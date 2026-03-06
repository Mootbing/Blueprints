import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { callClaude, buildContent, type ClaudeResult } from "./anthropicClient";
import { agentSystemPrompt } from "./prompts";
import { containsComponentJson, parseComponentArray, extractJson } from "./parseResponse";
import { containsWorkflowJson, parseWorkflowResult, applyWorkflow } from "./buildWorkflow";
import { ComponentSchema } from "../types";
import { uuid } from "../utils/uuid";
import { z } from "zod";
import type { AppSlate, Component, Screen } from "../types";
import type { ChatMessage, AgentSession } from "./types";
import type { HistoryEntry } from "../hooks/useUndoHistory";
import type { ChatLogEntry } from "./useChatLog";

// ─── Screen management parsing ──────────────────────────────────

interface ScreenOp {
  op: "create" | "delete" | "rename" | "setComponents" | "setInitial";
  id: string;
  name?: string;
  components?: Component[];
}

interface ScreenMgmtResult {
  screenOps: ScreenOp[];
  description: string;
}

function containsScreenOps(text: string): boolean {
  try {
    const json = extractJson(text);
    if (!json) return false;
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) && Array.isArray(parsed.screenOps);
  } catch {
    return false;
  }
}

function parseScreenOps(text: string): ScreenMgmtResult {
  const json = extractJson(text);
  if (!json) throw new Error("No JSON found");
  const parsed = JSON.parse(json);
  const ops: ScreenOp[] = [];
  for (const op of parsed.screenOps) {
    if (op.components) {
      op.components = z.array(ComponentSchema).parse(op.components);
    }
    ops.push(op);
  }
  return { screenOps: ops, description: parsed.description ?? "Screen management" };
}

function applyScreenOps(slate: AppSlate, result: ScreenMgmtResult): AppSlate {
  let updated = { ...slate, screens: { ...slate.screens } };
  for (const op of result.screenOps) {
    switch (op.op) {
      case "create": {
        const newScreen: Screen = {
          id: op.id,
          name: op.name ?? "New Screen",
          components: op.components ?? [],
        };
        updated.screens[op.id] = newScreen;
        break;
      }
      case "delete": {
        const ids = Object.keys(updated.screens);
        if (ids.length <= 1) break; // don't delete last screen
        const { [op.id]: _, ...rest } = updated.screens;
        updated.screens = rest;
        if (updated.initial_screen_id === op.id) {
          updated.initial_screen_id = Object.keys(rest)[0];
        }
        break;
      }
      case "rename": {
        const screen = updated.screens[op.id];
        if (screen && op.name) {
          updated.screens[op.id] = { ...screen, name: op.name };
        }
        break;
      }
      case "setComponents": {
        const screen = updated.screens[op.id];
        if (screen && op.components) {
          updated.screens[op.id] = { ...screen, components: op.components };
        }
        break;
      }
      case "setInitial": {
        if (updated.screens[op.id]) {
          updated.initial_screen_id = op.id;
        }
        break;
      }
    }
  }
  return updated;
}

// ─── Actionable detection & branch building ─────────────────────

function hasActionableJson(text: string): boolean {
  return containsScreenOps(text) || containsComponentJson(text) || containsWorkflowJson(text);
}

function buildBranchSlate(
  slate: AppSlate,
  screenId: string,
  responseText: string,
): { slate: AppSlate; description: string } | null {
  try {
    // Screen ops take priority
    if (containsScreenOps(responseText)) {
      const result = parseScreenOps(responseText);
      return {
        slate: applyScreenOps(slate, result),
        description: result.description,
      };
    }
    if (containsWorkflowJson(responseText)) {
      const result = parseWorkflowResult(responseText);
      return {
        slate: applyWorkflow(slate, screenId, result),
        description: result.description,
      };
    }
    if (containsComponentJson(responseText)) {
      const components = parseComponentArray(responseText);
      const screen = slate.screens[screenId];
      if (!screen) return null;
      return {
        slate: {
          ...slate,
          screens: {
            ...slate.screens,
            [screenId]: { ...screen, components },
          },
        },
        description: "AI generated components",
      };
    }
  } catch {}
  return null;
}

// ─── Session persistence (lifted from WorkflowsPage) ──────────

