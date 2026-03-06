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
import type { TextStyle } from "react-native";
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

// ── State interfaces ──

export interface TextEditingState {
  text: string;
  fontSize: number;
  color: string;
  backgroundColor: string;
  fontFamily: string;
  textAlign: "left" | "center" | "right";
  wrapMode: "wrap-word" | "wrap-text" | "no-wrap";
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
  textDecorationLine: "none" | "underline";
}

export interface StyleEditingState {
  borderRadius: number;
  borderWidth: number;
  borderColor: string;
  backgroundColor: string;
  hasBorderRadius: boolean;
  hasBorder: boolean;
  hasBackgroundColor: boolean;
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

// ── Props ──

type EditorToolbarProps = {
  onUndo: () => void;
  onInspect?: () => void;
  onAIChat?: () => void;
  theme?: Theme;
} & (
  | { mode: "text"; textState: TextEditingState; onTextStateChange: (u: Partial<TextEditingState>) => void; styleState?: undefined; onStyleStateChange?: undefined }
  | { mode: "style"; styleState: StyleEditingState; onStyleStateChange: (u: Partial<StyleEditingState>) => void; textState?: undefined; onTextStateChange?: undefined }
);

// ── Constants ──

const FONTS = [
  { name: "Modern", value: "System" },
  { name: "Classic", value: "serif" },
  { name: "Signature", value: "cursive" },
  { name: "Typewriter", value: "monospace" },
];

const COLORS = [
  "#FFFFFF", "#000000", "#FF0000", "#00FF00", "#0000FF", "#FFFF00",
  "#FF00FF", "#00FFFF", "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A",
  "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E2",
];

const BORDER_COLORS = [
  "#000000", "#FFFFFF", "#e0e0e0", "#94a3b8",
  "#FF0000", "#ef4444", "#f97316", "#f59e0b",
  "#22c55e", "#10b981", "#06b6d4", "#0ea5e9",
  "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7",
  "#ec4899", "#f43f5e",
];

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
  { value: 5, label: "5" },
  { value: 6, label: "6" },
  { value: 7, label: "7" },
  { value: 8, label: "8" },
  { value: 9, label: "9" },
  { value: 10, label: "10" },
] as const;

type StyleSliderTarget = "borderRadius" | "borderWidth" | "gap" | "shadowRadius" | "shadowOpacity";

