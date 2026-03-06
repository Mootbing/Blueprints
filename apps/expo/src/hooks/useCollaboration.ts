import { useEffect, useRef, useState, useCallback } from "react";
import type { SyncableStorageProvider } from "../storage/StorageProvider";
import type { AppSlate } from "../types";

interface CollaborationOptions {
  storage: SyncableStorageProvider;
  slateId: string;
  onRemoteChange: (slate: AppSlate) => void;
  enabled?: boolean;
}

export function useCollaboration({
  storage,
  slateId,
  onRemoteChange,
  enabled = true,
}: CollaborationOptions) {
  const [collaborators, setCollaborators] = useState<{ userId: string }[]>([]);
  const storageRef = useRef(storage);
  storageRef.current = storage;
  const onRemoteChangeRef = useRef(onRemoteChange);
  onRemoteChangeRef.current = onRemoteChange;
  const broadcastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastBroadcastSlateRef = useRef<AppSlate | null>(null);

  useEffect(() => {
    if (!enabled) return;

    storageRef.current.joinCollabChannel(
      slateId,
      (slate, _senderId) => {
        onRemoteChangeRef.current(slate);
      },
      (users) => {
        setCollaborators(users);
      }
    );

    return () => {
      storageRef.current.leaveCollabChannel(slateId);
      if (broadcastTimeout.current) clearTimeout(broadcastTimeout.current);
    };
  }, [slateId, enabled]);

  const broadcastChange = useCallback(
    (slate: AppSlate) => {
      if (!enabled) return;
      // Debounce broadcasts to 200ms
      if (broadcastTimeout.current) clearTimeout(broadcastTimeout.current);
      lastBroadcastSlateRef.current = slate;
      broadcastTimeout.current = setTimeout(() => {
        if (lastBroadcastSlateRef.current) {
          storageRef.current.broadcastSlateChange(slateId, lastBroadcastSlateRef.current);
        }
      }, 200);
    },
    [slateId, enabled]
  );

  return { collaborators, broadcastChange };
}
