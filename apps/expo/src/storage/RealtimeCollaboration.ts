import { getSupabaseClient } from "./supabaseClient";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { AppSlate } from "../types";
import type { CollabEventHandler, PresenceHandler } from "./StorageProvider";

interface CollabChannel {
  channel: RealtimeChannel;
  onChange: CollabEventHandler;
  onPresence: PresenceHandler;
}

let senderId: string | null = null;

function getSenderId(): string {
  if (!senderId) {
    senderId = `sender_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
  return senderId;
}

export class RealtimeCollaboration {
  private channels = new Map<string, CollabChannel>();
  private changeCounter = 0;

  join(slateId: string, onChange: CollabEventHandler, onPresence: PresenceHandler): void {
    if (this.channels.has(slateId)) return;

    const supabase = getSupabaseClient();
    const channel = supabase.channel(`collab:${slateId}`, {
      config: { broadcast: { self: false } },
    });

    // Broadcast listener (fast path)
    channel.on("broadcast", { event: "slate_change" }, (payload) => {
      const { slate, senderId: remoteSenderId } = payload.payload as {
        slate: AppSlate;
        senderId: string;
        changeId: number;
      };
      if (remoteSenderId === getSenderId()) return; // Skip echo
      onChange(slate, remoteSenderId);
    });

    // Postgres changes listener (authoritative)
    channel.on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "user_slates",
        filter: `id=eq.${slateId}`,
      },
      (payload) => {
        const row = payload.new as { slate: AppSlate; owner_id: string };
        // Only apply if it didn't come from our broadcast
        onChange(row.slate, "db_update");
      }
    );

    // Presence
    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      const users = Object.values(state)
        .flat()
        .map((p: any) => ({ userId: p.userId as string }));
      onPresence(users);
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        const supabase = getSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        channel.track({ userId: user?.id ?? "anonymous" });
      }
    });

    this.channels.set(slateId, { channel, onChange, onPresence });
  }

  leave(slateId: string): void {
    const entry = this.channels.get(slateId);
    if (!entry) return;
    entry.channel.unsubscribe();
    this.channels.delete(slateId);
  }

  broadcast(slateId: string, slate: AppSlate): void {
    const entry = this.channels.get(slateId);
    if (!entry) return;
    this.changeCounter++;
    entry.channel.send({
      type: "broadcast",
      event: "slate_change",
      payload: {
        slate,
        senderId: getSenderId(),
        changeId: this.changeCounter,
      },
    });
  }

  leaveAll(): void {
    for (const [slateId] of this.channels) {
      this.leave(slateId);
    }
  }
}
