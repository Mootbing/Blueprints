import { AsyncStorageProvider } from "./AsyncStorageProvider";
import { SyncEngine } from "./SyncEngine";
import { RealtimeCollaboration } from "./RealtimeCollaboration";
import { getSupabaseClient, ensureAnonymousAuth } from "./supabaseClient";
import type { SyncableStorageProvider, PersistedHistory, CollabEventHandler, PresenceHandler } from "./StorageProvider";
import type { AppSlate, SlateMeta, ShareInfo } from "../types";

export class SupabaseStorageProvider implements SyncableStorageProvider {
  private local = new AsyncStorageProvider();
  private syncEngine = new SyncEngine();
  private realtime = new RealtimeCollaboration();
  private connectionStatus: 'online' | 'offline' | 'syncing' = 'offline';
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    try {
      await ensureAnonymousAuth();
      this.connectionStatus = 'online';
      this.initialized = true;
      // Pull remote slates on init
      await this.syncAll();
    } catch {
      this.connectionStatus = 'offline';
      this.initialized = true;
    }
  }

  getConnectionStatus(): 'online' | 'offline' | 'syncing' {
    return this.connectionStatus;
  }

  // --- StorageProvider delegates to local ---

  async listSlates(): Promise<SlateMeta[]> {
    return this.local.listSlates();
  }

  async saveSlateList(slates: SlateMeta[]): Promise<void> {
    return this.local.saveSlateList(slates);
  }

  async loadSlate(slateId: string): Promise<AppSlate | null> {
    return this.local.loadSlate(slateId);
  }

  async saveSlate(slateId: string, slate: AppSlate): Promise<void> {
    // Always write locally first (instant)
    await this.local.saveSlate(slateId, slate);

    // Mark as dirty
    const slates = await this.local.listSlates();
    const meta = slates.find((s) => s.id === slateId);
    if (meta) {
      const updatedMeta = { ...meta, syncStatus: 'dirty' as const, updatedAt: Date.now() };
      const updatedList = slates.map((s) => (s.id === slateId ? updatedMeta : s));
      await this.local.saveSlateList(updatedList);
    }

    // Enqueue sync op
    await this.syncEngine.enqueue({
      type: "upsert",
      slateId,
      slateName: meta?.name,
      slate,
      createdAt: meta?.createdAt,
      expectedVersion: meta?.remoteVersion,
      timestamp: Date.now(),
    });

    // Try to flush if online
    if (this.connectionStatus === 'online') {
      this.flushInBackground();
    }
  }

  async deleteSlate(slateId: string): Promise<void> {
    await this.local.deleteSlate(slateId);
    await this.syncEngine.enqueue({
      type: "delete",
      slateId,
      timestamp: Date.now(),
    });
    if (this.connectionStatus === 'online') {
      this.flushInBackground();
    }
  }

  async saveHistory(slateId: string, history: PersistedHistory): Promise<void> {
    return this.local.saveHistory(slateId, history);
  }

  async loadHistory(slateId: string): Promise<PersistedHistory | null> {
    return this.local.loadHistory(slateId);
  }

  // --- Sync ---

  async syncAll(): Promise<void> {
    if (this.connectionStatus === 'syncing') return;
    this.connectionStatus = 'syncing';

    try {
      // Flush local changes
      const flushResults = await this.syncEngine.flush();

      // Update local sync statuses from flush results
      const slates = await this.local.listSlates();
      let updatedList = [...slates];
      for (const [slateId, status] of flushResults) {
        updatedList = updatedList.map((s) => {
          if (s.id !== slateId) return s;
          if (status === 'synced') {
            return { ...s, syncStatus: 'synced' as const, lastSyncedAt: Date.now() };
          } else if (status === 'conflict') {
            return { ...s, syncStatus: 'conflict' as const };
          }
          return s;
        });
      }

      // Pull remote changes
      const dirtyIds = new Set(
        updatedList.filter((s) => s.syncStatus === 'dirty' || s.syncStatus === 'conflict').map((s) => s.id)
      );
      const lastSynced = Math.min(
        ...updatedList.map((s) => s.lastSyncedAt ?? 0),
        Date.now()
      );

      try {
        const { upserted, deleted } = await this.syncEngine.pull(lastSynced, dirtyIds);

        // Apply remote inserts/updates
        for (const remote of upserted) {
          await this.local.saveSlate(remote.id, remote.slate);
          const existing = updatedList.find((s) => s.id === remote.id);
          if (existing) {
            updatedList = updatedList.map((s) =>
              s.id === remote.id
                ? { ...s, name: remote.name, syncStatus: 'synced' as const, remoteVersion: remote.version, lastSyncedAt: Date.now() }
                : s
            );
          } else {
            updatedList.push({
              id: remote.id,
              name: remote.name,
              createdAt: remote.createdAt,
              syncStatus: 'synced',
              remoteVersion: remote.version,
              lastSyncedAt: Date.now(),
            });
          }
        }

        // Handle remote deletes
        for (const id of deleted) {
          await this.local.deleteSlate(id);
          updatedList = updatedList.filter((s) => s.id !== id);
        }
      } catch {
        // Pull failed — keep going with what we have
      }

      // Mark remaining unsynced slates
      updatedList = updatedList.map((s) => {
        if (!s.syncStatus || s.syncStatus === 'local-only') {
          return { ...s, syncStatus: 'local-only' as const };
        }
        return s;
      });

      await this.local.saveSlateList(updatedList);
      this.connectionStatus = 'online';
    } catch {
      this.connectionStatus = 'offline';
    }
  }

  private flushInBackground(): void {
    this.syncEngine.flush().then(async (results) => {
      if (results.size === 0) return;
      const slates = await this.local.listSlates();
      const updatedList = slates.map((s) => {
        const status = results.get(s.id);
        if (!status) return s;
        if (status === 'synced') {
          return { ...s, syncStatus: 'synced' as const, lastSyncedAt: Date.now() };
        } else if (status === 'conflict') {
          return { ...s, syncStatus: 'conflict' as const };
        }
        return s;
      });
      await this.local.saveSlateList(updatedList);
    }).catch(() => {
      // Silently fail — will retry on next sync
    });
  }

  // --- Sharing ---

  async createShareLink(slateId: string, role: 'viewer' | 'editor'): Promise<ShareInfo> {
    const supabase = getSupabaseClient();

    // Generate code
    const { data: codeData, error: codeError } = await supabase.rpc("generate_share_code");
    if (codeError) throw codeError;
    const shareCode = codeData as string;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { error } = await supabase.from("share_links").insert({
      slate_id: slateId,
      created_by: user.id,
      share_code: shareCode,
      role,
    });
    if (error) throw error;

    return { shareCode, role, isActive: true };
  }

  async revokeShareLink(shareCode: string): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("share_links")
      .update({ is_active: false })
      .eq("share_code", shareCode);
    if (error) throw error;
  }

  async listShareLinks(slateId: string): Promise<ShareInfo[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("share_links")
      .select("share_code, role, is_active, expires_at")
      .eq("slate_id", slateId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (!data) return [];

    return data.map((row) => ({
      shareCode: row.share_code,
      role: row.role as 'viewer' | 'editor',
      isActive: row.is_active,
      expiresAt: row.expires_at ? new Date(row.expires_at).getTime() : undefined,
    }));
  }

  async loadSharedSlate(shareCode: string): Promise<{ slate: AppSlate; role: 'viewer' | 'editor'; slateId: string } | null> {
    const supabase = getSupabaseClient();

    const { data: linkData, error: linkError } = await supabase
      .from("share_links")
      .select("id, slate_id, role, is_active, expires_at")
      .eq("share_code", shareCode)
      .single();

    if (linkError || !linkData) return null;
    if (!linkData.is_active) return null;
    if (linkData.expires_at && new Date(linkData.expires_at) < new Date()) return null;

    // Record a claim so RLS policies can verify this user's access
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("share_link_claims").upsert(
        { share_link_id: linkData.id, user_id: user.id },
        { onConflict: "share_link_id,user_id" }
      );
    }

    const { data: slateData, error: slateError } = await supabase
      .from("user_slates")
      .select("id, slate")
      .eq("id", linkData.slate_id)
      .is("deleted_at", null)
      .single();

    if (slateError || !slateData) return null;

    return {
      slate: slateData.slate as AppSlate,
      role: linkData.role as 'viewer' | 'editor',
      slateId: slateData.id,
    };
  }

  // --- Collaboration ---

  joinCollabChannel(slateId: string, onChange: CollabEventHandler, onPresence: PresenceHandler): void {
    this.realtime.join(slateId, onChange, onPresence);
  }

  leaveCollabChannel(slateId: string): void {
    this.realtime.leave(slateId);
  }

  broadcastSlateChange(slateId: string, slate: AppSlate): void {
    this.realtime.broadcast(slateId, slate);
  }

  // --- Force resolution ---

  async forceUpload(slateId: string, slate: AppSlate, name: string): Promise<void> {
    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("user_slates")
      .upsert({
        id: slateId,
        owner_id: user.id,
        name,
        slate,
      }, { onConflict: "id" })
      .select("version")
      .single();

    if (error) throw error;

    // Update local meta
    const slates = await this.local.listSlates();
    const updatedList = slates.map((s) =>
      s.id === slateId
        ? { ...s, syncStatus: 'synced' as const, remoteVersion: data?.version, lastSyncedAt: Date.now() }
        : s
    );
    await this.local.saveSlateList(updatedList);

    // Clear this slate from sync queue
    const queue = await this.syncEngine.getQueue();
    const filtered = queue.filter((op) => op.slateId !== slateId);
    if (filtered.length !== queue.length) {
      // Rewrite queue without this slate
      await this.syncEngine.clearQueue();
      for (const op of filtered) {
        await this.syncEngine.enqueue(op);
      }
    }
  }

  async forceDownload(slateId: string): Promise<AppSlate | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("user_slates")
      .select("slate, version, name")
      .eq("id", slateId)
      .single();

    if (error || !data) return null;

    const slate = data.slate as AppSlate;
    await this.local.saveSlate(slateId, slate);

    const slates = await this.local.listSlates();
    const updatedList = slates.map((s) =>
      s.id === slateId
        ? { ...s, name: data.name, syncStatus: 'synced' as const, remoteVersion: data.version, lastSyncedAt: Date.now() }
        : s
    );
    await this.local.saveSlateList(updatedList);

    // Clear from sync queue
    const queue = await this.syncEngine.getQueue();
    const filtered = queue.filter((op) => op.slateId !== slateId);
    if (filtered.length !== queue.length) {
      await this.syncEngine.clearQueue();
      for (const op of filtered) {
        await this.syncEngine.enqueue(op);
      }
    }

    return slate;
  }
}