function useAgentSessions(slateId: string) {
  const [sessions, setSessions] = useState<AgentSession[]>([]);
  const loadedRef = useRef(false);
  const storageKey = `agent_sessions_${slateId}`;

  useEffect(() => {
    AsyncStorage.getItem(storageKey).then((data) => {
      if (data) {
        try {
          setSessions(JSON.parse(data));
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
        persistToStorage(next);
        return next;
      });
    },
    [persistToStorage],
  );

  return { sessions, createSession, updateSession, deleteSession };
}

// ─── Agent runner (lives in Canvas, survives menu close) ──────

interface UseAgentRunnerOptions {
  slateId: string;
  slate: AppSlate;
  screenId: string;
  apiKey: string;
  historyEntries?: HistoryEntry[];
  currentHistoryId?: string;
  onAddBranchEntry?: (branchSlate: AppSlate, description: string) => string;
  chatLog?: ChatLogEntry[];
}

export function useAgentRunner({
  slateId,
  slate,
  screenId,
  apiKey,
  historyEntries,
  currentHistoryId,
  onAddBranchEntry,
  chatLog,
}: UseAgentRunnerOptions) {
  const { sessions, createSession, updateSession, deleteSession } =
    useAgentSessions(slateId);

  const [error, setError] = useState<string | null>(null);
  const loadingSessionsRef = useRef(new Set<string>());
  const [loadingCount, setLoadingCount] = useState(0);
  const isLoading = loadingCount > 0;

  // Use refs for values accessed in async operations so they survive closures
  const slateRef = useRef(slate);
  slateRef.current = slate;
  const screenIdRef = useRef(screenId);
  screenIdRef.current = screenId;
  const apiKeyRef = useRef(apiKey);
  apiKeyRef.current = apiKey;
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

  const sendMessage = useCallback(
    async (sessionId: string, text: string, images?: string[]) => {
      if (loadingSessionsRef.current.has(sessionId)) return;
      const session = sessions.find((s) => s.id === sessionId);
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
      setLoadingCount((c) => c + 1);
      setError(null);

      try {
        const system = agentSystemPrompt(
          slateRef.current,
          screenIdRef.current,
          slateRef.current.theme,
          historyMetaRef.current,
          currentHistoryIdRef.current,
          chatLogRef.current,
        );
        const apiMessages = newMessages.map((m) => ({
          role: m.role,
          content: m.images ? buildContent(m.content, m.images) : m.content,
        }));

        // Call with auto-continuation for truncated responses
        const MAX_CONTINUATIONS = 3;
        let fullResponse = "";
        let currentMessages = apiMessages;

        for (let i = 0; i <= MAX_CONTINUATIONS; i++) {
          const result: ClaudeResult = await callClaude(
            apiKeyRef.current,
            system,
            currentMessages,
            16384,
          );
          fullResponse += result.text;

          if (result.stopReason !== "max_tokens") break;
          if (i === MAX_CONTINUATIONS) break;

          // Continue: feed partial response back as assistant, ask to continue
          currentMessages = [
            ...currentMessages,
            { role: "assistant" as const, content: result.text },
            { role: "user" as const, content: "Continue from where you left off. Output ONLY the remaining JSON, no explanation." },
          ];
        }

        const response = fullResponse;

        let branchEntryId: string | undefined;
        const actionable = hasActionableJson(response);
        if (actionable && onAddBranchEntryRef.current) {
          const branch = buildBranchSlate(slateRef.current, screenIdRef.current, response);
          if (branch) {
            branchEntryId = onAddBranchEntryRef.current(branch.slate, branch.description);
          }
        }

        const assistantMsg: ChatMessage = {
          id: uuid(),
          role: "assistant",
          content: response,
          hasComponentJson: actionable,
          branchEntryId,
          timestamp: Date.now(),
        };

        updateSession(sessionId, {
          messages: [...newMessages, assistantMsg],
          status: "idle",
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        updateSession(sessionId, { status: "idle" });
      } finally {
        loadingSessionsRef.current.delete(sessionId);
        setLoadingCount((c) => c - 1);
      }
    },
    [sessions, updateSession],
  );

  return {
    sessions,
    isLoading,
    error,
    sendMessage,
    createSession,
    updateSession,
    deleteSession,
    setError,
  };
}
