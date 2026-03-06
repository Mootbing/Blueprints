import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Pressable,
  Text,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useKeyboardHeight } from "../hooks/useKeyboardHeight";
import { ColorPickerModal } from "./ColorPickerModal";
import { SliderModal } from "./SliderModal";
import type { Theme } from "../types";

export interface StyleEditingState {
  borderRadius: number;
  borderWidth: number;
  borderColor: string;
  backgroundColor: string;
  hasBorderRadius: boolean;
  hasBorder: boolean;
  hasBackgroundColor: boolean;
  // Flex layout (containers only)
  hasLayoutMode: boolean;
  layoutMode: "absolute" | "flex";
  flexDirection: "row" | "column";
  gap: number;
  justifyContent: "flex-start" | "center" | "flex-end" | "space-between" | "space-around" | "space-evenly";
  alignItems: "flex-start" | "center" | "flex-end" | "stretch";
}

interface StyleEditorToolbarProps {
  state: StyleEditingState;
  onStateChange: (updates: Partial<StyleEditingState>) => void;
  onUndo: () => void;
  onInspect?: () => void;
  onAIChat?: () => void;
  theme?: Theme;
}

const DEFAULT_BORDER_RADII = { none: 0, sm: 4, md: 8, lg: 12, xl: 16, full: 9999 };
const BORDER_RADII_PRESETS = [
  { key: "none", label: "N/A" },
  { key: "sm", label: "SM" },
  { key: "md", label: "MD" },
  { key: "lg", label: "LG" },
  { key: "xl", label: "XL" },
  { key: "full", label: "Full" },
] as const;

const DEFAULT_BORDER_WIDTHS = [
  { value: 0, label: "0" },
  { value: 1, label: "1" },
  { value: 2, label: "2" },
  { value: 3, label: "3" },
  { value: 4, label: "4" },
] as const;

const BORDER_COLORS = [
  "#000000", "#FFFFFF", "#e0e0e0", "#94a3b8",
  "#FF0000", "#ef4444", "#f97316", "#f59e0b",
  "#22c55e", "#10b981", "#06b6d4", "#0ea5e9",
  "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7",
  "#ec4899", "#f43f5e",
];

type SliderTarget = "borderRadius" | "borderWidth" | "gap";
type PanelType = "borderColor" | "backgroundColor" | null;

const SLIDER_CONFIG: Record<SliderTarget, { min: number; max: number }> = {
  borderRadius: { min: 0, max: 50 },
  borderWidth: { min: 0, max: 20 },
  gap: { min: 0, max: 40 },
};

const JUSTIFY_OPTIONS = [
  { value: "flex-start", label: "Start" },
  { value: "center", label: "Center" },
  { value: "flex-end", label: "End" },
  { value: "space-between", label: "Between" },
  { value: "space-around", label: "Around" },
  { value: "space-evenly", label: "Even" },
] as const;

const ALIGN_OPTIONS = [
  { value: "flex-start", label: "Start" },
  { value: "center", label: "Center" },
  { value: "flex-end", label: "End" },
  { value: "stretch", label: "Stretch" },
] as const;

