import { useState, useCallback, useRef, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const MAX_LOG_ENTRIES = 50;

export interface ChatLogEntry {
  id: string;
  source: "component" | "screen";
  /** e.g. component label or "Screen generation" */
  context: string;
  screenId: string;
  userMessage: string;
  assistantSummary: string;
  timestamp: number;
}

export function useChatLog(slateId: string) {
  const [entries, setEntries] = useState<ChatLogEntry[]>([]);
  const loadedRef = useRef(false);
  const storageKey = `chat_log_${slateId}`;

  useEffect(() => {
    AsyncStorage.getItem(storageKey).then((data) => {
      if (data) {
        try {
          setEntries(JSON.parse(data));
        } catch {}
      }
      loadedRef.current = true;
    });
  }, [storageKey]);

  const persist = useCallback(
    (next: ChatLogEntry[]) => {
      if (loadedRef.current) {
        AsyncStorage.setItem(storageKey, JSON.stringify(next)).catch(() => {});
      }
    },
    [storageKey],
  );

  const logInteraction = useCallback(
    (entry: Omit<ChatLogEntry, "id" | "timestamp">) => {
      setEntries((prev) => {
        const next = [
          ...prev,
          { ...entry, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, timestamp: Date.now() },
        ].slice(-MAX_LOG_ENTRIES);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  return { chatLog: entries, logInteraction };
}

/** Summarize an AI response to a short string for the log. */
export function summarizeResponse(content: string): string {
  // Strip JSON blocks
  const stripped = content.replace(/<json>[\s\S]*?<\/json>/g, "").trim();
  if (!stripped) return "(applied changes)";
  // Take first 120 chars
  const oneLine = stripped.replace(/\n+/g, " ").trim();
  return oneLine.length > 120 ? oneLine.slice(0, 117) + "..." : oneLine;
}
