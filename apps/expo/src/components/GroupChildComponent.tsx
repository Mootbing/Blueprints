import React, { useState, useCallback, useMemo, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import type { Component, Layout } from "../types";
import { rendererRegistry } from "./renderers";
import type { TextEditingState } from "./TextEditorModal";

function clamp(value: number, min: number, max: number) {
  "worklet";
  return Math.min(Math.max(value, min), max);
}

interface GroupChildComponentProps {
  component: Component;
  containerWidth: number;
  containerHeight: number;
  isSelected: boolean;
  isEditMode: boolean;
  editingComponentId: string | null;
  editState: TextEditingState | null;
  onSelect: (id: string) => void;
  onUpdate: (id: string, layout: Layout) => void;
  onEditStart: (componentId: string, initialState: TextEditingState) => void;
  onEditStateChange?: (updates: Partial<TextEditingState>) => void;
  onDrillInto: (id: string) => void;
  onStyleSelect: (componentId: string) => void;
  onPickImage?: (componentId: string) => void;
}

export function GroupChildComponent({
  component,
  containerWidth,
  containerHeight,
  isSelected,
  isEditMode,
  editingComponentId,
  editState,
  onSelect,
  onUpdate,
  onEditStart,
  onEditStateChange,
  onDrillInto,
  onStyleSelect,
  onPickImage,
}: GroupChildComponentProps) {
  const [editTapFired, setEditTapFired] = useState(false);
  const isComponentEditing = editingComponentId === component.id;

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const baseX = useDerivedValue(() => component.layout.x * containerWidth);
  const baseY = useDerivedValue(() => component.layout.y * containerHeight);
  const baseW = useDerivedValue(() => component.layout.width * containerWidth);
  const baseH = useDerivedValue(() => component.layout.height * containerHeight);

  const editOffsetX = useSharedValue(0);
  const editOffsetY = useSharedValue(0);

  useEffect(() => {
    if (isComponentEditing) {
      const currentX = component.layout.x * containerWidth;
      const currentY = component.layout.y * containerHeight;
      const w = component.layout.width * containerWidth;
      const h = component.layout.height * containerHeight;
      const targetX = containerWidth / 2 - w / 2;
      const targetY = containerHeight / 2 - h / 2;
      editOffsetX.value = withTiming(targetX - currentX, { duration: 300 });
      editOffsetY.value = withTiming(targetY - currentY, { duration: 300 });
    } else {
      editOffsetX.value = withTiming(0, { duration: 300 });
      editOffsetY.value = withTiming(0, { duration: 300 });
    }
  }, [isComponentEditing, containerWidth, containerHeight, component.layout, editOffsetX, editOffsetY]);

  const animatedStyle = useAnimatedStyle(() => ({
    position: "absolute" as const,
    left: baseX.value + translateX.value + editOffsetX.value,
    top: baseY.value + translateY.value + editOffsetY.value,
    width: baseW.value,
    height: baseH.value,
    minHeight: 20,
  }));

  const commitLayout = useCallback(() => {
    const finalX = baseX.value + translateX.value;
    const finalY = baseY.value + translateY.value;

    const newLayout: Layout = {
      x: clamp(finalX / containerWidth, 0, 1),
      y: clamp(finalY / containerHeight, 0, 1),
      width: component.layout.width,
      height: component.layout.height,
      rotation: component.layout.rotation,
    };

    translateX.value = 0;
    translateY.value = 0;

    onUpdate(component.id, newLayout);
  }, [component.id, component.layout, containerWidth, containerHeight, onUpdate, baseX, baseY, translateX, translateY]);

  const fireEditTap = useCallback(() => {
    // If already selected and is a container, drill deeper
    if (isSelected && component.type === "container") {
      onDrillInto(component.id);
      return;
    }

    onSelect(component.id);

    // For text/button, set editTapFired so the renderer triggers edit mode
    if (component.type === "text" || component.type === "button") {
      setEditTapFired(true);
    } else if (component.type === "image") {
      onPickImage?.(component.id);
    } else {
      // For shape, textInput, container, list, etc. — open style editor
      onStyleSelect(component.id);
    }
  }, [isSelected, component.id, component.type, onSelect, onDrillInto, onStyleSelect, onPickImage]);

  const consumeEditTap = useCallback(() => {
    setEditTapFired(false);
  }, []);

  const handleEditStart = useCallback((initialState: TextEditingState) => {
    onEditStart(component.id, initialState);
  }, [component.id, onEditStart]);

  const allGestures = useMemo(() => {
    const panGesture = Gesture.Pan()
      .enabled(!isComponentEditing)
      .minDistance(10)
      .onStart(() => {
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
      })
      .onUpdate((e) => {
        translateX.value = savedTranslateX.value + e.translationX;
        translateY.value = savedTranslateY.value + e.translationY;
      })
      .onFinalize(() => {
        runOnJS(commitLayout)();
      });

    const tapGesture = Gesture.Tap()
      .enabled(!isComponentEditing)
      .maxDistance(10)
      .onEnd(() => {
        runOnJS(fireEditTap)();
      });

    return Gesture.Simultaneous(tapGesture, panGesture);
  }, [isComponentEditing, commitLayout, fireEditTap, translateX, translateY, savedTranslateX, savedTranslateY]);

  const Renderer = rendererRegistry[component.type];
  if (!Renderer) return null;

  let rendererProps: Record<string, unknown> = { component, isEditMode };

  if (component.type === "text") {
    rendererProps = {
      ...rendererProps,
      editTapFired,
      consumeEditTap,
      editState: isComponentEditing ? editState : null,
      onEditStart: handleEditStart,
      onEditStateChange,
    };
  } else if (component.type === "button") {
    rendererProps = {
      ...rendererProps,
      editTapFired,
      consumeEditTap,
      editState: isComponentEditing ? editState : null,
      onEditStart: handleEditStart,
      onEditStateChange,
    };
  }

  return (
    <GestureDetector gesture={allGestures}>
      <Animated.View style={[animatedStyle, isComponentEditing && { zIndex: 200 }]}>
        {isSelected && !isComponentEditing && (
          <View style={styles.selectionOutline} pointerEvents="none" />
        )}
        <Renderer {...rendererProps} />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  selectionOutline: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: "#818cf8",
    borderRadius: 4,
    zIndex: 10,
  },
});
