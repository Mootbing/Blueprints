import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Pressable,
  Text,
  TextInput,
  ScrollView,
  Platform,
  StyleSheet,
  Animated,
  Keyboard,
  PanResponder,
  Vibration,
} from "react-native";
import { crossAlert } from "../utils/crossAlert";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import Svg, { Circle, Rect } from "react-native-svg";
import { useSharedValue } from "react-native-reanimated";
import type { AppSlate, Layout, Component, ComponentStyleUpdates, Screen } from "../types";
import { ComponentSchema } from "../types";
import { SDUIComponent } from "./SDUIComponent";
import { SnapGuides } from "./SnapGuides";
import { EditorToolbar, type TextEditingState, type StyleEditingState } from "./EditorToolbar";
import * as ImagePicker from "expo-image-picker";
import { useKeyboardHeight } from "../hooks/useKeyboardHeight";
import { GroupBreadcrumb } from "./GroupBreadcrumb";
import { CanvasMenu } from "./menu/CanvasMenu";
import { IconPickerModal } from "./IconPickerModal";
import { PRESETS } from "./menu/ComponentsPage";
import { BACKGROUND_ID } from "./SlateEditor";
import { findComponent, deepCloneComponent } from "../utils/componentTree";
import { ContextMenu } from "./ContextMenu";
import { SpotlightOverlay } from "./SpotlightOverlay";
import { VersionHistoryModal } from "./menu/VersionHistoryModal";
import { AIChatSheet } from "./ai/AIChatSheet";
import { AgentPagerModal } from "./ai/AgentPagerModal";
import { tidyLayout } from "../ai/tidyLayout";
import { useChatLog } from "../ai/useChatLog";
import { useAgentRunner } from "../ai/useAgentRunner";
import { CanvasStoreProvider, useCanvasStore, useCanvasStoreApi } from "../stores/CanvasStoreProvider";

import type { HistoryEntry } from "../hooks/useUndoHistory";


/* Circular progress ring for long-press feedback (SVG) */
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function LongPressRing({
  progress,
  size,
  strokeWidth,
  color,
}: {
  progress: Animated.Value;
  size: number;
  strokeWidth: number;
  color: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
    extrapolate: "clamp",
  });

  return (
    <View
      style={{
        width: size,
        height: size,
        position: "absolute",
        top: (48 - size) / 2 - 1.5,
        left: (48 - size) / 2 - 1.5,
        transform: [{ rotate: "-90deg" }],
      }}
      pointerEvents="none"
    >
      <Svg width={size} height={size}>
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
        />
      </Svg>
    </View>
  );
}

/* Draggable floating sphere – tap to switch modes, long-press to open menu */
const LONG_PRESS_DURATION = 300;

function AddSphere({
  onPress,
  isEditMode,
  onToggleEditMode,
  isPreviewOnly,
}: {
  onPress: () => void;
  isEditMode: boolean;
  onToggleEditMode: () => void;
  isPreviewOnly?: boolean;
}) {
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const moved = useRef(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);
  const onPressRef = useRef(onPress);
  const onToggleRef = useRef(onToggleEditMode);
  onPressRef.current = onPress;
  onToggleRef.current = onToggleEditMode;
  const longPressProgress = useRef(new Animated.Value(0)).current;

  const panEvent = useRef(
    Animated.event([null, { dx: pan.x, dy: pan.y }], {
      useNativeDriver: false,
    })
  ).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 3 || Math.abs(g.dy) > 3,
      onPanResponderGrant: () => {
        moved.current = false;
        didLongPress.current = false;
        pan.setOffset({ x: (pan.x as any)._value, y: (pan.y as any)._value });
        pan.setValue({ x: 0, y: 0 });
        longPressProgress.setValue(0);
        Animated.timing(longPressProgress, {
          toValue: 1,
          duration: LONG_PRESS_DURATION,
          useNativeDriver: false,
        }).start();
        if (!isPreviewOnly) {
          longPressTimer.current = setTimeout(() => {
            didLongPress.current = true;
            onToggleRef.current();
          }, LONG_PRESS_DURATION);
        }
      },
      onPanResponderMove: (_, g) => {
        if (Math.abs(g.dx) > 3 || Math.abs(g.dy) > 3) {
          moved.current = true;
          if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
            longPressProgress.stopAnimation();
            longPressProgress.setValue(0);
          }
        }
        panEvent(_, g);
      },
      onPanResponderRelease: () => {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
        longPressProgress.stopAnimation();
        longPressProgress.setValue(0);
        pan.flattenOffset();
        if (!moved.current && !didLongPress.current) {
          onPressRef.current();
        }
      },
    })
  ).current;

  return (
    <Animated.View
      style={[
        styles.devSphere,
        isPreviewOnly ? styles.devSphereLeave : isEditMode ? styles.devSphereEdit : styles.devSpherePreview,
        { transform: pan.getTranslateTransform() },
      ]}
      {...panResponder.panHandlers}
    >
      {!isPreviewOnly && (
        <LongPressRing
          progress={longPressProgress}
          size={54}
          strokeWidth={3}
          color={isEditMode ? "#007AFF" : "#5AC8FA"}
        />
      )}
      <Feather
        name={isPreviewOnly ? "log-out" : isEditMode ? "code" : "eye"}
        size={22}
        color={isPreviewOnly ? "#ff4444" : isEditMode ? "#000" : "#fff"}
      />
    </Animated.View>
  );
}

export interface ScreenActions {
  onSwitchScreen?: (id: string) => void;
  onAddScreen?: () => void;
  onDeleteScreen?: (id: string) => void;
  onRenameScreen?: (id: string, name: string) => void;
  onSetInitialScreen?: (id: string) => void;
}

interface CanvasProps {
  slate: AppSlate;
  screenId: string;
  isEditMode: boolean;
  onToggleEditMode: () => void;
  onComponentUpdate: (id: string, layout: Layout) => void;
  onContentChange?: (id: string, content: string) => void;
  onStyleChange?: (id: string, updates: ComponentStyleUpdates) => void;
  onAddComponent: (component: Component) => void;
  onCloseSlate?: () => void;
  onDeleteSlate?: () => void;
  slateName?: string;
  onRenameSlate?: (name: string) => void;
  onResetAndBuild?: () => void;
  onNavigate?: (screenId: string) => void;
  onScreenUpdate?: (screen: Screen) => void;
  onDeleteComponent?: (id: string) => void;
  onComponentReplace?: (id: string, replacement: Component) => void;
  onAddChildComponent?: (parentId: string, child: Component) => void;
  onSlateChange?: (updater: AppSlate | ((prev: AppSlate) => AppSlate), description?: string) => void;
  currentScreenId?: string;
  initialScreenId?: string;
  screenActions?: ScreenActions;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  entries?: HistoryEntry[];
  currentId?: string;
  restoreToId?: (id: string) => void;
  createBranch?: (branchSlate: AppSlate, description: string, source?: "user" | "ai") => string;
  addBranchEntry?: (branchSlate: AppSlate, description: string, source?: "user" | "ai") => string;
  startBatch?: (description: string, source?: "user" | "ai") => void;
  endBatch?: () => void;
  slateId: string;
  // Storage
  storage?: import("../storage/StorageProvider").StorageProvider;
  // Preview-only mode (viewer share link)
  isPreviewOnly?: boolean;
  // Current user ID for "You" badge in history
  currentUserId?: string;
  // Whether this is a newly created slate (show onboarding)
  isNew?: boolean;
}

export function Canvas(props: CanvasProps) {
  return (
    <CanvasStoreProvider>
      <CanvasInner {...props} />
    </CanvasStoreProvider>
  );
}

