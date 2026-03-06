import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Pressable,
  Text,
  TextInput,
  Platform,
  StyleSheet,
  Animated,
  Keyboard,
  PanResponder,
} from "react-native";
import { crossAlert } from "../utils/crossAlert";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import Svg, { Circle } from "react-native-svg";
import { useSharedValue } from "react-native-reanimated";
import type { AppSlate, Layout, Component, ComponentStyleUpdates, Screen } from "../types";
import { ComponentSchema } from "../types";
import { SDUIComponent } from "./SDUIComponent";
import { SnapGuides } from "./SnapGuides";
import { TextEditorToolbar, type TextEditingState } from "./TextEditorModal";
import { StyleEditorToolbar, type StyleEditingState } from "./ComponentToolbar";
import * as ImagePicker from "expo-image-picker";
import { useKeyboardHeight } from "../hooks/useKeyboardHeight";
import { GroupBreadcrumb } from "./GroupBreadcrumb";
import { CanvasMenu } from "./menu/CanvasMenu";
import { PRESETS } from "./menu/ComponentsPage";
import { BACKGROUND_ID } from "./SlateEditor";
import { findComponent, deepCloneComponent } from "../utils/componentTree";
import { ContextMenu } from "./ContextMenu";
import { VersionHistoryModal } from "./menu/VersionHistoryModal";
import { AIChatSheet } from "./ai/AIChatSheet";
import { tidyLayout } from "../ai/tidyLayout";
import { useChatLog } from "../ai/useChatLog";
import { useAgentRunner } from "../ai/useAgentRunner";
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
        top: (48 - size) / 2,
        left: (48 - size) / 2,
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

/* Draggable floating action sphere – opens the edit menu */
const LONG_PRESS_DURATION = 500;

function AddSphere({
  onPress,
  isEditMode,
  onToggleEditMode,
}: {
  onPress: () => void;
  isEditMode: boolean;
  onToggleEditMode: () => void;
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
        longPressTimer.current = setTimeout(() => {
          didLongPress.current = true;
          onToggleRef.current();
        }, LONG_PRESS_DURATION);
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
        Animated.event([null, { dx: pan.x, dy: pan.y }], {
          useNativeDriver: false,
        })(_, g);
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
        isEditMode ? styles.devSphereEdit : styles.devSpherePreview,
        { transform: pan.getTranslateTransform() },
      ]}
      {...panResponder.panHandlers}
    >
      <LongPressRing
        progress={longPressProgress}
        size={54}
        strokeWidth={3}
        color={isEditMode ? "#007AFF" : "#5AC8FA"}
      />
      <Feather name={isEditMode ? "code" : "eye"} size={22} color={isEditMode ? "#000" : "#fff"} />
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
  onNavigateBack?: () => void;
  navStack?: string[];
  onScreenUpdate?: (screen: Screen) => void;
  onDeleteComponent?: (id: string) => void;
  onComponentReplace?: (id: string, replacement: Component) => void;
  onAddChildComponent?: (parentId: string, child: Component) => void;
  onSlateChange?: (updater: AppSlate | ((prev: AppSlate) => AppSlate)) => void;
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
  createBranch?: (branchSlate: AppSlate, description: string) => string;
  addBranchEntry?: (branchSlate: AppSlate, description: string) => string;
  startBatch?: (description: string) => void;
  endBatch?: () => void;
  // AI props
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  slateId: string;
}

