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

export interface StyleEditingState {
  borderRadius: number;
  borderWidth: number;
  borderColor: string;
  hasBorderRadius: boolean;
  hasBorder: boolean;
}

interface StyleEditorToolbarProps {
  state: StyleEditingState;
  onStateChange: (updates: Partial<StyleEditingState>) => void;
  onUndo: () => void;
  onInspect?: () => void;
}

const BORDER_COLORS = [
  "#000000", "#FFFFFF", "#e0e0e0", "#94a3b8",
  "#FF0000", "#ef4444", "#f97316", "#f59e0b",
  "#22c55e", "#10b981", "#06b6d4", "#0ea5e9",
  "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7",
  "#ec4899", "#f43f5e",
];

type SliderTarget = "borderRadius" | "borderWidth";
type PanelType = "borderColor" | null;

const SLIDER_CONFIG = {
  borderRadius: { min: 0, max: 50 },
  borderWidth: { min: 0, max: 20 },
};

export function StyleEditorToolbar({
  state,
  onStateChange,
  onUndo,
  onInspect,
}: StyleEditorToolbarProps) {
  const { height: screenHeight } = useWindowDimensions();
  const keyboardHeight = useKeyboardHeight();

  const [activePanel, setActivePanel] = useState<PanelType>(null);
  const [sliderTarget, setSliderTarget] = useState<SliderTarget>("borderRadius");

  const togglePanel = useCallback((panel: PanelType) => {
    setActivePanel((current) => (current === panel ? null : panel));
  }, []);

  // Dynamic slider config based on target
  const { min: sliderMin, max: sliderMax } = SLIDER_CONFIG[sliderTarget];
  const currentValue = sliderTarget === "borderRadius" ? state.borderRadius : state.borderWidth;

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
    onStateChange({ [sliderTarget]: Math.round(newVal) });
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
        (sliderTarget === "borderWidth" && state.hasBorder)) && (
        <View style={[styles.sizeSliderContainer, keyboardHeight > 0 && { bottom: keyboardHeight + 80 }]}>
          <View style={styles.sliderTrack} onLayout={onTrackLayout}>
            <View style={styles.sliderTrackLine} />
            <GestureDetector gesture={panGesture}>
              <Animated.View style={[styles.sliderThumb, sliderThumbStyle]}>
                <View style={styles.sliderThumbInner} />
              </Animated.View>
            </GestureDetector>
          </View>
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
            </ScrollView>
          </View>
        )}

        {/* Icon Toolbar */}
        <View style={styles.iconToolbar}>
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
    backgroundColor: "rgba(255,255,255,0.2)",
    color: "#FFFFFF",
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
    backgroundColor: "rgba(255,255,255,0.3)",
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
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  undoText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
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
    borderTopColor: "rgba(255,255,255,0.1)",
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
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  iconButtonActive: {
    backgroundColor: "rgba(255,255,255,0.3)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
  },
  iconSubLabel: {
    color: "rgba(255,255,255,0.6)",
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
});
