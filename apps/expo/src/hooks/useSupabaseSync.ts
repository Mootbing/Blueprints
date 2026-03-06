import { useState, useEffect, useRef, useCallback } from "react";
import { AppState } from "react-native";
import type { SyncableStorageProvider } from "../storage/StorageProvider";

// Lightweight NetInfo-like check that works cross-platform
async function isOnline(): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && "onLine" in navigator) {
      return navigator.onLine;
    }
    return true;
  } catch {
    return true;
  }
}

export function useSupabaseSync(storage: SyncableStorageProvider) {
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline' | 'syncing'>('offline');
  const [isSyncing, setIsSyncing] = useState(false);
  const storageRef = useRef(storage);
  storageRef.current = storage;

  // Initialize on mount
  useEffect(() => {
    let mounted = true;
    storage.initialize().then(() => {
      if (mounted) {
        setConnectionStatus(storage.getConnectionStatus());
      }
    });
    return () => { mounted = false; };
  }, [storage]);

  // Sync on app foreground
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        isOnline().then((online) => {
          if (online) {
            setIsSyncing(true);
            storageRef.current.syncAll().then(() => {
              setConnectionStatus(storageRef.current.getConnectionStatus());
              setIsSyncing(false);
            }).catch(() => {
              setIsSyncing(false);
            });
          }
        });
      }
    });
    return () => subscription.remove();
  }, []);

  // Listen for online/offline events (web)
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.addEventListener !== "function") return;

    const handleOnline = () => {
      setIsSyncing(true);
      storageRef.current.syncAll().then(() => {
        setConnectionStatus(storageRef.current.getConnectionStatus());
        setIsSyncing(false);
      }).catch(() => setIsSyncing(false));
    };
    const handleOffline = () => {
      setConnectionStatus('offline');
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const syncAll = useCallback(async () => {
    setIsSyncing(true);
    try {
      await storageRef.current.syncAll();
      setConnectionStatus(storageRef.current.getConnectionStatus());
    } finally {
      setIsSyncing(false);
    }
  }, []);

  return { connectionStatus, isSyncing, syncAll };
}
