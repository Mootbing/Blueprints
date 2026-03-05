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
  type GestureResponderEvent,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { useSharedValue } from "react-native-reanimated";
import type { AppBlueprint, Layout, Component, ComponentStyleUpdates, Screen } from "../types";
import { ComponentSchema } from "../types";
import { SDUIComponent } from "./SDUIComponent";
import { SnapGuides } from "./SnapGuides";
import { TextEditorToolbar, type TextEditingState } from "./TextEditorModal";
import { StyleEditorToolbar, type StyleEditingState } from "./ComponentToolbar";
import * as ImagePicker from "expo-image-picker";
import { useKeyboardHeight } from "../hooks/useKeyboardHeight";
import { GroupBreadcrumb } from "./GroupBreadcrumb";
import { GroupChildCarousel } from "./GroupChildCarousel";
import { CanvasMenu } from "./menu/CanvasMenu";
import { PRESETS } from "./menu/ComponentsPage";

/* Small draggable sphere to toggle between edit / preview */
function ModeSphere({ mode, onPress }: { mode: "edit" | "preview"; onPress: () => void }) {
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const moved = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 3 || Math.abs(g.dy) > 3,
      onPanResponderGrant: () => {
        moved.current = false;
        pan.setOffset({ x: (pan.x as any)._value, y: (pan.y as any)._value });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (_, g) => {
        if (Math.abs(g.dx) > 3 || Math.abs(g.dy) > 3) moved.current = true;
        Animated.event([null, { dx: pan.x, dy: pan.y }], {
          useNativeDriver: false,
        })(_, g);
      },
      onPanResponderRelease: () => {
        pan.flattenOffset();
        if (!moved.current) {
          onPress();
        }
      },
    })
  ).current;

  const isPreview = mode === "preview";

  return (
    <Animated.View
      style={[
        styles.devSphere,
        isPreview ? styles.devSpherePreview : styles.devSphereEdit,
        { transform: pan.getTranslateTransform() },
      ]}
      {...panResponder.panHandlers}
    >
      {isPreview ? (
        <Text style={styles.devSphereText}>&lt;/&gt;</Text>
      ) : (
        <Feather name="eye" size={20} color="#a5b4fc" />
      )}
    </Animated.View>
  );
}

interface CanvasProps {
  blueprint: AppBlueprint;
  screenId: string;
  isEditMode: boolean;
  onToggleEditMode: () => void;
  onComponentUpdate: (id: string, layout: Layout) => void;
  onContentChange?: (id: string, content: string) => void;
  onStyleChange?: (id: string, updates: ComponentStyleUpdates) => void;
  onAddComponent: (component: Component) => void;
  onBackgroundColorChange?: (color: string) => void;
  onCloseBlueprint?: () => void;
  onDeleteBlueprint?: () => void;
  onResetAndBuild?: () => void;
  onNavigate?: (screenId: string) => void;
  onScreenUpdate?: (screen: Screen) => void;
  onDeleteComponent?: (id: string) => void;
  onComponentReplace?: (id: string, replacement: Component) => void;
  onAddChildComponent?: (parentId: string, child: Component) => void;
  onBlueprintChange?: (updater: AppBlueprint | ((prev: AppBlueprint) => AppBlueprint)) => void;
}

