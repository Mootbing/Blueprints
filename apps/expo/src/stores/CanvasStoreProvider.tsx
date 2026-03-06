import React, { createContext, useContext, useRef, useEffect } from "react";
import { useStore } from "zustand";
import {
  createCanvasStore,
  loadPersistedSettings,
  type CanvasStore,
} from "./useCanvasStore";

type CanvasStoreApi = ReturnType<typeof createCanvasStore>;

const CanvasStoreContext = createContext<CanvasStoreApi | null>(null);

export function CanvasStoreProvider({ children }: { children: React.ReactNode }) {
  const storeRef = useRef<CanvasStoreApi | null>(null);
  if (storeRef.current === null) {
    storeRef.current = createCanvasStore();
  }

  useEffect(() => {
    if (storeRef.current) {
      loadPersistedSettings(storeRef.current);
    }
  }, []);

  return (
    <CanvasStoreContext.Provider value={storeRef.current}>
      {children}
    </CanvasStoreContext.Provider>
  );
}

export function useCanvasStore<T>(selector: (state: CanvasStore) => T): T {
  const store = useContext(CanvasStoreContext);
  if (!store) {
    throw new Error("useCanvasStore must be used within a CanvasStoreProvider");
  }
  return useStore(store, selector);
}

export function useCanvasStoreApi(): CanvasStoreApi {
  const store = useContext(CanvasStoreContext);
  if (!store) {
    throw new Error("useCanvasStoreApi must be used within a CanvasStoreProvider");
  }
  return store;
}
