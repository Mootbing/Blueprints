import React, { useState } from "react";
import { View, Pressable, Text, ScrollView, StyleSheet, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import type { Component } from "../../types";
import { uuid } from "../../utils/uuid";
import { ShareModal } from "../ShareModal";
import type { SyncableStorageProvider } from "../../storage/StorageProvider";

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
      type: "button" as const,
      id: uuid(),
      layout: { x, y, width: 0.7, height: 0.065 },
      label: "Button",
      backgroundColor: "#1a1a1a",
      textColor: "#ffffff",
      fontSize: 16,
      fontWeight: "600" as const,
      textAlign: "center" as const,
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
      borderWidth: 1,
      borderColor: "#333",
      borderRadius: 8,
      backgroundColor: "#111",
    }),
  },
  {
    label: "Toggle",
    icon: "ON",
    create: (x, y) => ({
      type: "toggle" as const,
      id: uuid(),
      layout: { x, y, width: 0.15, height: 0.05 },
      defaultValue: false,
      activeColor: "#ffffff",
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
    label: "Scroll",
    icon: "SCR",
    create: (x, y) => ({
      type: "container" as const,
      id: uuid(),
      layout: { x, y, width: 0.85, height: 0.4 },
      backgroundColor: "#0a0a0a",
      borderRadius: 12,
      borderWidth: 1,
      borderColor: "#1a1a1a",
      padding: 0.02,
      scrollable: true,
      scrollDirection: "vertical" as const,
    }),
  },
];

interface ComponentsPageProps {
  width: number;
  onAddComponent: (preset: (typeof PRESETS)[number]) => void;
  onOpenVersionHistory?: () => void;
  storage?: import("../../storage/StorageProvider").StorageProvider;
  slateId?: string;
  onOpenSettings?: () => void;
  onCloseAndSave?: () => void;
}

export function ComponentsPage({
  width,
  onAddComponent,
  onOpenVersionHistory,
  storage,
  slateId,
  onOpenSettings,
  onCloseAndSave,
}: ComponentsPageProps) {
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const isSyncable = storage && 'joinCollabChannel' in storage;
  return (
    <View style={[styles.page, { width }]}>
      {/* Undo / Redo / History Row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.undoRow}
      >
        <Pressable
          style={({ pressed }) => [styles.undoBtn, pressed && styles.undoBtnPressed]}
          onPress={onOpenVersionHistory}
        >
          <Feather name="clock" size={18} color="#fff" />
          <Text style={styles.undoLabel}>History</Text>
        </Pressable>
        {isSyncable && slateId && (
          <Pressable
            style={({ pressed }) => [styles.undoBtn, pressed && styles.undoBtnPressed]}
            onPress={() => setShareModalOpen(true)}
          >
            <Feather name="share" size={18} color="#fff" />
            <Text style={styles.undoLabel}>Live Share</Text>
          </Pressable>
        )}
        <Pressable
          style={({ pressed }) => [styles.undoBtn, pressed && styles.undoBtnPressed]}
          onPress={onOpenSettings}
        >
          <Feather name="settings" size={18} color="#fff" />
          <Text style={styles.undoLabel}>Slate Settings</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.undoBtn, pressed && styles.undoBtnPressed]}
          onPress={onCloseAndSave}
        >
          <Feather name="save" size={18} color="#fff" />
          <Text style={styles.undoLabel}>Close & Save</Text>
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

      {isSyncable && slateId && (
        <ShareModal
          visible={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          storage={storage as SyncableStorageProvider}
          slateId={slateId}
        />
      )}
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
    marginLeft: 48,
  },
sectionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#1a1a1a",
    marginVertical: 8,
  },
});
