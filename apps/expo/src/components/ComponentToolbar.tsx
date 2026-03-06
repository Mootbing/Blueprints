import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  View,
  TextInput,
  Pressable,
  Text,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { useKeyboardHeight } from "../hooks/useKeyboardHeight";
import { ColorPickerModal } from "./ColorPickerModal";
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
  // Scroll
  hasScrollable: boolean;
  scrollable: boolean;
  scrollDirection: "vertical" | "horizontal";
  // Shadow
  hasShadow: boolean;
  shadowEnabled: boolean;
  shadowColor: string;
  shadowOpacity: number;
  shadowRadius: number;
  // Gradient
  hasGradient: boolean;
  gradientEnabled: boolean;
  gradientColors: string[];
  gradientDirection: "to-bottom" | "to-right" | "to-bottom-right" | "to-top";
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

type SliderTarget = "borderRadius" | "borderWidth" | "gap" | "shadowRadius" | "shadowOpacity";
type PanelType = "borderColor" | "backgroundColor" | "shadowColor" | "gradientColors" | null;

const SLIDER_CONFIG: Record<SliderTarget, { min: number; max: number }> = {
  borderRadius: { min: 0, max: 50 },
  borderWidth: { min: 0, max: 20 },
  gap: { min: 0, max: 40 },
  shadowRadius: { min: 0, max: 30 },
  shadowOpacity: { min: 0, max: 100 },
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
  const { height: screenHeight } = useWindowDimensions();
  const keyboardHeight = useKeyboardHeight();

  const [activePanel, setActivePanel] = useState<PanelType>(null);
  const [sliderTarget, setSliderTarget] = useState<SliderTarget>("borderRadius");
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<"borderColor" | "backgroundColor" | "shadowColor" | "gradientStop">("borderColor");
  const [editingGradientIndex, setEditingGradientIndex] = useState(0);

  const togglePanel = useCallback((panel: PanelType) => {
    setActivePanel((current) => (current === panel ? null : panel));
  }, []);

  // Dynamic slider config based on target
  const { min: sliderMin, max: sliderMax } = SLIDER_CONFIG[sliderTarget];
  const currentValue = sliderTarget === "borderRadius" ? state.borderRadius
    : sliderTarget === "borderWidth" ? state.borderWidth
    : sliderTarget === "shadowRadius" ? state.shadowRadius
    : sliderTarget === "shadowOpacity" ? Math.round(state.shadowOpacity * 100)
    : sliderTarget === "gap" ? state.gap
    : 0;

  const thumbSize = 40;
  const [trackHeight, setTrackHeight] = useState(screenHeight * 0.25);
  const maxOffset = Math.max(0, trackHeight - thumbSize);

  const sliderOffset = useSharedValue(
    (1 - (currentValue - sliderMin) / (sliderMax - sliderMin)) * maxOffset
  );
  const isDraggingSlider = useRef(false);

  useEffect(() => {
    if (isDraggingSlider.current) return;
    sliderOffset.value =
      (1 - (currentValue - sliderMin) / (sliderMax - sliderMin)) * maxOffset;
  }, [currentValue, sliderMin, sliderMax, maxOffset, sliderOffset]);

  const onTrackLayout = useCallback((e: { nativeEvent: { layout: { height: number } } }) => {
    setTrackHeight(e.nativeEvent.layout.height);
  }, []);

  const updateSliderValue = useCallback((offset: number) => {
    const trackRange = Math.max(1, trackHeight - thumbSize);
    const normalized = 1 - Math.max(0, Math.min(offset / trackRange, 1));
    const newVal = sliderMin + normalized * (sliderMax - sliderMin);
    const rounded = Math.round(newVal);
    if (sliderTarget === "shadowOpacity") {
      onStateChange({ shadowOpacity: rounded / 100 });
    } else {
      onStateChange({ [sliderTarget]: rounded });
    }
  }, [trackHeight, sliderMin, sliderMax, sliderTarget, onStateChange]);

  const setDragging = useCallback((v: boolean) => { isDraggingSlider.current = v; }, []);

  const startOffset = useSharedValue(0);

  const panGesture = useMemo(() =>
    Gesture.Pan()
      .onStart(() => {
        runOnJS(setDragging)(true);
        startOffset.value = sliderOffset.value;
      })
      .onUpdate((e) => {
        const newOffset = Math.max(0, Math.min(maxOffset, startOffset.value + e.translationY));
        sliderOffset.value = newOffset;
        runOnJS(updateSliderValue)(newOffset);
      })
      .onFinalize(() => {
        runOnJS(setDragging)(false);
      }),
    [maxOffset, updateSliderValue, setDragging, startOffset, sliderOffset]
  );

  const sliderThumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sliderOffset.value }],
  }));

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Dynamic Slider - Left Side */}
      {((sliderTarget === "borderRadius" && state.hasBorderRadius) ||
        (sliderTarget === "borderWidth" && state.hasBorder) ||
        (sliderTarget === "gap" && state.hasLayoutMode && state.layoutMode === "flex") ||
        (sliderTarget === "shadowRadius" && state.hasShadow && state.shadowEnabled) ||
        (sliderTarget === "shadowOpacity" && state.hasShadow && state.shadowEnabled)) && (
        <View style={[styles.sizeSliderContainer, keyboardHeight > 0 && { bottom: keyboardHeight + 80 }]}>
          <TextInput
            style={styles.radiusInput}
            value={String(currentValue)}
            onChangeText={(val) => {
              const num = parseInt(val, 10);
              if (!isNaN(num) && num >= 0 && num <= sliderMax) {
                onStateChange({ [sliderTarget]: num });
              } else if (val === "") {
                onStateChange({ [sliderTarget]: 0 });
              }
            }}
            keyboardType="number-pad"
            selectTextOnFocus
          />
          <View style={styles.sliderTrack} onLayout={onTrackLayout}>
            <View style={styles.sliderTrackLine} />
            <GestureDetector gesture={panGesture}>
              <Animated.View style={[styles.sliderThumb, sliderThumbStyle]}>
                <View style={styles.sliderThumbInner} />
              </Animated.View>
            </GestureDetector>
          </View>
        </View>
      )}

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

        {/* Shadow Color Panel */}
        {activePanel === "shadowColor" && state.hasShadow && state.shadowEnabled && (
          <View style={styles.colorPicker}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.colorPickerContent}
            >
              {BORDER_COLORS.map((col) => (
                <Pressable
                  key={col}
                  style={[
                    styles.colorOption,
                    { backgroundColor: col },
                    state.shadowColor === col && styles.colorOptionSelected,
                  ]}
                  onPress={() => onStateChange({ shadowColor: col })}
                >
                  {state.shadowColor === col && (
                    <View style={styles.colorCheckmark}>
                      <Text style={styles.checkmarkText}>✓</Text>
                    </View>
                  )}
                </Pressable>
              ))}
              <Pressable
                style={[styles.colorOption, styles.addCustomButton]}
                onPress={() => { setPickerTarget("shadowColor"); setPickerVisible(true); }}
              >
                <Feather name="plus" size={22} color="#FFF" />
              </Pressable>
            </ScrollView>
          </View>
        )}

        {/* Gradient Colors Panel */}
        {activePanel === "gradientColors" && state.hasGradient && state.gradientEnabled && (
          <View style={styles.colorPicker}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.colorPickerContent}
            >
              {state.gradientColors.map((col, idx) => (
                <Pressable
                  key={idx}
                  style={[
                    styles.colorOption,
                    { backgroundColor: col, borderWidth: 2, borderColor: "#333" },
                  ]}
                  onPress={() => {
                    setEditingGradientIndex(idx);
                    setPickerTarget("gradientStop");
                    setPickerVisible(true);
                  }}
                  onLongPress={() => {
                    if (state.gradientColors.length > 2) {
                      const next = [...state.gradientColors];
                      next.splice(idx, 1);
                      onStateChange({ gradientColors: next });
                    }
                  }}
                >
                  <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700", textShadowColor: "rgba(0,0,0,0.8)", textShadowRadius: 2, textShadowOffset: { width: 0, height: 1 } }}>{idx + 1}</Text>
                </Pressable>
              ))}
              <Pressable
                style={[styles.colorOption, styles.addCustomButton]}
                onPress={() => {
                  const next = [...state.gradientColors, "#888888"];
                  onStateChange({ gradientColors: next });
                }}
              >
                <Feather name="plus" size={22} color="#FFF" />
              </Pressable>
            </ScrollView>
          </View>
        )}

        {/* Border Radius Presets */}
        {sliderTarget === "borderRadius" && state.hasBorderRadius && activePanel === null && (
          <View style={styles.presetsPanel}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetsRow}>
              {BORDER_RADII_PRESETS.map((p) => {
                const radii = theme?.borderRadii ?? DEFAULT_BORDER_RADII;
                const val = radii[p.key];
                const active = state.borderRadius === val;
                return (
                  <Pressable
                    key={p.key}
                    style={[styles.presetButton, active && styles.presetButtonActive]}
                    onPress={() => onStateChange({ borderRadius: val })}
                  >
                    <Text style={[styles.presetLabel, active && styles.presetLabelActive]}>{p.label}</Text>
                    <Text style={[styles.presetValue, active && styles.presetLabelActive]}>{val}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Border Width Presets */}
        {sliderTarget === "borderWidth" && state.hasBorder && activePanel === null && (
          <View style={styles.presetsPanel}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetsRow}>
              {DEFAULT_BORDER_WIDTHS.map((p) => {
                const active = state.borderWidth === p.value;
                return (
                  <Pressable
                    key={p.value}
                    style={[styles.presetButton, active && styles.presetButtonActive]}
                    onPress={() => onStateChange({ borderWidth: p.value })}
                  >
                    <Text style={[styles.presetLabel, active && styles.presetLabelActive]}>{p.label}</Text>
                  </Pressable>
                );
              })}
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
              style={[styles.iconButton, sliderTarget === "borderRadius" && styles.iconButtonActive]}
              onPress={() => setSliderTarget("borderRadius")}
            >
              <View style={styles.radiusIcon}>
                <View style={styles.radiusCorner} />
              </View>
              <Text style={styles.iconSubLabel}>{state.borderRadius}</Text>
            </Pressable>
          )}

          {state.hasBorder && (
            <Pressable
              style={[styles.iconButton, sliderTarget === "borderWidth" && styles.iconButtonActive]}
              onPress={() => setSliderTarget("borderWidth")}
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
              style={[styles.iconButton, sliderTarget === "gap" && styles.iconButtonActive]}
              onPress={() => setSliderTarget("gap")}
            >
              <Feather name="maximize-2" size={14} color="#FFFFFF" />
              <Text style={styles.iconSubLabel}>{state.gap}</Text>
            </Pressable>
          )}

          {/* Scroll toggle */}
          {state.hasScrollable && (
            <Pressable
              style={[styles.iconButton, state.scrollable && styles.iconButtonActive]}
              onPress={() => onStateChange({ scrollable: !state.scrollable })}
            >
              <Feather name="list" size={16} color="#FFFFFF" />
              <Text style={styles.iconSubLabel}>{state.scrollable ? "Scrl" : "No"}</Text>
            </Pressable>
          )}

          {/* Scroll direction toggle */}
          {state.hasScrollable && state.scrollable && (
            <Pressable
              style={[styles.iconButton]}
              onPress={() => onStateChange({
                scrollDirection: state.scrollDirection === "vertical" ? "horizontal" : "vertical",
              })}
            >
              <Feather name={state.scrollDirection === "vertical" ? "arrow-down" : "arrow-right"} size={16} color="#FFFFFF" />
              <Text style={styles.iconSubLabel}>{state.scrollDirection === "vertical" ? "V" : "H"}</Text>
            </Pressable>
          )}

          {/* Shadow toggle */}
          {state.hasShadow && (
            <Pressable
              style={[styles.iconButton, state.shadowEnabled && styles.iconButtonActive]}
              onPress={() => onStateChange({ shadowEnabled: !state.shadowEnabled })}
            >
              <Feather name="sun" size={16} color="#FFFFFF" />
              <Text style={styles.iconSubLabel}>{state.shadowEnabled ? "On" : "Off"}</Text>
            </Pressable>
          )}

          {/* Shadow radius slider */}
          {state.hasShadow && state.shadowEnabled && (
            <Pressable
              style={[styles.iconButton, sliderTarget === "shadowRadius" && styles.iconButtonActive]}
              onPress={() => setSliderTarget("shadowRadius")}
            >
              <Feather name="circle" size={14} color="#FFFFFF" />
              <Text style={styles.iconSubLabel}>{state.shadowRadius}</Text>
            </Pressable>
          )}

          {/* Shadow opacity slider */}
          {state.hasShadow && state.shadowEnabled && (
            <Pressable
              style={[styles.iconButton, sliderTarget === "shadowOpacity" && styles.iconButtonActive]}
              onPress={() => setSliderTarget("shadowOpacity")}
            >
              <Feather name="eye" size={14} color="#FFFFFF" />
              <Text style={styles.iconSubLabel}>{Math.round(state.shadowOpacity * 100)}</Text>
            </Pressable>
          )}

          {/* Shadow color */}
          {state.hasShadow && state.shadowEnabled && (
            <Pressable
              style={[styles.iconButton, activePanel === "shadowColor" && styles.iconButtonActive]}
              onPress={() => togglePanel("shadowColor")}
            >
              <View style={[styles.colorIndicator, { backgroundColor: state.shadowColor }]} />
            </Pressable>
          )}

          {/* Gradient toggle */}
          {state.hasGradient && (
            <Pressable
              style={[styles.iconButton, state.gradientEnabled && styles.iconButtonActive]}
              onPress={() => {
                if (!state.gradientEnabled && state.gradientColors.length < 2) {
                  onStateChange({ gradientEnabled: true, gradientColors: ["#000000", "#ffffff"] });
                } else {
                  onStateChange({ gradientEnabled: !state.gradientEnabled });
                }
              }}
            >
              <Feather name="sunset" size={16} color="#FFFFFF" />
              <Text style={styles.iconSubLabel}>Grad</Text>
            </Pressable>
          )}

          {/* Gradient direction cycle */}
          {state.hasGradient && state.gradientEnabled && (
            <Pressable
              style={[styles.iconButton]}
              onPress={() => {
                const dirs: Array<"to-bottom" | "to-right" | "to-bottom-right" | "to-top"> = ["to-bottom", "to-right", "to-bottom-right", "to-top"];
                const idx = dirs.indexOf(state.gradientDirection);
                onStateChange({ gradientDirection: dirs[(idx + 1) % dirs.length] });
              }}
            >
              <Feather
                name={state.gradientDirection === "to-right" ? "arrow-right" : state.gradientDirection === "to-top" ? "arrow-up" : state.gradientDirection === "to-bottom-right" ? "arrow-down-right" : "arrow-down"}
                size={16}
                color="#FFFFFF"
              />
            </Pressable>
          )}

          {/* Gradient colors panel */}
          {state.hasGradient && state.gradientEnabled && (
            <Pressable
              style={[styles.iconButton, activePanel === "gradientColors" && styles.iconButtonActive]}
              onPress={() => togglePanel("gradientColors")}
            >
              <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: "#fff", overflow: "hidden", flexDirection: "row" }}>
                {state.gradientColors.slice(0, 3).map((c, i) => (
                  <View key={i} style={{ flex: 1, backgroundColor: c }} />
                ))}
              </View>
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
        initialColor={
          pickerTarget === "borderColor" ? state.borderColor
          : pickerTarget === "shadowColor" ? state.shadowColor
          : pickerTarget === "gradientStop" ? (state.gradientColors[editingGradientIndex] ?? "#000000")
          : state.backgroundColor
        }
        onSelect={(color) => {
          if (pickerTarget === "gradientStop") {
            const next = [...state.gradientColors];
            next[editingGradientIndex] = color;
            onStateChange({ gradientColors: next });
          } else {
            onStateChange({ [pickerTarget]: color });
          }
        }}
        onClose={() => setPickerVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 300,
  },
  sizeSliderContainer: {
    position: "absolute",
    left: 20,
    top: "20%",
    bottom: "15%",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  radiusInput: {
    width: 44,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#1a1a1a",
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    padding: 0,
  },
  sliderTrack: {
    flex: 1,
    width: 40,
    justifyContent: "flex-start",
    alignItems: "center",
    position: "relative",
  },
  sliderTrackLine: {
    width: 4,
    height: "100%",
    backgroundColor: "#333",
    borderRadius: 2,
    position: "absolute",
  },
  sliderThumb: {
    position: "absolute",
    top: 0,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  sliderThumbInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
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
  presetsPanel: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#1a1a1a",
  },
  presetsRow: {
    gap: 8,
    paddingHorizontal: 4,
  },
  presetButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#1a1a1a",
    alignItems: "center",
  },
  presetButtonActive: {
    backgroundColor: "#fff",
    borderColor: "#fff",
  },
  presetLabel: {
    color: "#555",
    fontSize: 12,
    fontWeight: "700",
  },
  presetValue: {
    color: "#333",
    fontSize: 10,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  presetLabelActive: {
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
