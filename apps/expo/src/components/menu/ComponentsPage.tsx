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
  // --- Compound Components ---
  {
    label: "Card",
    icon: "CRD",
    create: (x, y) => ({
      type: "card" as const,
      id: uuid(),
      layout: { x: 0.06, y, width: 0.88, height: 0.35 },
      title: "Card Title",
      subtitle: "Subtitle text",
      body: "Card body content goes here.",
      backgroundColor: "#1a1a1a",
      borderRadius: 16,
    }),
  },
  {
    label: "App Bar",
    icon: "NAV",
    create: (x, y) => ({
      type: "appBar" as const,
      id: uuid(),
      layout: { x: 0, y: 0, width: 1, height: 0.07 },
      title: "Page Title",
      leftIcon: "arrow-left",
      rightIcon: "more-vertical",
      iconLibrary: "feather" as const,
      backgroundColor: "#000000",
    }),
  },
  {
    label: "Tab Bar",
    icon: "TAB",
    create: (x, y) => ({
      type: "tabBar" as const,
      id: uuid(),
      layout: { x: 0, y: 0.92, width: 1, height: 0.08 },
      tabs: [
        { label: "Home", icon: "home" },
        { label: "Search", icon: "search" },
        { label: "Profile", icon: "person" },
      ],
      activeColor: "#ffffff",
      inactiveColor: "#666666",
      backgroundColor: "#000000",
    }),
  },
  {
    label: "Checkbox",
    icon: "CHK",
    create: (x, y) => ({
      type: "checkbox" as const,
      id: uuid(),
      layout: { x, y, width: 0.5, height: 0.05 },
      label: "Check me",
      checked: false,
    }),
  },
  {
    label: "Search",
    icon: "SRC",
    create: (x, y) => ({
      type: "searchBar" as const,
      id: uuid(),
      layout: { x: 0.06, y, width: 0.88, height: 0.06 },
      placeholder: "Search...",
      backgroundColor: "#1a1a1a",
      borderRadius: 20,
    }),
  },
  {
    label: "Slider",
    icon: "SLD",
    create: (x, y) => ({
      type: "slider" as const,
      id: uuid(),
      layout: { x: 0.06, y, width: 0.88, height: 0.06 },
      value: 50,
      min: 0,
      max: 100,
      activeTrackColor: "#ffffff",
      trackColor: "#333333",
    }),
  },
  {
    label: "Select",
    icon: "SEL",
    create: (x, y) => ({
      type: "select" as const,
      id: uuid(),
      layout: { x: 0.06, y, width: 0.88, height: 0.06 },
      placeholder: "Choose an option",
      options: [
        { label: "Option 1", value: "1" },
        { label: "Option 2", value: "2" },
        { label: "Option 3", value: "3" },
      ],
    }),
  },
  {
    label: "Badge",
    icon: "BDG",
    create: (x, y) => ({
      type: "badge" as const,
      id: uuid(),
      layout: { x, y, width: 0.15, height: 0.035 },
      text: "New",
      backgroundColor: "#ffffff",
      textColor: "#000000",
    }),
  },
  {
    label: "Avatar",
    icon: "AVT",
    create: (x, y) => ({
      type: "avatar" as const,
      id: uuid(),
      layout: { x, y, width: 0.12, height: 0.06 },
      initials: "AB",
      backgroundColor: "#333333",
    }),
  },
  {
    label: "Progress",
    icon: "PRG",
    create: (x, y) => ({
      type: "progressBar" as const,
      id: uuid(),
      layout: { x: 0.06, y, width: 0.88, height: 0.03 },
      value: 0.6,
      fillColor: "#ffffff",
      trackColor: "#333333",
    }),
  },
  {
    label: "Chip",
    icon: "CHP",
    create: (x, y) => ({
      type: "chip" as const,
      id: uuid(),
      layout: { x, y, width: 0.2, height: 0.045 },
      label: "Tag",
      selected: false,
    }),
  },
  {
    label: "Segments",
    icon: "SEG",
    create: (x, y) => ({
      type: "segmentedControl" as const,
      id: uuid(),
      layout: { x: 0.06, y, width: 0.88, height: 0.055 },
      options: [
        { label: "Tab 1", value: "1" },
        { label: "Tab 2", value: "2" },
        { label: "Tab 3", value: "3" },
      ],
    }),
  },
  {
    label: "Carousel",
    icon: "CAR",
    create: (x, y) => ({
      type: "carousel" as const,
      id: uuid(),
      layout: { x: 0.06, y, width: 0.88, height: 0.3 },
      items: [
        { id: uuid(), title: "Slide 1", imageUrl: "https://placekitten.com/400/300" },
        { id: uuid(), title: "Slide 2", imageUrl: "https://placekitten.com/401/300" },
        { id: uuid(), title: "Slide 3", imageUrl: "https://placekitten.com/402/300" },
      ],
      showDots: true,
      borderRadius: 12,
    }),
  },
  {
    label: "Accordion",
    icon: "ACC",
    create: (x, y) => ({
      type: "accordion" as const,
      id: uuid(),
      layout: { x: 0.06, y, width: 0.88, height: 0.15 },
      title: "Accordion Section",
      expanded: true,
      backgroundColor: "#1a1a1a",
      borderRadius: 8,
    }),
  },
  {
    label: "Sheet",
    icon: "SHT",
    create: (x, y) => ({
      type: "bottomSheet" as const,
      id: uuid(),
      layout: { x: 0, y: 0.5, width: 1, height: 0.5 },
      backgroundColor: "#1a1a1a",
      borderRadius: 16,
      handleColor: "#666666",
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
          onPress={onCloseAndSave}
        >
          <Feather name="save" size={18} color="#fff" />
          <Text style={styles.undoLabel}>Close & Save</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.undoBtn, pressed && styles.undoBtnPressed]}
          onPress={onOpenSettings}
        >
          <Feather name="settings" size={18} color="#fff" />
          <Text style={styles.undoLabel}>Settings</Text>
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
    paddingTop: 0,
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