export function StyleEditorToolbar({
  state,
  onStateChange,
  onUndo,
  onInspect,
  onAIChat,
  theme,
}: StyleEditorToolbarProps) {
  const themeBorderColors = useMemo(() => {
    const c = theme?.colors ?? { primary: "#ffffff", secondary: "#cccccc", error: "#dc2626", success: "#22c55e", warning: "#f59e0b" };
    return [c.primary, c.secondary, c.error, c.success, c.warning];
  }, [theme?.colors]);

  const themeBgColors = useMemo(() => {
    const bg = theme?.backgroundColors ?? { background: "#000000", secondaryBackground: "#1a1a1a" };
    const c = theme?.colors ?? { primary: "#ffffff", secondary: "#cccccc", error: "#dc2626", success: "#22c55e", warning: "#f59e0b" };
    return [bg.background, bg.secondaryBackground, c.primary, c.secondary, c.error, c.success, c.warning];
  }, [theme?.backgroundColors, theme?.colors]);
  const keyboardHeight = useKeyboardHeight();

  const [activePanel, setActivePanel] = useState<PanelType>(null);
  const [sliderModal, setSliderModal] = useState<SliderTarget | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<"borderColor" | "backgroundColor">("borderColor");

  const togglePanel = useCallback((panel: PanelType) => {
    setActivePanel((current) => (current === panel ? null : panel));
  }, []);

  const sliderPresets = useMemo(() => {
    if (!sliderModal) return undefined;
    if (sliderModal === "borderRadius") {
      const radii = theme?.borderRadii ?? DEFAULT_BORDER_RADII;
      return BORDER_RADII_PRESETS.map((p) => ({ label: p.label, value: radii[p.key] }));
    }
    if (sliderModal === "borderWidth") {
      return DEFAULT_BORDER_WIDTHS.map((p) => ({ label: p.label, value: p.value }));
    }
    return [0, 4, 8, 12, 16, 24].map((v) => ({ label: String(v), value: v }));
  }, [sliderModal, theme?.borderRadii]);

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View />
        <Pressable style={styles.undoButton} onPress={onUndo}>
          <Text style={styles.undoText}>Undo</Text>
        </Pressable>
      </View>

      {/* Bottom Toolbar */}
      <View style={[styles.bottomToolbar, keyboardHeight > 0 && { bottom: keyboardHeight }]}>
        {/* Border Color Panel */}
        {activePanel === "borderColor" && state.hasBorder && (
          <View style={styles.colorPicker}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.colorPickerContent}
            >
              {themeBorderColors.map((col, i) => (
                <Pressable
                  key={`theme-${i}`}
                  style={[
                    styles.colorOption,
                    { backgroundColor: col },
                    state.borderColor === col && styles.colorOptionSelected,
                  ]}
                  onPress={() => onStateChange({ borderColor: col })}
                >
                  {state.borderColor === col && (
                    <View style={styles.colorCheckmark}>
                      <Text style={styles.checkmarkText}>✓</Text>
                    </View>
                  )}
                </Pressable>
              ))}
              <View style={styles.colorDivider}>
                <View style={styles.colorDividerLine} />
              </View>
              {BORDER_COLORS.map((col) => (
                <Pressable
                  key={col}
                  style={[
                    styles.colorOption,
                    { backgroundColor: col },
                    state.borderColor === col && styles.colorOptionSelected,
                  ]}
                  onPress={() => onStateChange({ borderColor: col })}
                >
                  {state.borderColor === col && (
                    <View style={styles.colorCheckmark}>
                      <Text style={styles.checkmarkText}>✓</Text>
                    </View>
                  )}
                </Pressable>
              ))}
              <Pressable
                style={[styles.colorOption, styles.addCustomButton]}
                onPress={() => { setPickerTarget("borderColor"); setPickerVisible(true); }}
              >
                <Feather name="plus" size={22} color="#FFF" />
              </Pressable>
            </ScrollView>
          </View>
        )}

        {/* Background Color Panel */}
        {activePanel === "backgroundColor" && state.hasBackgroundColor && (
          <View style={styles.colorPicker}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.colorPickerContent}
            >
              {themeBgColors.map((col, i) => (
                <Pressable
                  key={`theme-bg-${i}`}
                  style={[
                    styles.colorOption,
                    { backgroundColor: col },
                    state.backgroundColor === col && styles.colorOptionSelected,
                  ]}
                  onPress={() => onStateChange({ backgroundColor: col })}
                >
                  {state.backgroundColor === col && (
                    <View style={styles.colorCheckmark}>
                      <Text style={styles.checkmarkText}>✓</Text>
                    </View>
                  )}
                </Pressable>
              ))}
              <View style={styles.colorDivider}>
                <View style={styles.colorDividerLine} />
              </View>
              {BORDER_COLORS.map((col) => (
                <Pressable
                  key={col}
                  style={[
                    styles.colorOption,
                    { backgroundColor: col },
                    state.backgroundColor === col && styles.colorOptionSelected,
                  ]}
                  onPress={() => onStateChange({ backgroundColor: col })}
                >
                  {state.backgroundColor === col && (
                    <View style={styles.colorCheckmark}>
                      <Text style={styles.checkmarkText}>✓</Text>
                    </View>
                  )}
                </Pressable>
              ))}
              <Pressable
                style={[styles.colorOption, styles.addCustomButton]}
                onPress={() => { setPickerTarget("backgroundColor"); setPickerVisible(true); }}
              >
                <Feather name="plus" size={22} color="#FFF" />
              </Pressable>
            </ScrollView>
          </View>
        )}

        {/* Flex Layout Options Panel */}
        {state.hasLayoutMode && state.layoutMode === "flex" && activePanel === null && (
          <View style={styles.flexPanel}>
            <View style={styles.flexRow}>
              <Text style={styles.flexLabel}>Justify</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.flexOptionsRow}>
                {JUSTIFY_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.value}
                    style={[styles.flexOption, state.justifyContent === opt.value && styles.flexOptionActive]}
                    onPress={() => onStateChange({ justifyContent: opt.value })}
                  >
                    <Text style={[styles.flexOptionText, state.justifyContent === opt.value && styles.flexOptionTextActive]}>{opt.label}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
            <View style={styles.flexRow}>
              <Text style={styles.flexLabel}>Align</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.flexOptionsRow}>
                {ALIGN_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.value}
                    style={[styles.flexOption, state.alignItems === opt.value && styles.flexOptionActive]}
                    onPress={() => onStateChange({ alignItems: opt.value })}
                  >
                    <Text style={[styles.flexOptionText, state.alignItems === opt.value && styles.flexOptionTextActive]}>{opt.label}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </View>
        )}

        {/* Icon Toolbar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.iconToolbar}
        >
          {onAIChat && (
            <Pressable
              style={[styles.iconButton]}
              onPress={onAIChat}
            >
              <Text style={{ fontSize: 18 }}>✨</Text>
            </Pressable>
          )}

          {state.hasBorderRadius && (
            <Pressable
              style={[styles.iconButton, sliderModal === "borderRadius" && styles.iconButtonActive]}
              onPress={() => setSliderModal("borderRadius")}
            >
              <View style={styles.radiusIcon}>
                <View style={styles.radiusCorner} />
              </View>
              <Text style={styles.iconSubLabel}>{state.borderRadius}</Text>
            </Pressable>
          )}

          {state.hasBorder && (
            <Pressable
              style={[styles.iconButton, sliderModal === "borderWidth" && styles.iconButtonActive]}
              onPress={() => setSliderModal("borderWidth")}
            >
              <View style={styles.borderWidthIcon}>
                <View style={[styles.borderWidthLine, { height: Math.max(2, state.borderWidth * 2) }]} />
              </View>
              <Text style={styles.iconSubLabel}>{state.borderWidth}</Text>
            </Pressable>
          )}

          {state.hasBorder && (
            <Pressable
              style={[styles.iconButton, activePanel === "borderColor" && styles.iconButtonActive]}
              onPress={() => togglePanel("borderColor")}
            >
              <View style={[styles.colorIndicator, { backgroundColor: state.borderColor }]} />
            </Pressable>
          )}

          {state.hasBackgroundColor && (
            <Pressable
              style={[styles.iconButton, activePanel === "backgroundColor" && styles.iconButtonActive]}
              onPress={() => togglePanel("backgroundColor")}
            >
              <View style={styles.bgColorIcon}>
                <Feather name="droplet" size={14} color="#FFF" />
                <View
                  style={[
                    styles.bgColorBar,
                    { backgroundColor: state.backgroundColor || "#888" },
                  ]}
                />
              </View>
            </Pressable>
          )}

          {/* Layout mode toggle */}
          {state.hasLayoutMode && (
            <Pressable
              style={[styles.iconButton, state.layoutMode === "flex" && styles.iconButtonActive]}
              onPress={() => onStateChange({
                layoutMode: state.layoutMode === "flex" ? "absolute" : "flex",
              })}
            >
              <Feather name={state.layoutMode === "flex" ? "columns" : "move"} size={16} color="#FFFFFF" />
              <Text style={styles.iconSubLabel}>{state.layoutMode === "flex" ? "Flex" : "Abs"}</Text>
            </Pressable>
          )}

          {/* Flex direction toggle */}
          {state.hasLayoutMode && state.layoutMode === "flex" && (
            <Pressable
              style={[styles.iconButton]}
              onPress={() => onStateChange({
                flexDirection: state.flexDirection === "row" ? "column" : "row",
              })}
            >
              <Feather name={state.flexDirection === "row" ? "arrow-right" : "arrow-down"} size={16} color="#FFFFFF" />
              <Text style={styles.iconSubLabel}>{state.flexDirection === "row" ? "Row" : "Col"}</Text>
            </Pressable>
          )}

          {/* Gap slider toggle */}
          {state.hasLayoutMode && state.layoutMode === "flex" && (
            <Pressable
              style={[styles.iconButton, sliderModal === "gap" && styles.iconButtonActive]}
              onPress={() => setSliderModal("gap")}
            >
              <Feather name="maximize-2" size={14} color="#FFFFFF" />
              <Text style={styles.iconSubLabel}>{state.gap}</Text>
            </Pressable>
          )}

          {onInspect && (
            <Pressable
              style={[styles.iconButton]}
              onPress={onInspect}
            >
              <Feather name="code" size={18} color="#FFFFFF" />
            </Pressable>
          )}
        </ScrollView>
      </View>

      <ColorPickerModal
        visible={pickerVisible}
        initialColor={pickerTarget === "borderColor" ? state.borderColor : state.backgroundColor}
        onSelect={(color) => onStateChange({ [pickerTarget]: color })}
        onClose={() => setPickerVisible(false)}
      />

      <SliderModal
        visible={sliderModal !== null}
        title={sliderModal === "borderRadius" ? "Border Radius" : sliderModal === "borderWidth" ? "Border Width" : "Gap"}
        initialValue={sliderModal === "borderRadius" ? state.borderRadius : sliderModal === "borderWidth" ? state.borderWidth : state.gap}
        min={SLIDER_CONFIG[sliderModal ?? "borderRadius"].min}
        max={SLIDER_CONFIG[sliderModal ?? "borderRadius"].max}
        presets={sliderPresets}
        onSelect={(val) => { if (sliderModal) onStateChange({ [sliderModal]: val }); }}
        onClose={() => setSliderModal(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 300,
  },
  topBar: {
    position: "absolute",
    top: 40,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  undoButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.85)",
    borderWidth: 1,
    borderColor: "#1a1a1a",
  },
  undoText: {
    color: "#ccc",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  bottomToolbar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "transparent",
    paddingBottom: 20,
  },
  colorPicker: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: "#1a1a1a",
  },
  colorPickerContent: {
    gap: 12,
    paddingHorizontal: 8,
  },
  colorOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  colorCheckmark: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  checkmarkText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "bold",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  iconToolbar: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  iconButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 22,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#1a1a1a",
  },
  iconButtonActive: {
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#333",
  },
  iconSubLabel: {
    color: "#555",
    fontSize: 10,
    fontWeight: "700",
  },
  radiusIcon: {
    width: 18,
    height: 18,
    justifyContent: "flex-start",
    alignItems: "flex-end",
  },
  radiusCorner: {
    width: 14,
    height: 14,
    borderTopRightRadius: 8,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: "#FFFFFF",
  },
  borderWidthIcon: {
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  borderWidthLine: {
    width: 18,
    backgroundColor: "#FFFFFF",
    borderRadius: 1,
  },
  colorIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  addCustomButton: {
    borderWidth: 2,
    borderColor: "#333",
    backgroundColor: "#111",
  },
  bgColorIcon: {
    alignItems: "center",
    justifyContent: "center",
  },
  bgColorBar: {
    width: 20,
    height: 6,
    marginTop: 2,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: "#333",
  },
  flexPanel: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#1a1a1a",
  },
  flexRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  flexLabel: {
    color: "#444",
    fontSize: 11,
    fontWeight: "700",
    width: 42,
  },
  flexOptionsRow: {
    gap: 6,
  },
  flexOption: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#1a1a1a",
  },
  flexOptionActive: {
    backgroundColor: "#fff",
    borderColor: "#fff",
  },
  flexOptionText: {
    color: "#555",
    fontSize: 11,
    fontWeight: "600",
  },
  flexOptionTextActive: {
    color: "#000",
  },
  colorDivider: {
    width: 20,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  colorDividerLine: {
    width: 1,
    height: 28,
    backgroundColor: "#333",
  },
});
