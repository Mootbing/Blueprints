import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
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

function NewAgentPage({
  width,
  onSend,
}: {
  width: number;
  onSend: (text: string) => void;
}) {
  const [text, setText] = useState("");
  const canSend = text.trim().length > 0;

  return (
    <KeyboardAvoidingView
      style={[s.newAgentPage, { width }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={100}
    >
      <View style={s.newAgentContent}>
        <Feather name="cpu" size={28} color="#333" />
        <Text style={s.newAgentTitle}>New Agent</Text>
        <Text style={s.newAgentSubtitle}>
          Start a conversation to create a new agent
        </Text>
        <View style={s.newAgentInputRow}>
          <TextInput
            style={s.newAgentInput}
            value={text}
            onChangeText={setText}
            placeholder="Ask anything..."
            placeholderTextColor="#333"
            multiline
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Pressable
            style={[s.newAgentSendBtn, !canSend && s.newAgentSendBtnDisabled]}
            onPress={() => {
              if (!canSend) return;
              onSend(text.trim());
              setText("");
            }}
            disabled={!canSend}
          >
            <Feather name="arrow-up" size={18} color={canSend ? "#000" : "#555"} />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
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

  const sessions = agentRunner?.sessions ?? [];

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

  // Clean up empty sessions (no messages) when closing
  const prevVisible = useRef(visible);
  useEffect(() => {
    if (prevVisible.current && !visible && agentRunner) {
      for (const session of sessions) {
        if (session.messages.length === 0) {
          agentRunner.deleteSession(session.id);
        }
      }
    }
    prevVisible.current = visible;
  }, [visible, agentRunner, sessions]);

  // Reset on open — scroll to initialSessionId if provided
  useEffect(() => {
    if (visible) {
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
      const target = idx > 0 ? idx - 1 : 0;
      setPageIndex(target);
      agentRunner?.deleteSession(id);
      setTimeout(() => {
        scrollRef.current?.scrollTo({ x: target * screenWidth, animated: true });
      }, 50);
    },
    [sessions, agentRunner, screenWidth],
  );

  // ─── Apply / Undo handlers ──────────────────────────────────

  const handleApplyMessage = useCallback(
    (sessionId: string, messageId: string) => {
      agentRunner?.applyMessage(sessionId, messageId);
    },
    [agentRunner],
  );

  const handleUndoMessage = useCallback(
    (sessionId: string, messageId: string) => {
      agentRunner?.undoMessage(sessionId, messageId, historyEntries, onRestoreToId);
    },
    [agentRunner, historyEntries, onRestoreToId],
  );

  // ─── Render message actions ───────────────────────────────────

  const renderMessageActions = useCallback(
    (msg: ChatMessage, sessionId?: string) => {
      const cherryPickId = extractCherryPickId(msg.content);
      const hasPending = msg.pendingSlate && !msg.applied;
      const isApplied = msg.applied === true;
      const branchId = msg.branchEntryId;
      const isPreviewing = branchId && currentHistoryId === branchId;

      if (!cherryPickId && !branchId && !hasPending && !isApplied) return null;

      return (
        <View style={s.messageActions}>
          {/* Apply button for pending (unapplied) changes */}
          {hasPending && sessionId && (
            <Pressable
              style={({ pressed }) => [s.previewBtn, pressed && s.previewBtnPressed]}
              onPress={() => handleApplyMessage(sessionId, msg.id)}
            >
              <Feather name="check-circle" size={14} color="#000" />
              <Text style={s.previewBtnText}>Apply</Text>
            </Pressable>
          )}
          {/* Undo button for applied changes */}
          {isApplied && sessionId && (
            <Pressable
              style={({ pressed }) => [s.undoPreviewBtn, pressed && s.undoPreviewBtnPressed]}
              onPress={() => handleUndoMessage(sessionId, msg.id)}
            >
              <Feather name="rotate-ccw" size={14} color="#f59e0b" />
              <Text style={s.undoPreviewBtnText}>Undo</Text>
            </Pressable>
          )}
          {/* Preview button for applied changes (navigate to that history entry) */}
          {branchId && isApplied && !isPreviewing && (
            <Pressable
              style={({ pressed }) => [s.previewBtn, pressed && s.previewBtnPressed]}
              onPress={() => handlePreview(branchId)}
            >
              <Feather name="eye" size={14} color="#000" />
              <Text style={s.previewBtnText}>Preview</Text>
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
    [handleApplyMessage, handleUndoMessage, handlePreview, handleCherryPick, currentHistoryId],
  );

  // Auto-create first agent when opening with none
  useEffect(() => {
    if (visible && sessions.length === 0 && agentRunner) {
      agentRunner.createSession("Agent 1");
    }
  }, [visible, sessions.length, agentRunner]);

  if (!visible || sessions.length === 0) return null;

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
                  isLoading={agentRunner?.loadingSessions?.has(session.id) ?? false}
                  error={agentRunner?.errorMap?.[session.id] ?? null}
                  onSend={(text, images) => sendMessage(session.id, text, images)}
                  renderMessageActions={(msg) => renderMessageActions(msg, session.id)}
                  placeholder="Ask anything -- generate screens, add logic, modify components..."
                  initialText={initialMessage && currentSession?.id === session.id && session.messages.length === 0 ? initialMessage : undefined}
                  autoSend={!!(initialMessage && currentSession?.id === session.id && session.messages.length === 0)}
                  streamingThinking={agentRunner?.streamingThinkingMap?.[session.id] ?? null}
                />
              ) : (
                <View style={{ width: screenWidth, flex: 1 }} />
              )}
            </View>
          ))}

          {/* "+" page */}
          <NewAgentPage
            width={screenWidth}
            onSend={(text) => {
              if (!agentRunner) return;
              const num = sessions.length + 1;
              const newSession = agentRunner.createSession(`Agent ${num}`);
              // Send message to the new session after it's created
              setTimeout(() => agentRunner.sendMessage(newSession.id, text), 50);
            }}
          />
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
    marginLeft: "auto",
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


  // New agent "+" page
  newAgentPage: {
    flex: 1,
    justifyContent: "center",
  },
  newAgentContent: {
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 24,
    paddingBottom: 80,
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
    marginBottom: 8,
  },
  newAgentInputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    width: "100%",
    backgroundColor: "#0a0a0a",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1a1a1a",
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
    gap: 8,
  },
  newAgentInput: {
    flex: 1,
    color: "#ccc",
    fontSize: 15,
    maxHeight: 100,
    paddingVertical: 6,
  },
  newAgentSendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  newAgentSendBtnDisabled: {
    backgroundColor: "#1a1a1a",
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
