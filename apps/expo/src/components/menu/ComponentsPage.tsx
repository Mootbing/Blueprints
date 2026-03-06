import React from "react";
import { View, Pressable, Text, ScrollView, StyleSheet, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import type { Component } from "../../types";
import { uuid } from "../../utils/uuid";

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
      color: "#ccc",
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
      backgroundColor: "#1a1a1a",
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
      backgroundColor: "#111",
      borderColor: "#333",
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
          color: "#ccc",
          fontWeight: "500" as const,
        },
        {
          type: "toggle" as const,
          id: uuid(),
          layout: { x: 0.65, y: 0.0, width: 0.35, height: 1.0 },
          defaultValue: false,
          activeColor: "#ffffff",
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
      color: "#1a1a1a",
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
      backgroundColor: "#1a1a1a",
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
      color: "#ccc",
    }),
  },
  {
    label: "List",
    icon: "LST",
    create: (x, y) => ({
      type: "container" as const,
      id: uuid(),
      layout: { x, y, width: 0.9, height: 0.3 },
      backgroundColor: "#0a0a0a",
      borderRadius: 12,
      borderWidth: 1,
      borderColor: "#1a1a1a",
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
              color: "#ccc",
              fontWeight: "500" as const,
            },
            {
              type: "text" as const,
              id: uuid(),
              layout: { x: 0.05, y: 0.55, width: 0.9, height: 0.35 },
              content: "Description",
              fontSize: 13,
              color: "#555",
              fontWeight: "normal" as const,
            },
          ],
        },
        {
          type: "divider" as const,
          id: uuid(),
          layout: { x: 0.05, y: 0.33, width: 0.9, height: 0.005 },
          color: "#1a1a1a",
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
              color: "#ccc",
              fontWeight: "500" as const,
            },
            {
              type: "text" as const,
              id: uuid(),
              layout: { x: 0.05, y: 0.55, width: 0.9, height: 0.35 },
              content: "Description",
              fontSize: 13,
              color: "#555",
              fontWeight: "normal" as const,
            },
          ],
        },
        {
          type: "divider" as const,
          id: uuid(),
          layout: { x: 0.05, y: 0.67, width: 0.9, height: 0.005 },
          color: "#1a1a1a",
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
              color: "#ccc",
              fontWeight: "500" as const,
            },
            {
              type: "text" as const,
              id: uuid(),
              layout: { x: 0.05, y: 0.55, width: 0.9, height: 0.35 },
              content: "Description",
              fontSize: 13,
              color: "#555",
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
      backgroundColor: "#0a0a0a",
      borderRadius: 12,
      borderWidth: 1,
      borderColor: "#1a1a1a",
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
      backgroundColor: "#0a0a0a",
      borderRadius: 16,
      borderWidth: 1,
      borderColor: "#1a1a1a",
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
          color: "#fff",
          fontWeight: "bold" as const,
        },
        {
          type: "text" as const,
          id: uuid(),
          layout: { x: 0.05, y: 0.78, width: 0.9, height: 0.15 },
          content: "Card subtitle goes here",
          fontSize: 13,
          color: "#555",
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
          color: "#ccc",
        },
        {
          type: "text" as const,
          id: uuid(),
          layout: { x: 0.15, y: 0.0, width: 0.7, height: 1.0 },
          content: "Page Title",
          fontSize: 18,
          color: "#ccc",
          fontWeight: "600" as const,
          textAlign: "center" as const,
        },
      ],
    }),
  },
];

interface ComponentsPageProps {
  width: number;
  onAddComponent: (preset: (typeof PRESETS)[number]) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onOpenVersionHistory?: () => void;
}

export function ComponentsPage({
  width,
  onAddComponent,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onOpenVersionHistory,
}: ComponentsPageProps) {
  return (
    <View style={[styles.page, { width }]}>
      {/* Undo / Redo / History Row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.undoRow}
      >
        <Pressable
          style={({ pressed }) => [styles.undoBtn, pressed && canUndo && styles.undoBtnPressed]}
          onPress={onUndo}
          disabled={!canUndo}
        >
          <Feather
            name="corner-up-left"
            size={18}
            color={canUndo ? "#fff" : "#333"}
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
            color={canRedo ? "#fff" : "#333"}
          />
          <Text style={[styles.undoLabel, !canRedo && styles.undoLabelDisabled]}>Redo</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.undoBtn, pressed && styles.undoBtnPressed]}
          onPress={onOpenVersionHistory}
        >
          <Feather name="clock" size={18} color="#fff" />
          <Text style={styles.undoLabel}>History</Text>
        </Pressable>
      </ScrollView>

      <View style={styles.sectionDivider} />

      {/* Add Component */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeader}>ADD COMPONENTS</Text>
      </View>

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

    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 8,
  },
  undoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
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
    backgroundColor: "#111",
  },
  undoLabel: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  undoLabelDisabled: {
    color: "#333",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 13,
    gap: 12,
  },
  rowPressed: {
    backgroundColor: "#111",
  },
  rowLabel: {
    color: "#ccc",
    fontSize: 15,
    fontWeight: "500",
    flex: 1,
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
  presetRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 13,
    paddingLeft: 32,
    gap: 12,
  },
  presetIcon: {
    color: "#555",
    fontSize: 12,
    fontWeight: "600",
    width: 28,
    textAlign: "center",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    letterSpacing: 0.5,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#111",
    marginLeft: 56,
  },
sectionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#1a1a1a",
    marginVertical: 8,
  },
});
