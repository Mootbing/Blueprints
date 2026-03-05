import React, { useState } from "react";
import { View, Pressable, Text, ScrollView, StyleSheet, Platform } from "react-native";
import type { Component } from "../../types";
import { uuid } from "../../utils/uuid";

const BG_COLORS = [
  "#ffffff", "#f5f5f5", "#e0e0e0", "#1a1a1a", "#000000",
  "#fef3c7", "#fde68a", "#fca5a5", "#fecaca", "#fed7aa",
  "#bbf7d0", "#a7f3d0", "#a5f3fc", "#bae6fd", "#c7d2fe",
  "#ddd6fe", "#f5d0fe", "#fbcfe8",
];

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
  backgroundColor: string;
  onAddComponent: (preset: (typeof PRESETS)[number]) => void;
  onBackgroundColorChange: (color: string) => void;
}

export function ComponentsPage({ width, backgroundColor, onAddComponent, onBackgroundColorChange }: ComponentsPageProps) {
  const [showBgPicker, setShowBgPicker] = useState(false);

  return (
    <View style={[styles.page, { width }]}>
      {/* Background Color */}
      <Pressable
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        onPress={() => setShowBgPicker((v) => !v)}
      >
        <View style={[styles.bgIndicator, { backgroundColor }]} />
        <Text style={styles.rowLabel}>Background Color</Text>
        <Text style={styles.chevron}>{showBgPicker ? "\u2212" : "+"}</Text>
      </Pressable>
      {showBgPicker && (
        <View style={styles.bgPickerWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.bgPickerContent}
          >
            {BG_COLORS.map((col) => {
              const active = backgroundColor === col;
              return (
                <Pressable
                  key={col}
                  style={[
                    styles.bgColorDot,
                    { backgroundColor: col },
                    active && styles.bgColorDotActive,
                  ]}
                  onPress={() => onBackgroundColorChange(col)}
                />
              );
            })}
          </ScrollView>
        </View>
      )}

      <View style={styles.sectionDivider} />

      {/* Components */}
      {PRESETS.map((preset, i) => (
        <React.Fragment key={preset.label}>
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
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
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.06)",
    marginLeft: 56,
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
  sectionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginVertical: 8,
  },
});
