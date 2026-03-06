import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
} from "react-native";
import { crossAlert } from "../../utils/crossAlert";
import { Feather } from "@expo/vector-icons";
import { SwipeToDelete } from "../SwipeToDelete";
import { ChatView } from "../ai/ChatView";
import type {
  ChatMessage,
  AgentSession,
  AgentStatus,
} from "../../ai/types";
import type { HistoryEntry } from "../../hooks/useUndoHistory";

// ─── Cherry-pick detection ──────────────────────────────────────

function extractCherryPickId(text: string): string | null {
  if (typeof text !== "string") return null;
  const match = text.match(/<cherry-pick>([\s\S]*?)<\/cherry-pick>/);
  return match ? match[1].trim() : null;
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
          <SwipeToDelete key={session.id} onDelete={() => onDelete(session.id)}>
            <View>
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
          </SwipeToDelete>
        );
      })}

      {!q && (
        <Pressable style={s.addAgentBtn} onPress={onCreate}>
          <Feather name="plus" size={14} color="#888" />
          <Text style={s.addAgentBtnText}>Add New Agent</Text>
        </Pressable>
      )}
    </View>
  );
}

// ─── Main agent page ────────────────────────────────────────────

interface AgentPageProps {
  width: number;
  apiKey: string;
  historyEntries?: HistoryEntry[];
  currentHistoryId?: string;
  onRestoreToId?: (id: string) => void;
  createTrigger?: number;
  /** When set, auto-creates a new agent and sends this as the first message */
  initialPrompt?: string;
  agentRunner?: ReturnType<typeof import("../../ai/useAgentRunner").useAgentRunner>;
}

export function AgentPage({
  width,
  apiKey,
  historyEntries,
  currentHistoryId,
  onRestoreToId,
  createTrigger,
  initialPrompt,
  agentRunner,
}: AgentPageProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sessions = agentRunner?.sessions ?? [];
  const isLoading = agentRunner?.isLoading ?? false;
  const error = agentRunner?.error ?? null;

  const activeSession = activeId
    ? sessions.find((s) => s.id === activeId)
    : null;

  // ─── Send message ─────────────────────────────────────────────

  const sendMessage = useCallback(
    async (text: string) => {
      if (!activeId) return;
      agentRunner?.sendMessage(activeId, text);
    },
    [activeId, agentRunner],
  );

  // ─── Preview / Undo handlers ─────────────────────────────────

  const handlePreview = useCallback(
    (branchEntryId: string) => {
      onRestoreToId?.(branchEntryId);
    },
    [onRestoreToId],
  );

  const handleUndoPreview = useCallback(
    (branchEntryId: string) => {
      const branchEntry = historyEntries?.find((e) => e.id === branchEntryId);
      if (branchEntry?.parentId) {
        onRestoreToId?.(branchEntry.parentId);
      }
    },
    [historyEntries, onRestoreToId],
  );

  // ─── Cherry-pick handler ──────────────────────────────────────

  const handleCherryPick = useCallback(
    (entryId: string) => {
      const entry = historyEntries?.find((e) => e.id === entryId);
      if (!entry) {
        crossAlert("Not Found", `History entry "${entryId}" not found.`);
        return;
      }
      crossAlert(
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
      agentRunner?.updateSession(sessionId, { status: "accepted" });
    },
    [sessions, agentRunner],
  );

  const handleReject = useCallback(
    (sessionId: string) => {
      const session = sessions.find((s) => s.id === sessionId);
      if (!session?.branchEntryId) {
        agentRunner?.updateSession(sessionId, { status: "rejected" });
        return;
      }

      const branchEntry = historyEntries?.find(
        (e) => e.id === session.branchEntryId,
      );
      if (branchEntry?.parentId) {
        onRestoreToId?.(branchEntry.parentId);
      }
      agentRunner?.updateSession(sessionId, { status: "rejected" });
    },
    [sessions, historyEntries, onRestoreToId, agentRunner],
  );

  // ─── Create new agent ─────────────────────────────────────────

  const handleCreate = useCallback(() => {
    if (!agentRunner) return;
    const num = sessions.length + 1;
    const session = agentRunner.createSession(`Agent ${num}`);
    setActiveId(session.id);
  }, [sessions.length, agentRunner]);

  // Auto-create when triggered externally (e.g. from Workflows page)
  const lastTrigger = useRef(createTrigger);
  const lastPrompt = useRef(initialPrompt);
  useEffect(() => {
    if (createTrigger != null && createTrigger !== lastTrigger.current) {
      lastTrigger.current = createTrigger;
      handleCreate();
    }
  }, [createTrigger, handleCreate]);

  // Auto-send initial prompt when it changes (from workflow edit)
  useEffect(() => {
    if (initialPrompt && initialPrompt !== lastPrompt.current && agentRunner) {
      lastPrompt.current = initialPrompt;
      const num = sessions.length + 1;
      const session = agentRunner.createSession(`Workflow Edit ${num}`);
      setActiveId(session.id);
      // Send the prompt after session is created
      setTimeout(() => {
        agentRunner.sendMessage(session.id, initialPrompt);
      }, 100);
    }
  }, [initialPrompt, agentRunner, sessions.length]);

  // ─── Delete agent ─────────────────────────────────────────────

  const handleDelete = useCallback(
    (id: string) => {
      agentRunner?.deleteSession(id);
      if (activeId === id) setActiveId(null);
    },
    [activeId, agentRunner],
  );

  // ─── Render message actions (preview/undo + cherry-pick) ──────

  const renderMessageActions = useCallback(
    (msg: ChatMessage) => {
      const cherryPickId = extractCherryPickId(msg.content);
      const branchId = msg.branchEntryId;

      if (!cherryPickId && !branchId) return null;

      const isPreviewing = branchId && currentHistoryId === branchId;

      return (
        <View style={s.messageActions}>
          {branchId && !isPreviewing && (
            <Pressable
              style={({ pressed }) => [
                s.previewBtn,
                pressed && s.previewBtnPressed,
              ]}
              onPress={() => handlePreview(branchId)}
            >
              <Feather name="eye" size={14} color="#000" />
              <Text style={s.previewBtnText}>Preview</Text>
            </Pressable>
          )}
          {branchId && isPreviewing && (
            <Pressable
              style={({ pressed }) => [
                s.undoBtn,
                pressed && s.undoBtnPressed,
              ]}
              onPress={() => handleUndoPreview(branchId)}
            >
              <Feather name="rotate-ccw" size={14} color="#f59e0b" />
              <Text style={s.undoBtnText}>Undo</Text>
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
    [handlePreview, handleUndoPreview, handleCherryPick, currentHistoryId],
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
              crossAlert("Delete Agent", `Delete "${activeSession.name}"?`, [
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
  addAgentBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 4,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1a1a1a",
    borderStyle: "dashed",
    backgroundColor: "#0a0a0a",
  },
  addAgentBtnText: {
    color: "#888",
    fontSize: 13,
    fontWeight: "600",
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
  previewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  previewBtnPressed: {
    backgroundColor: "#ccc",
  },
  previewBtnText: {
    color: "#000",
    fontSize: 13,
    fontWeight: "600",
  },
  undoBtn: {
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
  undoBtnPressed: {
    backgroundColor: "rgba(245,158,11,0.25)",
  },
  undoBtnText: {
    color: "#f59e0b",
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
