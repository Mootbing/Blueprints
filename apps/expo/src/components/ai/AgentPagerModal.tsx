import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from "react-native";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { crossAlert } from "../../utils/crossAlert";
import { ChatView } from "./ChatView";
import type { ChatMessage, AgentStatus } from "../../ai/types";
import type { HistoryEntry } from "../../hooks/useUndoHistory";
import type { useAgentRunner } from "../../ai/useAgentRunner";

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
    label: "Review",
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

// ─── New agent page (the "+" page) ─────────────────────────────

function NewAgentPage({ width }: { width: number }) {
  return (
    <View style={[s.newAgentPage, { width }]}>
      <View style={s.newAgentContent}>
        <View style={s.newAgentIconCircle}>
          <Feather name="plus" size={32} color="#555" />
        </View>
        <Text style={s.newAgentTitle}>New Agent</Text>
        <Text style={s.newAgentSubtitle}>
          Swipe here to create a new agent conversation
        </Text>
      </View>
    </View>
  );
}

// ─── Main modal ─────────────────────────────────────────────────

interface AgentPagerModalProps {
  visible: boolean;
  onClose: () => void;
  /** Called when Preview is tapped — dismisses pane and goes straight to preview mode */
  onPreviewDismiss?: () => void;
  agentRunner?: ReturnType<typeof useAgentRunner>;
  historyEntries?: HistoryEntry[];
  currentHistoryId?: string;
  onRestoreToId?: (id: string) => void;
  isEditMode?: boolean;
  onToggleEditMode?: () => void;
  /** Open directly on a specific session */
  initialSessionId?: string | null;
  /** Pre-fill the chat input when opening */
  initialMessage?: string | null;
}

