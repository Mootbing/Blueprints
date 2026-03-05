import React, { useState, useCallback, useRef } from "react";
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
import type { Screen, AppBlueprint } from "../../types";
import { PRESETS } from "./ComponentsPage";
import { ComponentsPage } from "./ComponentsPage";
import { LayersPage } from "./LayersPage";
import { SettingsPage } from "./SettingsPage";
import { VariablesPage } from "./VariablesPage";

const PAGE_LABELS = ["Edit", "Layers", "Variables", "Settings"] as const;

interface CanvasMenuProps {
  visible: boolean;
  fadeAnim: Animated.Value;
  screen: Screen;
  blueprint: AppBlueprint;
  isEditMode: boolean;
  snappingEnabled: boolean;
  inspectorEnabled: boolean;
  quickToggleEnabled: boolean;
  onClose: () => void;
  onAddComponent: (preset: (typeof PRESETS)[number]) => void;
  onToggleEditMode: () => void;
  onToggleSnapping: () => void;
  onToggleInspector: () => void;
  onToggleQuickToggle: () => void;
  onBackgroundColorChange: (color: string) => void;
  onCloseBlueprint: () => void;
  onDeleteBlueprint: () => void;
  onScreenUpdate: (screen: Screen) => void;
  onDeleteComponent: (id: string) => void;
  onTreeSelect: (id: string) => void;
  onBlueprintChange?: (updater: AppBlueprint | ((prev: AppBlueprint) => AppBlueprint)) => void;
}

export function CanvasMenu({
  visible,
  fadeAnim,
  screen,
  blueprint,
  isEditMode,
  snappingEnabled,
  inspectorEnabled,
  quickToggleEnabled,
  onClose,
  onAddComponent,
  onToggleEditMode,
  onToggleSnapping,
  onToggleInspector,
  onToggleQuickToggle,
  onBackgroundColorChange,
  onCloseBlueprint,
  onDeleteBlueprint,
  onScreenUpdate,
  onDeleteComponent,
  onTreeSelect,
  onBlueprintChange,
}: CanvasMenuProps) {
  const [pageIndex, setPageIndex] = useState(0);
  const screenWidth = Dimensions.get("window").width;
  const scrollRef = useRef<ScrollView>(null);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = e.nativeEvent.contentOffset.x;
      const idx = Math.round(offsetX / screenWidth);
      setPageIndex(idx);
    },
    [screenWidth],
  );

  const handleTreeSelect = useCallback(
    (id: string) => {
      onTreeSelect(id);
    },
    [onTreeSelect],
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
        >
          {/* Page 1: Components */}
          <ScrollView
            style={{ width: screenWidth }}
            showsVerticalScrollIndicator={false}
            bounces={false}
            nestedScrollEnabled
          >
            <ComponentsPage
              width={screenWidth}
              backgroundColor={screen.backgroundColor ?? "#ffffff"}
              onAddComponent={onAddComponent}
              onBackgroundColorChange={onBackgroundColorChange}
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
              screen={screen}
              components={screen.components}
              onSelectComponent={handleTreeSelect}
              onDeleteComponent={onDeleteComponent}
              onScreenUpdate={onScreenUpdate}
            />
          </ScrollView>

          {/* Page 3: Variables */}
          <ScrollView
            style={{ width: screenWidth }}
            showsVerticalScrollIndicator={false}
            bounces={false}
            nestedScrollEnabled
          >
            <VariablesPage
              width={screenWidth}
              blueprint={blueprint}
              screenId={screen.id}
              onBlueprintChange={onBlueprintChange}
            />
          </ScrollView>

          {/* Page 4: Settings */}
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
              quickToggleEnabled={quickToggleEnabled}
              onToggleEditMode={onToggleEditMode}
              onToggleSnapping={onToggleSnapping}
              onToggleInspector={onToggleInspector}
              onToggleQuickToggle={onToggleQuickToggle}
              onCloseBlueprint={onCloseBlueprint}
              onDeleteBlueprint={onDeleteBlueprint}
              onClose={onClose}
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
    backgroundColor: "rgba(0,0,0,0.7)",
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
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
  },
  doneBtn: {
    paddingHorizontal: 4,
  },
  doneLabel: {
    color: "#818cf8",
    fontSize: 16,
    fontWeight: "600",
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
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  dotActive: {
    backgroundColor: "#818cf8",
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pager: {
    flex: 1,
  },
});
