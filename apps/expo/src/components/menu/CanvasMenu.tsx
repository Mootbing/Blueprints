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
import type { Screen, AppSlate } from "../../types";
import { PRESETS, ComponentsPage } from "./ComponentsPage";
import { SettingsPage } from "./SettingsPage";
import { AgentPage } from "./WorkflowsPage";
import { LayersPage, PagesPage, WorkflowsSummaryPage } from "./ScreensPage";
import type { ScreenActions } from "../Canvas";

const PAGE_LABELS = ["Pages", "Layers", "Workflows", "Edit", "Agent", "Settings"] as const;
const INITIAL_PAGE = 3; // Start on Edit

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
  onApplyComponents?: (components: import("../../types").Component[], mode: "replace" | "add") => void;
  // Agent orchestration props
  historyEntries?: import("../../hooks/useUndoHistory").HistoryEntry[];
  currentHistoryId?: string;
  onCreateBranch?: (branchSlate: AppSlate, description: string) => string;
  onRestoreToId?: (id: string) => void;
  slateId?: string;
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
  onApplyComponents,
  historyEntries,
  currentHistoryId,
  onCreateBranch,
  onRestoreToId,
  slateId,
}: CanvasMenuProps) {
  const [pageIndex, setPageIndex] = useState(INITIAL_PAGE);
  const screenWidth = Dimensions.get("window").width;
  const scrollRef = useRef<ScrollView>(null);
  const didScrollToInitial = useRef(false);

  // Reset to Edit page every time the menu opens
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
          {/* Page 1: Pages */}
          <ScrollView
            style={{ width: screenWidth }}
            showsVerticalScrollIndicator={false}
            bounces={false}
            nestedScrollEnabled
          >
            <PagesPage
              width={screenWidth}
              screens={slate.screens}
              currentScreenId={currentScreenId}
              initialScreenId={initialScreenId}
              onSwitchScreen={screenActions?.onSwitchScreen ?? (() => {})}
              onAddScreen={screenActions?.onAddScreen ?? (() => {})}
              onDeleteScreen={screenActions?.onDeleteScreen ?? (() => {})}
              onRenameScreen={screenActions?.onRenameScreen ?? (() => {})}
              onSetInitialScreen={screenActions?.onSetInitialScreen ?? (() => {})}
              onClose={onClose}
            />
          </ScrollView>

          {/* Page 2: Layers */}
          <ScrollView
            style={{ width: screenWidth }}
            showsVerticalScrollIndicator={false}
            bounces={false}
            nestedScrollEnabled
          >
            <LayersPage
              width={screenWidth}
              currentScreenName={screen.name}
              currentComponents={screen.components}
              onSelectComponent={onTreeSelect}
              onDeleteComponent={onDeleteComponent}
              lockedIds={lockedIds}
              onToggleLock={onToggleLock}
              onMoveComponent={onMoveComponent}
              onClose={onClose}
            />
          </ScrollView>

          {/* Page 3: Workflows */}
          <ScrollView
            style={{ width: screenWidth }}
            showsVerticalScrollIndicator={false}
            bounces={false}
            nestedScrollEnabled
          >
            <WorkflowsSummaryPage
              width={screenWidth}
              currentComponents={screen.components}
              slate={slate}
              currentScreen={screen}
              showAdvancedCode={showAdvancedCode}
            />
          </ScrollView>

          {/* Page 4: Edit (Add components) */}
          <ScrollView
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
          </ScrollView>

          {/* Page 5: Agent */}
          <View style={{ width: screenWidth, flex: 1 }}>
            <AgentPage
              width={screenWidth}
              slate={slate}
              screenId={screen.id}
              apiKey={apiKey}
              slateId={slateId ?? "default"}
              onSlateChange={onSlateChange}
              onApplyComponents={onApplyComponents ?? (() => {})}
              historyEntries={historyEntries}
              currentHistoryId={currentHistoryId}
              onCreateBranch={onCreateBranch}
              onRestoreToId={onRestoreToId}
            />
          </View>

          {/* Page 6: Settings */}
          <ScrollView
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
              onToggleEditMode={onToggleEditMode}
              onToggleSnapping={onToggleSnapping}
              onToggleInspector={onToggleInspector}
              onToggleAdvancedCode={onToggleAdvancedCode}
              onCloseSlate={onCloseSlate}
              onDeleteSlate={onDeleteSlate}
              onClose={onClose}
              slate={slate}
              onSlateChange={onSlateChange}
              apiKey={apiKey}
              onApiKeyChange={onApiKeyChange}
            />
          </ScrollView>

        </ScrollView>
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
});
