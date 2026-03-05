import React, { useState, useCallback, useMemo, useEffect } from "react";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
  runOnJS,
  type SharedValue,
} from "react-native-reanimated";
import type { Component, Layout, ComponentStyleUpdates } from "../types";
import { rendererRegistry } from "./renderers";
import { computeSnap } from "../utils/snapWorklet";
import type { TextEditingState } from "./TextEditorModal";

interface SDUIComponentProps {
  component: Component;
  canvasWidth: number;
  canvasHeight: number;
  isEditMode: boolean;
  autoEdit?: boolean;
  onAutoEditConsumed?: () => void;
  onUpdate: (id: string, layout: Layout) => void;
  onContentChange?: (id: string, content: string) => void;
  onStyleChange?: (id: string, updates: ComponentStyleUpdates) => void;
  onNavigate?: (screenId: string) => void;
  onResetAndBuild?: () => void;
  onInteract?: () => void;
  componentIndex?: number;
  siblingRects?: SharedValue<number[]>;
  onGuidesChange?: (guides: number[]) => void;
  onGuidesEnd?: () => void;
  editingComponentId?: string | null;
  editState?: TextEditingState | null;
  onEditStart?: (componentId: string, initialState: TextEditingState) => void;
  onEditStateChange?: (updates: Partial<TextEditingState>) => void;
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
  autoEdit,
  onAutoEditConsumed,
  onUpdate,
  onContentChange,
  onStyleChange,
  onNavigate,
  onResetAndBuild,
  onInteract,
  componentIndex,
  siblingRects,
  onGuidesChange,
  onGuidesEnd,
  editingComponentId,
  editState,
  onEditStart,
  onEditStateChange,
}: SDUIComponentProps) {
  const [editTapFired, setEditTapFired] = useState(false);
  const isComponentEditing = editingComponentId === component.id;

  const fireEditTap = useCallback(() => {
    setEditTapFired(true);
    onInteract?.();
  }, [onInteract]);

  const consumeEditTap = useCallback(() => {
    setEditTapFired(false);
  }, []);

  useEffect(() => {
    if (autoEdit && isEditMode) {
      setEditTapFired(true);
      onAutoEditConsumed?.();
    }
  }, [autoEdit, isEditMode, onAutoEditConsumed]);

  // All shared values must be declared unconditionally (rules of hooks)
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const savedRotation = useSharedValue(0);

  const activeGestures = useSharedValue(0);
  const panStarted = useSharedValue(false);
  const pinchStarted = useSharedValue(false);
  const rotationStarted = useSharedValue(false);

  // Edit animation offset — lerps the component to center when editing
  const editOffsetX = useSharedValue(0);
  const editOffsetY = useSharedValue(0);

  // Derive base values as shared values so animated style reacts to prop changes
  const baseX = useDerivedValue(() => component.layout.x * canvasWidth);
  const baseY = useDerivedValue(() => component.layout.y * canvasHeight);
  const baseW = useDerivedValue(() => component.layout.width * canvasWidth);
  const baseH = useDerivedValue(() => component.layout.height * canvasHeight);
  const baseRotation = useDerivedValue(() => component.layout.rotation ?? 0);

  // Animate to center when editing, back when done
  useEffect(() => {
    if (isComponentEditing) {
      const currentX = component.layout.x * canvasWidth;
      const currentY = component.layout.y * canvasHeight;
      const w = component.layout.width * canvasWidth;
      const h = component.layout.height * canvasHeight;
      const targetX = canvasWidth / 2 - w / 2;
      const targetY = canvasHeight / 2 - h / 2;
      editOffsetX.value = withTiming(targetX - currentX, { duration: 300 });
      editOffsetY.value = withTiming(targetY - currentY, { duration: 300 });
    } else {
      editOffsetX.value = withTiming(0, { duration: 300 });
      editOffsetY.value = withTiming(0, { duration: 300 });
    }
  }, [isComponentEditing, canvasWidth, canvasHeight, component.layout, editOffsetX, editOffsetY]);

  const animatedStyle = useAnimatedStyle(() => {
    if (isEditMode) {
      return {
        position: "absolute" as const,
        left: baseX.value + translateX.value + editOffsetX.value,
        top: baseY.value + translateY.value + editOffsetY.value,
        width: baseW.value * scale.value,
        height: baseH.value * scale.value,
        transform: [{ rotate: `${baseRotation.value + rotation.value}rad` }],
      };
    }
    return {
      position: "absolute" as const,
      left: baseX.value,
      top: baseY.value,
      width: baseW.value,
      height: baseH.value,
      transform: baseRotation.value ? [{ rotate: `${baseRotation.value}rad` }] : [],
    };
  });

  const commitLayout = useCallback(() => {
    const finalX = baseX.value + translateX.value;
    const finalY = baseY.value + translateY.value;
    const finalW = baseW.value * scale.value;
    const finalH = baseH.value * scale.value;
    const finalRotation = baseRotation.value + rotation.value;

    const newLayout: Layout = {
      x: clamp(finalX / canvasWidth, 0, 1),
      y: clamp(finalY / canvasHeight, 0, 1),
      width: clamp(finalW / canvasWidth, 0, 1),
      height: clamp(finalH / canvasHeight, 0, 1),
      rotation: finalRotation,
    };

    translateX.value = 0;
    translateY.value = 0;
    scale.value = 1;
    rotation.value = 0;

    onUpdate(component.id, newLayout);
  }, [component.id, canvasWidth, canvasHeight, onUpdate, baseX, baseY, baseW, baseH, baseRotation, translateX, translateY, scale, rotation]);

  const allGestures = useMemo(() => {
    const panGesture = Gesture.Pan()
      .enabled(!isComponentEditing)
      .minDistance(10)
      .onStart(() => {
        panStarted.value = true;
        activeGestures.value++;
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
      })
      .onUpdate((e) => {
        const rawX = savedTranslateX.value + e.translationX;
        const rawY = savedTranslateY.value + e.translationY;

        if (siblingRects && componentIndex != null && onGuidesChange) {
          const currentL = baseX.value + rawX;
          const currentT = baseY.value + rawY;
          const currentW = baseW.value * scale.value;
          const currentH = baseH.value * scale.value;

          const result = computeSnap(
            currentL,
            currentT,
            currentW,
            currentH,
            siblingRects.value,
            componentIndex,
            canvasWidth,
            canvasHeight
          );

          translateX.value = rawX + result.snapDX;
          translateY.value = rawY + result.snapDY;
          runOnJS(onGuidesChange)(result.guides);
        } else {
          translateX.value = rawX;
          translateY.value = rawY;
        }
      })
      .onFinalize(() => {
        if (!panStarted.value) return;
        panStarted.value = false;
        activeGestures.value--;
        if (onGuidesEnd) {
          runOnJS(onGuidesEnd)();
        }
        if (activeGestures.value <= 0) {
          activeGestures.value = 0;
          runOnJS(commitLayout)();
        }
      });

    const pinchGesture = Gesture.Pinch()
      .enabled(!isComponentEditing)
      .onStart(() => {
        pinchStarted.value = true;
        activeGestures.value++;
        savedScale.value = scale.value;
      })
      .onUpdate((e) => {
        scale.value = savedScale.value * e.scale;
      })
      .onFinalize(() => {
        if (!pinchStarted.value) return;
        pinchStarted.value = false;
        activeGestures.value--;
        if (activeGestures.value <= 0) {
          activeGestures.value = 0;
          runOnJS(commitLayout)();
        }
      });

    const rotationGesture = Gesture.Rotation()
      .enabled(!isComponentEditing)
      .onStart(() => {
        rotationStarted.value = true;
        activeGestures.value++;
        savedRotation.value = rotation.value;
      })
      .onUpdate((e) => {
        rotation.value = savedRotation.value + e.rotation;
      })
      .onFinalize(() => {
        if (!rotationStarted.value) return;
        rotationStarted.value = false;
        activeGestures.value--;
        if (activeGestures.value <= 0) {
          activeGestures.value = 0;
          runOnJS(commitLayout)();
        }
      });

    const tapGesture = Gesture.Tap()
      .enabled(!isComponentEditing)
      .maxDistance(10)
      .onEnd(() => {
        runOnJS(fireEditTap)();
      });

    return Gesture.Simultaneous(
      tapGesture,
      panGesture,
      pinchGesture,
      rotationGesture
    );
  }, [isComponentEditing, commitLayout, fireEditTap, translateX, translateY, scale, rotation, savedTranslateX, savedTranslateY, savedScale, savedRotation, activeGestures, panStarted, pinchStarted, rotationStarted, siblingRects, componentIndex, onGuidesChange, onGuidesEnd, canvasWidth, canvasHeight, baseX, baseY, baseW, baseH]);

  const handleEditStart = useCallback((initialState: TextEditingState) => {
    onEditStart?.(component.id, initialState);
  }, [component.id, onEditStart]);

  const Renderer = rendererRegistry[component.type];
  if (!Renderer) return null;

  let rendererProps: Record<string, unknown>;
  if (component.type === "text") {
    rendererProps = {
      component,
      isEditMode,
      editTapFired,
      consumeEditTap,
      editState: isComponentEditing ? editState : null,
      onEditStart: handleEditStart,
      onEditStateChange,
    };
  } else if (component.type === "button") {
    rendererProps = {
      component,
      isEditMode,
      editTapFired,
      consumeEditTap,
      editState: isComponentEditing ? editState : null,
      onEditStart: handleEditStart,
      onEditStateChange,
      onNavigate,
      onResetAndBuild,
    };
  } else if (component.type === "icon") {
    rendererProps = { component, isEditMode, onNavigate };
  } else if (component.type === "toggle" || component.type === "textInput") {
    rendererProps = { component, isEditMode };
  } else if (component.type === "list") {
    rendererProps = { component, isEditMode, onNavigate };
  } else if (component.type === "container") {
    rendererProps = { component, isEditMode };
  } else {
    rendererProps = { component };
  }

  if (!isEditMode) {
    return (
      <Animated.View style={animatedStyle}>
        <Renderer {...rendererProps} />
      </Animated.View>
    );
  }

  return (
    <GestureDetector gesture={allGestures}>
      <Animated.View style={[animatedStyle, isComponentEditing && { zIndex: 200 }]}>
        <Renderer {...rendererProps} />
      </Animated.View>
    </GestureDetector>
  );
}