export function Canvas({
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
  onNavigateBack,
  navStack,
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
  apiKey,
  onApiKeyChange,
  slateId,
}: CanvasProps) {
  const keyboardHeight = useKeyboardHeight();
  const [canvasDimensions, setCanvasDimensions] = useState({
    width: 0,
    height: 0,
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const dropPoint = { normX: 0.1, normY: 0.3 };
  const [activeGuides, setActiveGuides] = useState<number[]>([]);
  const [snappingEnabled, setSnappingEnabled] = useState(true);
  const snappingLoaded = useRef(false);

  // Load snapping setting
  useEffect(() => {
    AsyncStorage.getItem("settings_snapping").then((val) => {
      if (val !== null) setSnappingEnabled(val === "true");
      snappingLoaded.current = true;
    });
  }, []);

  // Persist snapping setting
  useEffect(() => {
    if (!snappingLoaded.current) return;
    AsyncStorage.setItem("settings_snapping", String(snappingEnabled));
  }, [snappingEnabled]);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ componentId: string | null; x: number; y: number } | null>(null);
  const clipboardRef = useRef<Component | null>(null);
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);

  // Chat log for agent context
  const { chatLog, logInteraction } = useChatLog(slateId);

  // Agent runner (lives here so it survives menu close)
  const agentRunner = useAgentRunner({
    slateId,
    slate,
    screenId,
    apiKey,
    historyEntries: entries,
    currentHistoryId: currentId,
    onAddBranchEntry: addBranchEntry,
    chatLog,
  });

  // AI state
  const [aiChatTarget, setAiChatTarget] = useState<Component | null>(null);
  const [isTidying, setIsTidying] = useState(false);
  const [pendingAIChange, setPendingAIChange] = useState<{
    componentId: string;
    original: Component;
  } | null>(null);
  const [showAdvancedCode, setShowAdvancedCode] = useState(false);

  // Load advanced code setting
  useEffect(() => {
    AsyncStorage.getItem("settings_advancedCode").then((val) => {
      if (val !== null) setShowAdvancedCode(val === "true");
    });
  }, []);

  const [autoEditId, setAutoEditId] = useState<string | null>(null);
  const [editingInfo, setEditingInfo] = useState<
    | { mode: "text"; componentId: string; state: TextEditingState }
    | { mode: "style"; componentId: string; state: StyleEditingState; initialState: StyleEditingState }
    | null
  >(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverTrash, setDragOverTrash] = useState(false);

  // Locked components (cannot be selected/dragged on canvas)
  const [lockedIds, setLockedIds] = useState<Set<string>>(() => new Set([BACKGROUND_ID]));
  const toggleLock = useCallback((id: string) => {
    setLockedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Component Inspector
  const [inspectorEnabled, setInspectorEnabled] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [inspectorJson, setInspectorJson] = useState("");
  const [inspectorError, setInspectorError] = useState<string | null>(null);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const inspectorLoaded = useRef(false);

  // Load inspector setting
  useEffect(() => {
    AsyncStorage.getItem("settings_inspector").then((val) => {
      if (val !== null) setInspectorEnabled(val === "true");
      inspectorLoaded.current = true;
    });
  }, []);

  // Persist inspector setting
  useEffect(() => {
    if (!inspectorLoaded.current) return;
    AsyncStorage.setItem("settings_inspector", String(inspectorEnabled));
  }, [inspectorEnabled]);

  // --- Drill-in navigation ---
  const [drillPath, setDrillPath] = useState<string[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);


  const currentContainerId = drillPath.length > 0 ? drillPath[drillPath.length - 1] : null;
  const isDrilledIn = drillPath.length > 0;

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const screen = slate.screens[screenId];

  const currentContainerComp = isDrilledIn && currentContainerId && screen
    ? findComponent(screen.components, currentContainerId)
    : undefined;

  const resetDrillSelection = useCallback(() => {
    setSelectedChildId(null);
    setSelectedComponentId(null);
    setEditingInfo(null);
  }, []);

  const drillInto = useCallback((containerId: string) => {
    setDrillPath(prev => [...prev, containerId]);
    resetDrillSelection();
  }, [resetDrillSelection]);

  const drillOut = useCallback(() => {
    setDrillPath(prev => prev.slice(0, -1));
    resetDrillSelection();
  }, [resetDrillSelection]);

  const drillToLevel = useCallback((level: number) => {
    setDrillPath(prev => prev.slice(0, level));
    resetDrillSelection();
  }, [resetDrillSelection]);

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
    setMenuOpen(true);
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, isEditMode, onToggleEditMode]);

  const closeMenu = useCallback(() => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      setMenuOpen(false);
    });
  }, [fadeAnim]);

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
      });
    },
    [onSlateChange, screenId],
  );

  const clearGuides = useCallback(() => setActiveGuides([]), []);

  const openStyleEditor = useCallback((componentId: string) => {
    const comp = findComponent(screen.components, componentId);
    if (!comp) return;
    const hasBorderRadius = ["shape", "textInput", "list", "container", "image"].includes(comp.type);
    const hasBorder = ["shape", "textInput", "container"].includes(comp.type);
    const hasBackgroundColor = ["shape", "textInput", "list", "container"].includes(comp.type);
    const hasLayoutMode = comp.type === "container";
    if (!hasBorderRadius && !hasBorder && !hasBackgroundColor && !hasLayoutMode) return;
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
    };
    setEditingInfo({
      mode: "style",
      componentId,
      state: { ...initialState },
      initialState,
    });
  }, [screen?.components]);

  const handleTreeSelect = useCallback((componentId: string) => {
    closeMenu();
    if (!isEditMode) onToggleEditMode();
    const comp = findComponent(screen.components, componentId);
    if (!comp) return;
    if (comp.type === "text" || comp.type === "button") {
      const isButton = comp.type === "button";
      const fw = comp.fontWeight;
      const textState: TextEditingState = {
        text: isButton ? (comp.label ?? "Button") : (comp.content ?? ""),
        fontSize: comp.fontSize ?? 16,
        color: isButton ? (comp.textColor ?? "#ffffff") : (comp.color ?? "#ccc"),
        backgroundColor: isButton ? (comp.backgroundColor ?? "#1a1a1a") : (comp.backgroundColor ?? "transparent"),
        fontFamily: comp.fontFamily ?? "System",
        fontWeight: (fw === "normal" || fw === "bold") ? fw : "normal",
        textAlign: comp.textAlign ?? "left",
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
  }, [closeMenu, isEditMode, onToggleEditMode, screen?.components, openStyleEditor]);

  const handleSelect = useCallback((componentId: string) => {
    if (editingInfo) return;
    if (lockedIds.has(componentId)) return;

    // If tapping an already-selected container, drill into it
    const comp = findComponent(screen.components, componentId);
    if (comp?.type === "container" && selectedComponentId === componentId) {
      drillInto(componentId);
      return;
    }

    setSelectedComponentId(componentId);
    if (!comp) return;
    if (comp.type === "text" || comp.type === "button") return;
    if (comp.type === "container") return; // First tap selects, second tap drills in
    openStyleEditor(componentId);
  }, [editingInfo, lockedIds, screen?.components, selectedComponentId, drillInto, openStyleEditor]);

  // Child select/edit handlers for drill-in mode
  const handleChildSelect = useCallback((childId: string) => {
    setSelectedChildId(childId);
    setSelectedComponentId(childId);
  }, []);

  const handleChildStyleSelect = useCallback((componentId: string) => {
    setSelectedChildId(componentId);
    setSelectedComponentId(componentId);
    openStyleEditor(componentId);
  }, [openStyleEditor]);

  // --- Drag-to-trash handlers ---
  const handleDragStart = useCallback((componentId: string) => {
    if (lockedIds.has(componentId)) return;
    setDraggingId(componentId);
    startBatch?.("Moved component");
  }, [lockedIds, startBatch]);

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
    setDragOverTrash(false);
    endBatch?.();
  }, [endBatch]);

  const handleDragOverTrashChange = useCallback((isOver: boolean) => {
    setDragOverTrash(isOver);
  }, []);

  // --- Context menu handlers ---
  const handleLongPress = useCallback((componentId: string, screenX: number, screenY: number) => {
    if (lockedIds.has(componentId)) return;
    setContextMenu({ componentId, x: screenX, y: screenY });
  }, [lockedIds]);

  const handleCopy = useCallback(() => {
    if (!contextMenu?.componentId || !screen) return;
    const comp = findComponent(screen.components, contextMenu.componentId);
    if (comp) clipboardRef.current = comp;
    setContextMenu(null);
  }, [contextMenu, screen]);

  const handlePaste = useCallback(() => {
    if (!clipboardRef.current || !contextMenu) return;
    const cloned = deepCloneComponent(clipboardRef.current);
    // Place near the long-press location
    const normX = Math.min(Math.max(contextMenu.x / Math.max(canvasDimensions.width, 1), 0), 0.9);
    const normY = Math.min(Math.max(contextMenu.y / Math.max(canvasDimensions.height, 1), 0), 0.9);
    cloned.layout = { ...cloned.layout, x: normX, y: normY };
    onAddComponent(cloned);
    setContextMenu(null);
  }, [onAddComponent, contextMenu, canvasDimensions]);

  const handleDuplicate = useCallback(() => {
    if (!contextMenu?.componentId || !screen) return;
    const comp = findComponent(screen.components, contextMenu.componentId);
    if (!comp) return;
    const cloned = deepCloneComponent(comp);
    cloned.layout = { ...cloned.layout, x: cloned.layout.x + 0.02, y: cloned.layout.y + 0.02 };
    onAddComponent(cloned);
    setContextMenu(null);
  }, [contextMenu, screen, onAddComponent]);

  // --- AI handlers ---
  const handleTidy = useCallback(async () => {
    if (!apiKey || isTidying || !screen) return;
    setIsTidying(true);
    try {
      startBatch?.("AI Tidy Layout");
      const tidied = await tidyLayout(apiKey, screen.components, slate.theme);
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
  }, [apiKey, isTidying, screen, slate.theme, screenId, onSlateChange, startBatch, endBatch]);

  const handleOpenAIChat = useCallback(() => {
    if (!contextMenu?.componentId || !screen) return;
    const comp = findComponent(screen.components, contextMenu.componentId);
    if (comp) setAiChatTarget(comp);
    setContextMenu(null);
  }, [contextMenu, screen]);

  const handleOpenAIChatFromToolbar = useCallback(() => {
    if (!screen) return;
    const compId = editingInfo?.componentId ?? selectedComponentId;
    if (!compId) return;
    const comp = findComponent(screen.components, compId);
    if (comp) {
      setEditingInfo(null);
      setAiChatTarget(comp);
    }
  }, [screen, editingInfo, selectedComponentId]);

  const handleAIChatFromLayer = useCallback((componentId: string) => {
    if (!screen) return;
    const comp = findComponent(screen.components, componentId);
    if (comp) setAiChatTarget(comp);
  }, [screen]);

  const handleAIChatApply = useCallback((component: Component) => {
    // Save original before applying so we can revert
    if (aiChatTarget) {
      setPendingAIChange({ componentId: component.id, original: aiChatTarget });
    }
    startBatch?.("AI Modified Component");
    onComponentReplace?.(component.id, component);
    endBatch?.();
    setAiChatTarget(null);
  }, [onComponentReplace, startBatch, endBatch, aiChatTarget]);

  const handleKeepAIChange = useCallback(() => {
    setPendingAIChange(null);
  }, []);

  const handleDiscardAIChange = useCallback(() => {
    if (!pendingAIChange) return;
    startBatch?.("Discard AI Change");
    onComponentReplace?.(pendingAIChange.componentId, pendingAIChange.original);
    endBatch?.();
    setPendingAIChange(null);
  }, [pendingAIChange, onComponentReplace, startBatch, endBatch]);

  const handleApplyComponents = useCallback((components: Component[], mode: "replace" | "add") => {
    startBatch?.("AI Generated Screen");
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

  // --- Inline editing handlers ---
  const handleEditStart = useCallback((componentId: string, initialState: TextEditingState) => {
    if (lockedIds.has(componentId)) return;
    setSelectedComponentId(componentId);
    setEditingInfo({ mode: "text", componentId, state: initialState });
  }, [lockedIds]);

  const handleEditStateChange = useCallback((updates: Partial<TextEditingState>) => {
    setEditingInfo(prev => prev && prev.mode === "text" ? { ...prev, state: { ...prev.state, ...updates } } : prev);
  }, []);

  const handleStyleStateChange = useCallback((updates: Partial<StyleEditingState>) => {
    setEditingInfo(prev => {
      if (!prev || prev.mode !== "style") return prev;
      return { ...prev, state: { ...prev.state, ...updates } };
    });
    if (editingInfo && editingInfo.mode === "style") {
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
      if (Object.keys(styleUpdates).length > 0) {
        onStyleChange?.(editingInfo.componentId, styleUpdates);
      }
    }
  }, [editingInfo, onStyleChange]);

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
  }, [editingInfo, screen.components, onContentChange, onStyleChange]);

  const handleEditCancel = useCallback(() => {
    // Revert live style changes to their original values
    if (editingInfo?.mode === "style") {
      const { componentId, initialState } = editingInfo;
      const revert: Record<string, unknown> = {};
      if (initialState.hasBorderRadius) revert.borderRadius = initialState.borderRadius;
      if (initialState.hasBorder) {
        revert.borderWidth = initialState.borderWidth;
        revert.borderColor = initialState.borderColor;
      }
      if (initialState.hasLayoutMode) {
        revert.layoutMode = initialState.layoutMode;
        revert.flexDirection = initialState.flexDirection;
        revert.gap = initialState.gap;
        revert.justifyContent = initialState.justifyContent;
        revert.alignItems = initialState.alignItems;
      }
      if (Object.keys(revert).length > 0) {
        onStyleChange?.(componentId, revert);
      }
    }
    Keyboard.dismiss();
    setEditingInfo(null);
    setSelectedComponentId(null);
    setInspectorOpen(false);
  }, [editingInfo, onStyleChange]);

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
  }, [selectedComponentId, editingInfo, screen?.components]);

  const applyInspectorChanges = useCallback(() => {
    const compId = selectedComponentId ?? editingInfo?.componentId;
    if (!compId) return;
    try {
      const parsed = ComponentSchema.parse(JSON.parse(inspectorJson));
      // Preserve the original ID so we don't break selection
      const updated = { ...parsed, id: compId };
      onComponentReplace?.(compId, updated);
      setInspectorError(null);
      setInspectorOpen(false);
      setEditingInfo(null);
      setSelectedComponentId(null);
    } catch (e) {
      setInspectorError(e instanceof Error ? e.message : "Invalid JSON");
    }
  }, [inspectorJson, selectedComponentId, editingInfo, onComponentReplace]);

  if (!screen) return null;

  return (
    <View
      style={{
        flex: 1,
        position: "relative",
        backgroundColor: "#ffffff",
      }}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setCanvasDimensions({ width, height });
      }}
    >
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
              onUpdate={onComponentUpdate}
              onContentChange={onContentChange}
              onStyleChange={onStyleChange}
              onNavigate={onNavigate}
              onResetAndBuild={onResetAndBuild}
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
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOverTrashChange={handleDragOverTrashChange}
              onDeleteComponent={onDeleteComponent}
              onPickImage={handlePickImage}
              isDimmed={isDimmed}
              locked={lockedIds.has(component.id)}
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

      {/* Breadcrumb bar when drilled in */}
      {isDrilledIn && isEditMode && (
        <GroupBreadcrumb
          drillPath={drillPath}
          components={screen.components}
          onDrillToLevel={drillToLevel}
        />
      )}

      {/* Back button in preview mode */}
      {!isEditMode && navStack && navStack.length > 0 && onNavigateBack && (
        <Pressable style={styles.backButton} onPress={onNavigateBack}>
          <Feather name="chevron-left" size={22} color="#ffffff" />
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
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
      {editingInfo?.mode === "text" && !inspectorOpen && (
        <TextEditorToolbar
          state={editingInfo.state}
          onStateChange={handleEditStateChange}
          onUndo={handleEditCancel}
          onInspect={inspectorEnabled ? openInspector : undefined}
          onAIChat={apiKey ? handleOpenAIChatFromToolbar : undefined}
          theme={slate.theme}
        />
      )}
      {editingInfo?.mode === "style" && !inspectorOpen && (
        <StyleEditorToolbar
          state={editingInfo.state}
          onStateChange={handleStyleStateChange}
          onUndo={handleEditCancel}
          onInspect={inspectorEnabled ? openInspector : undefined}
          onAIChat={apiKey ? handleOpenAIChatFromToolbar : undefined}
          theme={slate.theme}
        />
      )}

      {/* Floating add sphere – always visible, opens edit menu */}
      {!menuOpen && (
        <AddSphere
          onPress={openMenu}
          isEditMode={isEditMode}
          onToggleEditMode={() => {
            onToggleEditMode();
            crossAlert(
              isEditMode ? "Preview Mode" : "Dev Mode",
              isEditMode
                ? "You are now in preview mode. Long-hold the sphere to return to dev mode."
                : "You are now in dev mode.",
            );
          }}
        />
      )}

      {/* Context menu */}
      {contextMenu && isEditMode && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          hasClipboard={clipboardRef.current != null}
          hasComponent={contextMenu.componentId != null}
          onCopy={handleCopy}
          onPaste={handlePaste}
          onDuplicate={handleDuplicate}
          onAIChat={apiKey ? handleOpenAIChat : undefined}
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
        onClose={() => setVersionHistoryOpen(false)}
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
            {/* Dim overlay — 4 rects around the component cutout */}
            <View style={[styles.aiDimRect, { top: 0, left: 0, right: 0, height: Math.max(0, compY - pad) }]} pointerEvents="none" />
            <View style={[styles.aiDimRect, { top: compY - pad, left: 0, width: Math.max(0, compX - pad), height: compH + pad * 2 }]} pointerEvents="none" />
            <View style={[styles.aiDimRect, { top: compY - pad, left: compX + compW + pad, right: 0, height: compH + pad * 2 }]} pointerEvents="none" />
            <View style={[styles.aiDimRect, { top: compY + compH + pad, left: 0, right: 0, bottom: 0 }]} pointerEvents="none" />
            {/* Glow border around component */}
            <View
              style={[
                styles.aiSpotlightBorder,
                {
                  top: compY - pad,
                  left: compX - pad,
                  width: compW + pad * 2,
                  height: compH + pad * 2,
                },
              ]}
              pointerEvents="none"
            />
            {/* Buttons */}
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
          apiKey={apiKey}
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
        onToggleSnapping={() => setSnappingEnabled(v => !v)}
        onToggleInspector={() => setInspectorEnabled(v => !v)}
        onToggleAdvancedCode={() => {
          setShowAdvancedCode(v => {
            AsyncStorage.setItem("settings_advancedCode", String(!v));
            return !v;
          });
        }}
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
        currentScreenId={currentScreenId ?? screenId}
        initialScreenId={initialScreenId ?? slate.initial_screen_id}
        screenActions={screenActions}
        onUndo={onUndo}
        onRedo={onRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        onOpenVersionHistory={() => setVersionHistoryOpen(true)}
        apiKey={apiKey}
        onApiKeyChange={onApiKeyChange}
        onApplyComponents={handleApplyComponents}
        historyEntries={entries}
        currentHistoryId={currentId}
        onRestoreToId={restoreToId}
        slateId={slateId}
        logInteraction={logInteraction}
        chatLog={chatLog}
        agentRunner={agentRunner}
        onAIChatComponent={handleAIChatFromLayer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  editBackdrop: {
    backgroundColor: "rgba(0,0,0,0.6)",
    zIndex: 100,
  },
  backButton: {
    position: "absolute",
    top: 50,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.85)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#1a1a1a",
    zIndex: 80,
  },
  backButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 2,
    letterSpacing: 0.3,
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
    zIndex: 999,
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
  aiDimRect: {
    position: "absolute",
    backgroundColor: "rgba(0,0,0,0.6)",
    zIndex: 899,
  },
  aiSpotlightBorder: {
    position: "absolute",
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.25)",
    zIndex: 899,
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
