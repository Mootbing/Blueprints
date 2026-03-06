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

interface TextEditorToolbarProps {
  state: TextEditingState;
  onStateChange: (updates: Partial<TextEditingState>) => void;
  onUndo: () => void;
  onInspect?: () => void;
  onAIChat?: () => void;
  theme?: Theme;
}

const FONTS = [
  { name: "Modern", value: "System" },
  { name: "Classic", value: "serif" },
  { name: "Signature", value: "cursive" },
  { name: "Typewriter", value: "monospace" },
];

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
    <View style={styles.bubblePanel}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToOffsets={snapOffsets}
        decelerationRate="fast"
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={[
          styles.bubbleScrollContent,
          { paddingLeft: inset, paddingRight: inset },
        ]}
      >
        {options.map((opt, index) => {
          const active = opt.value === activeValue;
          return (
            <Pressable
              key={opt.value}
              style={[
                styles.fontButton,
                active && styles.fontButtonActive,
              ]}
              onPress={() => scrollToIdx(index)}
            >
              <Text
                style={[
                  styles.fontButtonText,
                  opt.labelStyle,
                  active && styles.fontButtonTextActive,
                ]}
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
    <View style={styles.bubblePanel}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToOffsets={snapOffsets}
        decelerationRate="fast"
        contentContainerStyle={[
          styles.bubbleScrollContent,
          { paddingLeft: inset, paddingRight: inset },
        ]}
      >
        {options.map((opt, index) => {
          const active = values[opt.value];
          return (
            <Pressable
              key={opt.value}
              style={[
                styles.fontButton,
                active && styles.fontButtonActive,
              ]}
              onPress={() => {
                scrollToIdx(index);
                onToggle(opt.value);
              }}
            >
              <Text
                style={[
                  styles.fontButtonText,
                  opt.labelStyle,
                  active && styles.fontButtonTextActive,
                ]}
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
  const selectableItems = useMemo(
    () => allItems.filter((c) => c !== "|"),
    [allItems],
  );
  const cbRef = useRef({ allItems, selectableItems, onSelect });
  cbRef.current = { allItems, selectableItems, onSelect };

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
      // Find closest snap offset
      const { allItems: items, selectableItems: selectable, onSelect: sel } = cbRef.current;
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
    <View style={styles.colorPicker}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToOffsets={snapOffsets.filter((_, i) => allItems[i] !== "|")}
        decelerationRate="fast"
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={[
          styles.colorScrollContent,
          { paddingLeft: inset, paddingRight: inset },
        ]}
      >
        {allItems.map((col, index) => {
          if (col === "|") {
            return (
              <View key={`divider-${index}`} style={styles.colorDivider}>
                <View style={styles.colorDividerLine} />
              </View>
            );
          }
          const isNone = col === "transparent";
          const active = col === activeColor;
          return (
            <Pressable
              key={`${col}-${index}`}
              style={[
                styles.colorOption,
                isNone
                  ? { backgroundColor: "transparent", borderWidth: 1, borderColor: "#FFF" }
                  : { backgroundColor: col },
                active && styles.colorOptionSelected,
              ]}
              onPress={() => scrollToIdx(index)}
            >
              {isNone && <Text style={styles.noneText}>∅</Text>}
              {!isNone && active && (
                <View style={styles.colorCheckmark}>
                  <Text style={styles.checkmarkText}>✓</Text>
                </View>
              )}
            </Pressable>
          );
        })}
        {onAddCustom && (
          <Pressable
            style={[styles.colorOption, styles.addCustomButton]}
            onPress={onAddCustom}
          >
            <Feather name="plus" size={22} color="#FFF" />
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const COLORS = [
  "#FFFFFF",
  "#000000",
  "#FF0000",
  "#00FF00",
  "#0000FF",
  "#FFFF00",
  "#FF00FF",
  "#00FFFF",
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#FFA07A",
  "#98D8C8",
  "#F7DC6F",
  "#BB8FCE",
  "#85C1E2",
];

type PanelType = "fonts" | "color" | "highlight" | "format" | "alignment" | "textSizes" | null;

const BUBBLE_WIDTH = 100;
const BUBBLE_GAP = 12;
const BUBBLE_STEP = BUBBLE_WIDTH + BUBBLE_GAP;

const COLOR_SIZE = 44;
const COLOR_GAP = 12;
const COLOR_STEP = COLOR_SIZE + COLOR_GAP;

const DIVIDER_WIDTH = 20;
const DIVIDER_STEP = DIVIDER_WIDTH + COLOR_GAP;

export function TextEditorToolbar({
  state,
  onStateChange,
  onUndo,
  onInspect,
  onAIChat,
  theme,
}: TextEditorToolbarProps) {
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
  const { height: screenHeight } = useWindowDimensions();
  const keyboardHeight = useKeyboardHeight();

  const [activePanel, setActivePanel] = useState<PanelType>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<"color" | "highlight">("color");

  const togglePanel = useCallback((panel: PanelType) => {
    setActivePanel((current) => (current === panel ? null : panel));
  }, []);

  // Custom Vertical Slider
  const minFontSize = 12;
  const maxFontSize = 120;
  const thumbSize = 40;
  const [trackHeight, setTrackHeight] = useState(screenHeight * 0.25);
  const maxOffset = Math.max(0, trackHeight - thumbSize);

  const sliderOffset = useSharedValue(
    (1 - (state.fontSize - minFontSize) / (maxFontSize - minFontSize)) * maxOffset
  );
  const isDraggingSlider = useRef(false);

  useEffect(() => {
    if (isDraggingSlider.current) return;
    sliderOffset.value =
      (1 - (state.fontSize - minFontSize) / (maxFontSize - minFontSize)) * maxOffset;
  }, [state.fontSize, maxOffset, sliderOffset, minFontSize, maxFontSize]);

  const onTrackLayout = useCallback((e: { nativeEvent: { layout: { height: number } } }) => {
    setTrackHeight(e.nativeEvent.layout.height);
  }, []);

  const updateFontSize = useCallback((offset: number) => {
    const trackRange = Math.max(1, trackHeight - thumbSize);
    const normalized = 1 - Math.max(0, Math.min(offset / trackRange, 1));
    const newSize = minFontSize + normalized * (maxFontSize - minFontSize);
    onStateChange({ fontSize: Math.round(newSize) });
  }, [trackHeight, onStateChange, minFontSize, maxFontSize]);

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
        runOnJS(updateFontSize)(newOffset);
      })
      .onFinalize(() => {
        runOnJS(setDragging)(false);
      }),
    [maxOffset, updateFontSize, setDragging, startOffset, sliderOffset]
  );

  const sliderThumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sliderOffset.value }],
  }));

  const isBold = state.fontWeight === "bold";
  const isItalic = state.fontStyle === "italic";
  const isUnderline = state.textDecorationLine === "underline";

  return (
    <View style={styles.container} pointerEvents="box-none">
        {/* Size Slider - Left Side */}
        <View style={[styles.sizeSliderContainer, keyboardHeight > 0 && { bottom: keyboardHeight + 80 }]}>
          <TextInput
            style={styles.fontSizeInput}
            value={String(state.fontSize)}
            onChangeText={(val) => {
              const num = parseInt(val, 10);
              if (!isNaN(num) && num >= 1 && num <= 999) {
                onStateChange({ fontSize: num });
              } else if (val === "") {
                onStateChange({ fontSize: 12 });
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

        {/* Top Bar */}
        <View style={styles.topBar}>
          <View />
          <Pressable style={styles.undoButton} onPress={onUndo}>
            <Text style={styles.undoText}>Undo</Text>
          </Pressable>
        </View>

        {/* Bottom Toolbar */}
        <View style={[styles.bottomToolbar, keyboardHeight > 0 && { bottom: keyboardHeight }]}>
          {activePanel === "fonts" && (
            <BubbleRow
              options={FONTS.map((f) => ({
                label: f.name,
                value: f.value,
                labelStyle: { fontFamily: f.value === "System" ? undefined : f.value },
              }))}
              activeValue={state.fontFamily}
              onSelect={(v) => onStateChange({ fontFamily: v })}
            />
          )}

          {activePanel === "format" && (
            <ToggleBubbleRow
              options={[
                { label: "Bold", value: "bold", labelStyle: { fontWeight: "bold" } },
                { label: "Italic", value: "italic", labelStyle: { fontStyle: "italic" } },
                { label: "Underline", value: "underline", labelStyle: { textDecorationLine: "underline" } },
              ]}
              values={{ bold: isBold, italic: isItalic, underline: isUnderline }}
              onToggle={(v) => {
                if (v === "bold") onStateChange({ fontWeight: isBold ? "normal" : "bold" });
                if (v === "italic") onStateChange({ fontStyle: isItalic ? "normal" : "italic" });
                if (v === "underline") onStateChange({ textDecorationLine: isUnderline ? "none" : "underline" });
              }}
            />
          )}

          {activePanel === "alignment" && (
            <View>
              <BubbleRow
                options={[
                  { label: "Left", value: "left" },
                  { label: "Center", value: "center" },
                  { label: "Right", value: "right" },
                ]}
                activeValue={state.textAlign}
                onSelect={(v) => onStateChange({ textAlign: v as "left" | "center" | "right" })}
              />
              <BubbleRow
                options={[
                  { label: "Wrap Word", value: "wrap-word" },
                  { label: "Wrap Text", value: "wrap-text" },
                  { label: "No Wrap", value: "no-wrap" },
                ]}
                activeValue={state.wrapMode}
                onSelect={(v) => onStateChange({ wrapMode: v as "wrap-word" | "wrap-text" | "no-wrap" })}
              />
            </View>
          )}

          {/* Text Color Picker */}
          {activePanel === "color" && (
            <ScrollColorRow
              colors={COLORS}
              activeColor={state.color}
              onSelect={(col) => onStateChange({ color: col })}
              onAddCustom={() => {
                setPickerTarget("color");
                setPickerVisible(true);
              }}
              themeColors={themeColorValues}
            />
          )}

          {/* Highlight Color Picker */}
          {activePanel === "highlight" && (
            <ScrollColorRow
              colors={COLORS}
              activeColor={state.backgroundColor}
              onSelect={(col) => onStateChange({ backgroundColor: col })}
              showNone
              onAddCustom={() => {
                setPickerTarget("highlight");
                setPickerVisible(true);
              }}
              themeColors={highlightColorValues}
            />
          )}

          {/* Font Size Presets */}
          {activePanel === "textSizes" && (
            <BubbleRow
              options={themeFontSizes.map((f) => ({
                label: `${f.label} (${f.size})`,
                value: f.value,
              }))}
              activeValue={String(state.fontSize)}
              onSelect={(v) => onStateChange({ fontSize: parseInt(v, 10) })}
            />
          )}

          {/* Icon Toolbar */}
          <View style={styles.iconToolbar}>
            {onAIChat && (
              <Pressable
                style={[styles.iconButton]}
                onPress={onAIChat}
              >
                <Text style={{ fontSize: 18 }}>✨</Text>
              </Pressable>
            )}

            <Pressable
              style={[styles.iconButton, activePanel === "fonts" && styles.iconButtonActive]}
              onPress={() => togglePanel("fonts")}
            >
              <Text style={styles.iconText}>Aa</Text>
            </Pressable>

            <Pressable
              style={[styles.iconButton, activePanel === "color" && styles.iconButtonActive]}
              onPress={() => togglePanel("color")}
            >
              <View style={[styles.colorIndicator, { backgroundColor: state.color }]} />
            </Pressable>

            <Pressable
              style={[styles.iconButton, activePanel === "highlight" && styles.iconButtonActive]}
              onPress={() => togglePanel("highlight")}
            >
              <View style={styles.highlightIcon}>
                <Text style={styles.iconText}>A</Text>
                <View
                  style={[
                    styles.highlightBar,
                    {
                      backgroundColor:
                        state.backgroundColor === "transparent" ? "#888" : state.backgroundColor,
                    },
                  ]}
                />
              </View>
            </Pressable>

            <Pressable
              style={[styles.iconButton, activePanel === "alignment" && styles.iconButtonActive]}
              onPress={() => togglePanel("alignment")}
            >
              <View style={styles.alignIcon}>
                {[16, 12, 14].map((w, i) => (
                  <View
                    key={i}
                    style={[
                      styles.alignLine,
                      {
                        width: w,
                        alignSelf:
                          state.textAlign === "left"
                            ? "flex-start"
                            : state.textAlign === "center"
                            ? "center"
                            : "flex-end",
                      },
                    ]}
                  />
                ))}
              </View>
            </Pressable>

            <Pressable
              style={[styles.iconButton, activePanel === "format" && styles.iconButtonActive]}
              onPress={() => togglePanel("format")}
            >
              <Text style={[styles.iconText, { textDecorationLine: "underline" }]}>U</Text>
            </Pressable>

            <Pressable
              style={[styles.iconButton, activePanel === "textSizes" && styles.iconButtonActive]}
              onPress={() => togglePanel("textSizes")}
            >
              <Text style={styles.iconText}>T</Text>
              <Text style={styles.iconSubText}>px</Text>
            </Pressable>

            {onInspect && (
              <Pressable
                style={[styles.iconButton]}
                onPress={onInspect}
              >
                <Feather name="code" size={18} color="#FFFFFF" />
              </Pressable>
            )}
          </View>
        </View>

        <ColorPickerModal
          visible={pickerVisible}
          initialColor={pickerTarget === "color" ? state.color : state.backgroundColor}
          onSelect={(color) =>
            onStateChange(
              pickerTarget === "color" ? { color } : { backgroundColor: color }
            )
          }
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
  fontSizeInput: {
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
  bubbleDimmed: {
    opacity: 0.4,
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
  iconToolbar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
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
  iconText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
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
  iconButtonActive: {
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#333",
  },
  iconSubText: {
    color: "#444",
    fontSize: 9,
    fontWeight: "700",
    marginTop: -2,
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
});
