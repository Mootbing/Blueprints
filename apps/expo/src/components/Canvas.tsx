import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  View,
  Pressable,
  Text,
  ScrollView,
  Platform,
  Alert,
  StyleSheet,
  Animated,
  SafeAreaView,
  Keyboard,
  type GestureResponderEvent,
} from "react-native";
import { BlurView } from "expo-blur";
import { useSharedValue } from "react-native-reanimated";
import type { AppBlueprint, Layout, Component, ComponentStyleUpdates } from "../types";
import { SDUIComponent } from "./SDUIComponent";
import { SnapGuides } from "./SnapGuides";
import { TextEditorToolbar, type TextEditingState } from "./TextEditorModal";

function uuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const BG_COLORS = [
  "#ffffff", "#f5f5f5", "#e0e0e0", "#1a1a1a", "#000000",
  "#fef3c7", "#fde68a", "#fca5a5", "#fecaca", "#fed7aa",
  "#bbf7d0", "#a7f3d0", "#a5f3fc", "#bae6fd", "#c7d2fe",
  "#ddd6fe", "#f5d0fe", "#fbcfe8",
];

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
  onResetProject?: () => void;
  onResetAndBuild?: () => void;
  onNavigate?: (screenId: string) => void;
}

const PRESETS: { label: string; icon: string; create: (x: number, y: number) => Component }[] = [
  {
    label: "Text",
    icon: "Aa",
    create: (x, y) => ({
      type: "text" as const,
      id: uuid(),
      layout: { x, y, width: 0.5, height: 0.06 },
      content: "Tap to edit",
      fontSize: 20,
      color: "#1a1a1a",
      fontWeight: "600" as const,
    }),
  },
  {
    label: "Button",
    icon: "[ ]",
    create: (x, y) => ({
      type: "button" as const,
      id: uuid(),
      layout: { x, y, width: 0.4, height: 0.065 },
      label: "Button",
      backgroundColor: "#6366f1",
      textColor: "#ffffff",
      interactions: [],
    }),
  },
  {
    label: "Image",
    icon: "IMG",
    create: (x, y) => ({
      type: "image" as const,
      id: uuid(),
      layout: { x, y, width: 0.4, height: 0.25 },
      src: "https://placekitten.com/400/300",
      resizeMode: "cover" as const,
    }),
  },
  {
    label: "Input",
    icon: "___",
    create: (x, y) => ({
      type: "textInput" as const,
      id: uuid(),
      layout: { x, y, width: 0.7, height: 0.06 },
      placeholder: "Enter text...",
      borderColor: "#cccccc",
      borderWidth: 1,
      borderRadius: 8,
    }),
  },
  {
    label: "Toggle",
    icon: "ON",
    create: (x, y) => ({
      type: "toggle" as const,
      id: uuid(),
      layout: { x, y, width: 0.5, height: 0.05 },
      label: "Toggle",
      defaultValue: false,
      activeColor: "#6366f1",
    }),
  },
  {
    label: "Divider",
    icon: "---",
    create: (x, y) => ({
      type: "divider" as const,
      id: uuid(),
      layout: { x, y, width: 0.8, height: 0.01 },
      direction: "horizontal" as const,
      thickness: 1,
      color: "#e0e0e0",
      lineStyle: "solid" as const,
    }),
  },
  {
    label: "Shape",
    icon: "SHP",
    create: (x, y) => ({
      type: "shape" as const,
      id: uuid(),
      layout: { x, y, width: 0.4, height: 0.15 },
      shapeType: "rounded-rectangle" as const,
      backgroundColor: "#6366f1",
      borderRadius: 12,
      opacity: 1,
    }),
  },
  {
    label: "Icon",
    icon: "ICO",
    create: (x, y) => ({
      type: "icon" as const,
      id: uuid(),
      layout: { x, y, width: 0.12, height: 0.06 },
      name: "star",
      library: "material" as const,
      size: 32,
      color: "#1a1a1a",
    }),
  },
  {
    label: "List",
    icon: "LST",
    create: (x, y) => ({
      type: "list" as const,
      id: uuid(),
      layout: { x, y, width: 0.9, height: 0.3 },
      items: [
        { id: "1", title: "Item 1", subtitle: "Description" },
        { id: "2", title: "Item 2", subtitle: "Description" },
        { id: "3", title: "Item 3", subtitle: "Description" },
      ],
      borderRadius: 12,
    }),
  },
  {
    label: "Container",
    icon: "BOX",
    create: (x, y) => ({
      type: "container" as const,
      id: uuid(),
      layout: { x, y, width: 0.85, height: 0.25 },
      backgroundColor: "#ffffff",
      borderRadius: 12,
      shadowEnabled: true,
      padding: 0.02,
    }),
  },
];

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
  onResetProject,
  onResetAndBuild,
  onNavigate,
}: CanvasProps) {
  const [canvasDimensions, setCanvasDimensions] = useState({
    width: 0,
    height: 0,
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropPoint, setDropPoint] = useState<{ normX: number; normY: number }>({ normX: 0.1, normY: 0.3 });
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [activeGuides, setActiveGuides] = useState<number[]>([]);
  const [snappingEnabled, setSnappingEnabled] = useState(true);
  const [autoEditId, setAutoEditId] = useState<string | null>(null);
  const [editingInfo, setEditingInfo] = useState<{
    componentId: string;
    state: TextEditingState;
  } | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const screen = blueprint.screens[screenId];

  const siblingRects = useSharedValue<number[]>([]);
  useMemo(() => {
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
  if (!screen) return null;

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
      setShowBgPicker(false);
    });
  }, [fadeAnim]);

  const handleAdd = (preset: (typeof PRESETS)[number]) => {
    const comp = preset.create(dropPoint.normX, dropPoint.normY);
    onAddComponent(comp);
    setAutoEditId(comp.id);
    closeMenu();
  };

  const clearGuides = useCallback(() => setActiveGuides([]), []);

  // --- Inline editing handlers ---
  const handleEditStart = useCallback((componentId: string, initialState: TextEditingState) => {
    setEditingInfo({ componentId, state: initialState });
  }, []);

  const handleEditStateChange = useCallback((updates: Partial<TextEditingState>) => {
    setEditingInfo(prev => prev ? { ...prev, state: { ...prev.state, ...updates } } : null);
  }, []);

  const handleEditDone = useCallback(() => {
    if (!editingInfo) return;
    const { componentId, state } = editingInfo;
    const comp = screen.components.find(c => c.id === componentId);
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
  }, [editingInfo, screen.components, onContentChange, onStyleChange]);

  const handleEditCancel = useCallback(() => {
    Keyboard.dismiss();
    setEditingInfo(null);
  }, []);

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
        onLongPress={openMenu}
        delayLongPress={500}
        onPress={() => {
          if (menuOpen) closeMenu();
        }}
      />
      {canvasDimensions.width > 0 &&
        screen.components.map((component, index) => (
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
            editState={editingInfo != null && editingInfo.componentId === component.id ? editingInfo.state : null}
            onEditStart={handleEditStart}
            onEditStateChange={handleEditStateChange}
          />
        ))}
      {isEditMode && snappingEnabled && (
        <SnapGuides
          guides={activeGuides}
          canvasWidth={canvasDimensions.width}
          canvasHeight={canvasDimensions.height}
        />
      )}

      {/* Editing backdrop + toolbar */}
      {editingInfo && (
        <Pressable
          style={[StyleSheet.absoluteFill, styles.editBackdrop]}
          onPress={handleEditCancel}
        />
      )}
      {editingInfo && (
        <TextEditorToolbar
          state={editingInfo.state}
          onStateChange={handleEditStateChange}
          onDone={handleEditDone}
        />
      )}

      {/* Fullscreen Blur Overlay */}
      {menuOpen && (
        <Animated.View style={[StyleSheet.absoluteFill, styles.overlay, { opacity: fadeAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeMenu}>
            <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
          </Pressable>

          <SafeAreaView style={styles.sheet} pointerEvents="box-none">
            <Pressable style={styles.closeBar} onPress={closeMenu}>
              <Text style={styles.closeLabel}>Done</Text>
            </Pressable>
            <ScrollView
              showsVerticalScrollIndicator={false}
              bounces={false}
              contentContainerStyle={styles.sheetContent}
            >
              {/* --- Mode --- */}
              <Text style={styles.categoryHeader}>MODE</Text>
              <Pressable style={styles.row} onPress={() => { onToggleEditMode(); closeMenu(); }}>
                <Text style={styles.rowLabel}>Edit Mode</Text>
                <View style={[styles.toggleTrack, isEditMode && styles.toggleTrackOn]}>
                  <View style={[styles.toggleThumb, isEditMode && styles.toggleThumbOn]} />
                </View>
              </Pressable>
              {isEditMode && (
                <Pressable style={styles.row} onPress={() => setSnappingEnabled(v => !v)}>
                  <Text style={styles.rowLabel}>Snap to Guides</Text>
                  <View style={[styles.toggleTrack, snappingEnabled && styles.toggleTrackOn]}>
                    <View style={[styles.toggleThumb, snappingEnabled && styles.toggleThumbOn]} />
                  </View>
                </Pressable>
              )}

              {isEditMode && (
                <>
                  <View style={styles.divider} />

                  {/* --- Components --- */}
                  <Text style={styles.categoryHeader}>COMPONENTS</Text>
                  {PRESETS.map((preset, i) => (
                    <React.Fragment key={preset.label}>
                      <Pressable
                        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                        onPress={() => handleAdd(preset)}
                      >
                        <Text style={styles.presetIcon}>{preset.icon}</Text>
                        <Text style={styles.rowLabel}>{preset.label}</Text>
                      </Pressable>
                      {i < PRESETS.length - 1 && <View style={styles.rowDivider} />}
                    </React.Fragment>
                  ))}

                  <View style={styles.divider} />

                  {/* --- Appearance --- */}
                  <Text style={styles.categoryHeader}>APPEARANCE</Text>
                  <Pressable
                    style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                    onPress={() => setShowBgPicker((v) => !v)}
                  >
                    <View
                      style={[
                        styles.bgIndicator,
                        { backgroundColor: screen.backgroundColor ?? "#ffffff" },
                      ]}
                    />
                    <Text style={styles.rowLabel}>Background Color</Text>
                    <Text style={styles.chevron}>{showBgPicker ? "−" : "+"}</Text>
                  </Pressable>
                  {showBgPicker && (
                    <View style={styles.bgPickerWrap}>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.bgPickerContent}
                      >
                        {BG_COLORS.map((col) => {
                          const active = (screen.backgroundColor ?? "#ffffff") === col;
                          return (
                            <Pressable
                              key={col}
                              style={[
                                styles.bgColorDot,
                                { backgroundColor: col },
                                active && styles.bgColorDotActive,
                              ]}
                              onPress={() => onBackgroundColorChange?.(col)}
                            />
                          );
                        })}
                      </ScrollView>
                    </View>
                  )}

                  <View style={styles.divider} />

                  {/* --- Danger Zone --- */}
                  <Text style={[styles.categoryHeader, styles.dangerHeader]}>DANGER ZONE</Text>
                  <Pressable
                    style={({ pressed }) => [styles.row, styles.dangerRow, pressed && styles.dangerRowPressed]}
                    onPress={() => {
                      closeMenu();
                      if (Platform.OS === "web") {
                        if (
                          window.confirm(
                            "Reset Project?\n\nThis will reset to the default landing page. This cannot be undone."
                          )
                        ) {
                          onResetProject?.();
                        }
                      } else {
                        Alert.alert(
                          "Reset Project",
                          "This will reset to the default landing page. This cannot be undone.",
                          [
                            { text: "Cancel", style: "cancel" },
                            {
                              text: "Reset",
                              style: "destructive",
                              onPress: () => onResetProject?.(),
                            },
                          ]
                        );
                      }
                    }}
                  >
                    <Text style={styles.dangerLabel}>Reset Project</Text>
                  </Pressable>
                </>
              )}
            </ScrollView>
          </SafeAreaView>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  editBackdrop: {
    backgroundColor: "rgba(0,0,0,0.5)",
    zIndex: 100,
  },
  overlay: {
    zIndex: 999,
    justifyContent: "center",
    alignItems: "center",
  },
  sheet: {
    flex: 1,
    width: "100%",
    backgroundColor: "transparent",
  },
  sheetContent: {
    paddingVertical: 0,
  },
  closeBar: {
    alignSelf: "flex-end",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  closeLabel: {
    color: "#818cf8",
    fontSize: 16,
    fontWeight: "600",
  },
  categoryHeader: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginVertical: 8,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.06)",
    marginLeft: 56,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 13,
    gap: 12,
  },
  rowPressed: {
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  rowLabel: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "500",
    flex: 1,
  },
  presetIcon: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 13,
    fontWeight: "700",
    width: 28,
    textAlign: "center",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  toggleTrack: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  toggleTrackOn: {
    backgroundColor: "#6366f1",
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#ffffff",
  },
  toggleThumbOn: {
    alignSelf: "flex-end",
  },
  bgIndicator: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
  },
  chevron: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 18,
    fontWeight: "600",
  },
  bgPickerWrap: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  bgPickerContent: {
    gap: 8,
    paddingVertical: 6,
  },
  bgColorDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
  },
  bgColorDotActive: {
    borderWidth: 3,
    borderColor: "#ffffff",
  },
  dangerHeader: {
    color: "rgba(239,68,68,0.6)",
  },
  dangerRow: {
    backgroundColor: "rgba(239,68,68,0.08)",
  },
  dangerRowPressed: {
    backgroundColor: "rgba(239,68,68,0.2)",
  },
  dangerLabel: {
    color: "#fca5a5",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    flex: 1,
  },
});
