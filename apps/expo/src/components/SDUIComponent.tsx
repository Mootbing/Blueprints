import React from "react";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import type { Component, Layout } from "../types";
import { rendererRegistry } from "./renderers";

interface SDUIComponentProps {
  component: Component;
  canvasWidth: number;
  canvasHeight: number;
  isEditMode: boolean;
  onUpdate: (id: string, layout: Layout) => void;
  onContentChange?: (id: string, content: string) => void;
  onStyleChange?: (id: string, updates: any) => void;
  onNavigate?: (screenId: string) => void;
}

function clamp(value: number, min: number, max: number) {
  "worklet";
  return Math.min(Math.max(value, min), max);
}

export function SDUIComponent({
  component,
  canvasWidth,
  canvasHeight,
  isEditMode,
  onUpdate,
  onContentChange,
  onStyleChange,
  onNavigate,
}: SDUIComponentProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const savedRotation = useSharedValue(0);

  const baseX = component.layout.x * canvasWidth;
  const baseY = component.layout.y * canvasHeight;
  const baseW = component.layout.width * canvasWidth;
  const baseH = component.layout.height * canvasHeight;

  const animatedStyle = useAnimatedStyle(() => {
    if (isEditMode) {
      return {
        position: "absolute" as const,
        left: baseX + translateX.value,
        top: baseY + translateY.value,
        width: baseW * scale.value,
        height: baseH * scale.value,
        transform: [{ rotate: `${rotation.value}rad` }],
      };
    }
    return {
      position: "absolute" as const,
      left: baseX,
      top: baseY,
      width: baseW,
      height: baseH,
    };
  });

  const Renderer = rendererRegistry[component.type];
  if (!Renderer) return null;

  const rendererProps: any = { component };
  if (component.type === "text") {
    rendererProps.isEditMode = isEditMode;
    rendererProps.onContentChange = onContentChange;
    rendererProps.onStyleChange = onStyleChange;
  }
  if (component.type === "button") {
    rendererProps.onNavigate = onNavigate;
  }

  if (!isEditMode) {
    return (
      <Animated.View style={animatedStyle}>
        <Renderer {...rendererProps} />
      </Animated.View>
    );
  }

  // --- Edit Mode: gesture handlers ---

  const panGesture = Gesture.Pan()
    .onStart(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      // Commit new position back to normalized coordinates
      const finalX = baseX + translateX.value;
      const finalY = baseY + translateY.value;
      const finalW = baseW * scale.value;
      const finalH = baseH * scale.value;

      const newLayout: Layout = {
        x: clamp(finalX / canvasWidth, 0, 1),
        y: clamp(finalY / canvasHeight, 0, 1),
        width: clamp(finalW / canvasWidth, 0, 1),
        height: clamp(finalH / canvasHeight, 0, 1),
      };

      onUpdate(component.id, newLayout);

      // Reset gesture offsets since the base position is now committed
      translateX.value = 0;
      translateY.value = 0;
      scale.value = 1;
      rotation.value = 0;
    });

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((e) => {
      scale.value = savedScale.value * e.scale;
    });

  const rotationGesture = Gesture.Rotation()
    .onStart(() => {
      savedRotation.value = rotation.value;
    })
    .onUpdate((e) => {
      rotation.value = savedRotation.value + e.rotation;
    });

  const composed = Gesture.Simultaneous(
    panGesture,
    pinchGesture,
    rotationGesture
  );

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={animatedStyle}>
        <Renderer {...rendererProps} />
      </Animated.View>
    </GestureDetector>
  );
}
