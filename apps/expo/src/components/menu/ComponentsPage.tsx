import React, { useState, useRef } from "react";
import { View, Pressable, Text, StyleSheet, Platform, Animated as RNAnimated } from "react-native";
import { Feather } from "@expo/vector-icons";
import type { Component } from "../../types";
import { uuid } from "../../utils/uuid";
import { TreeView } from "./TreeView";

export const PRESETS: { label: string; icon: string; create: (x: number, y: number) => Component }[] = [
  {
    label: "Text",
    icon: "Aa",
    create: (x, y) => ({
      type: "text" as const,
      id: uuid(),
      layout: { x, y, width: 0.5, height: 0.06 },
      content: "Text",
      fontSize: 20,
      color: "#1a1a1a",
      fontWeight: "600" as const,
    }),
  },
  {
    label: "Button",
    icon: "[ ]",
    create: (x, y) => ({
      type: "container" as const,
      id: uuid(),
      layout: { x, y, width: 0.7, height: 0.07 },
      backgroundColor: "#6366f1",
      borderRadius: 12,
      children: [
        {
          type: "text" as const,
          id: uuid(),
          layout: { x: 0.0, y: 0.0, width: 1.0, height: 1.0 },
          content: "Button",
          fontSize: 16,
          color: "#ffffff",
          fontWeight: "600" as const,
          textAlign: "center" as const,
        },
      ],
    }),
  },
  {
    label: "Image",
    icon: "IMG",
    create: (x, y) => ({
      type: "container" as const,
      id: uuid(),
      layout: { x, y, width: 0.4, height: 0.25 },
      backgroundColor: "transparent",
      borderRadius: 12,
      children: [
        {
          type: "image" as const,
          id: uuid(),
          layout: { x: 0.0, y: 0.0, width: 1.0, height: 1.0 },
          src: "https://placekitten.com/400/300",
          resizeMode: "cover" as const,
        },
      ],
    }),
  },
  {
    label: "Input",
    icon: "___",
    create: (x, y) => ({
      type: "container" as const,
      id: uuid(),
      layout: { x, y, width: 0.7, height: 0.06 },
      backgroundColor: "#ffffff",
      borderColor: "#cccccc",
      borderWidth: 1,
      borderRadius: 8,
      children: [
        {
          type: "textInput" as const,
          id: uuid(),
          layout: { x: 0.0, y: 0.0, width: 1.0, height: 1.0 },
          placeholder: "Enter text...",
          borderWidth: 0,
        },
      ],
    }),
  },
  {
    label: "Toggle",
    icon: "ON",
    create: (x, y) => ({
      type: "container" as const,
      id: uuid(),
      layout: { x, y, width: 0.5, height: 0.05 },
      backgroundColor: "transparent",
      borderRadius: 0,
      children: [
        {
          type: "text" as const,
          id: uuid(),
          layout: { x: 0.0, y: 0.0, width: 0.6, height: 1.0 },
          content: "Toggle",
          fontSize: 16,
          color: "#1a1a1a",
          fontWeight: "500" as const,
        },
        {
          type: "toggle" as const,
          id: uuid(),
          layout: { x: 0.65, y: 0.0, width: 0.35, height: 1.0 },
          defaultValue: false,
          activeColor: "#6366f1",
        },
      ],
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
      type: "container" as const,
      id: uuid(),
      layout: { x, y, width: 0.9, height: 0.3 },
      backgroundColor: "#ffffff",
      borderRadius: 12,
      shadowEnabled: true,
      children: [
        {
          type: "container" as const,
          id: uuid(),
          layout: { x: 0.0, y: 0.0, width: 1.0, height: 0.33 },
          backgroundColor: "transparent",
          borderRadius: 0,
          children: [
            {
              type: "text" as const,
              id: uuid(),
              layout: { x: 0.05, y: 0.1, width: 0.9, height: 0.45 },
              content: "Item 1",
              fontSize: 16,
              color: "#1a1a1a",
              fontWeight: "500" as const,
            },
            {
              type: "text" as const,
              id: uuid(),
              layout: { x: 0.05, y: 0.55, width: 0.9, height: 0.35 },
              content: "Description",
              fontSize: 13,
              color: "#94a3b8",
              fontWeight: "normal" as const,
            },
          ],
        },
        {
          type: "divider" as const,
          id: uuid(),
          layout: { x: 0.05, y: 0.33, width: 0.9, height: 0.005 },
          color: "#e5e7eb",
          thickness: 1,
        },
        {
          type: "container" as const,
          id: uuid(),
          layout: { x: 0.0, y: 0.34, width: 1.0, height: 0.33 },
          backgroundColor: "transparent",
          borderRadius: 0,
          children: [
            {
              type: "text" as const,
              id: uuid(),
              layout: { x: 0.05, y: 0.1, width: 0.9, height: 0.45 },
              content: "Item 2",
              fontSize: 16,
              color: "#1a1a1a",
              fontWeight: "500" as const,
            },
            {
              type: "text" as const,
              id: uuid(),
              layout: { x: 0.05, y: 0.55, width: 0.9, height: 0.35 },
              content: "Description",
              fontSize: 13,
              color: "#94a3b8",
              fontWeight: "normal" as const,
            },
          ],
        },
        {
          type: "divider" as const,
          id: uuid(),
          layout: { x: 0.05, y: 0.67, width: 0.9, height: 0.005 },
          color: "#e5e7eb",
          thickness: 1,
        },
        {
          type: "container" as const,
          id: uuid(),
          layout: { x: 0.0, y: 0.67, width: 1.0, height: 0.33 },
          backgroundColor: "transparent",
          borderRadius: 0,
          children: [
            {
              type: "text" as const,
              id: uuid(),
              layout: { x: 0.05, y: 0.1, width: 0.9, height: 0.45 },
              content: "Item 3",
              fontSize: 16,
              color: "#1a1a1a",
              fontWeight: "500" as const,
            },
            {
              type: "text" as const,
              id: uuid(),
              layout: { x: 0.05, y: 0.55, width: 0.9, height: 0.35 },
              content: "Description",
              fontSize: 13,
              color: "#94a3b8",
              fontWeight: "normal" as const,
            },
          ],
        },
      ],
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
  {
    label: "Card",
    icon: "CRD",
    create: (x, y) => ({
      type: "container" as const,
      id: uuid(),
      layout: { x, y, width: 0.85, height: 0.35 },
      backgroundColor: "#ffffff",
      borderRadius: 16,
      shadowEnabled: true,
      children: [
        {
          type: "image" as const,
          id: uuid(),
          layout: { x: 0.0, y: 0.0, width: 1.0, height: 0.55 },
          src: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&h=400&fit=crop",
          resizeMode: "cover" as const,
          borderRadius: 0,
        },
        {
          type: "text" as const,
          id: uuid(),
          layout: { x: 0.05, y: 0.6, width: 0.9, height: 0.15 },
          content: "Card Title",
          fontSize: 18,
          color: "#1a1a1a",
          fontWeight: "bold" as const,
        },
        {
          type: "text" as const,
          id: uuid(),
          layout: { x: 0.05, y: 0.78, width: 0.9, height: 0.15 },
          content: "Card subtitle goes here",
          fontSize: 13,
          color: "#94a3b8",
          fontWeight: "normal" as const,
        },
      ],
    }),
  },
  {
    label: "Header",
    icon: "HDR",
    create: (x, y) => ({
      type: "container" as const,
      id: uuid(),
      layout: { x, y, width: 0.9, height: 0.06 },
      backgroundColor: "transparent",
      borderRadius: 0,
      children: [
        {
          type: "icon" as const,
          id: uuid(),
          layout: { x: 0.0, y: 0.0, width: 0.1, height: 1.0 },
          name: "menu",
          library: "feather" as const,
          size: 24,
          color: "#1a1a1a",
        },
        {
          type: "text" as const,
          id: uuid(),
          layout: { x: 0.15, y: 0.0, width: 0.7, height: 1.0 },
          content: "Page Title",
          fontSize: 18,
          color: "#1a1a1a",
          fontWeight: "600" as const,
          textAlign: "center" as const,
        },
      ],
    }),
  },
];

interface ComponentsPageProps {
  width: number;
  components: Component[];
  onAddComponent: (preset: (typeof PRESETS)[number]) => void;
  onSelectComponent: (id: string) => void;
  onDeleteComponent: (id: string) => void;
  lockedIds?: Set<string>;
  onToggleLock?: (id: string) => void;
  onMoveComponent?: (componentId: string, toIndex: number, parentId: string | null) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onOpenVersionHistory?: () => void;
}

export function ComponentsPage({
  width,
  components,
  onAddComponent,
  onSelectComponent,
  onDeleteComponent,
  lockedIds,
  onToggleLock,
  onMoveComponent,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onOpenVersionHistory,
}: ComponentsPageProps) {
  const [showComponents, setShowComponents] = useState(true);
  const fadeAnim = useRef(new RNAnimated.Value(1)).current;

  const toggleComponents = () => {
    if (showComponents) {
      RNAnimated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => setShowComponents(false));
    } else {
      setShowComponents(true);
      fadeAnim.setValue(0);
      RNAnimated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  };

  return (
    <View style={[styles.page, { width }]}>
      {/* Undo / Redo / History Row */}
      <View style={styles.undoRow}>
        <Pressable
          style={({ pressed }) => [styles.undoBtn, pressed && canUndo && styles.undoBtnPressed]}
          onPress={onUndo}
          disabled={!canUndo}
        >
          <Feather
            name="corner-up-left"
            size={18}
            color={canUndo ? "#818cf8" : "rgba(255,255,255,0.2)"}
          />
          <Text style={[styles.undoLabel, !canUndo && styles.undoLabelDisabled]}>Undo</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.undoBtn, pressed && canRedo && styles.undoBtnPressed]}
          onPress={onRedo}
          disabled={!canRedo}
        >
          <Feather
            name="corner-up-right"
            size={18}
            color={canRedo ? "#818cf8" : "rgba(255,255,255,0.2)"}
          />
          <Text style={[styles.undoLabel, !canRedo && styles.undoLabelDisabled]}>Redo</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.undoBtn, pressed && styles.undoBtnPressed]}
          onPress={onOpenVersionHistory}
        >
          <Feather name="clock" size={18} color="#818cf8" />
          <Text style={styles.undoLabel}>History</Text>
        </Pressable>
      </View>

      <View style={styles.sectionDivider} />

      {/* Add Component Row */}
      <Pressable
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        onPress={toggleComponents}
      >
        <Text style={styles.plusIcon}>+</Text>
        <Text style={styles.rowLabel}>Add Component</Text>
        <Text style={styles.chevron}>{showComponents ? "\u2212" : "+"}</Text>
      </Pressable>

      {/* Fade-in component list */}
      {showComponents && (
        <RNAnimated.View style={{ opacity: fadeAnim }}>
          {PRESETS.map((preset, i) => (
            <React.Fragment key={preset.label}>
              <Pressable
                style={({ pressed }) => [styles.presetRow, pressed && styles.rowPressed]}
                onPress={() => onAddComponent(preset)}
              >
                <Text style={styles.presetIcon}>{preset.icon}</Text>
                <Text style={styles.rowLabel}>{preset.label}</Text>
              </Pressable>
              {i < PRESETS.length - 1 && <View style={styles.rowDivider} />}
            </React.Fragment>
          ))}
        </RNAnimated.View>
      )}

      <View style={styles.sectionDivider} />

      {/* Layers */}
      <Text style={styles.sectionLabel}>LAYERS (HIGHER IS ABOVE)</Text>
      <TreeView
        components={components}
        onSelectComponent={onSelectComponent}
        onDeleteComponent={onDeleteComponent}
        lockedIds={lockedIds}
        onToggleLock={onToggleLock}
        onMoveComponent={onMoveComponent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 8,
  },
  undoRow: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  undoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  undoBtnPressed: {
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  undoLabel: {
    color: "#818cf8",
    fontSize: 14,
    fontWeight: "600",
  },
  undoLabelDisabled: {
    color: "rgba(255,255,255,0.2)",
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
  plusIcon: {
    color: "#818cf8",
    fontSize: 20,
    fontWeight: "700",
    width: 28,
    textAlign: "center",
  },
  presetRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 13,
    paddingLeft: 32,
    gap: 12,
  },
  presetIcon: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 13,
    fontWeight: "700",
    width: 28,
    textAlign: "center",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.06)",
    marginLeft: 56,
  },
  chevron: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 18,
    fontWeight: "600",
  },
  sectionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginVertical: 8,
  },
  sectionLabel: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 4,
  },
});
