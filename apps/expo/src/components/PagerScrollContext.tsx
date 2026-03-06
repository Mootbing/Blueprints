import React, { createContext, useContext, useRef, useCallback } from "react";
import type { ScrollView } from "react-native";

interface PagerScrollContextValue {
  setGestureActive: (active: boolean) => void;
  registerScrollView: (ref: ScrollView | null) => void;
}

const PagerScrollContext = createContext<PagerScrollContextValue>({
  setGestureActive: () => {},
  registerScrollView: () => {},
});

export function PagerScrollProvider({ children }: { children: React.ReactNode }) {
  const scrollViews = useRef<Set<ScrollView>>(new Set());

  const registerScrollView = useCallback((ref: ScrollView | null) => {
    if (ref) scrollViews.current.add(ref);
  }, []);

  const setGestureActive = useCallback((active: boolean) => {
    const enabled = !active;
    scrollViews.current.forEach((sv) => {
      try {
        sv.setNativeProps({ scrollEnabled: enabled });
      } catch {}
    });
  }, []);

  const value = useRef({ setGestureActive, registerScrollView }).current;

  return (
    <PagerScrollContext.Provider value={value}>
      {children}
    </PagerScrollContext.Provider>
  );
}

export const usePagerScroll = () => useContext(PagerScrollContext);