const SLIDER_CONFIG: Record<StyleSliderTarget, { min: number; max: number }> = {
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

const BUBBLE_WIDTH = 100;
const BUBBLE_GAP = 12;
const BUBBLE_STEP = BUBBLE_WIDTH + BUBBLE_GAP;

const COLOR_SIZE = 44;
const COLOR_GAP = 12;
const COLOR_STEP = COLOR_SIZE + COLOR_GAP;

const DIVIDER_WIDTH = 20;
const DIVIDER_STEP = DIVIDER_WIDTH + COLOR_GAP;

// ── Snapping sub-components (from text editor) ──

interface BubbleOption {
  label: string;
  value: string;
  labelStyle?: TextStyle;
}

function BubbleRow({
  options,
  activeValue,
  onSelect,
}: {
  options: BubbleOption[];
  activeValue: string;
  onSelect: (value: string) => void;
}) {
  const { width: sw } = useWindowDimensions();
  const inset = sw / 2 - BUBBLE_WIDTH / 2;
  const scrollRef = useRef<ScrollView>(null);
  const lastIdx = useRef(-1);
  const cbRef = useRef({ options, onSelect });
  cbRef.current = { options, onSelect };

  const snapOffsets = useMemo(
    () => options.map((_, i) => i * BUBBLE_STEP),
    [options.length],
  );

  useEffect(() => {
    const idx = options.findIndex((o) => o.value === activeValue);
    if (idx >= 0) {
      lastIdx.current = idx;
      setTimeout(() => scrollRef.current?.scrollTo({ x: idx * BUBBLE_STEP, animated: false }), 0);
    }
  }, []);

  const handleScroll = useCallback(
    (e: { nativeEvent: { contentOffset: { x: number } } }) => {
      const x = e.nativeEvent.contentOffset.x;
      const index = Math.round(x / BUBBLE_STEP);
      const clamped = Math.max(0, Math.min(index, cbRef.current.options.length - 1));
      if (clamped !== lastIdx.current) {
        lastIdx.current = clamped;
        cbRef.current.onSelect(cbRef.current.options[clamped].value);
      }
    },
    [],
  );

  const scrollToIdx = useCallback((index: number) => {
    scrollRef.current?.scrollTo({ x: index * BUBBLE_STEP, animated: true });
  }, []);

  return (
    <View style={s.bubblePanel}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToOffsets={snapOffsets}
        decelerationRate="fast"
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={[
          s.bubbleScrollContent,
          { paddingLeft: inset, paddingRight: inset },
        ]}
      >
        {options.map((opt, index) => {
          const active = opt.value === activeValue;
          return (
            <Pressable
              key={opt.value}
              style={[s.fontButton, active && s.fontButtonActive]}
              onPress={() => scrollToIdx(index)}
            >
              <Text
                style={[s.fontButtonText, opt.labelStyle, active && s.fontButtonTextActive]}
                numberOfLines={1}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function ToggleBubbleRow({
  options,
  values,
  onToggle,
}: {
  options: { label: string; value: string; labelStyle?: TextStyle }[];
  values: Record<string, boolean>;
  onToggle: (value: string) => void;
}) {
  const { width: sw } = useWindowDimensions();
  const inset = sw / 2 - BUBBLE_WIDTH / 2;
  const scrollRef = useRef<ScrollView>(null);
  const snapOffsets = useMemo(
    () => options.map((_, i) => i * BUBBLE_STEP),
    [options.length],
  );

  const scrollToIdx = useCallback((index: number) => {
    scrollRef.current?.scrollTo({ x: index * BUBBLE_STEP, animated: true });
  }, []);

  return (
    <View style={s.bubblePanel}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToOffsets={snapOffsets}
        decelerationRate="fast"
        contentContainerStyle={[
          s.bubbleScrollContent,
          { paddingLeft: inset, paddingRight: inset },
        ]}
      >
        {options.map((opt, index) => {
          const active = values[opt.value];
          return (
            <Pressable
              key={opt.value}
              style={[s.fontButton, active && s.fontButtonActive]}
              onPress={() => { scrollToIdx(index); onToggle(opt.value); }}
            >
              <Text
                style={[s.fontButtonText, opt.labelStyle, active && s.fontButtonTextActive]}
                numberOfLines={1}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function ScrollColorRow({
  colors,
  activeColor,
  onSelect,
  showNone,
  onAddCustom,
  themeColors,
}: {
  colors: string[];
  activeColor: string;
  onSelect: (color: string) => void;
  showNone?: boolean;
  onAddCustom?: () => void;
  themeColors?: string[];
}) {
  const { width: sw } = useWindowDimensions();
  const inset = sw / 2 - COLOR_SIZE / 2;
  const scrollRef = useRef<ScrollView>(null);
  const lastIdx = useRef(-1);
  const allItems = useMemo(() => {
    const base = showNone ? ["transparent", ...colors] : colors;
    if (themeColors && themeColors.length > 0) {
      return [...themeColors, "|", ...base];
    }
    return base;
  }, [colors, showNone, themeColors]);
  const cbRef = useRef({ allItems, onSelect });
  cbRef.current = { allItems, onSelect };

  const snapOffsets = useMemo(
    () => {
      let offset = 0;
      return allItems.map((item) => {
        const val = offset;
        offset += item === "|" ? DIVIDER_STEP : COLOR_STEP;
        return val;
      });
    },
    [allItems],
  );

  useEffect(() => {
    const idx = allItems.indexOf(activeColor);
    if (idx >= 0) {
      lastIdx.current = idx;
      setTimeout(() => scrollRef.current?.scrollTo({ x: snapOffsets[idx], animated: false }), 0);
    }
  }, []);

  const handleScroll = useCallback(
    (e: { nativeEvent: { contentOffset: { x: number } } }) => {
      const x = e.nativeEvent.contentOffset.x;
      const { allItems: items, onSelect: sel } = cbRef.current;
      let closestIdx = 0;
      let closestDist = Infinity;
      let offset = 0;
      for (let i = 0; i < items.length; i++) {
        if (items[i] !== "|") {
          const dist = Math.abs(offset - x);
          if (dist < closestDist) { closestDist = dist; closestIdx = i; }
        }
        offset += items[i] === "|" ? DIVIDER_STEP : COLOR_STEP;
      }
      if (closestIdx !== lastIdx.current) {
        lastIdx.current = closestIdx;
        sel(items[closestIdx]);
      }
    },
    [],
  );

  const scrollToIdx = useCallback((index: number) => {
    let offset = 0;
    const items = cbRef.current.allItems;
    for (let i = 0; i < index; i++) {
      offset += items[i] === "|" ? DIVIDER_STEP : COLOR_STEP;
    }
    scrollRef.current?.scrollTo({ x: offset, animated: true });
  }, []);

  return (
    <View style={s.colorPicker}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToOffsets={snapOffsets.filter((_, i) => allItems[i] !== "|")}
        decelerationRate="fast"
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={[
          s.colorScrollContent,
          { paddingLeft: inset, paddingRight: inset },
        ]}
      >
        {allItems.map((col, index) => {
          if (col === "|") {
            return (
              <View key={`divider-${index}`} style={s.colorDivider}>
                <View style={s.colorDividerLine} />
              </View>
            );
          }
          const isNone = col === "transparent";
          const active = col === activeColor;
          return (
            <Pressable
              key={`${col}-${index}`}
              style={[
                s.colorOption,
                isNone
                  ? { backgroundColor: "transparent", borderWidth: 1, borderColor: "#FFF" }
                  : { backgroundColor: col },
                active && s.colorOptionSelected,
              ]}
              onPress={() => scrollToIdx(index)}
            >
              {isNone && <Text style={s.noneText}>∅</Text>}
              {!isNone && active && (
                <View style={s.colorCheckmark}>
                  <Text style={s.checkmarkText}>✓</Text>
                </View>
              )}
            </Pressable>
          );
        })}
        {onAddCustom && (
          <Pressable
            style={[s.colorOption, s.addCustomButton]}
            onPress={onAddCustom}
          >
            <Feather name="plus" size={22} color="#FFF" />
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

// ── Inline color row for style mode (non-snapping, from ComponentToolbar) ──

function InlineColorRow({
  colors,
  themeColors,
  activeColor,
  onSelect,
  onAddCustom,
}: {
  colors: string[];
  themeColors: string[];
  activeColor: string;
  onSelect: (color: string) => void;
  onAddCustom: () => void;
}) {
  return (
    <View style={s.inlineColorPicker}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.inlineColorContent}
      >
        {themeColors.map((col, i) => (
          <Pressable
            key={`theme-${i}`}
            style={[s.colorOption, { backgroundColor: col }, activeColor === col && s.colorOptionSelected]}
            onPress={() => onSelect(col)}
          >
            {activeColor === col && (
              <View style={s.colorCheckmark}><Text style={s.checkmarkText}>✓</Text></View>
            )}
          </Pressable>
        ))}
        <View style={s.colorDivider}><View style={s.colorDividerLine} /></View>
        {colors.map((col) => (
          <Pressable
            key={col}
            style={[s.colorOption, { backgroundColor: col }, activeColor === col && s.colorOptionSelected]}
            onPress={() => onSelect(col)}
          >
            {activeColor === col && (
              <View style={s.colorCheckmark}><Text style={s.checkmarkText}>✓</Text></View>
            )}
          </Pressable>
        ))}
        <Pressable style={[s.colorOption, s.addCustomButton]} onPress={onAddCustom}>
          <Feather name="plus" size={22} color="#FFF" />
        </Pressable>
      </ScrollView>
    </View>
  );
}

// ── Panel type ──

type PanelType =
  | "fonts" | "color" | "highlight" | "format" | "alignment" | "textSizes"
  | "borderColor" | "backgroundColor" | "shadowColor" | "gradientColors"
  | null;

// ── Main component ──

export function EditorToolbar(props: EditorToolbarProps) {
  const { mode, onUndo, onInspect, onAIChat, theme } = props;

  // ── Theme-derived colors ──
  const themeColorValues = useMemo(() => {
    const c = theme?.colors ?? { primary: "#ffffff", secondary: "#cccccc", error: "#dc2626", success: "#22c55e", warning: "#f59e0b" };
    return [c.primary, c.secondary, c.error, c.success, c.warning];
  }, [theme?.colors]);

  const highlightColorValues = useMemo(() => {
    const bg = theme?.backgroundColors ?? { background: "#000000", secondaryBackground: "#1a1a1a" };
    const c = theme?.colors ?? { primary: "#ffffff", secondary: "#cccccc", error: "#dc2626", success: "#22c55e", warning: "#f59e0b" };
    return [bg.background, bg.secondaryBackground, c.primary, c.secondary, c.error, c.success, c.warning];
  }, [theme?.backgroundColors, theme?.colors]);

  const themeFontSizes = useMemo(() => {
    const fs = theme?.fontSizes ?? { xs: 10, sm: 12, base: 14, md: 16, lg: 20, xl: 24, xxl: 32 };
    return [
      { label: "XS", value: String(fs.xs), size: fs.xs },
      { label: "SM", value: String(fs.sm), size: fs.sm },
      { label: "Base", value: String(fs.base), size: fs.base },
      { label: "MD", value: String(fs.md), size: fs.md },
      { label: "LG", value: String(fs.lg), size: fs.lg },
      { label: "XL", value: String(fs.xl), size: fs.xl },
      { label: "2XL", value: String(fs.xxl), size: fs.xxl },
    ];
  }, [theme?.fontSizes]);

  // ── Common state ──
  const { height: screenHeight } = useWindowDimensions();
  const keyboardHeight = useKeyboardHeight();
  const [activePanel, setActivePanel] = useState<PanelType>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<string>("color");

  // Style-mode slider target
  const [sliderTarget, setSliderTarget] = useState<StyleSliderTarget>("borderRadius");

  const togglePanel = useCallback((panel: PanelType) => {
    setActivePanel((current) => (current === panel ? null : panel));
  }, []);

  // ── Slider config (unified) ──
  const sliderMin = mode === "text" ? 12 : SLIDER_CONFIG[sliderTarget].min;
  const sliderMax = mode === "text" ? 120 : SLIDER_CONFIG[sliderTarget].max;
  const sliderValue = mode === "text"
    ? props.textState!.fontSize
    : sliderTarget === "borderRadius" ? props.styleState!.borderRadius
    : sliderTarget === "borderWidth" ? props.styleState!.borderWidth
    : sliderTarget === "shadowRadius" ? props.styleState!.shadowRadius
    : sliderTarget === "shadowOpacity" ? Math.round(props.styleState!.shadowOpacity * 100)
    : props.styleState!.gap;

  const showSlider = mode === "text" || (
    (sliderTarget === "borderRadius" && props.styleState!.hasBorderRadius) ||
    (sliderTarget === "borderWidth" && props.styleState!.hasBorder) ||
    (sliderTarget === "gap" && props.styleState!.hasLayoutMode && props.styleState!.layoutMode === "flex") ||
    (sliderTarget === "shadowRadius" && props.styleState!.hasShadow && props.styleState!.shadowEnabled) ||
    (sliderTarget === "shadowOpacity" && props.styleState!.hasShadow && props.styleState!.shadowEnabled)
  );

  // ── Vertical slider logic ──
  const thumbSize = 40;
  const [trackHeight, setTrackHeight] = useState(screenHeight * 0.25);
  const maxOffset = Math.max(0, trackHeight - thumbSize);

  const sliderOffset = useSharedValue(
    (1 - (sliderValue - sliderMin) / (sliderMax - sliderMin)) * maxOffset
  );
  const isDraggingSlider = useRef(false);

  useEffect(() => {
    if (isDraggingSlider.current) return;
    sliderOffset.value =
      (1 - (sliderValue - sliderMin) / (sliderMax - sliderMin)) * maxOffset;
  }, [sliderValue, sliderMin, sliderMax, maxOffset, sliderOffset]);

  const onTrackLayout = useCallback((e: { nativeEvent: { layout: { height: number } } }) => {
    setTrackHeight(e.nativeEvent.layout.height);
  }, []);

  const updateSliderValue = useCallback((offset: number) => {
    const trackRange = Math.max(1, trackHeight - thumbSize);
    const normalized = 1 - Math.max(0, Math.min(offset / trackRange, 1));
    const newVal = Math.round(sliderMin + normalized * (sliderMax - sliderMin));
    if (mode === "text") {
      props.onTextStateChange?.({ fontSize: newVal });
    } else if (sliderTarget === "shadowOpacity") {
      props.onStyleStateChange?.({ shadowOpacity: newVal / 100 });
    } else {
      props.onStyleStateChange?.({ [sliderTarget]: newVal } as any);
    }
  }, [trackHeight, sliderMin, sliderMax, mode, sliderTarget, props.onTextStateChange, props.onStyleStateChange]);

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

  // ── Text-mode helpers ──
  const isBold = mode === "text" ? props.textState!.fontWeight === "bold" : false;
  const isItalic = mode === "text" ? props.textState!.fontStyle === "italic" : false;
  const isUnderline = mode === "text" ? props.textState!.textDecorationLine === "underline" : false;

  // ── Color picker resolution ──
  const [editingGradientIndex, setEditingGradientIndex] = useState(0);

  const pickerInitialColor = useMemo(() => {
    if (mode === "text") {
      return pickerTarget === "color" ? props.textState!.color : props.textState!.backgroundColor;
    }
    if (pickerTarget === "shadowColor") return props.styleState!.shadowColor;
    if (pickerTarget === "gradientStop") return props.styleState!.gradientColors[editingGradientIndex] ?? "#000000";
    return pickerTarget === "borderColor" ? props.styleState!.borderColor : props.styleState!.backgroundColor;
  }, [mode, pickerTarget, editingGradientIndex, props.textState, props.styleState]);

  const handlePickerSelect = useCallback((color: string) => {
    if (mode === "text") {
      props.onTextStateChange?.(pickerTarget === "color" ? { color } : { backgroundColor: color });
    } else if (pickerTarget === "gradientStop") {
      const next = [...(props.styleState!.gradientColors)];
      next[editingGradientIndex] = color;
      props.onStyleStateChange?.({ gradientColors: next });
    } else {
      props.onStyleStateChange?.({ [pickerTarget]: color } as any);
    }
  }, [mode, pickerTarget, editingGradientIndex, props.onTextStateChange, props.onStyleStateChange, props.styleState]);

  // ── Slider text input handler ──
  const handleSliderInput = useCallback((val: string) => {
    const num = parseInt(val, 10);
    if (mode === "text") {
      if (!isNaN(num) && num >= 1 && num <= 999) props.onTextStateChange?.({ fontSize: num });
      else if (val === "") props.onTextStateChange?.({ fontSize: 12 });
    } else if (sliderTarget === "shadowOpacity") {
      if (!isNaN(num) && num >= 0 && num <= 100) props.onStyleStateChange?.({ shadowOpacity: num / 100 });
      else if (val === "") props.onStyleStateChange?.({ shadowOpacity: 0 });
    } else {
      if (!isNaN(num) && num >= 0 && num <= sliderMax) props.onStyleStateChange?.({ [sliderTarget]: num } as any);
      else if (val === "") props.onStyleStateChange?.({ [sliderTarget]: 0 } as any);
    }
  }, [mode, sliderMax, sliderTarget, props.onTextStateChange, props.onStyleStateChange]);

  return (
    <View style={s.container} pointerEvents="box-none">
      {/* Vertical Slider - Left Side */}
      {showSlider && (
        <View style={[s.sizeSliderContainer, keyboardHeight > 0 && { bottom: keyboardHeight + 80 }]}>
          <TextInput
            style={s.sliderInput}
            value={String(sliderValue)}
            onChangeText={handleSliderInput}
            keyboardType="number-pad"
            selectTextOnFocus
          />
          <View style={s.sliderTrack} onLayout={onTrackLayout}>
            <View style={s.sliderTrackLine} />
            <GestureDetector gesture={panGesture}>
              <Animated.View style={[s.sliderThumb, sliderThumbStyle]}>
                <View style={s.sliderThumbInner} />
              </Animated.View>
            </GestureDetector>
          </View>
        </View>
      )}

      {/* Top Bar */}
      <View style={s.topBar}>
        <View />
        <Pressable style={s.undoButton} onPress={onUndo}>
          <Text style={s.undoText}>Undo</Text>
        </Pressable>
      </View>

      {/* Bottom Toolbar */}
      <View style={[s.bottomToolbar, keyboardHeight > 0 && { bottom: keyboardHeight }]}>

        {/* ── Text-mode panels ── */}
        {mode === "text" && activePanel === "fonts" && (
          <BubbleRow
            options={FONTS.map((f) => ({
              label: f.name,
              value: f.value,
              labelStyle: { fontFamily: f.value === "System" ? undefined : f.value },
            }))}
            activeValue={props.textState!.fontFamily}
            onSelect={(v) => props.onTextStateChange!({ fontFamily: v })}
          />
        )}

        {mode === "text" && activePanel === "format" && (
          <ToggleBubbleRow
            options={[
              { label: "None", value: "none" },
              { label: "Bold", value: "bold", labelStyle: { fontWeight: "bold" } },
              { label: "Italic", value: "italic", labelStyle: { fontStyle: "italic" } },
              { label: "Underline", value: "underline", labelStyle: { textDecorationLine: "underline" } },
            ]}
            values={{ none: !isBold && !isItalic && !isUnderline, bold: isBold, italic: isItalic, underline: isUnderline }}
            onToggle={(v) => {
              if (v === "none") props.onTextStateChange!({ fontWeight: "normal", fontStyle: "normal", textDecorationLine: "none" });
              if (v === "bold") props.onTextStateChange!({ fontWeight: isBold ? "normal" : "bold" });
              if (v === "italic") props.onTextStateChange!({ fontStyle: isItalic ? "normal" : "italic" });
              if (v === "underline") props.onTextStateChange!({ textDecorationLine: isUnderline ? "none" : "underline" });
            }}
          />
        )}

        {mode === "text" && activePanel === "alignment" && (
          <View>
            <BubbleRow
              options={[
                { label: "Left", value: "left" },
                { label: "Center", value: "center" },
                { label: "Right", value: "right" },
              ]}
              activeValue={props.textState!.textAlign}
              onSelect={(v) => props.onTextStateChange!({ textAlign: v as "left" | "center" | "right" })}
            />
            <BubbleRow
              options={[
                { label: "Wrap", value: "wrap-word" },
                { label: "No Wrap", value: "no-wrap" },
              ]}
              activeValue={props.textState!.wrapMode}
              onSelect={(v) => props.onTextStateChange!({ wrapMode: v as "wrap-word" | "wrap-text" | "no-wrap" })}
            />
          </View>
        )}

        {mode === "text" && activePanel === "color" && (
          <ScrollColorRow
            colors={COLORS}
            activeColor={props.textState!.color}
            onSelect={(col) => props.onTextStateChange!({ color: col })}
            onAddCustom={() => { setPickerTarget("color"); setPickerVisible(true); }}
            themeColors={themeColorValues}
          />
        )}

        {mode === "text" && activePanel === "highlight" && (
          <ScrollColorRow
            colors={COLORS}
            activeColor={props.textState!.backgroundColor}
            onSelect={(col) => props.onTextStateChange!({ backgroundColor: col })}
            showNone
            onAddCustom={() => { setPickerTarget("highlight"); setPickerVisible(true); }}
            themeColors={highlightColorValues}
          />
        )}

        {mode === "text" && activePanel === "textSizes" && (
          <BubbleRow
            options={themeFontSizes.map((f) => ({
              label: `${f.label} (${f.size})`,
              value: f.value,
            }))}
            activeValue={String(props.textState!.fontSize)}
            onSelect={(v) => props.onTextStateChange!({ fontSize: parseInt(v, 10) })}
          />
        )}

        {/* ── Style-mode panels ── */}
        {mode === "style" && activePanel === "borderColor" && props.styleState!.hasBorder && (
          <ScrollColorRow
            colors={BORDER_COLORS}
            themeColors={themeColorValues}
            activeColor={props.styleState!.borderColor}
            onSelect={(col) => props.onStyleStateChange!({ borderColor: col })}
            onAddCustom={() => { setPickerTarget("borderColor"); setPickerVisible(true); }}
          />
        )}

        {mode === "style" && activePanel === "backgroundColor" && props.styleState!.hasBackgroundColor && (
          <ScrollColorRow
            colors={BORDER_COLORS}
            themeColors={highlightColorValues}
            activeColor={props.styleState!.backgroundColor}
            onSelect={(col) => props.onStyleStateChange!({ backgroundColor: col })}
            onAddCustom={() => { setPickerTarget("backgroundColor"); setPickerVisible(true); }}
          />
        )}

        {/* Shadow color panel */}
        {mode === "style" && activePanel === "shadowColor" && props.styleState!.hasShadow && props.styleState!.shadowEnabled && (
          <ScrollColorRow
            colors={BORDER_COLORS}
            themeColors={themeColorValues}
            activeColor={props.styleState!.shadowColor}
            onSelect={(col) => props.onStyleStateChange!({ shadowColor: col })}
            onAddCustom={() => { setPickerTarget("shadowColor"); setPickerVisible(true); }}
          />
        )}

        {/* Gradient colors panel */}
        {mode === "style" && activePanel === "gradientColors" && props.styleState!.hasGradient && props.styleState!.gradientEnabled && (
          <View style={s.inlineColorPicker}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.inlineColorContent}
            >
              {props.styleState!.gradientColors.map((col, idx) => (
                <Pressable
                  key={idx}
                  style={[s.colorOption, { backgroundColor: col, borderWidth: 2, borderColor: "#333" }]}
                  onPress={() => {
                    setEditingGradientIndex(idx);
                    setPickerTarget("gradientStop");
                    setPickerVisible(true);
                  }}
                  onLongPress={() => {
                    if (props.styleState!.gradientColors.length > 2) {
                      const next = [...props.styleState!.gradientColors];
                      next.splice(idx, 1);
                      props.onStyleStateChange!({ gradientColors: next });
                    }
                  }}
                >
                  <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700", textShadowColor: "rgba(0,0,0,0.8)", textShadowRadius: 2, textShadowOffset: { width: 0, height: 1 } }}>{idx + 1}</Text>
                </Pressable>
              ))}
              <Pressable
                style={[s.colorOption, s.addCustomButton]}
                onPress={() => {
                  const next = [...props.styleState!.gradientColors, "#888888"];
                  props.onStyleStateChange!({ gradientColors: next });
                }}
              >
                <Feather name="plus" size={22} color="#FFF" />
              </Pressable>
            </ScrollView>
          </View>
        )}

        {mode === "style" && sliderTarget === "borderRadius" && props.styleState!.hasBorderRadius && activePanel === null && (
          <BubbleRow
            options={BORDER_RADII_PRESETS.map((p) => {
              const radii = theme?.borderRadii ?? DEFAULT_BORDER_RADII;
              return { label: `${p.label} (${radii[p.key]})`, value: String(radii[p.key]) };
            })}
            activeValue={String(props.styleState!.borderRadius)}
            onSelect={(v) => props.onStyleStateChange!({ borderRadius: parseInt(v, 10) })}
          />
        )}

        {mode === "style" && sliderTarget === "borderWidth" && props.styleState!.hasBorder && activePanel === null && (
          <BubbleRow
            options={DEFAULT_BORDER_WIDTHS.map((p) => ({ label: p.label, value: String(p.value) }))}
            activeValue={String(props.styleState!.borderWidth)}
            onSelect={(v) => props.onStyleStateChange!({ borderWidth: parseInt(v, 10) })}
          />
        )}

        {mode === "style" && props.styleState!.hasLayoutMode && props.styleState!.layoutMode === "flex" && activePanel === null && (
          <View>
            <BubbleRow
              options={JUSTIFY_OPTIONS.map((o) => ({ label: o.label, value: o.value }))}
              activeValue={props.styleState!.justifyContent}
              onSelect={(v) => props.onStyleStateChange!({ justifyContent: v as any })}
            />
            <BubbleRow
              options={ALIGN_OPTIONS.map((o) => ({ label: o.label, value: o.value }))}
              activeValue={props.styleState!.alignItems}
              onSelect={(v) => props.onStyleStateChange!({ alignItems: v as any })}
            />
          </View>
        )}

        {/* ── Icon Toolbar ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.iconToolbar}
        >
          {onAIChat && (
            <Pressable style={s.iconButton} onPress={onAIChat}>
              <Text style={{ fontSize: 18 }}>✨</Text>
            </Pressable>
          )}

          {/* Text-mode icons */}
          {mode === "text" && (
            <>
              <Pressable
                style={[s.iconButton, activePanel === "fonts" && s.iconButtonActive]}
                onPress={() => togglePanel("fonts")}
              >
                <Text style={s.iconText}>Aa</Text>
              </Pressable>

              <Pressable
                style={[s.iconButton, activePanel === "color" && s.iconButtonActive]}
                onPress={() => togglePanel("color")}
              >
                <View style={[s.colorIndicator, { backgroundColor: props.textState!.color }]} />
              </Pressable>

              <Pressable
                style={[s.iconButton, activePanel === "highlight" && s.iconButtonActive]}
                onPress={() => togglePanel("highlight")}
              >
                <View style={s.highlightIcon}>
                  <Text style={s.iconText}>A</Text>
                  <View
                    style={[
                      s.highlightBar,
                      { backgroundColor: props.textState!.backgroundColor === "transparent" ? "#888" : props.textState!.backgroundColor },
                    ]}
                  />
                </View>
              </Pressable>

              <Pressable
                style={[s.iconButton, activePanel === "alignment" && s.iconButtonActive]}
                onPress={() => togglePanel("alignment")}
              >
                <View style={s.alignIcon}>
                  {[16, 12, 14].map((w, i) => (
                    <View
                      key={i}
                      style={[
                        s.alignLine,
                        {
                          width: w,
                          alignSelf:
                            props.textState!.textAlign === "left" ? "flex-start"
                            : props.textState!.textAlign === "center" ? "center"
                            : "flex-end",
                        },
                      ]}
                    />
                  ))}
                </View>
              </Pressable>

              <Pressable
                style={[s.iconButton, activePanel === "format" && s.iconButtonActive]}
                onPress={() => togglePanel("format")}
              >
                <Text style={[s.iconText, { textDecorationLine: "underline" }]}>U</Text>
              </Pressable>

              <Pressable
                style={[s.iconButton, activePanel === "textSizes" && s.iconButtonActive]}
                onPress={() => togglePanel("textSizes")}
              >
                <Text style={s.iconText}>T</Text>
                <Text style={s.iconSubText}>px</Text>
              </Pressable>
            </>
          )}

          {/* Style-mode icons */}
          {mode === "style" && (
            <>
              {props.styleState!.hasBorderRadius && (
                <Pressable
                  style={[s.iconButton, sliderTarget === "borderRadius" && s.iconButtonActive]}
                  onPress={() => setSliderTarget("borderRadius")}
                >
                  <View style={s.radiusIcon}><View style={s.radiusCorner} /></View>
                  <Text style={s.iconSubLabel}>{props.styleState!.borderRadius}</Text>
                </Pressable>
              )}

              {props.styleState!.hasBorder && (
                <Pressable
                  style={[s.iconButton, sliderTarget === "borderWidth" && s.iconButtonActive]}
                  onPress={() => setSliderTarget("borderWidth")}
                >
                  <View style={s.borderWidthIcon}>
                    <View style={[s.borderWidthLine, { height: Math.max(2, props.styleState!.borderWidth * 2) }]} />
                  </View>
                  <Text style={s.iconSubLabel}>{props.styleState!.borderWidth}</Text>
                </Pressable>
              )}

              {props.styleState!.hasBorder && (
                <Pressable
                  style={[s.iconButton, activePanel === "borderColor" && s.iconButtonActive]}
                  onPress={() => togglePanel("borderColor")}
                >
                  <View style={[s.colorIndicator, { backgroundColor: props.styleState!.borderColor }]} />
                </Pressable>
              )}

              {props.styleState!.hasBackgroundColor && (
                <Pressable
                  style={[s.iconButton, activePanel === "backgroundColor" && s.iconButtonActive]}
                  onPress={() => togglePanel("backgroundColor")}
                >
                  <View style={s.bgColorIcon}>
                    <Feather name="droplet" size={14} color="#FFF" />
                    <View style={[s.bgColorBar, { backgroundColor: props.styleState!.backgroundColor || "#888" }]} />
                  </View>
                </Pressable>
              )}

              {props.styleState!.hasLayoutMode && (
                <Pressable
                  style={[s.iconButton, props.styleState!.layoutMode === "flex" && s.iconButtonActive]}
                  onPress={() => props.onStyleStateChange!({ layoutMode: props.styleState!.layoutMode === "flex" ? "absolute" : "flex" })}
                >
                  <Feather name={props.styleState!.layoutMode === "flex" ? "columns" : "move"} size={16} color="#FFFFFF" />
                  <Text style={s.iconSubLabel}>{props.styleState!.layoutMode === "flex" ? "Flex" : "Abs"}</Text>
                </Pressable>
              )}

              {props.styleState!.hasLayoutMode && props.styleState!.layoutMode === "flex" && (
                <Pressable
                  style={s.iconButton}
                  onPress={() => props.onStyleStateChange!({ flexDirection: props.styleState!.flexDirection === "row" ? "column" : "row" })}
                >
                  <Feather name={props.styleState!.flexDirection === "row" ? "arrow-right" : "arrow-down"} size={16} color="#FFFFFF" />
                  <Text style={s.iconSubLabel}>{props.styleState!.flexDirection === "row" ? "Row" : "Col"}</Text>
                </Pressable>
              )}

              {props.styleState!.hasLayoutMode && props.styleState!.layoutMode === "flex" && (
                <Pressable
                  style={[s.iconButton, sliderTarget === "gap" && s.iconButtonActive]}
                  onPress={() => setSliderTarget("gap")}
                >
                  <Feather name="maximize-2" size={14} color="#FFFFFF" />
                  <Text style={s.iconSubLabel}>{props.styleState!.gap}</Text>
                </Pressable>
              )}

              {/* Scroll toggle */}
              {props.styleState!.hasScrollable && (
                <Pressable
                  style={[s.iconButton, props.styleState!.scrollable && s.iconButtonActive]}
                  onPress={() => props.onStyleStateChange!({ scrollable: !props.styleState!.scrollable })}
                >
                  <Feather name="list" size={16} color="#FFFFFF" />
                  <Text style={s.iconSubLabel}>{props.styleState!.scrollable ? "Scrl" : "No"}</Text>
                </Pressable>
              )}
              {props.styleState!.hasScrollable && props.styleState!.scrollable && (
                <Pressable
                  style={s.iconButton}
                  onPress={() => props.onStyleStateChange!({ scrollDirection: props.styleState!.scrollDirection === "vertical" ? "horizontal" : "vertical" })}
                >
                  <Feather name={props.styleState!.scrollDirection === "vertical" ? "arrow-down" : "arrow-right"} size={16} color="#FFFFFF" />
                  <Text style={s.iconSubLabel}>{props.styleState!.scrollDirection === "vertical" ? "V" : "H"}</Text>
                </Pressable>
              )}

              {/* Shadow toggle */}
              {props.styleState!.hasShadow && (
                <Pressable
                  style={[s.iconButton, props.styleState!.shadowEnabled && s.iconButtonActive]}
                  onPress={() => props.onStyleStateChange!({ shadowEnabled: !props.styleState!.shadowEnabled })}
                >
                  <Feather name="sun" size={16} color="#FFFFFF" />
                  <Text style={s.iconSubLabel}>{props.styleState!.shadowEnabled ? "On" : "Off"}</Text>
                </Pressable>
              )}
              {props.styleState!.hasShadow && props.styleState!.shadowEnabled && (
                <Pressable
                  style={[s.iconButton, sliderTarget === "shadowRadius" && s.iconButtonActive]}
                  onPress={() => setSliderTarget("shadowRadius")}
                >
                  <Feather name="circle" size={14} color="#FFFFFF" />
                  <Text style={s.iconSubLabel}>{props.styleState!.shadowRadius}</Text>
                </Pressable>
              )}
              {props.styleState!.hasShadow && props.styleState!.shadowEnabled && (
                <Pressable
                  style={[s.iconButton, sliderTarget === "shadowOpacity" && s.iconButtonActive]}
                  onPress={() => setSliderTarget("shadowOpacity")}
                >
                  <Feather name="eye" size={14} color="#FFFFFF" />
                  <Text style={s.iconSubLabel}>{Math.round(props.styleState!.shadowOpacity * 100)}</Text>
                </Pressable>
              )}
              {props.styleState!.hasShadow && props.styleState!.shadowEnabled && (
                <Pressable
                  style={[s.iconButton, activePanel === "shadowColor" && s.iconButtonActive]}
                  onPress={() => togglePanel("shadowColor")}
                >
                  <View style={[s.colorIndicator, { backgroundColor: props.styleState!.shadowColor }]} />
                </Pressable>
              )}

              {/* Gradient toggle */}
              {props.styleState!.hasGradient && (
                <Pressable
                  style={[s.iconButton, props.styleState!.gradientEnabled && s.iconButtonActive]}
                  onPress={() => {
                    if (!props.styleState!.gradientEnabled && props.styleState!.gradientColors.length < 2) {
                      props.onStyleStateChange!({ gradientEnabled: true, gradientColors: ["#000000", "#ffffff"] });
                    } else {
                      props.onStyleStateChange!({ gradientEnabled: !props.styleState!.gradientEnabled });
                    }
                  }}
                >
                  <Feather name="sunset" size={16} color="#FFFFFF" />
                  <Text style={s.iconSubLabel}>Grad</Text>
                </Pressable>
              )}
              {props.styleState!.hasGradient && props.styleState!.gradientEnabled && (
                <Pressable
                  style={s.iconButton}
                  onPress={() => {
                    const dirs: Array<"to-bottom" | "to-right" | "to-bottom-right" | "to-top"> = ["to-bottom", "to-right", "to-bottom-right", "to-top"];
                    const idx = dirs.indexOf(props.styleState!.gradientDirection);
                    props.onStyleStateChange!({ gradientDirection: dirs[(idx + 1) % dirs.length] });
                  }}
                >
                  <Feather
                    name={props.styleState!.gradientDirection === "to-right" ? "arrow-right" : props.styleState!.gradientDirection === "to-top" ? "arrow-up" : props.styleState!.gradientDirection === "to-bottom-right" ? "arrow-down-right" : "arrow-down"}
                    size={16}
                    color="#FFFFFF"
                  />
                </Pressable>
              )}
              {props.styleState!.hasGradient && props.styleState!.gradientEnabled && (
                <Pressable
                  style={[s.iconButton, activePanel === "gradientColors" && s.iconButtonActive]}
                  onPress={() => togglePanel("gradientColors")}
                >
                  <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: "#fff", overflow: "hidden", flexDirection: "row" }}>
                    {props.styleState!.gradientColors.slice(0, 3).map((c, i) => (
                      <View key={i} style={{ flex: 1, backgroundColor: c }} />
                    ))}
                  </View>
                </Pressable>
              )}
            </>
          )}

          {onInspect && (
            <Pressable style={s.iconButton} onPress={onInspect}>
              <Feather name="code" size={18} color="#FFFFFF" />
            </Pressable>
          )}
        </ScrollView>
      </View>

      <ColorPickerModal
        visible={pickerVisible}
        initialColor={pickerInitialColor}
        onSelect={handlePickerSelect}
        onClose={() => setPickerVisible(false)}
      />
    </View>
  );
}

// ── Styles ──

const s = StyleSheet.create({
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
  sliderInput: {
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
  // Bubble rows (text mode snapping)
  bubblePanel: {
    borderTopWidth: 1,
    borderTopColor: "#1a1a1a",
  },
  bubbleScrollContent: {
    paddingVertical: 10,
    gap: BUBBLE_GAP,
    alignItems: "center",
  },
  fontButton: {
    width: BUBBLE_WIDTH,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#333",
    alignItems: "center",
  },
  fontButtonActive: {
    backgroundColor: "#FFFFFF",
    borderColor: "#FFFFFF",
  },
  fontButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "500",
  },
  fontButtonTextActive: {
    color: "#000000",
  },
  // Color rows (text mode snapping)
  colorPicker: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: "#1a1a1a",
  },
  colorScrollContent: {
    gap: COLOR_GAP,
    alignItems: "center",
  },
  // Inline color rows (style mode)
  inlineColorPicker: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: "#1a1a1a",
  },
  inlineColorContent: {
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
  noneText: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "300",
  },
  addCustomButton: {
    borderWidth: 2,
    borderColor: "#333",
    backgroundColor: "#111",
  },
  colorDivider: {
    width: DIVIDER_WIDTH,
    height: COLOR_SIZE,
    justifyContent: "center",
    alignItems: "center",
  },
  colorDividerLine: {
    width: 1,
    height: 28,
    backgroundColor: "#333",
  },
  // Icon toolbar
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
  iconText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  iconSubText: {
    color: "#444",
    fontSize: 9,
    fontWeight: "700",
    marginTop: -2,
  },
  iconSubLabel: {
    color: "#555",
    fontSize: 10,
    fontWeight: "700",
  },
  colorIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  highlightIcon: {
    alignItems: "center",
    justifyContent: "center",
  },
  highlightBar: {
    width: 20,
    height: 6,
    marginTop: 2,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: "#333",
  },
  alignIcon: {
    width: 20,
    height: 20,
    justifyContent: "center",
  },
  alignLine: {
    height: 2,
    backgroundColor: "#FFFFFF",
    marginVertical: 2,
    borderRadius: 1,
  },
  // Style-mode specific
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
});
