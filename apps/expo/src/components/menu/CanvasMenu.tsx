import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Pressable,
  Text,
  ScrollView,
  StyleSheet,
  Animated,
  SafeAreaView,
  Dimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from "react-native";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import type { Screen, AppSlate, Component } from "../../types";
import type { ChatLogEntry } from "../../ai/useChatLog";
import type { useAgentRunner } from "../../ai/useAgentRunner";
import { PRESETS, ComponentsPage } from "./ComponentsPage";
import { SettingsPage } from "./SettingsPage";
import { DetailsPage } from "./ScreensPage";
import type { ScreenActions } from "../Canvas";
import { PagerScrollProvider, usePagerScroll } from "../PagerScrollContext";

const PAGE_LABELS = ["Details", "Canvas", "Agent", "Settings"] as const;
const INITIAL_PAGE = 1; // Start on Canvas

function PagerScrollRegistrar({ scrollRef }: { scrollRef: React.RefObject<ScrollView | null> }) {
  const { registerScrollView } = usePagerScroll();
  React.useEffect(() => {
    if (scrollRef.current) registerScrollView(scrollRef.current);
  }, [scrollRef, registerScrollView]);
  return null;
}

const RegisteredScrollView = React.forwardRef<ScrollView, React.ComponentProps<typeof ScrollView>>(
  (props, forwardedRef) => {
    const { registerScrollView } = usePagerScroll();
    const ref = React.useCallback(
      (node: ScrollView | null) => {
        registerScrollView(node);
        if (typeof forwardedRef === "function") forwardedRef(node);
        else if (forwardedRef) (forwardedRef as React.MutableRefObject<ScrollView | null>).current = node;
      },
      [registerScrollView, forwardedRef],
    );
    return <ScrollView ref={ref} {...props} />;
  },
);

interface CanvasMenuProps {
  visible: boolean;
  fadeAnim: Animated.Value;
  screen: Screen;
  slate: AppSlate;
  isEditMode: boolean;
  snappingEnabled: boolean;
  inspectorEnabled: boolean;
  showAdvancedCode: boolean;
  onClose: () => void;
  onAddComponent: (preset: (typeof PRESETS)[number]) => void;
  onToggleEditMode: () => void;
  onToggleSnapping: () => void;
  onToggleInspector: () => void;
  onToggleAdvancedCode: () => void;
  onCloseSlate: () => void;
  onDeleteSlate: () => void;
  slateName?: string;
  onRenameSlate?: (name: string) => void;
  onScreenUpdate: (screen: Screen) => void;
  onDeleteComponent: (id: string) => void;
  onTreeSelect: (id: string) => void;
  onSlateChange?: (updater: AppSlate | ((prev: AppSlate) => AppSlate)) => void;
  lockedIds?: Set<string>;
  onToggleLock?: (id: string) => void;
  onMoveComponent?: (componentId: string, toIndex: number, parentId: string | null) => void;
  currentScreenId: string;
  initialScreenId: string;
  screenActions?: ScreenActions;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onOpenVersionHistory?: () => void;
  // AI props
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  voiceAgentEnabled?: boolean;
  onToggleVoiceAgent?: () => void;
  onApplyComponents?: (components: import("../../types").Component[], mode: "replace" | "add") => void;
  storage?: import("../../storage/StorageProvider").StorageProvider;
  // Agent orchestration props
  historyEntries?: import("../../hooks/useUndoHistory").HistoryEntry[];
  currentHistoryId?: string;
  onRestoreToId?: (id: string) => void;
  slateId?: string;
  logInteraction?: (entry: Omit<ChatLogEntry, "id" | "timestamp">) => void;
  chatLog?: ChatLogEntry[];
  agentRunner?: ReturnType<typeof useAgentRunner>;
  onAIChatComponent?: (id: string) => void;
  onOpenAgentPager?: (sessionId?: string, initialMessage?: string) => void;
}

