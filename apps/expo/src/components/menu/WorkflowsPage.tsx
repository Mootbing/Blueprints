import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ChatView } from "../ai/ChatView";
import { callClaude } from "../../ai/anthropicClient";
import { agentSystemPrompt } from "../../ai/prompts";
import { containsComponentJson, parseComponentArray } from "../../ai/parseResponse";
import {
  parseWorkflowResult,
  applyWorkflow,
  containsWorkflowJson,
} from "../../ai/buildWorkflow";
import type { AppSlate, Component } from "../../types";
import type {
  ChatMessage,
  AgentSession,
  AgentStatus,
} from "../../ai/types";
import type { HistoryEntry } from "../../hooks/useUndoHistory";
import { uuid } from "../../utils/uuid";

// ─── Cherry-pick detection ──────────────────────────────────────

function extractCherryPickId(text: string): string | null {
  const match = text.match(/<cherry-pick>([\s\S]*?)<\/cherry-pick>/);
  return match ? match[1].trim() : null;
}

function hasActionableJson(text: string): boolean {
  return containsComponentJson(text) || containsWorkflowJson(text);
}

// ─── Agent session persistence ──────────────────────────────────

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

  const persist = useCallback(
    (newSessions: AgentSession[]) => {
      setSessions(newSessions);
      if (loadedRef.current) {
        AsyncStorage.setItem(storageKey, JSON.stringify(newSessions)).catch(
          () => {},
        );
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
      persist([...sessions, session]);
      return session;
    },
    [sessions, persist],
  );

  const updateSession = useCallback(
    (id: string, updates: Partial<AgentSession>) => {
      persist(sessions.map((s) => (s.id === id ? { ...s, ...updates } : s)));
    },
    [sessions, persist],
  );

  const deleteSession = useCallback(
    (id: string) => {
      persist(sessions.filter((s) => s.id !== id));
    },
    [sessions, persist],
  );

  return { sessions, createSession, updateSession, deleteSession };
}

// ─── Status badge ───────────────────────────────────────────────

const STATUS_CONFIG: Record<
  AgentStatus,
  { label: string; color: string; bg: string }