function CanvasInner({
  slate,
  screenId,
  isEditMode,
  onToggleEditMode,
  onComponentUpdate,
  onContentChange,
  onStyleChange,
  onAddComponent,
  onCloseSlate,
  onDeleteSlate,
  slateName,
  onRenameSlate,
  onResetAndBuild,
  onNavigate,
  onScreenUpdate,
  onDeleteComponent,
  onComponentReplace,
  onAddChildComponent,
  onSlateChange,
  currentScreenId,
  initialScreenId,
  screenActions,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  entries,
  currentId,
  restoreToId,
  createBranch,
  addBranchEntry,
  startBatch,
  endBatch,
  slateId,
  storage: storageProp,
  isPreviewOnly,
  currentUserId,
  isNew,
}: CanvasProps) {
  const keyboardHeight = useKeyboardHeight();
  const store = useCanvasStoreApi();

  // Read store state via selectors
  const canvasDimensions = useCanvasStore((s) => s.canvasDimensions);
  const menuOpen = useCanvasStore((s) => s.menuOpen);
  const activeGuides = useCanvasStore((s) => s.activeGuides);
  const snappingEnabled = useCanvasStore((s) => s.snappingEnabled);
  const contextMenu = useCanvasStore((s) => s.contextMenu);
  const versionHistoryOpen = useCanvasStore((s) => s.versionHistoryOpen);
  const agentPagerOpen = useCanvasStore((s) => s.agentPagerOpen);
  const agentPagerSessionId = useCanvasStore((s) => s.agentPagerSessionId);
  const agentPagerInitialMessage = useCanvasStore((s) => s.agentPagerInitialMessage);
  const editingInfo = useCanvasStore((s) => s.editingInfo);
  const selectedComponentId = useCanvasStore((s) => s.selectedComponentId);
  const autoEditId = useCanvasStore((s) => s.autoEditId);
  const draggingId = useCanvasStore((s) => s.draggingId);
  const dragOverTrash = useCanvasStore((s) => s.dragOverTrash);
  const dropTargetId = useCanvasStore((s) => s.dropTargetId);
  const drillPath = useCanvasStore((s) => s.drillPath);
  const selectedChildId = useCanvasStore((s) => s.selectedChildId);
  const lockedIds = useCanvasStore((s) => s.lockedIds);
  const inspectorEnabled = useCanvasStore((s) => s.inspectorEnabled);
  const showAdvancedCode = useCanvasStore((s) => s.showAdvancedCode);
  const inspectorOpen = useCanvasStore((s) => s.inspectorOpen);
  const inspectorJson = useCanvasStore((s) => s.inspectorJson);
  const inspectorError = useCanvasStore((s) => s.inspectorError);
  const aiChatTarget = useCanvasStore((s) => s.aiChatTarget);
  const isTidying = useCanvasStore((s) => s.isTidying);
  const pendingAIChange = useCanvasStore((s) => s.pendingAIChange);
  const multiSelectMode = useCanvasStore((s) => s.multiSelectMode);
  const selectedComponentIds = useCanvasStore((s) => s.selectedComponentIds);

  // Store actions (stable references)
  const {
    setCanvasDimensions,
    setMenuOpen,
    setEditingInfo,
    setSelectedComponentId,
    setAutoEditId,
    setDraggingId,
    setDragOverTrash,
    setDropTargetId,
    drillInto,
    drillOut,
    drillToLevel,
    setSelectedChildId,
    toggleLock,
    setSnappingEnabled,
    setInspectorEnabled,
    setShowAdvancedCode,
    setInspectorOpen,
    setInspectorJson,
    setInspectorError,
    setContextMenu,
    setAiChatTarget,
    setIsTidying,
    setPendingAIChange,
    setAgentPagerOpen,
    setAgentPagerSessionId,
    setAgentPagerInitialMessage,
    setVersionHistoryOpen,
    setActiveGuides,
    clearGuides,
    toggleMultiSelectId,
    clearMultiSelect,
  } = store.getState();

  const clipboardRef = useRef<Component[]>([]);
  const dropTargetIdRef = useRef<string | null>(null);
  const editingInfoRef = useRef(editingInfo);
  editingInfoRef.current = editingInfo;

  // Shared value for multi-select group drag — all selected components read this offset
  const multiDragOffsetX = useSharedValue(0);
  const multiDragOffsetY = useSharedValue(0);

  // Chat log for agent context
  const { chatLog, logInteraction } = useChatLog(slateId);

  const dropPoint = { normX: 0.1, normY: 0.3 };

  const currentContainerId = drillPath.length > 0 ? drillPath[drillPath.length - 1] : null;
  const isDrilledIn = drillPath.length > 0;

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const screen = slate.screens[screenId] ?? Object.values(slate.screens)[0];

  const currentContainerComp = isDrilledIn && currentContainerId && screen
    ? findComponent(screen.components, currentContainerId)
    : undefined;

  const siblingRects = useSharedValue<number[]>([]);
  useEffect(() => {
    if (!screen || canvasDimensions.width === 0) return;
    const rects: number[] = [];
    for (const comp of screen.components) {
      rects.push(
        comp.layout.x * canvasDimensions.width,
        comp.layout.y * canvasDimensions.height,
        comp.layout.width * canvasDimensions.width,
        comp.layout.height * canvasDimensions.height
      );
    }
    siblingRects.value = rects;
  }, [screen?.components, canvasDimensions.width, canvasDimensions.height]);

  const openMenu = useCallback(() => {
    if (!isEditMode) onToggleEditMode();
    clearMultiSelect();
    setMenuOpen(true);
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, isEditMode, onToggleEditMode, setMenuOpen, clearMultiSelect]);

  const closeMenu = useCallback(() => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      setMenuOpen(false);
    });
  }, [fadeAnim, setMenuOpen]);

  // Agent runner (lives here so it survives menu close)
  const handleChangesApplied = useCallback(() => {
    setAgentPagerOpen(false);
    setAgentPagerSessionId(null);
    setAgentPagerInitialMessage(null);
    closeMenu();
    if (isEditMode) onToggleEditMode();
  }, [setAgentPagerOpen, setAgentPagerSessionId, setAgentPagerInitialMessage, closeMenu, isEditMode, onToggleEditMode]);

  const agentRunner = useAgentRunner({
    slateId,
    slate,
    screenId,
    historyEntries: entries,
    currentHistoryId: currentId,
    onAddBranchEntry: createBranch,
    chatLog,
    onChangesApplied: handleChangesApplied,
  });

  // Open agent from an OPEN_AGENT action (e.g. onboarding submit button)
  const handleOpenAgentFromAction = useCallback((prompt: string) => {
    if (!agentRunner) return;
    const session = agentRunner.createSession("Agent 1");
    setAgentPagerSessionId(session.id);
    setAgentPagerInitialMessage(prompt);
    setAgentPagerOpen(true);
  }, [agentRunner, setAgentPagerSessionId, setAgentPagerInitialMessage, setAgentPagerOpen]);

  const handleAdd = (preset: (typeof PRESETS)[number]) => {
    if (isDrilledIn && currentContainerId) {
      const comp = preset.create(0.1, 0.1);
      onAddChildComponent?.(currentContainerId, comp);
      closeMenu();
    } else {
      const comp = preset.create(dropPoint.normX, dropPoint.normY);
      onAddComponent(comp);
      setAutoEditId(comp.id);
      closeMenu();
    }
  };

  const handleMoveComponent = useCallback(
    (componentId: string, toIndex: number, parentId: string | null) => {
      onSlateChange?.((prev) => {
        const scr = prev.screens[screenId];
        if (!scr) return prev;

        function reorder(comps: Component[], pid: string | null): Component[] {
          if (pid === parentId) {
            const fromIdx = comps.findIndex((c) => c.id === componentId);
            if (fromIdx === -1 || fromIdx === toIndex) return comps;
            const result = [...comps];
            const [moved] = result.splice(fromIdx, 1);
            result.splice(toIndex, 0, moved);
            return result;
          }
          return comps.map((c) => {
            if (c.type === "container" && c.children) {
              const updated = reorder(c.children, c.id);
              if (updated !== c.children) return { ...c, children: updated };
            }
            return c;
          });
        }

        const newComponents = reorder(scr.components, null);
        if (newComponents === scr.components) return prev;
        return {
          ...prev,
          screens: {
            ...prev.screens,
            [screenId]: { ...scr, components: newComponents },
          },
        };
      }, "Reordered component");
    },
    [onSlateChange, screenId],
  );

  const handleReparentComponent = useCallback(
    (componentId: string, newParentId: string | null) => {
      onSlateChange?.((prev) => {
        const scr = prev.screens[screenId];
        if (!scr) return prev;

        let draggedComp: Component | null = null;
        let oldParentId: string | null = null;
        function removeComp(comps: Component[], parentId: string | null): Component[] {
          return comps.reduce<Component[]>((acc, c) => {
            if (c.id === componentId) {
              draggedComp = c;
              oldParentId = parentId;
              return acc;
            }
            if (c.type === "container" && c.children) {
              const newChildren = removeComp(c.children, c.id);
              if (newChildren.length !== c.children.length) {
                acc.push({ ...c, children: newChildren });
                return acc;
              }
            }
            acc.push(c);
            return acc;
          }, []);
        }

        const newComponents = removeComp(scr.components, null);
        if (!draggedComp) return prev;

        const comp = draggedComp as Component;
        let absLayout = { ...comp.layout };
        if (oldParentId) {
          const oldParent = findComponent(scr.components, oldParentId);
          if (oldParent) {
            absLayout = {
              ...absLayout,
              x: oldParent.layout.x + comp.layout.x * oldParent.layout.width,
              y: oldParent.layout.y + comp.layout.y * oldParent.layout.height,
              width: comp.layout.width * oldParent.layout.width,
              height: comp.layout.height * oldParent.layout.height,
            };
          }
        }

        let finalComp: Component;
        if (newParentId === null) {
          finalComp = { ...comp, layout: absLayout };
          return {
            ...prev,
            screens: {
              ...prev.screens,
              [screenId]: { ...scr, components: [...newComponents, finalComp] },
            },
          };
        }

        const newParent = findComponent(newComponents, newParentId);
        if (newParent) {
          const pw = newParent.layout.width || 1;
          const ph = newParent.layout.height || 1;
          finalComp = {
            ...comp,
            layout: {
              ...absLayout,
              x: Math.max(0, Math.min((absLayout.x - newParent.layout.x) / pw, 1)),
              y: Math.max(0, Math.min((absLayout.y - newParent.layout.y) / ph, 1)),
              width: Math.min(absLayout.width / pw, 1),
              height: Math.min(absLayout.height / ph, 1),
            },
          };
        } else {
          finalComp = { ...comp, layout: absLayout };
        }

        function addChild(comps: Component[]): Component[] {
          return comps.map((c) => {
            if (c.id === newParentId) {
              const cont = c as any;
              return { ...cont, children: [...(cont.children ?? []), finalComp] };
            }
            if (c.type === "container" && c.children) {
              const updated = addChild(c.children);
              if (updated !== c.children) return { ...c, children: updated };
            }
            return c;
          });
        }
        return {
          ...prev,
          screens: {
            ...prev.screens,
            [screenId]: { ...scr, components: addChild(newComponents) },
          },
        };
      }, "Reparented component");
    },
    [onSlateChange, screenId],
  );

  const openStyleEditor = useCallback((componentId: string) => {
    const comp = findComponent(screen.components, componentId);
    if (!comp) return;
    const hasBorderRadius = ["shape", "textInput", "list", "container", "image"].includes(comp.type);
    const hasBorder = ["shape", "textInput", "container"].includes(comp.type);
    const hasBackgroundColor = ["shape", "textInput", "list", "container"].includes(comp.type);
    const hasLayoutMode = comp.type === "container";
    const hasScrollable = comp.type === "container";
    const hasShadow = ["container", "shape", "button"].includes(comp.type);
    const hasGradient = ["container", "shape", "button"].includes(comp.type);
    if (!hasBorderRadius && !hasBorder && !hasBackgroundColor && !hasLayoutMode && !hasShadow && !hasGradient) return;
    const initialState: StyleEditingState = {
      borderRadius: ("borderRadius" in comp && typeof comp.borderRadius === "number") ? comp.borderRadius : 0,
      borderWidth: ("borderWidth" in comp && typeof comp.borderWidth === "number") ? comp.borderWidth : 0,
      borderColor: ("borderColor" in comp && typeof comp.borderColor === "string") ? comp.borderColor : "#000000",
      backgroundColor: ("backgroundColor" in comp && typeof comp.backgroundColor === "string") ? comp.backgroundColor : "transparent",
      hasBorderRadius,
      hasBorder,
      hasBackgroundColor,
      hasLayoutMode,
      layoutMode: (comp.type === "container" && comp.layoutMode) || "absolute",
      flexDirection: (comp.type === "container" && comp.flexDirection) || "column",
      gap: (comp.type === "container" && typeof comp.gap === "number") ? comp.gap : 0,
      justifyContent: (comp.type === "container" && comp.justifyContent) || "flex-start",
      alignItems: (comp.type === "container" && comp.alignItems) || "stretch",
      hasScrollable,
      scrollable: (comp.type === "container" && comp.scrollable) || false,
      scrollDirection: (comp.type === "container" && comp.scrollDirection) || "vertical",
      hasShadow,
      shadowEnabled: ("shadowEnabled" in comp && typeof comp.shadowEnabled === "boolean") ? comp.shadowEnabled : false,
      shadowColor: ("shadowColor" in comp && typeof comp.shadowColor === "string") ? comp.shadowColor : "#000000",
      shadowOpacity: ("shadowOpacity" in comp && typeof comp.shadowOpacity === "number") ? comp.shadowOpacity : 0.15,
      shadowRadius: ("shadowRadius" in comp && typeof comp.shadowRadius === "number") ? comp.shadowRadius : 8,
      hasGradient,
      gradientEnabled: ("gradientEnabled" in comp && typeof comp.gradientEnabled === "boolean") ? comp.gradientEnabled : false,
      gradientColors: ("gradientColors" in comp && Array.isArray(comp.gradientColors)) ? comp.gradientColors : ["#000000", "#ffffff"],
      gradientDirection: ("gradientDirection" in comp && typeof comp.gradientDirection === "string") ? comp.gradientDirection as any : "to-bottom",
    };
    setEditingInfo({
      mode: "style",
      componentId,
      state: { ...initialState },
      initialState,
      initialLayout: { ...comp.layout },
    });
  }, [screen?.components, setEditingInfo]);

  const handleTreeSelect = useCallback((componentId: string) => {
    closeMenu();
    if (!isEditMode) onToggleEditMode();
    const comp = findComponent(screen.components, componentId);
    if (!comp) return;
    if (comp.type === "icon") {
      setSelectedComponentId(componentId);
      setIconPickerTarget({
        componentId,
        name: comp.name ?? "star",
        library: comp.library ?? "material",
        size: comp.size ?? 24,
        color: comp.color ?? "#ccc",
      });
    } else if (comp.type === "text" || comp.type === "button") {
      const isButton = comp.type === "button";
      const fw = comp.fontWeight;
      const textState: TextEditingState = {
        text: isButton ? (comp.label ?? "Button") : (comp.content ?? ""),
        fontSize: comp.fontSize ?? 16,
        color: isButton ? (comp.textColor ?? "#ffffff") : (comp.color ?? "#ccc"),
        backgroundColor: isButton ? (comp.backgroundColor ?? "#1a1a1a") : "transparent",
        fontFamily: "System",
        fontWeight: (fw === "normal" || fw === "bold") ? fw : "normal",
        textAlign: "left",
        wrapMode: (!isButton && "wrapMode" in comp && comp.wrapMode) ? comp.wrapMode : "wrap-word",
        fontStyle: "normal",
        textDecorationLine: "none",
      };
      setSelectedComponentId(componentId);
      setEditingInfo({ mode: "text", componentId, state: textState });
    } else if (["shape", "textInput", "list", "container", "image"].includes(comp.type)) {
      setSelectedComponentId(componentId);
      setTimeout(() => openStyleEditor(componentId), 0);
    } else {
      setSelectedComponentId(componentId);
    }
  }, [closeMenu, isEditMode, onToggleEditMode, screen?.components, openStyleEditor, setSelectedComponentId, setEditingInfo]);

  const handleSelect = useCallback((componentId: string) => {
    if (editingInfo) return;
    if (lockedIds.has(componentId)) return;

    // Multi-select mode: tap toggles
    if (multiSelectMode) {
      toggleMultiSelectId(componentId);
      return;
    }

    const comp = findComponent(screen.components, componentId);
    if (comp?.type === "container" && selectedComponentId === componentId) {
      drillInto(componentId);
      return;
    }

    setSelectedComponentId(componentId);
    if (!comp) return;
    if (comp.type === "text" || comp.type === "button" || comp.type === "icon") return;
    if (comp.type === "container") return;
    openStyleEditor(componentId);
  }, [editingInfo, lockedIds, screen?.components, selectedComponentId, drillInto, openStyleEditor, setSelectedComponentId, multiSelectMode, toggleMultiSelectId]);

  const handleChildSelect = useCallback((childId: string) => {
    setSelectedChildId(childId);
    setSelectedComponentId(childId);
  }, [setSelectedChildId, setSelectedComponentId]);

  const handleChildStyleSelect = useCallback((componentId: string) => {
    setSelectedChildId(componentId);
    setSelectedComponentId(componentId);
    openStyleEditor(componentId);
  }, [openStyleEditor, setSelectedChildId, setSelectedComponentId]);

  // --- Resize batch handlers ---
  const handleResizeStart = useCallback(() => {
    startBatch?.("Resized component");
  }, [startBatch]);

  const handleResizeEnd = useCallback(() => {
    endBatch?.();
  }, [endBatch]);

  // --- Drag-to-trash handlers ---
  const handleDragStart = useCallback((componentId: string) => {
    if (lockedIds.has(componentId)) return;
    setDraggingId(componentId);
    startBatch?.("Moved component");
  }, [lockedIds, startBatch, setDraggingId]);

  const handleDragMove = useCallback((componentId: string, centerX: number, centerY: number) => {
    if (!screen) return;
    let hoveredContainer: string | null = null;
    for (const comp of screen.components) {
      if (comp.type !== "container" || comp.id === componentId) continue;
      if (comp.children?.some((ch) => ch.id === componentId)) continue;
      const cx = comp.layout.x * canvasDimensions.width;
      const cy = comp.layout.y * canvasDimensions.height;
      const cw = comp.layout.width * canvasDimensions.width;
      const ch = comp.layout.height * canvasDimensions.height;
      if (centerX >= cx && centerX <= cx + cw && centerY >= cy && centerY <= cy + ch) {
        hoveredContainer = comp.id;
      }
    }
    dropTargetIdRef.current = hoveredContainer;
    setDropTargetId(hoveredContainer);
  }, [screen, canvasDimensions, setDropTargetId]);

  const handleDragEnd = useCallback(() => {
    const currentDropTarget = dropTargetIdRef.current;
    if (draggingId && currentDropTarget && !dragOverTrash) {
      const targetId = currentDropTarget;
      const sourceId = draggingId;
      onSlateChange?.((prev) => {
        const scr = prev.screens[screenId];
        if (!scr) return prev;
        let draggedComp: Component | null = null;
        function removeComp(comps: Component[]): Component[] {
          const result: Component[] = [];
          for (const c of comps) {
            if (c.id === sourceId) {
              draggedComp = c;
              continue;
            }
            if (c.type === "container" && c.children) {
              const newChildren = removeComp(c.children);
              if (newChildren.length !== c.children.length) {
                result.push({ ...c, children: newChildren });
                continue;
              }
            }
            result.push(c);
          }
          return result;
        }
        const newComponents = removeComp(scr.components);
        if (!draggedComp) return prev;
        const container = findComponent(newComponents, targetId);
        if (!container || container.type !== "container") return prev;
        const contX = container.layout.x;
        const contY = container.layout.y;
        const contW = container.layout.width;
        const contH = container.layout.height;
        const relX = contW > 0 ? ((draggedComp as Component).layout.x - contX) / contW : 0;
        const relY = contH > 0 ? ((draggedComp as Component).layout.y - contY) / contH : 0;
        const relW = contW > 0 ? (draggedComp as Component).layout.width / contW : (draggedComp as Component).layout.width;
        const relH = contH > 0 ? (draggedComp as Component).layout.height / contH : (draggedComp as Component).layout.height;
        const reparented = {
          ...(draggedComp as Component),
          layout: {
            ...(draggedComp as Component).layout,
            x: Math.max(0, Math.min(relX, 1)),
            y: Math.max(0, Math.min(relY, 1)),
            width: Math.min(relW, 1),
            height: Math.min(relH, 1),
          },
        };
        function addChild(comps: Component[]): Component[] {
          return comps.map((c) => {
            if (c.id === targetId) {
              const cont = c as any;
              return { ...cont, children: [...(cont.children ?? []), reparented] };
            }
            if (c.type === "container" && c.children) {
              const updated = addChild(c.children);
              if (updated !== c.children) return { ...c, children: updated };
            }
            return c;
          });
        }
        const finalComponents = addChild(newComponents);
        return {
          ...prev,
          screens: { ...prev.screens, [screenId]: { ...scr, components: finalComponents } },
        };
      }, "Moved component into container");
    }
    setDraggingId(null);
    setDragOverTrash(false);
    setDropTargetId(null);
    dropTargetIdRef.current = null;
    endBatch?.();
  }, [endBatch, draggingId, dragOverTrash, onSlateChange, screenId, setDraggingId, setDragOverTrash, setDropTargetId]);

  const handleDragOverTrashChange = useCallback((isOver: boolean) => {
    setDragOverTrash(isOver);
  }, [setDragOverTrash]);

  // --- Context menu handlers ---
  const handleLongPress = useCallback((componentId: string, screenX: number, screenY: number) => {
    if (editingInfo) return;
    Vibration.vibrate(50);
    // Treat locked components as canvas long press (no component context)
    const isLocked = lockedIds.has(componentId);
    // Auto-enter multi-select mode and select the long-pressed component
    if (!isLocked) {
      toggleMultiSelectId(componentId);
    }
    setContextMenu({ componentId: isLocked ? null : componentId, x: screenX, y: screenY });
  }, [lockedIds, editingInfo, setContextMenu, toggleMultiSelectId]);

  const handleCopy = useCallback(() => {
    if (!screen) return;
    // In multi-select mode, copy all selected components
    if (multiSelectMode && selectedComponentIds.size > 0) {
      const comps = screen.components.filter((c) => selectedComponentIds.has(c.id));
      if (comps.length > 0) clipboardRef.current = comps;
    } else if (contextMenu?.componentId) {
      const comp = findComponent(screen.components, contextMenu.componentId);
      if (comp) clipboardRef.current = [comp];
    }
    setContextMenu(null);
  }, [contextMenu, screen, setContextMenu, multiSelectMode, selectedComponentIds]);

  const handlePaste = useCallback(() => {
    if (clipboardRef.current.length === 0 || !contextMenu) return;
    const normX = Math.min(Math.max(contextMenu.x / Math.max(canvasDimensions.width, 1), 0), 0.9);
    const normY = Math.min(Math.max(contextMenu.y / Math.max(canvasDimensions.height, 1), 0), 0.9);
    clipboardRef.current.forEach((comp, i) => {
      const cloned = deepCloneComponent(comp);
      cloned.layout = { ...cloned.layout, x: normX + i * 0.02, y: normY + i * 0.02 };
      onAddComponent(cloned);
    });
    setContextMenu(null);
  }, [onAddComponent, contextMenu, canvasDimensions, setContextMenu]);

  const handleDuplicate = useCallback(() => {
    if (!screen) return;
    // In multi-select mode, duplicate all selected components
    if (multiSelectMode && selectedComponentIds.size > 0) {
      const comps = screen.components.filter((c) => selectedComponentIds.has(c.id));
      comps.forEach((comp) => {
        const cloned = deepCloneComponent(comp);
        cloned.layout = { ...cloned.layout, x: cloned.layout.x + 0.02, y: cloned.layout.y + 0.02 };
        onAddComponent(cloned);
      });
    } else if (contextMenu?.componentId) {
      const comp = findComponent(screen.components, contextMenu.componentId);
      if (!comp) return;
      const cloned = deepCloneComponent(comp);
      cloned.layout = { ...cloned.layout, x: cloned.layout.x + 0.02, y: cloned.layout.y + 0.02 };
      onAddComponent(cloned);
    }
    setContextMenu(null);
  }, [contextMenu, screen, onAddComponent, setContextMenu, multiSelectMode, selectedComponentIds]);

  // --- AI handlers ---
  const handleTidy = useCallback(async () => {
    if (isTidying || !screen) return;
    setIsTidying(true);
    try {
      startBatch?.("AI Tidy Layout", "ai");
      const tidied = await tidyLayout(slateId, screen.components, slate.theme);
      onSlateChange?.((prev: any) => {
        const scr = prev.screens[screenId];
        if (!scr) return prev;
        return {
          ...prev,
          screens: { ...prev.screens, [screenId]: { ...scr, components: tidied } },
        };
      });
      endBatch?.();
    } catch (err) {
      endBatch?.();
      crossAlert("Tidy Error", err instanceof Error ? err.message : "Failed to tidy layout");
    } finally {
      setIsTidying(false);
    }
  }, [slateId, isTidying, screen, slate.theme, screenId, onSlateChange, startBatch, endBatch, setIsTidying]);

  const handleOpenAIChat = useCallback(() => {
    if (!contextMenu?.componentId || !screen) return;
    const comp = findComponent(screen.components, contextMenu.componentId);
    if (comp) setAiChatTarget(comp);
    setContextMenu(null);
  }, [contextMenu, screen, setAiChatTarget, setContextMenu]);


  const handleOpenAIChatFromToolbar = useCallback(() => {
    if (!screen) return;
    const compId = editingInfo?.componentId ?? selectedComponentId;
    if (!compId) return;
    const comp = findComponent(screen.components, compId);
    if (comp) {
      setEditingInfo(null);
      setAiChatTarget(comp);
    }
  }, [screen, editingInfo, selectedComponentId, setEditingInfo, setAiChatTarget]);

  const handleAIChatFromLayer = useCallback((componentId: string) => {
    if (!screen) return;
    const comp = findComponent(screen.components, componentId);
    if (comp) setAiChatTarget(comp);
  }, [screen, setAiChatTarget]);

  const handleAIChatApply = useCallback((component: Component) => {
    if (aiChatTarget) {
      setPendingAIChange({ componentId: component.id, original: aiChatTarget });
    }
    startBatch?.("AI Modified Component", "ai");
    onComponentReplace?.(component.id, component);
    endBatch?.();
    setAiChatTarget(null);
  }, [onComponentReplace, startBatch, endBatch, aiChatTarget, setPendingAIChange, setAiChatTarget]);

  const handleKeepAIChange = useCallback(() => {
    setPendingAIChange(null);
  }, [setPendingAIChange]);

  const handleDiscardAIChange = useCallback(() => {
    if (!pendingAIChange) return;
    startBatch?.("Discard AI Change");
    onComponentReplace?.(pendingAIChange.componentId, pendingAIChange.original);
    endBatch?.();
    setPendingAIChange(null);
  }, [pendingAIChange, onComponentReplace, startBatch, endBatch, setPendingAIChange]);

  const handleApplyComponents = useCallback((components: Component[], mode: "replace" | "add") => {
    startBatch?.("AI Generated Screen", "ai");
    onSlateChange?.((prev: any) => {
      const scr = prev.screens[screenId];
      if (!scr) return prev;
      const newComponents = mode === "replace" ? components : [...scr.components, ...components];
      return {
        ...prev,
        screens: { ...prev.screens, [screenId]: { ...scr, components: newComponents } },
      };
    });
    endBatch?.();
  }, [screenId, onSlateChange, startBatch, endBatch]);

  // --- Hug content handler ---
  const handleHugContent = useCallback((componentId: string, axis: "width" | "height" | "both") => {
    if (!screen) return;
    const comp = findComponent(screen.components, componentId);
    if (!comp) return;
    const cw = canvasDimensions.width;
    const ch = canvasDimensions.height;

    startBatch?.("Hug content");
    if (comp.type === "container" && comp.children?.length) {
      const children = comp.children;
      let scaleX = 1, scaleY = 1;
      if (axis !== "height") {
        const maxRight = Math.max(...children.map(c => c.layout.x + c.layout.width), 0.1);
        scaleX = Math.min(1, maxRight + 0.02);
      }
      if (axis !== "width") {
        const maxBottom = Math.max(...children.map(c => c.layout.y + c.layout.height), 0.1);
        scaleY = Math.min(1, maxBottom + 0.02);
      }
      const newComp = {
        ...comp,
        layout: {
          ...comp.layout,
          ...(axis !== "height" && { width: comp.layout.width * scaleX }),
          ...(axis !== "width" && { height: comp.layout.height * scaleY }),
        },
        children: children.map(c => ({
          ...c,
          layout: {
            ...c.layout,
            ...(axis !== "height" && { x: c.layout.x / scaleX, width: c.layout.width / scaleX }),
            ...(axis !== "width" && { y: c.layout.y / scaleY, height: c.layout.height / scaleY }),
          },
        })),
      };
      onComponentReplace?.(componentId, newComp as Component);
    } else {
      let { width: w, height: h } = comp.layout;
      if ("fontSize" in comp) {
        const fontSize = (comp as any).fontSize || 16;
        const content: string = (comp as any).content || (comp as any).label || "";
        const lines = content.split?.("\n") || [content];
        const maxLen = Math.max(...lines.map((l: string) => l.length), 1);
        if (axis !== "height") w = Math.max(0.05, (maxLen * fontSize * 0.55 + 16) / cw);
        if (axis !== "width") h = Math.max(0.03, (lines.length * fontSize * 1.4 + 8) / ch);
      } else {
        if (axis !== "height") w = Math.max(0.05, w * 0.5);
        if (axis !== "width") h = Math.max(0.05, h * 0.5);
      }
      onComponentUpdate(componentId, { ...comp.layout, width: Math.min(w, 1), height: Math.min(h, 1) });
    }
    endBatch?.();
  }, [screen, canvasDimensions, onComponentUpdate, onComponentReplace, startBatch, endBatch]);

  // --- Inline editing handlers ---
  const handleEditStart = useCallback((componentId: string, initialState: TextEditingState) => {
    if (lockedIds.has(componentId)) return;
    // Intercept icon components — open icon picker instead of text toolbar
    const comp = findComponent(screen?.components ?? [], componentId);
    if (comp?.type === "icon") {
      setSelectedComponentId(componentId);
      setIconPickerTarget({
        componentId,
        name: comp.name ?? "star",
        library: comp.library ?? "material",
        size: comp.size ?? 24,
        color: comp.color ?? "#ccc",
      });
      return;
    }
    setSelectedComponentId(componentId);
    setEditingInfo({ mode: "text", componentId, state: initialState });
  }, [lockedIds, screen?.components, setSelectedComponentId, setEditingInfo]);

  const handleEditStateChange = useCallback((updates: Partial<TextEditingState>) => {
    setEditingInfo((prev) => prev && prev.mode === "text" ? { ...prev, state: { ...prev.state, ...updates } } : prev);
  }, [setEditingInfo]);

  const handleStyleStateChange = useCallback((updates: Partial<StyleEditingState>) => {
    setEditingInfo((prev) => {
      if (!prev || prev.mode !== "style") return prev;
      return { ...prev, state: { ...prev.state, ...updates } };
    });
    const info = editingInfoRef.current;
    if (info && info.mode === "style") {
      const styleUpdates: Record<string, unknown> = {};
      if (updates.borderRadius !== undefined) styleUpdates.borderRadius = updates.borderRadius;
      if (updates.borderWidth !== undefined) styleUpdates.borderWidth = updates.borderWidth;
      if (updates.borderColor !== undefined) styleUpdates.borderColor = updates.borderColor;
      if (updates.backgroundColor !== undefined) styleUpdates.backgroundColor = updates.backgroundColor;
      if (updates.layoutMode !== undefined) styleUpdates.layoutMode = updates.layoutMode;
      if (updates.flexDirection !== undefined) styleUpdates.flexDirection = updates.flexDirection;
      if (updates.gap !== undefined) styleUpdates.gap = updates.gap;
      if (updates.justifyContent !== undefined) styleUpdates.justifyContent = updates.justifyContent;
      if (updates.alignItems !== undefined) styleUpdates.alignItems = updates.alignItems;
      if (updates.scrollable !== undefined) styleUpdates.scrollable = updates.scrollable;
      if (updates.scrollDirection !== undefined) styleUpdates.scrollDirection = updates.scrollDirection;
      if (updates.shadowEnabled !== undefined) styleUpdates.shadowEnabled = updates.shadowEnabled;
      if (updates.shadowColor !== undefined) styleUpdates.shadowColor = updates.shadowColor;
      if (updates.shadowOpacity !== undefined) styleUpdates.shadowOpacity = updates.shadowOpacity;
      if (updates.shadowRadius !== undefined) styleUpdates.shadowRadius = updates.shadowRadius;
      if (updates.gradientEnabled !== undefined) styleUpdates.gradientEnabled = updates.gradientEnabled;
      if (updates.gradientColors !== undefined) styleUpdates.gradientColors = updates.gradientColors;
      if (updates.gradientDirection !== undefined) styleUpdates.gradientDirection = updates.gradientDirection;
      if (Object.keys(styleUpdates).length > 0) {
        onStyleChange?.(info.componentId, styleUpdates);
      }
    }
  }, [onStyleChange, setEditingInfo]);

  const handleEditDone = useCallback(() => {
    if (!editingInfo || !screen) return;
    if (editingInfo.mode === "style") {
      setEditingInfo(null);
      return;
    }
    const { componentId, state } = editingInfo;
    const comp = findComponent(screen.components, componentId);
    if (comp?.type === "text") {
      onContentChange?.(componentId, state.text);
      onStyleChange?.(componentId, {
        fontSize: state.fontSize,
        color: state.color,
        backgroundColor: state.backgroundColor === "transparent" ? undefined : state.backgroundColor,
        fontFamily: state.fontFamily,
        fontWeight: state.fontWeight,
        textAlign: state.textAlign,
        wrapMode: state.wrapMode,
      });
    } else if (comp?.type === "button") {
      onStyleChange?.(componentId, {
        label: state.text,
        textColor: state.color,
        backgroundColor: state.backgroundColor === "transparent" ? "#1a1a1a" : state.backgroundColor,
        fontSize: state.fontSize,
        fontFamily: state.fontFamily,
        fontWeight: state.fontWeight,
        textAlign: state.textAlign,
      });
    }
    Keyboard.dismiss();
    setEditingInfo(null);
    setSelectedComponentId(null);
    setInspectorOpen(false);
  }, [editingInfo, screen?.components, onContentChange, onStyleChange, setEditingInfo, setSelectedComponentId, setInspectorOpen]);

  const handleEditCancel = useCallback(() => {
    const info = editingInfoRef.current;
    if (info?.mode === "style") {
      const { componentId, initialState } = info;
      const revert: Record<string, unknown> = {};
      if (initialState.hasBorderRadius) revert.borderRadius = initialState.borderRadius;
      if (initialState.hasBorder) {
        revert.borderWidth = initialState.borderWidth;
        revert.borderColor = initialState.borderColor;
      }
      if (initialState.hasBackgroundColor) revert.backgroundColor = initialState.backgroundColor;
      if (initialState.hasLayoutMode) {
        revert.layoutMode = initialState.layoutMode;
        revert.flexDirection = initialState.flexDirection;
        revert.gap = initialState.gap;
        revert.justifyContent = initialState.justifyContent;
        revert.alignItems = initialState.alignItems;
      }
      if (initialState.hasScrollable) {
        revert.scrollable = initialState.scrollable;
        revert.scrollDirection = initialState.scrollDirection;
      }
      if (initialState.hasShadow) {
        revert.shadowEnabled = initialState.shadowEnabled;
        revert.shadowColor = initialState.shadowColor;
        revert.shadowOpacity = initialState.shadowOpacity;
        revert.shadowRadius = initialState.shadowRadius;
      }
      if (initialState.hasGradient) {
        revert.gradientEnabled = initialState.gradientEnabled;
        revert.gradientColors = initialState.gradientColors;
        revert.gradientDirection = initialState.gradientDirection;
      }
      if (Object.keys(revert).length > 0) {
        onStyleChange?.(componentId, revert);
      }
      // Revert layout if it was changed by resize handles
      if (info.initialLayout) {
        const comp = findComponent(screen?.components ?? [], componentId);
        if (comp) {
          const il = info.initialLayout;
          const cl = comp.layout;
          if (cl.width !== il.width || cl.height !== il.height || cl.x !== il.x || cl.y !== il.y) {
            onComponentUpdate(componentId, il);
          }
        }
      }
    }
    Keyboard.dismiss();
    setEditingInfo(null);
    setSelectedComponentId(null);
    setInspectorOpen(false);
  }, [onStyleChange, onComponentUpdate, setEditingInfo, setSelectedComponentId, setInspectorOpen]);

  const handlePickImage = useCallback(async (componentId: string) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const src = asset.base64
        ? `data:${asset.mimeType ?? "image/jpeg"};base64,${asset.base64}`
        : asset.uri;
      onStyleChange?.(componentId, { src });
    }
  }, [onStyleChange]);

  const openInspector = useCallback(() => {
    const compId = selectedComponentId ?? editingInfo?.componentId;
    if (!compId) return;
    const comp = findComponent(screen.components, compId);
    if (!comp) return;
    setInspectorJson(JSON.stringify(comp, null, 2));
    setInspectorError(null);
    setInspectorOpen(true);
  }, [selectedComponentId, editingInfo, screen?.components, setInspectorJson, setInspectorError, setInspectorOpen]);

  const applyInspectorChanges = useCallback(() => {
    const compId = selectedComponentId ?? editingInfo?.componentId;
    if (!compId) return;
    try {
      const parsed = ComponentSchema.parse(JSON.parse(inspectorJson));
      const updated = { ...parsed, id: compId };
      onComponentReplace?.(compId, updated);
      setInspectorError(null);
      setInspectorOpen(false);
      setEditingInfo(null);
      setSelectedComponentId(null);
    } catch (e) {
      setInspectorError(e instanceof Error ? e.message : "Invalid JSON");
    }
  }, [inspectorJson, selectedComponentId, editingInfo, onComponentReplace, setInspectorError, setInspectorOpen, setEditingInfo, setSelectedComponentId]);

  // --- Multi-select alignment handlers ---
  const handleAlign = useCallback((alignment: string) => {
    if (!screen || selectedComponentIds.size < 2) return;
    const selected = screen.components.filter((c) => selectedComponentIds.has(c.id));
    if (selected.length < 2) return;
    startBatch?.("Align components");
    const layouts = selected.map((c) => ({ id: c.id, ...c.layout }));
    switch (alignment) {
      case "left": {
        const minX = Math.min(...layouts.map((l) => l.x));
        layouts.forEach((l) => onComponentUpdate(l.id, { ...l, x: minX }));
        break;
      }
      case "centerX": {
        const centers = layouts.map((l) => l.x + l.width / 2);
        const avg = centers.reduce((a, b) => a + b, 0) / centers.length;
        layouts.forEach((l) => onComponentUpdate(l.id, { ...l, x: avg - l.width / 2 }));
        break;
      }
      case "right": {
        const maxR = Math.max(...layouts.map((l) => l.x + l.width));
        layouts.forEach((l) => onComponentUpdate(l.id, { ...l, x: maxR - l.width }));
        break;
      }
      case "top": {
        const minY = Math.min(...layouts.map((l) => l.y));
        layouts.forEach((l) => onComponentUpdate(l.id, { ...l, y: minY }));
        break;
      }
      case "middleY": {
        const mids = layouts.map((l) => l.y + l.height / 2);
        const avg = mids.reduce((a, b) => a + b, 0) / mids.length;
        layouts.forEach((l) => onComponentUpdate(l.id, { ...l, y: avg - l.height / 2 }));
        break;
      }
      case "bottom": {
        const maxB = Math.max(...layouts.map((l) => l.y + l.height));
        layouts.forEach((l) => onComponentUpdate(l.id, { ...l, y: maxB - l.height }));
        break;
      }
      case "distributeH": {
        const sorted = [...layouts].sort((a, b) => a.x - b.x);
        const totalW = sorted.reduce((s, l) => s + l.width, 0);
        const span = sorted[sorted.length - 1].x + sorted[sorted.length - 1].width - sorted[0].x;
        const gap = (span - totalW) / Math.max(sorted.length - 1, 1);
        let cx = sorted[0].x;
        sorted.forEach((l) => { onComponentUpdate(l.id, { ...l, x: cx }); cx += l.width + gap; });
        break;
      }
      case "distributeV": {
        const sorted = [...layouts].sort((a, b) => a.y - b.y);
        const totalH = sorted.reduce((s, l) => s + l.height, 0);
        const span = sorted[sorted.length - 1].y + sorted[sorted.length - 1].height - sorted[0].y;
        const gap = (span - totalH) / Math.max(sorted.length - 1, 1);
        let cy = sorted[0].y;
        sorted.forEach((l) => { onComponentUpdate(l.id, { ...l, y: cy }); cy += l.height + gap; });
        break;
      }
    }
    endBatch?.();
  }, [screen, selectedComponentIds, onComponentUpdate, startBatch, endBatch]);

  // --- Multi-select group drag ---
  const multiDragRef = useRef<Map<string, Layout>>(new Map());

  const handleMultiDragUpdate = useCallback((id: string, newLayout: Layout) => {
    if (!multiSelectMode || selectedComponentIds.size < 2 || !screen) {
      onComponentUpdate(id, newLayout);
      return;
    }
    const origLayout = multiDragRef.current.get(id);
    if (!origLayout) { onComponentUpdate(id, newLayout); return; }
    const dx = newLayout.x - origLayout.x;
    const dy = newLayout.y - origLayout.y;
    selectedComponentIds.forEach((compId) => {
      const orig = multiDragRef.current.get(compId);
      if (!orig) return;
      onComponentUpdate(compId, compId === id ? newLayout : { ...orig, x: orig.x + dx, y: orig.y + dy });
    });
  }, [multiSelectMode, selectedComponentIds, screen, onComponentUpdate]);

  const handleMultiDragStart = useCallback((componentId: string) => {
    if (multiSelectMode && selectedComponentIds.size >= 2 && screen) {
      multiDragRef.current.clear();
      screen.components.forEach((c) => {
        if (selectedComponentIds.has(c.id)) multiDragRef.current.set(c.id, { ...c.layout });
      });
    }
    handleDragStart(componentId);
  }, [multiSelectMode, selectedComponentIds, screen, handleDragStart]);

  const handleMultiDragEnd = useCallback(() => {
    multiDragOffsetX.value = 0;
    multiDragOffsetY.value = 0;
    multiDragRef.current.clear();
    handleDragEnd();
  }, [handleDragEnd, multiDragOffsetX, multiDragOffsetY]);

  // --- Icon picker ---
  const [iconPickerTarget, setIconPickerTarget] = useState<{ componentId: string; name: string; library: "material" | "feather" | "ionicons"; size: number; color: string } | null>(null);

  // --- Lasso selection ---
  const [lassoRect, setLassoRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const lassoOrigin = useRef<{ x: number; y: number } | null>(null);

  const lassoPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4,
      onPanResponderGrant: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        lassoOrigin.current = { x: locationX, y: locationY };
        setLassoRect({ x: locationX, y: locationY, w: 0, h: 0 });
      },
      onPanResponderMove: (_, g) => {
        if (!lassoOrigin.current) return;
        const ox = lassoOrigin.current.x;
        const oy = lassoOrigin.current.y;
        const cx = ox + g.dx;
        const cy = oy + g.dy;
        setLassoRect({
          x: Math.min(ox, cx),
          y: Math.min(oy, cy),
          w: Math.abs(g.dx),
          h: Math.abs(g.dy),
        });
      },
      onPanResponderRelease: () => {
        lassoOrigin.current = null;
        setLassoRect(null);
      },
      onPanResponderTerminate: () => {
        lassoOrigin.current = null;
        setLassoRect(null);
      },
    })
  ).current;

  // Select components that intersect the lasso rect
  useEffect(() => {
    if (!lassoRect || !screen || !canvasDimensions.width) return;
    const { x: lx, y: ly, w: lw, h: lh } = lassoRect;
    if (lw < 4 && lh < 4) return;
    const cw = canvasDimensions.width;
    const ch = canvasDimensions.height;
    const next = new Set<string>();
    for (const comp of screen.components) {
      const cx = comp.layout.x * cw;
      const cy = comp.layout.y * ch;
      const cRight = cx + comp.layout.width * cw;
      const cBottom = cy + comp.layout.height * ch;
      if (cx < lx + lw && cRight > lx && cy < ly + lh && cBottom > ly) {
        next.add(comp.id);
      }
    }
    store.setState({ selectedComponentIds: next, multiSelectMode: true });
  }, [lassoRect, screen, canvasDimensions, store]);

  if (!screen) return null;

  return (
    <View
      style={{
        flex: 1,
        position: "relative",
        backgroundColor: "#000000",
      }}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setCanvasDimensions({ width, height });
      }}
    >
      {multiSelectMode ? (
        <View style={StyleSheet.absoluteFill} {...lassoPanResponder.panHandlers} />
      ) : (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => {
            if (!isEditMode) return;
            if (menuOpen) closeMenu();
            else if (isDrilledIn && !editingInfo) drillOut();
            else if (editingInfo) handleEditCancel();
          }}
          onLongPress={(e) => {
            if (!isEditMode || menuOpen) return;
            const { pageX, pageY } = e.nativeEvent;
            setContextMenu({ componentId: null, x: pageX, y: pageY });
          }}
          delayLongPress={400}
        />
      )}
      {canvasDimensions.width > 0 &&
        screen.components.map((component, index) => {
          const isTheDrilledContainer = isDrilledIn && component.id === currentContainerId;
          const isDimmed = isDrilledIn && !isTheDrilledContainer;
          return (
            <SDUIComponent
              key={component.id}
              component={component}
              canvasWidth={canvasDimensions.width}
              canvasHeight={canvasDimensions.height}
              isEditMode={isEditMode}
              autoEdit={autoEditId === component.id}
              onAutoEditConsumed={() => setAutoEditId(null)}
              onUpdate={multiSelectMode && selectedComponentIds.has(component.id) ? handleMultiDragUpdate : onComponentUpdate}
              onContentChange={onContentChange}
              onStyleChange={onStyleChange}
              onNavigate={onNavigate}
              onResetAndBuild={onResetAndBuild}
              onOpenAgent={handleOpenAgentFromAction}
              onInteract={closeMenu}
              componentIndex={index}
              siblingRects={snappingEnabled ? siblingRects : undefined}
              onGuidesChange={snappingEnabled ? setActiveGuides : undefined}
              onGuidesEnd={snappingEnabled ? clearGuides : undefined}
              editingComponentId={editingInfo?.componentId ?? null}
              editState={
                editingInfo != null && editingInfo.mode === "text"
                  ? editingInfo.state
                  : null
              }
              onEditStart={handleEditStart}
              onEditStateChange={handleEditStateChange}
              onSelect={handleSelect}
              onDragStart={handleMultiDragStart}
              onDragEnd={handleMultiDragEnd}
              onDragMove={handleDragMove}
              onDragOverTrashChange={handleDragOverTrashChange}
              isDropTarget={dropTargetId === component.id}
              onDeleteComponent={onDeleteComponent}
              onPickImage={handlePickImage}
              isDimmed={isDimmed}
              locked={lockedIds.has(component.id)}
              multiSelectMode={multiSelectMode}
              isMultiSelected={selectedComponentIds.has(component.id)}
              multiDragOffsetX={multiDragOffsetX}
              multiDragOffsetY={multiDragOffsetY}
              isSelected={selectedComponentId === component.id}
              onHugContent={handleHugContent}
              onResizeStart={handleResizeStart}
              onResizeEnd={handleResizeEnd}
              onLongPress={handleLongPress}
              isDrilledInto={isTheDrilledContainer}
              selectedChildId={isTheDrilledContainer ? selectedChildId : undefined}
              onChildSelect={isTheDrilledContainer ? handleChildSelect : undefined}
              onChildUpdate={isTheDrilledContainer ? onComponentUpdate : undefined}
              onChildEditStart={isTheDrilledContainer ? handleEditStart : undefined}
              onChildEditStateChange={isTheDrilledContainer ? handleEditStateChange : undefined}
              onDrillInto={isTheDrilledContainer ? drillInto : undefined}
              onChildStyleSelect={isTheDrilledContainer ? handleChildStyleSelect : undefined}
              onChildPickImage={isTheDrilledContainer ? handlePickImage : undefined}
            />
          );
        })}
      {isEditMode && snappingEnabled && (
        <SnapGuides
          guides={activeGuides}
          canvasWidth={canvasDimensions.width}
          canvasHeight={canvasDimensions.height}
        />
      )}

      {/* Lasso selection rectangle */}
      {lassoRect && lassoRect.w > 4 && lassoRect.h > 4 && (
        <Svg style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}>
          <Rect
            x={lassoRect.x}
            y={lassoRect.y}
            width={lassoRect.w}
            height={lassoRect.h}
            fill="rgba(59,130,246,0.1)"
            stroke="rgba(59,130,246,0.5)"
            strokeWidth={1}
            strokeDasharray="4,4"
          />
        </Svg>
      )}

      {/* Breadcrumb bar when drilled in */}
      {isDrilledIn && isEditMode && (
        <GroupBreadcrumb
          drillPath={drillPath}
          components={screen.components}
          onDrillToLevel={drillToLevel}
        />
      )}


      {/* Multi-select alignment toolbar */}
      {isEditMode && multiSelectMode && !editingInfo && (
        <View style={styles.alignToolbar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.alignToolbarContent}>
            <Pressable
              style={({ pressed }) => [styles.alignBall, styles.alignBallExit, pressed && styles.alignBallPressed]}
              onPress={() => clearMultiSelect()}
            >
              <Feather name="x" size={20} color="#ef4444" />
            </Pressable>
            {selectedComponentIds.size >= 2 && ([
              { key: "left", icon: "align-left" as const },
              { key: "centerX", icon: "align-center" as const },
              { key: "right", icon: "align-right" as const },
              { key: "top", icon: "arrow-up" as const },
              { key: "middleY", icon: "minus" as const },
              { key: "bottom", icon: "arrow-down" as const },
              { key: "distributeH", icon: "more-horizontal" as const },
              { key: "distributeV", icon: "more-vertical" as const },
            ] as const).map((btn) => (
              <Pressable
                key={btn.key}
                style={({ pressed }) => [styles.alignBall, pressed && styles.alignBallPressed]}
                onPress={() => handleAlign(btn.key)}
              >
                <Feather name={btn.icon} size={20} color="#fff" />
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Trash pill - appears at bottom when dragging */}
      {isEditMode && draggingId && (
        <View style={styles.trashPillContainer} pointerEvents="none">
          <View style={[styles.trashPill, dragOverTrash && styles.trashPillActive]}>
            <Feather name="trash-2" size={20} color={dragOverTrash ? "#ffffff" : "rgba(255,255,255,0.8)"} />
          </View>
        </View>
      )}

      {/* Component Inspector panel */}
      {inspectorOpen && (
        <>
          <Pressable
            style={[StyleSheet.absoluteFill, styles.editBackdrop]}
            onPress={() => { setInspectorOpen(false); }}
          />
          <View style={[styles.inspectorPanel, keyboardHeight > 0 && { bottom: keyboardHeight }]}>
            <View style={styles.inspectorHeader}>
              <Text style={styles.inspectorTitle}>Component Code</Text>
              <Pressable onPress={() => setInspectorOpen(false)}>
                <Feather name="x" size={20} color="rgba(255,255,255,0.6)" />
              </Pressable>
            </View>
            <TextInput
              style={styles.inspectorInput}
              value={inspectorJson}
              onChangeText={(text) => {
                setInspectorJson(text);
                setInspectorError(null);
              }}
              multiline
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              textAlignVertical="top"
              placeholderTextColor="rgba(255,255,255,0.2)"
            />
            {inspectorError && (
              <Text style={styles.inspectorError}>{inspectorError}</Text>
            )}
            <Pressable
              style={({ pressed }) => [styles.jsonApplyBtn, pressed && styles.jsonApplyBtnPressed]}
              onPress={applyInspectorChanges}
            >
              <Text style={styles.jsonApplyLabel}>Apply Changes</Text>
            </Pressable>
          </View>
        </>
      )}

      {/* Editing backdrop + toolbar */}
      {editingInfo && !inspectorOpen && !isDrilledIn && (
        <Pressable
          style={[StyleSheet.absoluteFill, styles.editBackdrop]}
          onPress={handleEditDone}
        />
      )}
      {editingInfo && !inspectorOpen && (
        <EditorToolbar
          {...(editingInfo.mode === "text"
            ? { mode: "text", textState: editingInfo.state, onTextStateChange: handleEditStateChange }
            : { mode: "style", styleState: editingInfo.state, onStyleStateChange: handleStyleStateChange }
          )}
          onUndo={handleEditCancel}
          onInspect={inspectorEnabled ? openInspector : undefined}
          onAIChat={handleOpenAIChatFromToolbar}
          theme={slate.theme}
        />
      )}

      {/* Icon picker modal */}
      <IconPickerModal
        visible={iconPickerTarget !== null}
        currentName={iconPickerTarget?.name ?? "star"}
        currentLibrary={iconPickerTarget?.library ?? "material"}
        currentSize={iconPickerTarget?.size ?? 24}
        currentColor={iconPickerTarget?.color ?? "#ccc"}
        onSelect={(updates) => {
          if (iconPickerTarget) {
            onStyleChange?.(iconPickerTarget.componentId, updates);
          }
        }}
        onClose={() => {
          setIconPickerTarget(null);
          setSelectedComponentId(null);
        }}
      />

      {/* Floating sphere – tap to open menu (edit mode only), long-press to toggle */}
      {!menuOpen && !isPreviewOnly && (
        <AddSphere
          onPress={isEditMode ? openMenu : () => {}}
          isEditMode={isEditMode}
          onToggleEditMode={() => {
            onToggleEditMode();
            Vibration.vibrate(50);
          }}
        />
      )}

      {/* Preview-only: red leave sphere */}
      {!menuOpen && isPreviewOnly && (
        <AddSphere
          onPress={() => onCloseSlate?.()}
          isEditMode={false}
          onToggleEditMode={() => {}}
          isPreviewOnly
        />
      )}

      {/* Context menu */}
      {contextMenu && isEditMode && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          hasClipboard={clipboardRef.current.length > 0}
          hasComponent={contextMenu.componentId != null}
          onCopy={handleCopy}
          onPaste={handlePaste}
          onDuplicate={handleDuplicate}
          onAIChat={handleOpenAIChat}

          onUndo={onUndo}
          onRedo={onRedo}
          canUndo={canUndo}
          canRedo={canRedo}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Version History */}
      <VersionHistoryModal
        visible={versionHistoryOpen}
        entries={entries ?? []}
        currentId={currentId ?? "__root__"}
        onRestore={(id) => {
          restoreToId?.(id);
          setVersionHistoryOpen(false);
        }}
        onClose={() => {
          setVersionHistoryOpen(false);
          openMenu();
        }}
        currentUserId={currentUserId}
      />

      {/* Agent Pager */}
      <AgentPagerModal
        visible={agentPagerOpen}
        onClose={() => {
          setAgentPagerOpen(false);
          setAgentPagerSessionId(null);
          setAgentPagerInitialMessage(null);
          openMenu();
        }}
        onPreviewDismiss={() => {
          setAgentPagerOpen(false);
          setAgentPagerSessionId(null);
          setAgentPagerInitialMessage(null);
          // Go to preview mode: close menu and exit edit mode
          closeMenu();
          if (isEditMode) onToggleEditMode();
        }}
        agentRunner={agentRunner}
        historyEntries={entries}
        currentHistoryId={currentId}
        onRestoreToId={restoreToId}
        isEditMode={isEditMode}
        onToggleEditMode={onToggleEditMode}
        initialSessionId={agentPagerSessionId}
        initialMessage={agentPagerInitialMessage}
      />

      {/* Tidy loading overlay */}
      {isTidying && (
        <View style={styles.tidyOverlay} pointerEvents="none">
          <View style={styles.tidyPill}>
            <Text style={styles.tidyText}>Tidying...</Text>
          </View>
        </View>
      )}

      {/* AI spotlight + Keep/Discard buttons */}
      {pendingAIChange && !aiChatTarget && screen && (() => {
        const comp = findComponent(screen.components, pendingAIChange.componentId);
        if (!comp) return null;
        const cw = canvasDimensions.width;
        const ch = canvasDimensions.height;
        const compX = comp.layout.x * cw;
        const compY = comp.layout.y * ch;
        const compW = comp.layout.width * cw;
        const compH = comp.layout.height * ch;
        const pxBottom = compY + compH;
        const pxCenterX = compX + compW / 2;
        const btnTop = Math.min(pxBottom + 10, ch - 44);
        const pad = 6;
        return (
          <>
            <SpotlightOverlay
              rect={{ x: compX, y: compY, width: compW, height: compH }}
              padding={pad}
              style={{ zIndex: 899 }}
            />
            <View
              style={[
                styles.aiConfirmRow,
                { top: btnTop, left: pxCenterX, transform: [{ translateX: -72 }] },
              ]}
            >
              <Pressable
                style={({ pressed }) => [styles.aiConfirmBtn, styles.aiDiscardBtn, pressed && styles.aiDiscardBtnPressed]}
                onPress={handleDiscardAIChange}
              >
                <Feather name="x" size={14} color="#fff" />
                <Text style={styles.aiConfirmText}>Discard</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.aiConfirmBtn, styles.aiKeepBtn, pressed && styles.aiKeepBtnPressed]}
                onPress={handleKeepAIChange}
              >
                <Feather name="check" size={14} color="#fff" />
                <Text style={styles.aiConfirmText}>Keep</Text>
              </Pressable>
            </View>
          </>
        );
      })()}

      {/* AI Component Chat */}
      {aiChatTarget && (
        <AIChatSheet
          visible={true}
          component={aiChatTarget}
          slateId={slateId}
          theme={slate.theme}
          componentRect={
            canvasDimensions.width > 0
              ? {
                  x: aiChatTarget.layout.x * canvasDimensions.width,
                  y: aiChatTarget.layout.y * canvasDimensions.height,
                  width: aiChatTarget.layout.width * canvasDimensions.width,
                  height: aiChatTarget.layout.height * canvasDimensions.height,
                }
              : undefined
          }
          onApply={handleAIChatApply}
          onClose={() => setAiChatTarget(null)}
          logInteraction={logInteraction}
          screenId={screenId}
        />
      )}

      {/* Swipeable menu */}
      <CanvasMenu
        visible={menuOpen}
        fadeAnim={fadeAnim}
        screen={screen}
        slate={slate}
        isEditMode={isEditMode}
        snappingEnabled={snappingEnabled}
        inspectorEnabled={inspectorEnabled}
        showAdvancedCode={showAdvancedCode}
        onClose={closeMenu}
        onAddComponent={handleAdd}
        onToggleEditMode={onToggleEditMode}
        onToggleSnapping={() => setSnappingEnabled(!snappingEnabled)}
        onToggleInspector={() => setInspectorEnabled(!inspectorEnabled)}
        onToggleAdvancedCode={() => setShowAdvancedCode(!showAdvancedCode)}
        onCloseSlate={() => onCloseSlate?.()}
        onDeleteSlate={() => onDeleteSlate?.()}
        slateName={slateName}
        onRenameSlate={onRenameSlate}
        onScreenUpdate={(s) => onScreenUpdate?.(s)}
        onDeleteComponent={(id) => onDeleteComponent?.(id)}
        onTreeSelect={handleTreeSelect}
        onSlateChange={onSlateChange}
        lockedIds={lockedIds}
        onToggleLock={toggleLock}
        onMoveComponent={handleMoveComponent}
        onReparentComponent={handleReparentComponent}
        currentScreenId={currentScreenId ?? screenId}
        initialScreenId={initialScreenId ?? slate.initial_screen_id}
        screenActions={screenActions}
        onUndo={onUndo}
        onRedo={onRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        onOpenVersionHistory={() => setVersionHistoryOpen(true)}
        storage={storageProp}
        onApplyComponents={handleApplyComponents}
        historyEntries={entries}
        currentHistoryId={currentId}
        onRestoreToId={restoreToId}
        slateId={slateId}
        logInteraction={logInteraction}
        chatLog={chatLog}
        agentRunner={agentRunner}
        onAIChatComponent={handleAIChatFromLayer}
        onOpenAgentPager={(sessionId, initialMessage) => {
          let resolvedId = sessionId ?? null;
          if (sessionId === "__new__" && agentRunner) {
            const num = agentRunner.sessions.length + 1;
            const newSession = agentRunner.createSession(`Agent ${num}`);
            resolvedId = newSession.id;
          }
          setAgentPagerSessionId(resolvedId);
          setAgentPagerInitialMessage(initialMessage ?? null);
          closeMenu();
          setTimeout(() => setAgentPagerOpen(true), 200);
        }}
        isPreviewOnly={isPreviewOnly}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  editBackdrop: {
    backgroundColor: "rgba(0,0,0,0.6)",
    zIndex: 100,
  },
  alignToolbar: {
    position: "absolute",
    bottom: 32,
    left: 0,
    right: 0,
    zIndex: 300,
  },
  alignToolbarContent: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  alignBall: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#333",
    borderWidth: 1.5,
    borderColor: "#555",
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
      },
      android: { elevation: 8 },
      default: {},
    }),
  },
  alignBallExit: {
    backgroundColor: "#1a0000",
    borderColor: "#ef4444",
  },
  alignBallPressed: {
    opacity: 0.6,
  },
  trashPillContainer: {
    position: "absolute",
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 50,
  },
  trashPill: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#333",
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  trashPillActive: {
    backgroundColor: "#dc2626",
    borderColor: "#dc2626",
  },
  inspectorPanel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 200,
    backgroundColor: "rgba(0,0,0,0.95)",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    borderColor: "#1a1a1a",
    padding: 16,
    maxHeight: "60%",
  },
  inspectorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  inspectorTitle: {
    color: "#ccc",
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  inspectorInput: {
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#1a1a1a",
    borderRadius: 8,
    color: "#ccc",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 11,
    padding: 12,
    minHeight: 150,
    maxHeight: 300,
  },
  inspectorError: {
    color: "#dc2626",
    fontSize: 12,
    marginTop: 6,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  jsonApplyBtn: {
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center" as const,
    marginTop: 8,
  },
  jsonApplyBtnPressed: {
    backgroundColor: "#ccc",
  },
  jsonApplyLabel: {
    color: "#000",
    fontSize: 14,
    fontWeight: "700" as const,
  },
  devSphere: {
    position: "absolute",
    bottom: 32,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2147483647,
    borderWidth: 1.5,
    overflow: "visible",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
      },
      android: { elevation: 8 },
      default: {},
    }),
  },
  devSphereEdit: {
    backgroundColor: "#fff",
    borderColor: "rgba(255,255,255,0.6)",
  },
  devSpherePreview: {
    backgroundColor: "#333",
    borderColor: "#555",
  },
  devSphereLeave: {
    backgroundColor: "#1a0000",
    borderColor: "#ff4444",
  },
  tidyOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 500,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  tidyPill: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.9)",
    borderWidth: 1,
    borderColor: "#1a1a1a",
  },
  tidyText: {
    color: "#ccc",
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  aiConfirmRow: {
    position: "absolute",
    zIndex: 900,
    flexDirection: "row",
    gap: 8,
  },
  aiConfirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  aiKeepBtn: {
    backgroundColor: "rgba(34,197,94,0.2)",
    borderColor: "rgba(34,197,94,0.4)",
  },
  aiKeepBtnPressed: {
    backgroundColor: "rgba(34,197,94,0.4)",
  },
  aiDiscardBtn: {
    backgroundColor: "rgba(239,68,68,0.2)",
    borderColor: "rgba(239,68,68,0.4)",
  },
  aiDiscardBtnPressed: {
    backgroundColor: "rgba(239,68,68,0.4)",
  },
  aiConfirmText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
});