export function CanvasMenu({
  visible,
  fadeAnim,
  screen,
  slate,
  isEditMode,
  snappingEnabled,
  inspectorEnabled,
  showAdvancedCode,
  onClose,
  onAddComponent,
  onToggleEditMode,
  onToggleSnapping,
  onToggleInspector,
  onToggleAdvancedCode,
  onCloseSlate,
  onDeleteSlate,
  slateName,
  onRenameSlate,
  onScreenUpdate,
  onDeleteComponent,
  onTreeSelect,
  onSlateChange,
  lockedIds,
  onToggleLock,
  onMoveComponent,
  currentScreenId,
  initialScreenId,
  screenActions,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onOpenVersionHistory,
  apiKey,
  onApiKeyChange,
  voiceAgentEnabled,
  onToggleVoiceAgent,
  onApplyComponents,
  storage: storageProp,
  historyEntries,
  currentHistoryId,
  onRestoreToId,
  slateId,
  logInteraction,
  chatLog,
  agentRunner,
  onAIChatComponent,
  onOpenAgentPager,
}: CanvasMenuProps) {
  const [pageIndex, setPageIndex] = useState(INITIAL_PAGE);
  const screenWidth = Dimensions.get("window").width;
  const scrollRef = useRef<ScrollView>(null);
  const didScrollToInitial = useRef(false);

  // Reset to Canvas page every time the menu opens
  useEffect(() => {
    if (visible) {
      setPageIndex(INITIAL_PAGE);
      didScrollToInitial.current = false;
      setTimeout(() => {
        scrollRef.current?.scrollTo({ x: INITIAL_PAGE * screenWidth, animated: false });
      }, 0);
    }
  }, [visible, screenWidth]);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = e.nativeEvent.contentOffset.x;
      const idx = Math.round(offsetX / screenWidth);
      setPageIndex(idx);
    },
    [screenWidth],
  );

  const handleNavigateToAgent = useCallback(() => {
    onOpenAgentPager?.();
  }, [onOpenAgentPager]);

  const handleEditWorkflow = useCallback((_comp: Component) => {
    onOpenAgentPager?.();
  }, [onOpenAgentPager]);

  const handleNavigateToCanvas = useCallback(() => {
    scrollRef.current?.scrollTo({ x: 1 * screenWidth, animated: true });
    setPageIndex(1);
  }, [screenWidth]);

  if (!visible) return null;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.overlay, { opacity: fadeAnim }]}>
      <Pressable style={[StyleSheet.absoluteFill, styles.overlayBg]} onPress={onClose}>
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
      </Pressable>

      <SafeAreaView style={styles.sheet} pointerEvents="box-none">
        {/* Header with inline dots */}
        <View style={styles.header}>
          <Text style={styles.pageTitle}>{PAGE_LABELS[pageIndex]}</Text>
          <View style={styles.dotsRow}>
            {PAGE_LABELS.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, pageIndex === i && styles.dotActive]}
              />
            ))}
          </View>
          <Pressable style={styles.doneBtn} onPress={onClose}>
            <Text style={styles.doneLabel}>Done</Text>
          </Pressable>
        </View>

        {/* Horizontal pager */}
        <PagerScrollProvider>
        <PagerScrollRegistrar scrollRef={scrollRef} />
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          bounces={false}
          style={styles.pager}
          contentOffset={{ x: INITIAL_PAGE * screenWidth, y: 0 }}
          onLayout={() => {
            if (!didScrollToInitial.current) {
              didScrollToInitial.current = true;
              scrollRef.current?.scrollTo({ x: INITIAL_PAGE * screenWidth, animated: false });
            }
          }}
        >
          {/* Page 1: Details (Pages + Layers + Workflows) */}
          <RegisteredScrollView
            style={{ width: screenWidth }}
            showsVerticalScrollIndicator={false}
            bounces={false}
            nestedScrollEnabled
          >
            <DetailsPage
              width={screenWidth}
              screens={slate.screens}
              currentScreenId={currentScreenId}
              initialScreenId={initialScreenId}
              onSwitchScreen={screenActions?.onSwitchScreen ?? (() => {})}
              onAddScreen={screenActions?.onAddScreen ?? (() => {})}
              onDeleteScreen={screenActions?.onDeleteScreen ?? (() => {})}
              onRenameScreen={screenActions?.onRenameScreen ?? (() => {})}
              onSetInitialScreen={screenActions?.onSetInitialScreen ?? (() => {})}
              currentScreenName={screen.name}
              currentComponents={screen.components}
              onSelectComponent={onTreeSelect}
              onDeleteComponent={onDeleteComponent}
              lockedIds={lockedIds}
              onToggleLock={onToggleLock}
              onMoveComponent={onMoveComponent}
              onAIChatComponent={onAIChatComponent}
              slate={slate}
              currentScreen={screen}
              showAdvancedCode={showAdvancedCode}
              onNavigateToAgent={handleNavigateToAgent}
              onEditWorkflow={handleEditWorkflow}
              onNavigateToCanvas={handleNavigateToCanvas}
              onOpenAgentPager={onOpenAgentPager}
              onClose={onClose}
            />
          </RegisteredScrollView>

          {/* Page 2: Canvas (Add components) */}
          <RegisteredScrollView
            style={{ width: screenWidth }}
            showsVerticalScrollIndicator={false}
            bounces={false}
            nestedScrollEnabled
          >
            <ComponentsPage
              width={screenWidth}
              onAddComponent={onAddComponent}
              onUndo={onUndo}
              onRedo={onRedo}
              canUndo={canUndo}
              canRedo={canRedo}
              onOpenVersionHistory={() => {
                onClose();
                onOpenVersionHistory?.();
              }}
            />
          </RegisteredScrollView>

          {/* Page 3: Agent (list + create) */}
          <RegisteredScrollView
            style={{ width: screenWidth }}
            showsVerticalScrollIndicator={false}
            bounces={false}
            nestedScrollEnabled
          >
            <View style={[styles.agentPage, { width: screenWidth }]}>
              <Text style={styles.agentSectionHeader}>AGENTS</Text>

              {(!agentRunner || agentRunner.sessions.length === 0) && (
                <View style={styles.agentEmpty}>
                  <Feather name="cpu" size={24} color="#222" />
                  <Text style={styles.agentEmptyTitle}>No agents yet</Text>
                  <Text style={styles.agentEmptySubtitle}>
                    Create an agent to generate screens, add logic, or modify your app
                  </Text>
                </View>
              )}

              {agentRunner?.sessions.map((session) => {
                const statusColor =
                  session.status === "running" ? "#60a5fa"
                  : session.status === "awaiting_review" ? "#f59e0b"
                  : session.status === "accepted" ? "#22c55e"
                  : session.status === "rejected" ? "#ef4444"
                  : "#555";
                const statusLabel =
                  session.status === "awaiting_review" ? "Review"
                  : session.status.charAt(0).toUpperCase() + session.status.slice(1);
                return (
                  <Pressable
                    key={session.id}
                    style={({ pressed }) => [
                      styles.agentRow,
                      pressed && styles.agentRowPressed,
                    ]}
                    onPress={() => onOpenAgentPager?.(session.id)}
                  >
                    <Feather name="cpu" size={14} color="#555" style={{ marginTop: 2 }} />
                    <View style={styles.agentRowInfo}>
                      <Text style={styles.agentRowName} numberOfLines={1}>
                        {session.name}
                      </Text>
                      <View style={styles.agentRowMeta}>
                        <View style={[styles.agentStatusDot, { backgroundColor: statusColor }]} />
                        <Text style={[styles.agentRowStatus, { color: statusColor }]}>
                          {statusLabel}
                        </Text>
                        <Text style={styles.agentRowMsgCount}>
                          {session.messages.length} msgs
                        </Text>
                      </View>
                    </View>
                    <Feather name="chevron-right" size={16} color="#333" />
                  </Pressable>
                );
              })}

              <Pressable
                style={({ pressed }) => [
                  styles.agentAddBtn,
                  pressed && styles.agentAddBtnPressed,
                ]}
                onPress={() => onOpenAgentPager?.()}
              >
                <Feather name="plus" size={14} color="#888" />
                <Text style={styles.agentAddBtnText}>New Agent</Text>
              </Pressable>
            </View>
          </RegisteredScrollView>

          {/* Page 4: Settings */}
          <RegisteredScrollView
            style={{ width: screenWidth }}
            showsVerticalScrollIndicator={false}
            bounces={false}
            nestedScrollEnabled
          >
            <SettingsPage
              width={screenWidth}
              isEditMode={isEditMode}
              snappingEnabled={snappingEnabled}
              inspectorEnabled={inspectorEnabled}
              showAdvancedCode={showAdvancedCode}
              voiceAgentEnabled={voiceAgentEnabled ?? false}
              onToggleEditMode={onToggleEditMode}
              onToggleSnapping={onToggleSnapping}
              onToggleInspector={onToggleInspector}
              onToggleAdvancedCode={onToggleAdvancedCode}
              onToggleVoiceAgent={onToggleVoiceAgent ?? (() => {})}
              onCloseSlate={onCloseSlate}
              onDeleteSlate={onDeleteSlate}
              onClose={onClose}
              slate={slate}
              slateId={slateId}
              slateName={slateName}
              onRenameSlate={onRenameSlate}
              onSlateChange={onSlateChange}
              apiKey={apiKey}
              onApiKeyChange={onApiKeyChange}
              storage={storageProp}
            />
          </RegisteredScrollView>

        </ScrollView>
        </PagerScrollProvider>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    zIndex: 999,
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
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
    position: "relative",
  },
  pageTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "300",
    letterSpacing: 0.5,
  },
  doneBtn: {
    paddingHorizontal: 4,
  },
  doneLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
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
  pager: {
    flex: 1,
  },
  agentPage: {
    paddingTop: 8,
  },
  agentSectionHeader: {
    color: "#444",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 2.5,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 10,
  },
  agentEmpty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 50,
    gap: 10,
  },
  agentEmptyTitle: {
    color: "#444",
    fontSize: 14,
    fontWeight: "500",
  },
  agentEmptySubtitle: {
    color: "#333",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 30,
  },
  agentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#1a1a1a",
  },
  agentRowPressed: {
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  agentRowInfo: {
    flex: 1,
  },
  agentRowName: {
    color: "#ccc",
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  agentRowMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 3,
  },
  agentStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  agentRowStatus: {
    fontSize: 11,
    fontWeight: "600",
  },
  agentRowMsgCount: {
    color: "#444",
    fontSize: 11,
  },
  agentAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1a1a1a",
    borderStyle: "dashed",
    backgroundColor: "#0a0a0a",
  },
  agentAddBtnPressed: {
    backgroundColor: "#111",
  },
  agentAddBtnText: {
    color: "#888",
    fontSize: 13,
    fontWeight: "600",
  },
});
