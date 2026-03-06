import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { buildContent } from "./anthropicClient";
import { agentSystemPrompt } from "./prompts";
import { uuid } from "../utils/uuid";
import { submitJob, subscribeToJob, checkCompletedJobs, getJobResult } from "./aiJobClient";
import type { AppSlate } from "../types";
import type { ChatMessage, AgentSession } from "./types";
import type { HistoryEntry } from "../hooks/useUndoHistory";
import type { ChatLogEntry } from "./useChatLog";
import { getSupabaseClient } from "../storage/supabaseClient";

// ─── Session persistence ────────────────────────────────────────

function useAgentSessions(slateId: string) {
  const [sessions, setSessions] = useState<AgentSession[]>([]);
  const sessionsRef = useRef<AgentSession[]>([]);
  const loadedRef = useRef(false);
  const storageKey = `agent_sessions_${slateId}`;

  sessionsRef.current = sessions;

  useEffect(() => {
    AsyncStorage.getItem(storageKey).then((data) => {
      if (data) {
        try {
          const parsed = JSON.parse(data);
          sessionsRef.current = parsed;
          setSessions(parsed);
        } catch {}
      }
      loadedRef.current = true;
    });
  }, [storageKey]);

  const persistToStorage = useCallback(
    (newSessions: AgentSession[]) => {
      if (loadedRef.current) {
        AsyncStorage.setItem(storageKey, JSON.stringify(newSessions)).catch(() => {});
      }
    },
    [storageKey],
  );

  const createSession = useCallback(
    (name: string): AgentSession => {
      const session: AgentSession = {
        id: uuid(),
        name,
        status: "idle",
        createdAt: Date.now(),
        messages: [],
      };
      setSessions((prev) => {
        const next = [...prev, session];
        sessionsRef.current = next;
        persistToStorage(next);
        return next;
      });
      return session;
    },
    [persistToStorage],
  );

  const updateSession = useCallback(
    (id: string, updates: Partial<AgentSession>) => {
      setSessions((prev) => {
        const next = prev.map((s) => (s.id === id ? { ...s, ...updates } : s));
        sessionsRef.current = next;
        persistToStorage(next);
        return next;
      });
    },
    [persistToStorage],
  );

  const deleteSession = useCallback(
    (id: string) => {
      setSessions((prev) => {
        const next = prev.filter((s) => s.id !== id);
        sessionsRef.current = next;
        persistToStorage(next);
        return next;
      });
    },
    [persistToStorage],
  );

  return { sessions, sessionsRef, createSession, updateSession, deleteSession };
}

// ─── Agent runner (job-based, server-side processing) ──────────

interface UseAgentRunnerOptions {
  slateId: string;
  slate: AppSlate;
  screenId: string;
  historyEntries?: HistoryEntry[];
  currentHistoryId?: string;
  onAddBranchEntry?: (branchSlate: AppSlate, description: string) => string;
  chatLog?: ChatLogEntry[];
}