export function Canvas({
  blueprint,
  screenId,
  isEditMode,
  onToggleEditMode,
  onComponentUpdate,
  onContentChange,
  onStyleChange,
  onAddComponent,
  onBackgroundColorChange,
  onCloseBlueprint,
  onDeleteBlueprint,
  onResetAndBuild,
  onNavigate,
  onScreenUpdate,
  onDeleteComponent,
  onComponentReplace,
  onAddChildComponent,
  onBlueprintChange,
}: CanvasProps) {
  const keyboardHeight = useKeyboardHeight();
  const [canvasDimensions, setCanvasDimensions] = useState({
    width: 0,
    height: 0,
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropPoint, setDropPoint] = useState<{ normX: number; normY: number }>({ normX: 0.1, normY: 0.3 });
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

  // Quick toggle sphere
  const [quickToggleEnabled, setQuickToggleEnabled] = useState(true);
  const quickToggleLoaded = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem("settings_quickToggle").then((val) => {
      if (val !== null) setQuickToggleEnabled(val === "true");
      quickToggleLoaded.current = true;
    });
  }, []);

  useEffect(() => {
    if (!quickToggleLoaded.current) return;
    AsyncStorage.setItem("settings_quickToggle", String(quickToggleEnabled));
  }, [quickToggleEnabled]);

  const [autoEditId, setAutoEditId] = useState<string | null>(null);
  const [editingInfo, setEditingInfo] = useState<
    | { mode: "text"; componentId: string; state: TextEditingState }
    | { mode: "style"; componentId: string; state: StyleEditingState; initialState: StyleEditingState }
    | null
  >(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverTrash, setDragOverTrash] = useState(false);

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

  const screen = blueprint.screens[screenId];

  function findComponent(components: Component[], id: string): Component | undefined {
    for (const c of components) {
      if (c.id === id) return c;
      if (c.type === "container" && c.children) {
        const found = findComponent(c.children, id);
        if (found) return found;
      }
    }
    return undefined;
  }

  const currentContainerComp = isDrilledIn && currentContainerId && screen
    ? findComponent(screen.components, currentContainerId)
    : undefined;

  const drillInto = useCallback((containerId: string) => {
    setDrillPath(prev => [...prev, containerId]);
    setSelectedChildId(null);
    setSelectedComponentId(null);
    setEditingInfo(null);
  }, []);

  const drillOut = useCallback(() => {
    setDrillPath(prev => prev.slice(0, -1));
    setSelectedChildId(null);
    setSelectedComponentId(null);
    setEditingInfo(null);
  }, []);

  const drillToLevel = useCallback((level: number) => {
    setDrillPath(prev => prev.slice(0, level));
    setSelectedChildId(null);
    setSelectedComponentId(null);
    setEditingInfo(null);
  }, []);

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

  const openMenu = useCallback(
    (e: GestureResponderEvent) => {
      if (canvasDimensions.width === 0) return;
      const { locationX, locationY } = e.nativeEvent;
      setDropPoint({
        normX: Math.min(Math.max(locationX / canvasDimensions.width, 0), 1),
        normY: Math.min(Math.max(locationY / canvasDimensions.height, 0), 1),
      });
      setMenuOpen(true);
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    },
    [canvasDimensions, fadeAnim]
  );

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
        color: isButton ? (comp.textColor ?? "#ffffff") : (comp.color ?? "#1a1a1a"),
        backgroundColor: isButton ? (comp.backgroundColor ?? "#6366f1") : (comp.backgroundColor ?? "transparent"),
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
  }, [editingInfo, screen?.components, selectedComponentId, drillInto, openStyleEditor]);

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
    setDraggingId(componentId);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
    setDragOverTrash(false);
  }, []);

  const handleDragOverTrashChange = useCallback((isOver: boolean) => {
    setDragOverTrash(isOver);
  }, []);

  // --- Inline editing handlers ---
  const handleEditStart = useCallback((componentId: string, initialState: TextEditingState) => {
    setSelectedComponentId(componentId);
    setEditingInfo({ mode: "text", componentId, state: initialState });
  }, []);

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
        backgroundColor: state.backgroundColor === "transparent" ? "#6366f1" : state.backgroundColor,
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
    });
    if (!result.canceled && result.assets[0]) {
      onStyleChange?.(componentId, { src: result.assets[0].uri });
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
        backgroundColor: screen.backgroundColor ?? "#ffffff",
      }}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setCanvasDimensions({ width, height });
      }}
    >
      <Pressable
        style={StyleSheet.absoluteFill}
        onLongPress={isEditMode ? openMenu : undefined}
        delayLongPress={500}
        onPress={() => {
          if (!isEditMode) return;
          if (menuOpen) closeMenu();
          else if (isDrilledIn && !editingInfo) drillOut();
          else if (editingInfo) handleEditCancel();
        }}
      />
      {canvasDimensions.width > 0 &&
        screen.components.map((component, index) => {
          const isDimmed = isDrilledIn;
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
              editState={editingInfo != null && editingInfo.mode === "text" && editingInfo.componentId === component.id ? editingInfo.state : null}
              onEditStart={handleEditStart}
              onEditStateChange={handleEditStateChange}
              onSelect={handleSelect}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOverTrashChange={handleDragOverTrashChange}
              onDeleteComponent={onDeleteComponent}
              onPickImage={handlePickImage}
              isDimmed={isDimmed}
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

      {/* Group child carousel when drilled in */}
      {isDrilledIn && currentContainerComp?.type === 'container' && (
        <GroupChildCarousel
          key={currentContainerId!}
          childComponents={currentContainerComp.children ?? []}
          canvasWidth={canvasDimensions.width}
          canvasHeight={canvasDimensions.height}
          editingComponentId={editingInfo?.componentId ?? null}
          editState={editingInfo?.mode === 'text' ? editingInfo.state : null}
          onChildSelect={handleChildSelect}
          onChildEditStart={handleEditStart}
          onChildEditStateChange={handleEditStateChange}
          onDrillInto={drillInto}
          onChildStyleSelect={handleChildStyleSelect}
          onChildPickImage={handlePickImage}
          onEditDone={handleEditDone}
          onLongPress={() => {
            setMenuOpen(true);
            fadeAnim.setValue(0);
            Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
          }}
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
        />
      )}
      {editingInfo?.mode === "style" && !inspectorOpen && (
        <StyleEditorToolbar
          state={editingInfo.state}
          onStateChange={handleStyleStateChange}
          onUndo={handleEditCancel}
          onInspect={inspectorEnabled ? openInspector : undefined}
        />
      )}

      {/* Mode toggle sphere */}
      {quickToggleEnabled && !editingInfo && (
        <ModeSphere
          mode={isEditMode ? "edit" : "preview"}
          onPress={onToggleEditMode}
        />
      )}

      {/* Swipeable 3-page menu */}
      <CanvasMenu
        visible={menuOpen}
        fadeAnim={fadeAnim}
        screen={screen}
        blueprint={blueprint}
        isEditMode={isEditMode}
        snappingEnabled={snappingEnabled}
        inspectorEnabled={inspectorEnabled}
        quickToggleEnabled={quickToggleEnabled}
        onClose={closeMenu}
        onAddComponent={handleAdd}
        onToggleEditMode={onToggleEditMode}
        onToggleSnapping={() => setSnappingEnabled(v => !v)}
        onToggleInspector={() => setInspectorEnabled(v => !v)}
        onToggleQuickToggle={() => setQuickToggleEnabled(v => !v)}
        onBackgroundColorChange={(c) => onBackgroundColorChange?.(c)}
        onCloseBlueprint={() => onCloseBlueprint?.()}
        onDeleteBlueprint={() => onDeleteBlueprint?.()}
        onScreenUpdate={(s) => onScreenUpdate?.(s)}
        onDeleteComponent={(id) => onDeleteComponent?.(id)}
        onTreeSelect={handleTreeSelect}
        onBlueprintChange={onBlueprintChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  editBackdrop: {
    backgroundColor: "rgba(0,0,0,0.5)",
    zIndex: 100,
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
    borderColor: "rgba(255,255,255,0.4)",
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  trashPillActive: {
    backgroundColor: "#ef4444",
    borderColor: "#ef4444",
  },
  inspectorPanel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 200,
    backgroundColor: "rgba(15,23,42,0.95)",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
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
    color: "#e2e8f0",
    fontSize: 16,
    fontWeight: "600",
  },
  inspectorInput: {
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 8,
    color: "#e2e8f0",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 11,
    padding: 12,
    minHeight: 150,
    maxHeight: 300,
  },
  inspectorError: {
    color: "#fca5a5",
    fontSize: 12,
    marginTop: 6,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  jsonApplyBtn: {
    backgroundColor: "#6366f1",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center" as const,
    marginTop: 8,
  },
  jsonApplyBtnPressed: {
    backgroundColor: "#4f46e5",
  },
  jsonApplyLabel: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600" as const,
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
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
      },
      android: { elevation: 8 },
      default: {},
    }),
  },
  devSpherePreview: {
    backgroundColor: "rgba(15,23,42,0.85)",
    borderColor: "rgba(99,102,241,0.6)",
  },
  devSphereEdit: {
    backgroundColor: "rgba(99,102,241,0.85)",
    borderColor: "rgba(165,180,252,0.6)",
  },
  devSphereText: {
    color: "#a5b4fc",
    fontSize: 14,
    fontWeight: "700" as const,
    letterSpacing: -0.5,
  },
});
