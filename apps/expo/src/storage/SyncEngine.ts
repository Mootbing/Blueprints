import AsyncStorage from "@react-native-async-storage/async-storage";
import { getSupabaseClient } from "./supabaseClient";
import type { AppSlate, SlateMeta } from "../types";

const SYNC_QUEUE_KEY = "sync_queue";

export interface SyncOp {
  type: "upsert" | "delete";
  slateId: string;
  slateName?: string;
  slate?: AppSlate;
  createdAt?: number;
  expectedVersion?: number;
  timestamp: number;
}

export class SyncEngine {
  private flushing = false;

  async enqueue(op: SyncOp): Promise<void> {
    const queue = await this.getQueue();
    // Replace existing op for the same slate (coalesce)
    const filtered = queue.filter((o) => o.slateId !== op.slateId);
    filtered.push(op);
    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(filtered));
  }

  async getQueue(): Promise<SyncOp[]> {
    const raw = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as SyncOp[];
    } catch {
      return [];
    }
  }

  async clearQueue(): Promise<void> {
    await AsyncStorage.removeItem(SYNC_QUEUE_KEY);
  }

  async flush(): Promise<Map<string, { status: 'synced' | 'conflict'; version?: number }>> {
    if (this.flushing) return new Map();
    this.flushing = true;
    const results = new Map<string, { status: 'synced' | 'conflict'; version?: number }>();

    try {
      const queue = await this.getQueue();
      if (queue.length === 0) return results;

      const supabase = getSupabaseClient();
      const remaining: SyncOp[] = [];

      for (const op of queue) {
        try {
          if (op.type === "delete") {
            await supabase
              .from("user_slates")
              .update({ deleted_at: new Date().toISOString() })
              .eq("id", op.slateId);
            results.set(op.slateId, { status: 'synced' });
          } else if (op.type === "upsert") {
            // Try update first with version check
            if (op.expectedVersion && op.expectedVersion > 0) {
              const { data, error } = await supabase
                .from("user_slates")
                .update({
                  name: op.slateName ?? "Untitled",
                  slate: op.slate,
                })
                .eq("id", op.slateId)
                .eq("version", op.expectedVersion)
                .select("version")
                .maybeSingle();

              if (error) throw error;

              if (!data) {
                // Version mismatch = conflict
                results.set(op.slateId, { status: 'conflict' });
                remaining.push(op);
              } else {
                results.set(op.slateId, { status: 'synced', version: data.version });
              }
            } else {
              // First sync — upsert
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) throw new Error("Not authenticated");

              const { data, error } = await supabase
                .from("user_slates")
                .upsert({
                  id: op.slateId,
                  owner_id: user.id,
                  name: op.slateName ?? "Untitled",
                  slate: op.slate,
                  created_at: op.createdAt ?? Date.now(),
                }, { onConflict: "id" })
                .select("version")
                .single();

              if (error) throw error;
              results.set(op.slateId, { status: 'synced', version: data?.version });
            }
          }
        } catch {
          // Network error — keep in queue for retry
          remaining.push(op);
        }
      }

      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(remaining));
    } finally {
      this.flushing = false;
    }

    return results;
  }

  async pull(lastSyncedAt: number, dirtySlateIds: Set<string>): Promise<{
    upserted: { id: string; name: string; slate: AppSlate; version: number; createdAt: number; updatedAt: string }[];
    deleted: string[];
  }> {
    const supabase = getSupabaseClient();
    const since = new Date(lastSyncedAt || 0).toISOString();

    const { data, error } = await supabase
      .from("user_slates")
      .select("id, name, slate, version, created_at, updated_at, deleted_at")
      .gt("updated_at", since)
      .order("updated_at", { ascending: true });

    if (error) throw error;
    if (!data) return { upserted: [], deleted: [] };

    const upserted: { id: string; name: string; slate: AppSlate; version: number; createdAt: number; updatedAt: string }[] = [];
    const deleted: string[] = [];

    for (const row of data) {
      if (dirtySlateIds.has(row.id)) continue; // Skip locally dirty slates

      if (row.deleted_at) {
        deleted.push(row.id);
      } else {
        upserted.push({
          id: row.id,
          name: row.name,
          slate: row.slate as AppSlate,
          version: row.version,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        });
      }
    }

    return { upserted, deleted };
  }
}