> = {
  idle: { label: "Idle", color: "#555", bg: "#1a1a1a" },
  running: { label: "Running", color: "#60a5fa", bg: "rgba(96,165,250,0.12)" },
  awaiting_review: {
    label: "Awaiting Review",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.12)",
  },
  accepted: { label: "Accepted", color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  rejected: { label: "Rejected", color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
};

function StatusBadge({ status }: { status: AgentStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <View style={[s.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[s.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

// ─── Agent list view ────────────────────────────────────────────

function AgentListView({
  sessions,
  onSelect,
  onCreate,
  onDelete,
  onAccept,
  onReject,
}: {
  sessions: AgentSession[];
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const handleDelete = (session: AgentSession) => {
    Alert.alert("Delete Agent", `Delete "${session.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => onDelete(session.id),
      },
    ]);
  };

  const q = searchQuery.trim().toLowerCase();
  const filtered = q
    ? sessions.filter((sess) => sess.name.toLowerCase().includes(q))
    : sessions;

  return (
    <View style={s.listContainer}>
      {/* Search bar */}
      <View style={s.searchContainer}>
        <Feather name="search" size={14} color="#333" />
        <TextInput
          style={s.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search agents..."
          placeholderTextColor="#333"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
            <Feather name="x" size={14} color="#444" />
          </Pressable>
        )}
      </View>

      {/* Section header */}
      <View style={s.sectionHeaderRow}>
        <Text style={s.sectionHeader}>AGENT ORCHESTRATOR</Text>
        <Pressable onPress={onCreate} hitSlop={8}>
          <Feather name="plus" size={14} color="#444" />
        </Pressable>
      </View>

      {sessions.length === 0 && (
        <View style={s.emptyState}>
          <Feather name="cpu" size={24} color="#222" />
          <Text style={s.emptyTitle}>No agents yet</Text>
          <Text style={s.emptySubtitle}>
            Create an agent to generate screens, add logic, or modify your app
          </Text>
        </View>
      )}

      {filtered.length === 0 && sessions.length > 0 && (
        <View style={s.emptyState}>
          <Text style={s.emptyTitle}>No results for "{searchQuery}"</Text>
        </View>
      )}

      {filtered.map((session) => {
        const cfg = STATUS_CONFIG[session.status];
        return (
          <View key={session.id}>
            <View style={s.agentRow}>
              <Pressable
                style={s.agentRowTap}
                onPress={() => onSelect(session.id)}
              >
                <Feather name="cpu" size={14} color="#555" style={{ marginTop: 2 }} />
                <View style={s.agentInfo}>
                  <Text style={s.agentTitle} numberOfLines={1}>
                    {session.name}
                  </Text>
                  <View style={s.agentBadgeRow}>
                    <View style={[s.agentBadge, { backgroundColor: cfg.bg, borderColor: cfg.color + "30" }]}>
                      <Text style={[s.agentBadgeText, { color: cfg.color }]}>
                        {cfg.label}
                      </Text>
                    </View>
                    <View style={s.agentBadge}>
                      <Text style={s.agentBadgeText}>
                        {session.messages.length} msgs
                      </Text>
                    </View>
                  </View>
                </View>
              </Pressable>
              <Pressable
                onPress={() => handleDelete(session)}
                hitSlop={12}
                style={s.deleteBtn}
              >
                <Feather name="trash-2" size={14} color="#e54" />
              </Pressable>
              <Feather name="chevron-right" size={16} color="#333" />
            </View>

            {/* Accept/Reject for awaiting_review */}
            {session.status === "awaiting_review" && (
              <View style={s.reviewActions}>
                <Pressable
                  style={({ pressed }) => [
                    s.reviewBtn,
                    s.acceptBtn,
                    pressed && s.acceptBtnPressed,
                  ]}
                  onPress={() => onAccept(session.id)}
                >
                  <Feather name="check" size={14} color="#22c55e" />
                  <Text style={[s.reviewBtnText, { color: "#22c55e" }]}>
                    Accept
                  </Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    s.reviewBtn,
                    s.rejectBtn,
                    pressed && s.rejectBtnPressed,
                  ]}
                  onPress={() => onReject(session.id)}
                >
                  <Feather name="x" size={14} color="#ef4444" />
                  <Text style={[s.reviewBtnText, { color: "#ef4444" }]}>
                    Reject
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

// ─── Main agent page ────────────────────────────────────────────

interface AgentPageProps {
  width: number;
  slate: AppSlate;
  screenId: string;
  apiKey: string;
  slateId: string;
  onSlateChange?: (updater: AppSlate | ((prev: AppSlate) => AppSlate)) => void;
  onApplyComponents: (components: Component[], mode: "replace" | "add") => void;
  historyEntries?: HistoryEntry[];
  currentHistoryId?: string;
  onCreateBranch?: (branchSlate: AppSlate, description: string) => string;
  onRestoreToId?: (id: string) => void;
}

export function AgentPage({
  width,
  slate,
  screenId,
  apiKey,
  slateId,
  onSlateChange,
  onApplyComponents,
  historyEntries,
  currentHistoryId,
  onCreateBranch,
  onRestoreToId,
}: AgentPageProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { sessions, createSession, updateSession, deleteSession } =
    useAgentSessions(slateId);

  const activeSession = activeId
    ? sessions.find((s) => s.id === activeId)
    : null;

  // Build history metadata for agent prompt (strip slate snapshots)
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

  // ─── Send message ─────────────────────────────────────────────

  const sendMessage = useCallback(
    async (text: string) => {
      if (!activeId || isLoading) return;
      const session = sessions.find((s) => s.id === activeId);
      if (!session) return;

      const userMsg: ChatMessage = {
        id: uuid(),
        role: "user",
        content: text.trim(),
        timestamp: Date.now(),
      };

      const newMessages = [...session.messages, userMsg];
      updateSession(activeId, { messages: newMessages, status: "running" });
      setIsLoading(true);
      setError(null);

      try {
        const system = agentSystemPrompt(
          slate,
          screenId,
          slate.theme,
          historyMeta,
          currentHistoryId,
        );
        const apiMessages = newMessages.map((m) => ({
          role: m.role,
          content: m.content,
        }));
        const response = await callClaude(apiKey, system, apiMessages, 8192);

        const assistantMsg: ChatMessage = {
          id: uuid(),
          role: "assistant",
          content: response,
          hasComponentJson: hasActionableJson(response),
          timestamp: Date.now(),
        };

        updateSession(activeId, {
          messages: [...newMessages, assistantMsg],
          status: "idle",
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        updateSession(activeId, { status: "idle" });
      } finally {
        setIsLoading(false);
      }
    },
    [
      activeId,
      isLoading,
      sessions,
      updateSession,
      slate,
      screenId,
      historyMeta,
      currentHistoryId,
      apiKey,
    ],
  );

  // ─── Apply as branch ─────────────────────────────────────────

  const handleApplyAsBranch = useCallback(
    (msg: ChatMessage) => {
      if (!activeSession) return;

      try {
        // Try workflow first
        if (containsWorkflowJson(msg.content)) {
          const result = parseWorkflowResult(msg.content);
          const updated = applyWorkflow(slate, screenId, result);
          const desc = `[${activeSession.name}] ${result.description}`;

          if (onCreateBranch) {
            const entryId = onCreateBranch(updated, desc);
            updateSession(activeSession.id, {
              status: "awaiting_review",
              branchEntryId: entryId,
            });
            Alert.alert(
              "Branch Created",
              `"${activeSession.name}" changes applied. Accept or reject from the agent list.`,
            );
          } else {
            onSlateChange?.(updated);
            Alert.alert("Applied", result.description);
          }
          return;
        }

        // Try components
        if (containsComponentJson(msg.content)) {
          const components = parseComponentArray(msg.content);
          const screen = slate.screens[screenId];
          const hasExisting = (screen?.components.length ?? 0) > 1;

          const applyComponents = (mode: "replace" | "add") => {
            if (onCreateBranch) {
              const scr = slate.screens[screenId];
              if (!scr) return;
              const newComponents =
                mode === "replace"
                  ? components
                  : [...scr.components, ...components];
              const updated: AppSlate = {
                ...slate,
                screens: {
                  ...slate.screens,
                  [screenId]: { ...scr, components: newComponents },
                },
              };
              const desc = `[${activeSession.name}] Generated components`;
              const entryId = onCreateBranch(updated, desc);
              updateSession(activeSession.id, {
                status: "awaiting_review",
                branchEntryId: entryId,
              });
              Alert.alert(
                "Branch Created",
                `"${activeSession.name}" changes applied. Accept or reject from the agent list.`,
              );
            } else {
              onApplyComponents(components, mode);
            }
          };

          if (!hasExisting) {
            applyComponents("replace");
            return;
          }

          Alert.alert("Apply Components", "This screen already has components.", [
            { text: "Cancel", style: "cancel" },
            {
              text: "Replace All",
              style: "destructive",
              onPress: () => applyComponents("replace"),
            },
            {
              text: "Add to Screen",
              onPress: () => applyComponents("add"),
            },
          ]);
          return;
        }

        Alert.alert(
          "Nothing to Apply",
          "No actionable JSON found in this response.",
        );
      } catch (err) {
        Alert.alert(
          "Error",
          err instanceof Error ? err.message : "Failed to apply",
        );
      }
    },
    [
      activeSession,
      slate,
      screenId,
      onCreateBranch,
      onSlateChange,
      onApplyComponents,
      updateSession,
    ],
  );

  // ─── Cherry-pick handler ──────────────────────────────────────

  const handleCherryPick = useCallback(
    (entryId: string) => {
      const entry = historyEntries?.find((e) => e.id === entryId);
      if (!entry) {
        Alert.alert("Not Found", `History entry "${entryId}" not found.`);
        return;
      }
      Alert.alert(
        "Cherry-pick",
        `Restore to "${entry.description}"?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Restore",
            onPress: () => onRestoreToId?.(entryId),
          },
        ],
      );
    },
    [historyEntries, onRestoreToId],
  );

  // ─── Accept / Reject ─────────────────────────────────────────

  const handleAccept = useCallback(
    (sessionId: string) => {
      const session = sessions.find((s) => s.id === sessionId);
      if (!session) return;
      // Changes are already applied (HEAD is at the branch entry)
      updateSession(sessionId, { status: "accepted" });
    },
    [sessions, updateSession],
  );

  const handleReject = useCallback(
    (sessionId: string) => {
      const session = sessions.find((s) => s.id === sessionId);
      if (!session?.branchEntryId) {
        updateSession(sessionId, { status: "rejected" });
        return;
      }

      // Find the parent of the branch entry to undo
      const branchEntry = historyEntries?.find(
        (e) => e.id === session.branchEntryId,
      );
      if (branchEntry?.parentId) {
        onRestoreToId?.(branchEntry.parentId);
      }
      updateSession(sessionId, { status: "rejected" });
    },
    [sessions, historyEntries, onRestoreToId, updateSession],
  );

  // ─── Create new agent ─────────────────────────────────────────

  const handleCreate = useCallback(() => {
    const num = sessions.length + 1;
    const session = createSession(`Agent ${num}`);
    setActiveId(session.id);
  }, [sessions.length, createSession]);

  // ─── Delete agent ─────────────────────────────────────────────

  const handleDelete = useCallback(
    (id: string) => {
      deleteSession(id);
      if (activeId === id) setActiveId(null);
    },
    [activeId, deleteSession],
  );

  // ─── Render message actions (branch + cherry-pick) ────────────

  const renderMessageActions = useCallback(
    (msg: ChatMessage) => {
      const cherryPickId = extractCherryPickId(msg.content);
      const hasJson = msg.hasComponentJson;

      if (!cherryPickId && !hasJson) return null;

      return (
        <View style={s.messageActions}>
          {hasJson && (
            <Pressable
              style={({ pressed }) => [
                s.branchBtn,
                pressed && s.branchBtnPressed,
              ]}
              onPress={() => handleApplyAsBranch(msg)}
            >
              <Feather name="git-branch" size={14} color="#000" />
              <Text style={s.branchBtnText}>Branch & Apply</Text>
            </Pressable>
          )}
          {cherryPickId && (
            <Pressable
              style={({ pressed }) => [
                s.cherryPickBtn,
                pressed && s.cherryPickBtnPressed,
              ]}
              onPress={() => handleCherryPick(cherryPickId)}
            >
              <Feather name="git-commit" size={14} color="#f59e0b" />
              <Text style={s.cherryPickBtnText}>Cherry-pick</Text>
            </Pressable>
          )}
        </View>
      );
    },
    [handleApplyAsBranch, handleCherryPick],
  );

  // ─── No API key ───────────────────────────────────────────────

  if (!apiKey) {
    return (
      <View style={[s.page, { width }]}>
        <View style={s.noKeyContainer}>
          <Feather name="key" size={32} color="#222" />
          <Text style={s.noKeyTitle}>API Key Required</Text>
          <Text style={s.noKeyText}>
            Go to Settings and add your Anthropic API key.
          </Text>
        </View>
      </View>
    );
  }

  // ─── Agent chat view ──────────────────────────────────────────

  if (activeSession) {
    return (
      <View style={[s.page, { width }]}>
        {/* Chat header with back button */}
        <View style={s.chatHeader}>
          <Pressable
            onPress={() => setActiveId(null)}
            hitSlop={12}
            style={s.backBtn}
          >
            <Feather name="arrow-left" size={18} color="#fff" />
          </Pressable>
          <View style={s.chatHeaderCenter}>
            <Text style={s.chatHeaderName} numberOfLines={1}>
              {activeSession.name}
            </Text>
            <StatusBadge status={activeSession.status} />
          </View>
          <Pressable
            onPress={() => {
              Alert.alert("Delete Agent", `Delete "${activeSession.name}"?`, [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: () => handleDelete(activeId!) },
              ]);
            }}
            hitSlop={12}
            style={s.headerDeleteBtn}
          >
            <Feather name="trash-2" size={16} color="#e54" />
          </Pressable>
        </View>

        <ChatView
          messages={activeSession.messages}
          isLoading={isLoading}
          error={error}
          onSend={sendMessage}
          renderMessageActions={renderMessageActions}
          placeholder="Ask anything — generate screens, add logic, modify components..."
        />
      </View>
    );
  }

  // ─── Agent list view ──────────────────────────────────────────

  return (
    <View style={[s.page, { width }]}>
      <AgentListView
        sessions={sessions}
        onSelect={setActiveId}
        onCreate={handleCreate}
        onDelete={handleDelete}
        onAccept={handleAccept}
        onReject={handleReject}
      />
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    flex: 1,
  },
  noKeyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingVertical: 80,
    gap: 12,
  },
  noKeyTitle: {
    color: "#ccc",
    fontSize: 18,
    fontWeight: "300",
    letterSpacing: 0.5,
  },
  noKeyText: {
    color: "#444",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },

  // ─── Agent list ─────────────────────────────────────────────
  listContainer: {
    flex: 1,
    paddingTop: 8,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "#0a0a0a",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1a1a1a",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: "#ccc",
    fontSize: 14,
    padding: 0,
  },
  sectionHeader: {
    color: "#444",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 2.5,
    flex: 1,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 10,
  },
  emptyTitle: {
    color: "#444",
    fontSize: 14,
    fontWeight: "500",
  },
  emptySubtitle: {
    color: "#333",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 30,
  },
  agentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#1a1a1a",
  },
  agentRowTap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  agentInfo: { flex: 1 },
  agentTitle: {
    color: "#ccc",
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  agentBadgeRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
  },
  agentBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#1a1a1a",
  },
  agentBadgeText: {
    color: "#555",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  deleteBtn: {
    padding: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  // ─── Review actions ─────────────────────────────────────────
  reviewActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  reviewBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  reviewBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  acceptBtn: {
    borderColor: "rgba(34,197,94,0.3)",
    backgroundColor: "rgba(34,197,94,0.08)",
  },
  acceptBtnPressed: {
    backgroundColor: "rgba(34,197,94,0.2)",
  },
  rejectBtn: {
    borderColor: "rgba(239,68,68,0.3)",
    backgroundColor: "rgba(239,68,68,0.08)",
  },
  rejectBtnPressed: {
    backgroundColor: "rgba(239,68,68,0.2)",
  },

  // ─── Chat header ───────────────────────────────────────────
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#1a1a1a",
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  chatHeaderCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  chatHeaderName: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  headerDeleteBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },

  // ─── Message actions ──────────────────────────────────────
  messageActions: {
    flexDirection: "row",
    gap: 8,
    marginLeft: 16,
    marginTop: 4,
    marginBottom: 4,
  },
  branchBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  branchBtnPressed: {
    backgroundColor: "#ccc",
  },
  branchBtnText: {
    color: "#000",
    fontSize: 13,
    fontWeight: "600",
  },
  cherryPickBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "rgba(245,158,11,0.12)",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.3)",
  },
  cherryPickBtnPressed: {
    backgroundColor: "rgba(245,158,11,0.25)",
  },
  cherryPickBtnText: {
    color: "#f59e0b",
    fontSize: 13,
    fontWeight: "600",
  },

});
