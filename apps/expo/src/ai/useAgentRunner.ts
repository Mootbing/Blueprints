import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { buildContent } from "./anthropicClient";
import { agentSystemPrompt } from "./prompts";
import { uuid } from "../utils/uuid";
import { submitJob, subscribeToJob, checkCompletedJobs, getJobResult, getActiveJobs } from "./aiJobClient";
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
  onAddBranchEntry?: (branchSlate: AppSlate, description: string, source?: "user" | "ai") => string;
  chatLog?: ChatLogEntry[];
  /** Called after AI changes are auto-applied (server or conflict fallback) */
  onChangesApplied?: () => void;
}

export function useAgentRunner({
  slateId,
  slate,
  screenId,
  historyEntries,
  currentHistoryId,
  onAddBranchEntry,
  chatLog,
  onChangesApplied,
}: UseAgentRunnerOptions) {
  const { sessions, sessionsRef, createSession, updateSession, deleteSession } =
    useAgentSessions(slateId);

  const [errorMap, setErrorMap] = useState<Record<string, string | null>>({});
  const loadingSessionsRef = useRef(new Set<string>());
  const [loadingSessions, setLoadingSessions] = useState<Set<string>>(new Set());
  const isLoading = loadingSessions.size > 0;
  const [streamingThinkingMap, setStreamingThinkingMap] = useState<Record<string, string | null>>({});

  // Helpers for per-session state updates
  const addLoadingSession = useCallback((sid: string) => {
    loadingSessionsRef.current.add(sid);
    setLoadingSessions(new Set(loadingSessionsRef.current));
  }, []);
  const removeLoadingSession = useCallback((sid: string) => {
    loadingSessionsRef.current.delete(sid);
    setLoadingSessions(new Set(loadingSessionsRef.current));
  }, []);
  const setSessionError = useCallback((sid: string, err: string | null) => {
    setErrorMap((prev) => ({ ...prev, [sid]: err }));
  }, []);
  const setSessionThinking = useCallback((sid: string, val: string | null) => {
    setStreamingThinkingMap((prev) => ({ ...prev, [sid]: val }));
  }, []);

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
  const onChangesAppliedRef = useRef(onChangesApplied);
  onChangesAppliedRef.current = onChangesApplied;
  const chatLogRef = useRef(chatLog);
  chatLogRef.current = chatLog;
  const historyEntriesRef = useRef(historyEntries);
  historyEntriesRef.current = historyEntries;
  const currentHistoryIdRef = useRef(currentHistoryId);
  currentHistoryIdRef.current = currentHistoryId;

  // Helper: build assistant message and create branch entry if changes were applied server-side
  const buildAssistantMessage = useCallback(
    async (response: any): Promise<ChatMessage> => {
      const msg: ChatMessage = {
        id: uuid(),
        role: "assistant",
        content: response?.text ?? "",
        hasComponentJson: response?.hasActionableJson ?? response?.applied ?? false,
        thinking: response?.thinking || undefined,
        thinkingSignature: response?.thinkingSignature,
        timestamp: Date.now(),
      };

      // Apply AI-generated slate changes locally
      // Prefer builtSlate from response (always available) over re-fetching from DB
      const builtSlate = response?.builtSlate ?? response?.pendingSlate;
      if (builtSlate && onAddBranchEntryRef.current) {
        try {
          const description = response.description ?? "AI changes";
          const entryId = onAddBranchEntryRef.current(builtSlate, description, "ai");
          msg.branchEntryId = entryId;
          onChangesAppliedRef.current?.();
        } catch (err) {
          console.warn("[useAgentRunner] Failed to create branch entry from builtSlate:", err);
        }
      } else if (response?.applied && onAddBranchEntryRef.current) {
        // Fallback: re-fetch from DB if builtSlate not in response (old edge function)
        try {
          const supabase = getSupabaseClient();
          const { data: slateRow } = await supabase
            .from("user_slates")
            .select("slate")
            .eq("id", slateId)
            .single();

          if (slateRow?.slate) {
            const description = response.description ?? "AI changes";
            const entryId = onAddBranchEntryRef.current(slateRow.slate, description, "ai");
            msg.branchEntryId = entryId;
            onChangesAppliedRef.current?.();
          }
        } catch (err) {
          console.warn("[useAgentRunner] Failed to create branch entry for applied changes:", err);
        }
      }

      return msg;
    },
    [slateId],
  );

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
      if (mountedRef.current) {
        addLoadingSession(sessionId);
        setSessionError(sessionId, null);
      }

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

        if (mountedRef.current) setSessionThinking(sessionId, "");

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
            if (mountedRef.current) setSessionThinking(sessionId, thinkingTextRef.current);
          },
          onComplete: async (job) => {
            if (!mountedRef.current) return;
            setSessionThinking(sessionId, null);

            const response = job.response;
            const assistantMsg = await buildAssistantMessage(response);

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

            cleanupFnsRef.current.delete(sessionId);
            cleanup();
            if (mountedRef.current) removeLoadingSession(sessionId);
          },
          onError: (errorMsg) => {
            if (!mountedRef.current) return;
            setSessionThinking(sessionId, null);
            setSessionError(sessionId, errorMsg);
            updateSession(sessionId, { status: "idle" });
            cleanupFnsRef.current.delete(sessionId);
            cleanup();
            if (mountedRef.current) removeLoadingSession(sessionId);
          },
        });

        cleanupFnsRef.current.set(sessionId, cleanup);

        // Fallback: poll in case Realtime fails
        const pollStartTime = Date.now();
        const pollInterval = setInterval(async () => {
          // If Realtime already handled it, stop polling
          if (!loadingSessionsRef.current.has(sessionId)) {
            clearInterval(pollInterval);
            return;
          }

          const result = await getJobResult(jobId);
          if (!result) return;
          if (result.status === "completed" || result.status === "conflict") {
            clearInterval(pollInterval);

            if (mountedRef.current) {
              setSessionThinking(sessionId, null);
              const assistantMsg = await buildAssistantMessage(result.response);
              updateSession(sessionId, {
                messages: [...newMessages, assistantMsg],
                status: "idle",
              });
            }
            cleanupFnsRef.current.get(sessionId)?.();
            cleanupFnsRef.current.delete(sessionId);
            if (mountedRef.current) removeLoadingSession(sessionId);
          } else if (result.status === "failed") {
            clearInterval(pollInterval);
            if (mountedRef.current) {
              setSessionThinking(sessionId, null);
              setSessionError(sessionId, result.error_message ?? "Job failed");
              updateSession(sessionId, { status: "idle" });
            }
            cleanupFnsRef.current.get(sessionId)?.();
            cleanupFnsRef.current.delete(sessionId);
            if (mountedRef.current) removeLoadingSession(sessionId);
          } else if (Date.now() - pollStartTime > 240000) {
            // Job stuck in pending/running for over 4 minutes — treat as timed out
            clearInterval(pollInterval);
            if (mountedRef.current) {
              setSessionThinking(sessionId, null);
              setSessionError(sessionId, "Request timed out. Please try again.");
              updateSession(sessionId, { status: "idle" });
            }
            cleanupFnsRef.current.get(sessionId)?.();
            cleanupFnsRef.current.delete(sessionId);
            if (mountedRef.current) removeLoadingSession(sessionId);
          }
        }, 5000);

      } catch (err) {
        if (mountedRef.current) {
          setSessionThinking(sessionId, null);
          setSessionError(sessionId, err instanceof Error ? err.message : "Unknown error");
          updateSession(sessionId, { status: "idle" });
          removeLoadingSession(sessionId);
        }
      }
    },
    [sessionsRef, updateSession, slateId, getSlateVersion, buildAssistantMessage, addLoadingSession, removeLoadingSession, setSessionError, setSessionThinking],
  );

  // ─── Mount-time reconciliation: resume tracking in-progress jobs, apply completed ones ───
  const reconciledRef = useRef(false);
  useEffect(() => {
    if (reconciledRef.current) return;
    reconciledRef.current = true;

    const reconcile = async () => {
      console.log("[useAgentRunner] Mount reconciliation starting...");

      // 1. Check for active (pending/running) jobs and re-subscribe
      const activeJobs = await getActiveJobs(slateId).catch(() => []);
      console.log(`[useAgentRunner] Found ${activeJobs.length} active jobs`);

      for (const job of activeJobs) {
        const sessionId = job.session_id;
        if (!sessionId) continue;
        if (job.job_type !== "agent_message") continue;

        // Mark session as running
        const session = sessionsRef.current.find((s) => s.id === sessionId);
        if (!session) continue;

        console.log(`[useAgentRunner] Re-subscribing to active job ${job.id} for session ${sessionId}`);
        if (mountedRef.current) {
          addLoadingSession(sessionId);
          setSessionThinking(sessionId, "");
          updateSession(sessionId, { status: "running" });
        }

        const thinkingTextRef = { current: "" };
        const cleanup = subscribeToJob(job.id, {
          onThinking: (chunk) => {
            thinkingTextRef.current += chunk;
            if (mountedRef.current) setSessionThinking(sessionId, thinkingTextRef.current);
          },
          onComplete: async (completedJob) => {
            if (!mountedRef.current) return;
            setSessionThinking(sessionId, null);

            const response = completedJob.response;
            const currentSession = sessionsRef.current.find((s) => s.id === sessionId);
            const alreadyHasReply = currentSession?.messages.some(
              (m) => m.role === "assistant" && m.timestamp > (job.created_at ? new Date(job.created_at).getTime() : 0)
            );
            if (alreadyHasReply) {
              console.log(`[useAgentRunner] Session ${sessionId} already has reply, skipping`);
            } else {
              const assistantMsg = await buildAssistantMessage(response);
              updateSession(sessionId, {
                messages: [...(currentSession?.messages ?? []), assistantMsg],
                status: "idle",
              });
            }

            cleanupFnsRef.current.delete(sessionId);
            cleanup();
            if (mountedRef.current) removeLoadingSession(sessionId);
          },
          onError: (errorMsg) => {
            if (!mountedRef.current) return;
            setSessionThinking(sessionId, null);
            setSessionError(sessionId, errorMsg);
            updateSession(sessionId, { status: "idle" });
            cleanupFnsRef.current.delete(sessionId);
            cleanup();
            if (mountedRef.current) removeLoadingSession(sessionId);
          },
        });
        cleanupFnsRef.current.set(sessionId, cleanup);

        // Also poll as fallback
        const reconPollStart = Date.now();
        const pollInterval = setInterval(async () => {
          if (!loadingSessionsRef.current.has(sessionId)) {
            clearInterval(pollInterval);
            return;
          }

          const result = await getJobResult(job.id);
          if (!result) return;
          if (result.status === "completed" || result.status === "conflict") {
            clearInterval(pollInterval);
            if (mountedRef.current) {
              setSessionThinking(sessionId, null);
              const currentSession = sessionsRef.current.find((s) => s.id === sessionId);
              const alreadyHasReply = currentSession?.messages.some(
                (m) => m.role === "assistant" && m.timestamp > (job.created_at ? new Date(job.created_at).getTime() : 0)
              );
              if (!alreadyHasReply) {
                const assistantMsg = await buildAssistantMessage(result.response);
                updateSession(sessionId, {
                  messages: [...(currentSession?.messages ?? []), assistantMsg],
                  status: "idle",
                });
              }
            }
            cleanupFnsRef.current.get(sessionId)?.();
            cleanupFnsRef.current.delete(sessionId);
            if (mountedRef.current) removeLoadingSession(sessionId);
          } else if (result.status === "failed") {
            clearInterval(pollInterval);
            if (mountedRef.current) {
              setSessionThinking(sessionId, null);
              setSessionError(sessionId, result.error_message ?? "Job failed");
              updateSession(sessionId, { status: "idle" });
            }
            cleanupFnsRef.current.get(sessionId)?.();
            cleanupFnsRef.current.delete(sessionId);
            if (mountedRef.current) removeLoadingSession(sessionId);
          } else if (Date.now() - reconPollStart > 240000) {
            clearInterval(pollInterval);
            if (mountedRef.current) {
              setSessionThinking(sessionId, null);
              setSessionError(sessionId, "Request timed out. Please try again.");
              updateSession(sessionId, { status: "idle" });
            }
            cleanupFnsRef.current.get(sessionId)?.();
            cleanupFnsRef.current.delete(sessionId);
            if (mountedRef.current) removeLoadingSession(sessionId);
          }
        }, 3000);
      }

      // 2. Check for recently completed jobs whose results may not be in sessions yet
      const completedJobs = await checkCompletedJobs(slateId).catch(() => []);
      for (const job of completedJobs) {
        if (job.status !== "completed" || !job.response) continue;
        const sessionId = (job as any).session_id;
        if (!sessionId || (job as any).job_type !== "agent_message") continue;

        const session = sessionsRef.current.find((s) => s.id === sessionId);
        if (!session) continue;

        // Check if the session already has a reply after this job was created
        const jobTime = (job as any).completed_at ? new Date((job as any).completed_at).getTime() : 0;
        const hasReply = session.messages.some(
          (m) => m.role === "assistant" && m.timestamp >= jobTime - 5000
        );
        if (hasReply) continue;

        // Check if last message is from user (waiting for reply)
        const lastMsg = session.messages[session.messages.length - 1];
        if (!lastMsg || lastMsg.role !== "user") continue;

        console.log(`[useAgentRunner] Applying completed job ${job.id} to session ${sessionId}`);
        const assistantMsg = await buildAssistantMessage(job.response);
        updateSession(sessionId, {
          messages: [...session.messages, assistantMsg],
          status: "idle",
        });
      }
    };

    reconcile();
  }, [slateId]);

  // Foreground reconciliation: check for completed jobs when app returns
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;

      // Re-run the same checks on foreground
      Promise.all([
        getActiveJobs(slateId).catch(() => []),
        checkCompletedJobs(slateId).catch(() => []),
      ]).then(async ([activeJobs, completedJobs]) => {
        // For active jobs that we're not already tracking, start polling
        for (const job of activeJobs) {
          const sessionId = job.session_id;
          if (!sessionId || job.job_type !== "agent_message") continue;
          if (loadingSessionsRef.current.has(sessionId)) continue; // already tracking

          const session = sessionsRef.current.find((s) => s.id === sessionId);
          if (!session) continue;

          console.log(`[useAgentRunner] Foreground: re-subscribing to job ${job.id}`);
          if (mountedRef.current) {
            addLoadingSession(sessionId);
            setSessionThinking(sessionId, "");
            updateSession(sessionId, { status: "running" });
          }

          const cleanup = subscribeToJob(job.id, {
            onComplete: async (completedJob) => {
              if (!mountedRef.current) return;
              setSessionThinking(sessionId, null);
              const response = completedJob.response;
              const currentSession = sessionsRef.current.find((s) => s.id === sessionId);
              const assistantMsg = await buildAssistantMessage(response);
              updateSession(sessionId, {
                messages: [...(currentSession?.messages ?? []), assistantMsg],
                status: "idle",
              });
              cleanupFnsRef.current.delete(sessionId);
              cleanup();
              if (mountedRef.current) removeLoadingSession(sessionId);
            },
            onError: (errorMsg) => {
              if (!mountedRef.current) return;
              setSessionThinking(sessionId, null);
              setSessionError(sessionId, errorMsg);
              updateSession(sessionId, { status: "idle" });
              cleanupFnsRef.current.delete(sessionId);
              cleanup();
              if (mountedRef.current) removeLoadingSession(sessionId);
            },
          });
          cleanupFnsRef.current.set(sessionId, cleanup);
        }

        // Apply completed jobs that aren't in sessions yet
        for (const job of completedJobs) {
          if (job.status !== "completed" || !job.response) continue;
          const sessionId = (job as any).session_id;
          if (!sessionId || (job as any).job_type !== "agent_message") continue;

          const session = sessionsRef.current.find((s) => s.id === sessionId);
          if (!session || session.status !== "running") continue;

          const assistantMsg = await buildAssistantMessage(job.response);
          updateSession(sessionId, {
            messages: [...session.messages, assistantMsg],
            status: "idle",
          });
          cleanupFnsRef.current.get(sessionId)?.();
          cleanupFnsRef.current.delete(sessionId);
          if (mountedRef.current) {
            setSessionThinking(sessionId, null);
            removeLoadingSession(sessionId);
          }
        }
      }).catch(() => {});
    });
    return () => subscription.remove();
  }, [slateId, sessionsRef, updateSession, buildAssistantMessage, addLoadingSession, removeLoadingSession, setSessionError, setSessionThinking]);

  const deleteSessionWithAbort = useCallback(
    (id: string) => {
      const cleanup = cleanupFnsRef.current.get(id);
      if (cleanup) {
        cleanup();
        cleanupFnsRef.current.delete(id);
      }
      removeLoadingSession(id);
      setSessionThinking(id, null);
      setSessionError(id, null);
      deleteSession(id);
    },
    [deleteSession, removeLoadingSession, setSessionThinking, setSessionError],
  );

  return {
    sessions,
    isLoading,
    loadingSessions,
    streamingThinkingMap,
    errorMap,
    sendMessage,
    createSession,
    updateSession,
    deleteSession: deleteSessionWithAbort,
    setError: setSessionError,
  };
}