export function useAgentRunner({
  slateId,
  slate,
  screenId,
  historyEntries,
  currentHistoryId,
  onAddBranchEntry,
  chatLog,
}: UseAgentRunnerOptions) {
  const { sessions, sessionsRef, createSession, updateSession, deleteSession } =
    useAgentSessions(slateId);

  const [error, setError] = useState<string | null>(null);
  const loadingSessionsRef = useRef(new Set<string>());
  const [loadingCount, setLoadingCount] = useState(0);
  const isLoading = loadingCount > 0;
  const [streamingThinking, setStreamingThinking] = useState<string | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Track active job subscriptions for cleanup
  const cleanupFnsRef = useRef(new Map<string, () => void>());

  useEffect(() => {
    return () => {
      for (const cleanup of cleanupFnsRef.current.values()) {
        cleanup();
      }
      cleanupFnsRef.current.clear();
    };
  }, []);

  // Use refs for values accessed in async operations
  const slateRef = useRef(slate);
  slateRef.current = slate;
  const screenIdRef = useRef(screenId);
  screenIdRef.current = screenId;
  const onAddBranchEntryRef = useRef(onAddBranchEntry);
  onAddBranchEntryRef.current = onAddBranchEntry;
  const chatLogRef = useRef(chatLog);
  chatLogRef.current = chatLog;
  const historyEntriesRef = useRef(historyEntries);
  historyEntriesRef.current = historyEntries;
  const currentHistoryIdRef = useRef(currentHistoryId);
  currentHistoryIdRef.current = currentHistoryId;

  const historyMeta = useMemo(
    () =>
      historyEntries
        ?.filter((e) => e.id !== "__root__")
        .map((e) => ({
          id: e.id,
          description: e.description,
          timestamp: e.timestamp,
        })),
    [historyEntries],
  );
  const historyMetaRef = useRef(historyMeta);
  historyMetaRef.current = historyMeta;

  // Get slate version for CAS
  const getSlateVersion = useCallback(async (): Promise<number | undefined> => {
    try {
      const supabase = getSupabaseClient();
      const { data } = await supabase
        .from("user_slates")
        .select("version")
        .eq("id", slateId)
        .single();
      return data?.version;
    } catch {
      return undefined;
    }
  }, [slateId]);

  const sendMessage = useCallback(
    async (sessionId: string, text: string, images?: string[]) => {
      if (loadingSessionsRef.current.has(sessionId)) return;
      const session = sessionsRef.current.find((s) => s.id === sessionId);
      if (!session) return;

      const userMsg: ChatMessage = {
        id: uuid(),
        role: "user",
        content: text.trim(),
        images: images && images.length > 0 ? images : undefined,
        timestamp: Date.now(),
      };

      const newMessages = [...session.messages, userMsg];
      updateSession(sessionId, { messages: newMessages, status: "running" });
      loadingSessionsRef.current.add(sessionId);
      if (mountedRef.current) setLoadingCount((c) => c + 1);
      if (mountedRef.current) setError(null);

      try {
        const system = agentSystemPrompt(
          slateRef.current,
          screenIdRef.current,
          slateRef.current.theme,
          historyMetaRef.current,
          currentHistoryIdRef.current,
          chatLogRef.current,
        );

        const apiMessages = newMessages.map((m) => {
          const role: "user" | "assistant" = m.role as "user" | "assistant";
          if (role === "assistant" && m.thinking && m.thinkingSignature) {
            return {
              role,
              content: [
                { type: "thinking" as const, thinking: m.thinking, signature: m.thinkingSignature },
                { type: "text" as const, text: m.content },
              ],
            };
          }
          return {
            role,
            content: m.images ? buildContent(m.content, m.images) : m.content,
          };
        });

        if (mountedRef.current) setStreamingThinking("");

        // Get current slate version for CAS
        const baseVersion = await getSlateVersion();

        // Submit job to server
        const jobId = await submitJob({
          slateId,
          sessionId,
          jobType: "agent_message",
          request: {
            messages: apiMessages,
            system,
            model: "claude-opus-4-6",
            maxTokens: 16384,
            thinkingBudget: 10000,
            screenId: screenIdRef.current,
            slateId,
          },
          baseSlateVersion: baseVersion,
        });

        // Subscribe to job for streaming thinking + completion
        const thinkingTextRef = { current: "" };

        const cleanup = subscribeToJob(jobId, {
          onThinking: (chunk) => {
            thinkingTextRef.current += chunk;
            if (mountedRef.current) setStreamingThinking(thinkingTextRef.current);
          },
          onComplete: (job) => {
            if (!mountedRef.current) return;
            setStreamingThinking(null);

            const response = job.response;
            const assistantMsg: ChatMessage = {
              id: uuid(),
              role: "assistant",
              content: response.text ?? "",
              hasComponentJson: response.hasActionableJson ?? response.applied ?? false,
              thinking: response.thinking || undefined,
              thinkingSignature: response.thinkingSignature,
              timestamp: Date.now(),
            };

            const updatedMessages = [...newMessages, assistantMsg];
            updateSession(sessionId, {
              messages: updatedMessages,
              status: "idle",
            });

            // Auto-retitle after the first assistant response
            const isFirstReply = !session.messages.some((m) => m.role === "assistant");
            if (isFirstReply) {
              submitJob({
                slateId,
                sessionId,
                jobType: "generate_title",
                request: { messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })) },
              }).then((titleJobId) => {
                // Poll for title result
                const pollTitle = setInterval(async () => {
                  const result = await getJobResult(titleJobId);
                  if (result && result.status === "completed" && result.response?.title) {
                    clearInterval(pollTitle);
                    if (mountedRef.current) {
                      updateSession(sessionId, { name: result.response.title });
                    }
                  } else if (result && (result.status === "failed")) {
                    clearInterval(pollTitle);
                  }
                }, 2000);
                // Stop polling after 30s
                setTimeout(() => clearInterval(pollTitle), 30000);
              }).catch(() => {});
            }

            loadingSessionsRef.current.delete(sessionId);
            cleanupFnsRef.current.delete(sessionId);
            cleanup();
            if (mountedRef.current) setLoadingCount((c) => c - 1);
          },
          onError: (errorMsg) => {
            if (!mountedRef.current) return;
            setStreamingThinking(null);
            setError(errorMsg);
            updateSession(sessionId, { status: "idle" });
            loadingSessionsRef.current.delete(sessionId);
            cleanupFnsRef.current.delete(sessionId);
            cleanup();
            if (mountedRef.current) setLoadingCount((c) => c - 1);
          },
        });

        cleanupFnsRef.current.set(sessionId, cleanup);

        // Fallback: poll in case Realtime fails
        const pollInterval = setInterval(async () => {
          const result = await getJobResult(jobId);
          if (!result) return;
          if (result.status === "completed" || result.status === "conflict") {
            clearInterval(pollInterval);
            // If Realtime already handled it, skip
            if (!loadingSessionsRef.current.has(sessionId)) return;

            if (mountedRef.current) {
              setStreamingThinking(null);
              const response = result.response;
              const assistantMsg: ChatMessage = {
                id: uuid(),
                role: "assistant",
                content: response?.text ?? "",
                hasComponentJson: response?.hasActionableJson ?? response?.applied ?? false,
                thinking: response?.thinking || undefined,
                thinkingSignature: response?.thinkingSignature,
                timestamp: Date.now(),
              };
              updateSession(sessionId, {
                messages: [...newMessages, assistantMsg],
                status: "idle",
              });
            }
            loadingSessionsRef.current.delete(sessionId);
            cleanupFnsRef.current.get(sessionId)?.();
            cleanupFnsRef.current.delete(sessionId);
            if (mountedRef.current) setLoadingCount((c) => c - 1);
          } else if (result.status === "failed") {
            clearInterval(pollInterval);
            if (!loadingSessionsRef.current.has(sessionId)) return;
            if (mountedRef.current) {
              setStreamingThinking(null);
              setError(result.error_message ?? "Job failed");
              updateSession(sessionId, { status: "idle" });
            }
            loadingSessionsRef.current.delete(sessionId);
            cleanupFnsRef.current.get(sessionId)?.();
            cleanupFnsRef.current.delete(sessionId);
            if (mountedRef.current) setLoadingCount((c) => c - 1);
          }
        }, 5000);

        // Stop polling after 5 minutes
        setTimeout(() => clearInterval(pollInterval), 300000);

      } catch (err) {
        if (mountedRef.current) {
          setStreamingThinking(null);
          setError(err instanceof Error ? err.message : "Unknown error");
          updateSession(sessionId, { status: "idle" });
        }
        loadingSessionsRef.current.delete(sessionId);
        if (mountedRef.current) setLoadingCount((c) => c - 1);
      }
    },
    [sessionsRef, updateSession, slateId, getSlateVersion],
  );

  // Foreground reconciliation: check for completed jobs when app returns
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      checkCompletedJobs(slateId).then((jobs) => {
        for (const job of jobs) {
          if (job.status === "completed" && job.response) {
            // If this job's session has a pending loading state, handle it
            const sessionId = (job as any).session_id;
            if (sessionId && loadingSessionsRef.current.has(sessionId)) {
              const session = sessionsRef.current.find((s) => s.id === sessionId);
              if (session && session.status === "running") {
                const assistantMsg: ChatMessage = {
                  id: uuid(),
                  role: "assistant",
                  content: job.response.text ?? "",
                  hasComponentJson: job.response.hasActionableJson ?? job.response.applied ?? false,
                  thinking: job.response.thinking || undefined,
                  thinkingSignature: job.response.thinkingSignature,
                  timestamp: Date.now(),
                };
                updateSession(sessionId, {
                  messages: [...session.messages, assistantMsg],
                  status: "idle",
                });
                loadingSessionsRef.current.delete(sessionId);
                cleanupFnsRef.current.get(sessionId)?.();
                cleanupFnsRef.current.delete(sessionId);
                if (mountedRef.current) {
                  setStreamingThinking(null);
                  setLoadingCount((c) => Math.max(0, c - 1));
                }
              }
            }
          }
        }
      }).catch(() => {});
    });
    return () => subscription.remove();
  }, [slateId, sessionsRef, updateSession]);

  const deleteSessionWithAbort = useCallback(
    (id: string) => {
      const cleanup = cleanupFnsRef.current.get(id);
      if (cleanup) {
        cleanup();
        cleanupFnsRef.current.delete(id);
      }
      loadingSessionsRef.current.delete(id);
      deleteSession(id);
    },
    [deleteSession],
  );

  return {
    sessions,
    isLoading,
    streamingThinking,
    error,
    sendMessage,
    createSession,
    updateSession,
    deleteSession: deleteSessionWithAbort,
    setError,
  };
}