export function AgentPagerModal({
  visible,
  onClose,
  onPreviewDismiss,
  agentRunner,
  historyEntries,
  currentHistoryId,
  onRestoreToId,
  isEditMode,
  onToggleEditMode,
  initialSessionId,
  initialMessage,
}: AgentPagerModalProps) {
  const screenWidth = Dimensions.get("window").width;
  const scrollRef = useRef<ScrollView>(null);
  // pageIndex 0..N-1 = agents, N = "+" page
  const [pageIndex, setPageIndex] = useState(0);
  const createdForPageRef = useRef<number>(-1);

  const sessions = agentRunner?.sessions ?? [];
  const isLoading = agentRunner?.isLoading ?? false;
  const error = agentRunner?.error ?? null;

  const sessionIndex = pageIndex; // which agent session (0-based)
  const isOnPlusPage = pageIndex === sessions.length;

  // When sessions change (new one added), scroll to the new session
  const prevSessionCount = useRef(sessions.length);
  useEffect(() => {
    if (sessions.length > prevSessionCount.current) {
      const newIdx = sessions.length - 1; // last agent
      setTimeout(() => {
        scrollRef.current?.scrollTo({ x: newIdx * screenWidth, animated: true });
        setPageIndex(newIdx);
      }, 50);
    }
    prevSessionCount.current = sessions.length;
  }, [sessions.length, screenWidth]);

  // When landing on "+" page, auto-create a new agent
  useEffect(() => {
    if (!visible || !agentRunner) return;
    if (isOnPlusPage && sessions.length > 0 && createdForPageRef.current !== pageIndex) {
      createdForPageRef.current = pageIndex;
      const num = sessions.length + 1;
      agentRunner.createSession(`Agent ${num}`);
    }
  }, [isOnPlusPage, visible, agentRunner, sessions.length, pageIndex]);

  // Reset on open — scroll to initialSessionId if provided
  useEffect(() => {
    if (visible) {
      createdForPageRef.current = -1;
      let idx = 0; // default to first agent
      if (initialSessionId) {
        const found = sessions.findIndex((s) => s.id === initialSessionId);
        if (found >= 0) idx = found;
      }
      setPageIndex(idx);
      setTimeout(() => {
        scrollRef.current?.scrollTo({ x: idx * screenWidth, animated: false });
      }, 0);
    }
  }, [visible, screenWidth, initialSessionId]);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = e.nativeEvent.contentOffset.x;
      const idx = Math.round(offsetX / screenWidth);
      setPageIndex(idx);
    },
    [screenWidth],
  );

  // ─── Send message ─────────────────────────────────────────────

  const sendMessage = useCallback(
    async (sessionId: string, text: string, images?: string[]) => {
      agentRunner?.sendMessage(sessionId, text, images);
    },
    [agentRunner],
  );

  // ─── Preview / Undo / Cherry-pick handlers ────────────────────

  const handlePreview = useCallback(
    (branchEntryId: string) => {
      onRestoreToId?.(branchEntryId);
      if (onPreviewDismiss) {
        onPreviewDismiss();
      } else {
        onClose();
      }
    },
    [onRestoreToId, onPreviewDismiss, onClose],
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

  const handleCherryPick = useCallback(
    (entryId: string) => {
      const entry = historyEntries?.find((e) => e.id === entryId);
      if (!entry) {
        crossAlert("Not Found", `History entry "${entryId}" not found.`);
        return;
      }
      crossAlert("Cherry-pick", `Restore to "${entry.description}"?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Restore", onPress: () => onRestoreToId?.(entryId) },
      ]);
    },
    [historyEntries, onRestoreToId],
  );

  // ─── Delete agent ─────────────────────────────────────────────

  const handleDelete = useCallback(
    (id: string) => {
      const idx = sessions.findIndex((s) => s.id === id);
      // Set pageIndex synchronously BEFORE deleting so the auto-create
      // effect doesn't see isOnPlusPage=true when sessions.length shrinks.
      const target = idx > 0 ? idx - 1 : 0;
      setPageIndex(target);
      createdForPageRef.current = -1;
      agentRunner?.deleteSession(id);
      setTimeout(() => {
        scrollRef.current?.scrollTo({ x: target * screenWidth, animated: true });
      }, 50);
    },
    [sessions, agentRunner, screenWidth],
  );

  // ─── Render message actions ───────────────────────────────────

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
              style={({ pressed }) => [s.previewBtn, pressed && s.previewBtnPressed]}
              onPress={() => handlePreview(branchId)}
            >
              <Feather name="eye" size={14} color="#000" />
              <Text style={s.previewBtnText}>Preview</Text>
            </Pressable>
          )}
          {branchId && isPreviewing && (
            <Pressable
              style={({ pressed }) => [s.undoPreviewBtn, pressed && s.undoPreviewBtnPressed]}
              onPress={() => handleUndoPreview(branchId)}
            >
              <Feather name="rotate-ccw" size={14} color="#f59e0b" />
              <Text style={s.undoPreviewBtnText}>Undo</Text>
            </Pressable>
          )}
          {cherryPickId && (
            <Pressable
              style={({ pressed }) => [s.cherryBtn, pressed && s.cherryBtnPressed]}
              onPress={() => handleCherryPick(cherryPickId)}
            >
              <Feather name="git-commit" size={14} color="#f59e0b" />
              <Text style={s.cherryBtnText}>Cherry-pick</Text>
            </Pressable>
          )}
        </View>
      );
    },
    [handlePreview, handleUndoPreview, handleCherryPick, currentHistoryId],
  );

  // ─── Create first agent if none exist ─────────────────────────

  const handleCreateFirst = useCallback(() => {
    if (!agentRunner) return;
    const num = sessions.length + 1;
    agentRunner.createSession(`Agent ${num}`);
  }, [agentRunner, sessions.length]);

  if (!visible) return null;

  // No sessions yet - show empty state with create button
  if (sessions.length === 0) {
    return (
      <View style={[StyleSheet.absoluteFill, s.overlay]}>
        <Pressable style={[StyleSheet.absoluteFill, s.overlayBg]} onPress={onClose}>
          <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        </Pressable>
        <SafeAreaView style={s.sheet} pointerEvents="box-none">
          <View style={s.header}>
            <Pressable style={s.backBtn} onPress={onClose}>
              <Feather name="chevron-left" size={22} color="#fff" />
              <Text style={s.headerTitle}>Agents</Text>
            </Pressable>
          </View>
          <View style={s.emptyState}>
            <Feather name="cpu" size={32} color="#222" />
            <Text style={s.emptyTitle}>No agents yet</Text>
            <Text style={s.emptySubtitle}>
              Create an agent to generate screens, add logic, or modify your app
            </Text>
            <Pressable style={s.createFirstBtn} onPress={handleCreateFirst}>
              <Feather name="plus" size={16} color="#000" />
              <Text style={s.createFirstBtnText}>New Agent</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const currentSession = sessionIndex >= 0 && sessionIndex < sessions.length
    ? sessions[sessionIndex]
    : null;

  return (
    <View style={[StyleSheet.absoluteFill, s.overlay]}>
      <Pressable style={[StyleSheet.absoluteFill, s.overlayBg]} onPress={onClose}>
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
      </Pressable>

      <SafeAreaView style={s.sheet} pointerEvents="box-none">
        {/* Header */}
        <View style={s.header}>
          <Pressable style={s.backBtn} onPress={onClose}>
            <Feather name="chevron-left" size={22} color="#fff" />
            <Text style={s.headerTitle}>
              {currentSession ? currentSession.name : "Agents"}
            </Text>
          </Pressable>

          {/* Dots */}
          <View style={s.dotsRow}>
            {sessions.map((_, i) => (
              <View
                key={i}
                style={[s.dot, sessionIndex === i && s.dotActive]}
              />
            ))}
            <View style={[s.dotPlus, isOnPlusPage && s.dotPlusActive]}>
              <Text style={[s.dotPlusText, isOnPlusPage && s.dotPlusTextActive]}>+</Text>
            </View>
          </View>

          {/* Delete button for current agent */}
          {currentSession && (
            <Pressable
              onPress={() => {
                crossAlert("Delete Agent", `Delete "${currentSession.name}"?`, [
                  { text: "Cancel", style: "cancel" },
                  { text: "Delete", style: "destructive", onPress: () => handleDelete(currentSession.id) },
                ]);
              }}
              hitSlop={12}
              style={s.headerDeleteBtn}
            >
              <Feather name="trash-2" size={16} color="#e54" />
            </Pressable>
          )}
          {!currentSession && <View style={s.headerDeleteBtn} />}
        </View>

        {/* Status badge row */}
        {currentSession && (
          <View style={s.statusRow}>
            <StatusBadge status={currentSession.status} />
          </View>
        )}

        {/* Pager: [agent0] [agent1] ... [+ page] */}
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          bounces={false}
          style={s.pager}
          keyboardShouldPersistTaps="handled"
        >
          {sessions.map((session, i) => (
            <View key={session.id} style={{ width: screenWidth, flex: 1 }}>
              {Math.abs(sessionIndex - i) <= 1 ? (
                <ChatView
                  messages={session.messages}
                  isLoading={isLoading && currentSession?.id === session.id}
                  error={currentSession?.id === session.id ? error : null}
                  onSend={(text, images) => sendMessage(session.id, text, images)}
                  renderMessageActions={renderMessageActions}
                  placeholder="Ask anything -- generate screens, add logic, modify components..."
                  initialText={initialMessage && currentSession?.id === session.id && session.messages.length === 0 ? initialMessage : undefined}
                  streamingThinking={currentSession?.id === session.id ? agentRunner?.streamingThinking : null}
                />
              ) : (
                <View style={{ width: screenWidth, flex: 1 }} />
              )}
            </View>
          ))}

          {/* "+" page */}
          <NewAgentPage width={screenWidth} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────

const s = StyleSheet.create({
  overlay: {
    zIndex: 1000,
    justifyContent: "center",
    alignItems: "center",
  },
  overlayBg: {
    backgroundColor: "rgba(0,0,0,0.85)",
  },
  sheet: {
    flex: 1,
    width: "100%",
    backgroundColor: "transparent",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 6,
    position: "relative",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingVertical: 4,
    paddingRight: 12,
    minWidth: 100,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "300",
    letterSpacing: 0.5,
  },
  dotsRow: {
    position: "absolute",
    left: "50%",
    transform: [{ translateX: "-50%" }],
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#333",
  },
  dotActive: {
    backgroundColor: "#fff",
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  dotPlus: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#1a1a1a",
    alignItems: "center",
    justifyContent: "center",
  },
  dotPlusActive: {
    backgroundColor: "#fff",
  },
  dotPlusText: {
    color: "#555",
    fontSize: 11,
    fontWeight: "700",
    marginTop: -1,
  },
  dotPlusTextActive: {
    color: "#000",
  },
  headerDeleteBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 32,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "center",
    paddingBottom: 4,
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
  pager: {
    flex: 1,
  },

  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingBottom: 80,
  },
  emptyTitle: {
    color: "#444",
    fontSize: 16,
    fontWeight: "500",
  },
  emptySubtitle: {
    color: "#333",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 40,
  },
  createFirstBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#fff",
  },
  createFirstBtnText: {
    color: "#000",
    fontSize: 14,
    fontWeight: "600",
  },

  // New agent "+" page
  newAgentPage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  newAgentContent: {
    alignItems: "center",
    gap: 10,
    paddingBottom: 80,
  },
  newAgentIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "#1a1a1a",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  newAgentTitle: {
    color: "#444",
    fontSize: 16,
    fontWeight: "500",
  },
  newAgentSubtitle: {
    color: "#333",
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 40,
  },

  // Message actions (preview/undo/cherry-pick)
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
  undoPreviewBtn: {
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
  undoPreviewBtnPressed: {
    backgroundColor: "rgba(245,158,11,0.25)",
  },
  undoPreviewBtnText: {
    color: "#f59e0b",
    fontSize: 13,
    fontWeight: "600",
  },
  cherryBtn: {
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
  cherryBtnPressed: {
    backgroundColor: "rgba(245,158,11,0.25)",
  },
  cherryBtnText: {
    color: "#f59e0b",
    fontSize: 13,
    fontWeight: "600",
  },
});
