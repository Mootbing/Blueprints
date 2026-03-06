import React, { useState, useCallback, useMemo, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
  runOnJS,
  interpolate,
  type SharedValue,
} from "react-native-reanimated";
import type { Component, Layout, ComponentStyleUpdates } from "../types";
import { rendererRegistry } from "./renderers";
import { computeSnap } from "../utils/snapWorklet";
import type { TextEditingState } from "./TextEditorModal";
import { useKeyboardHeight } from "../hooks/useKeyboardHeight";
import { SmartComponentWrapper } from "../runtime/SmartComponentWrapper";

const TRASH_ZONE_HEIGHT = 80;

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
  onSelect?: (componentId: string) => void;
  onDragStart?: (componentId: string) => void;
  onDragEnd?: () => void;
  onDragOverTrashChange?: (isOver: boolean) => void;
  onDeleteComponent?: (componentId: string) => void;
  onPickImage?: (componentId: string) => void;
  onLongPress?: (id: string, screenX: number, screenY: number) => void;
  isDimmed?: boolean;
  locked?: boolean;
  // Drill-in props (for container components)
  isDrilledInto?: boolean;
  selectedChildId?: string | null;
  onChildSelect?: (id: string) => void;
  onChildUpdate?: (id: string, layout: Layout) => void;
  onChildEditStart?: (componentId: string, initialState: TextEditingState) => void;
  onChildEditStateChange?: (updates: Partial<TextEditingState>) => void;
  onDrillInto?: (id: string) => void;
  onChildStyleSelect?: (componentId: string) => void;
  onChildPickImage?: (componentId: string) => void;
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
  onSelect,
  onDragStart,
  onDragEnd,
  onDragOverTrashChange,
  onDeleteComponent,
  onPickImage,
  onLongPress,
  isDimmed,
  locked,
  isDrilledInto,
  selectedChildId,
  onChildSelect,
  onChildUpdate,
  onChildEditStart,
  onChildEditStateChange,
  onDrillInto,
  onChildStyleSelect,
  onChildPickImage,
}: SDUIComponentProps) {
  const keyboardHeight = useKeyboardHeight();
  const [editTapFired, setEditTapFired] = useState(false);
  const isComponentEditing = editingComponentId === component.id;

  const fireEditTap = useCallback(() => {
    setEditTapFired(true);
    onInteract?.();
    onSelect?.(component.id);
  }, [onInteract, onSelect, component.id]);

  const fireLongPress = useCallback((absX: number, absY: number) => {
    onLongPress?.(component.id, absX, absY);
  }, [onLongPress, component.id]);

  const consumeEditTap = useCallback(() => {
    setEditTapFired(false);
  }, []);

  useEffect(() => {
    if (autoEdit && isEditMode) {
      setEditTapFired(true);
      onAutoEditConsumed?.();
    }
  }, [autoEdit, isEditMode, onAutoEditConsumed]);

  // Track whether we're in text-editing mode (shared value for animated style)
  const isTextEditing = useSharedValue(false);
  useEffect(() => {
    isTextEditing.value = editState != null;
  }, [editState, isTextEditing]);

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

  // Trash zone detection
  const trashProgress = useSharedValue(0);
  const isOverTrashSV = useSharedValue(false);

  // Edit animation offset — lerps the component to center when editing
  const editOffsetX = useSharedValue(0);
  const editOffsetY = useSharedValue(0);

  // Derive base values as shared values so animated style reacts to prop changes
  const baseX = useDerivedValue(() => component.layout.x * canvasWidth);
  const baseY = useDerivedValue(() => component.layout.y * canvasHeight);
  const baseW = useDerivedValue(() => component.layout.width * canvasWidth);
  const baseH = useDerivedValue(() => component.layout.height * canvasHeight);
  const baseRotation = useDerivedValue(() => component.layout.rotation ?? 0);

  // Animate to center when editing or drilled into, back when done
  // Account for keyboard height so the component centers in the visible area
  const shouldCenter = isComponentEditing || !!isDrilledInto;
  useEffect(() => {
    if (shouldCenter) {
      const currentX = component.layout.x * canvasWidth;
      const currentY = component.layout.y * canvasHeight;
      const w = component.layout.width * canvasWidth;
      const h = component.layout.height * canvasHeight;
      const visibleHeight = canvasHeight - keyboardHeight;
      const targetX = canvasWidth / 2 - w / 2;
      const targetY = visibleHeight / 2 - h / 2;
      editOffsetX.value = withTiming(targetX - currentX, { duration: 300 });
      editOffsetY.value = withTiming(targetY - currentY, { duration: 300 });
    } else {
      editOffsetX.value = withTiming(0, { duration: 300 });
      editOffsetY.value = withTiming(0, { duration: 300 });
    }
  }, [shouldCenter, canvasWidth, canvasHeight, keyboardHeight, component.layout, editOffsetX, editOffsetY]);

  const animatedStyle = useAnimatedStyle(() => {
    const tScale = interpolate(trashProgress.value, [0, 1], [1, 0.1]);
    const tOpacity = interpolate(trashProgress.value, [0, 1], [1, 0.5]);
    if (isEditMode) {
      return {
        position: "absolute" as const,
        left: baseX.value + translateX.value + editOffsetX.value,
        top: baseY.value + translateY.value + editOffsetY.value,
        width: baseW.value,
        // When text editing, don't fix height so the TextInput can grow with content
        height: isTextEditing.value ? undefined : baseH.value,
        minHeight: isTextEditing.value ? Math.max(baseH.value, 44) : 44,
        opacity: tOpacity,
        transform: [
          { rotate: `${baseRotation.value + rotation.value}rad` },
          { scale: scale.value * tScale },
        ],
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
    const scaleFactor = scale.value;
    // Transform scale is applied from center, so adjust position accordingly
    const scaleOffsetX = baseW.value * (1 - scaleFactor) / 2;
    const scaleOffsetY = baseH.value * (1 - scaleFactor) / 2;
    const finalX = baseX.value + translateX.value + scaleOffsetX;
    const finalY = baseY.value + translateY.value + scaleOffsetY;
    const finalW = baseW.value * scaleFactor;
    const finalH = baseH.value * scaleFactor;
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

    // Scale fontSize proportionally for text-containing components
    if (scaleFactor !== 1 && onStyleChange) {
      const fontSize = ('fontSize' in component) ? (component as any).fontSize as number | undefined : undefined;
      if (fontSize != null) {
        onStyleChange(component.id, { fontSize: Math.max(8, Math.round(fontSize * scaleFactor)) });
      }
    }
  }, [component, canvasWidth, canvasHeight, onUpdate, onStyleChange, baseX, baseY, baseW, baseH, baseRotation, translateX, translateY, scale, rotation]);

  // Drag notification callbacks (stable refs for worklet runOnJS)
  const notifyDragStart = useCallback(() => {
    onDragStart?.(component.id);
  }, [onDragStart, component.id]);

  const notifyDragEnd = useCallback(() => {
    onDragEnd?.();
  }, [onDragEnd]);

  const notifyDragOverTrash = useCallback((isOver: boolean) => {
    onDragOverTrashChange?.(isOver);
  }, [onDragOverTrashChange]);

  const deleteThisComponent = useCallback(() => {
    onDeleteComponent?.(component.id);
  }, [onDeleteComponent, component.id]);

  const gesturesDisabled = isComponentEditing || !!isDrilledInto || !!locked;

  const allGestures = useMemo(() => {
    const panGesture = Gesture.Pan()
      .enabled(!gesturesDisabled)
      .minDistance(10)
      .onStart(() => {
        panStarted.value = true;
        activeGestures.value++;
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
        runOnJS(notifyDragStart)();
      })
      .onUpdate((e) => {
        const rawX = savedTranslateX.value + e.translationX;
        const rawY = savedTranslateY.value + e.translationY;

        if (siblingRects && componentIndex != null && onGuidesChange) {
          // Scale is applied as transform from center, so compute visual bounds
          const currentW = baseW.value * scale.value;
          const currentH = baseH.value * scale.value;
          const currentL = baseX.value + rawX + baseW.value * (1 - scale.value) / 2;
          const currentT = baseY.value + rawY + baseH.value * (1 - scale.value) / 2;

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

        // Trash zone detection (center is unaffected by scale-from-center transform)
        const centerY = baseY.value + translateY.value + baseH.value / 2;
        const overTrash = centerY > canvasHeight - TRASH_ZONE_HEIGHT;
        if (overTrash !== isOverTrashSV.value) {
          isOverTrashSV.value = overTrash;
          trashProgress.value = withTiming(overTrash ? 1 : 0, { duration: 200 });
          runOnJS(notifyDragOverTrash)(overTrash);
        }
      })
      .onFinalize(() => {
        if (!panStarted.value) return;
        panStarted.value = false;
        activeGestures.value--;
        if (onGuidesEnd) {
          runOnJS(onGuidesEnd)();
        }
        if (isOverTrashSV.value) {
          isOverTrashSV.value = false;
          trashProgress.value = 0;
          translateX.value = 0;
          translateY.value = 0;
          scale.value = 1;
          rotation.value = 0;
          runOnJS(deleteThisComponent)();
        } else {
          trashProgress.value = withTiming(0, { duration: 150 });
          if (activeGestures.value <= 0) {
            activeGestures.value = 0;
            runOnJS(commitLayout)();
          }
        }
        runOnJS(notifyDragEnd)();
      });

    const pinchGesture = Gesture.Pinch()
      .enabled(!gesturesDisabled)
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
      .enabled(!gesturesDisabled)
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
      .enabled(!gesturesDisabled)
      .maxDistance(10)
      .onEnd(() => {
        runOnJS(fireEditTap)();
      });

    const longPressGesture = Gesture.LongPress()
      .enabled(!gesturesDisabled)
      .minDuration(500)
      .onEnd((e, success) => {
        if (success) {
          runOnJS(fireLongPress)(e.absoluteX, e.absoluteY);
        }
      });

    const tapOrLongPress = Gesture.Exclusive(longPressGesture, tapGesture);

    return Gesture.Simultaneous(
      tapOrLongPress,
      panGesture,
      pinchGesture,
      rotationGesture
    );
  }, [gesturesDisabled, commitLayout, fireEditTap, fireLongPress, notifyDragStart, notifyDragEnd, notifyDragOverTrash, deleteThisComponent, translateX, translateY, scale, rotation, savedTranslateX, savedTranslateY, savedScale, savedRotation, activeGestures, panStarted, pinchStarted, rotationStarted, trashProgress, isOverTrashSV, siblingRects, componentIndex, onGuidesChange, onGuidesEnd, canvasWidth, canvasHeight, baseX, baseY, baseW, baseH]);

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
    };
  } else if (component.type === "icon") {
    rendererProps = { component, isEditMode };
  } else if (component.type === "toggle" || component.type === "textInput") {
    rendererProps = { component, isEditMode };
  } else if (component.type === "list") {
    rendererProps = { component, isEditMode };
  } else if (component.type === "container") {
    rendererProps = {
      component,
      isEditMode,
      isDrilledInto,
      selectedChildId,
      editingComponentId,
      editState,
      onChildSelect,
      onChildUpdate,
      onChildEditStart,
      onChildEditStateChange,
      onDrillInto,
      onChildStyleSelect,
      onChildPickImage,
    };
  } else if (component.type === "image") {
    rendererProps = {
      component,
      onPickImage: isComponentEditing ? () => onPickImage?.(component.id) : undefined,
    };
  } else {
    rendererProps = { component };
  }

  const isContainerSelected = isEditMode && component.type === "container" && !isDrilledInto &&
    editingComponentId !== component.id && editTapFired;

  const dimStyle = isDimmed ? { opacity: 0.3, pointerEvents: "none" as const } : undefined;

  if (!isEditMode) {
    return (
      <Animated.View style={animatedStyle}>
        <SmartComponentWrapper
          component={component}
          isEditMode={false}
          onNavigate={onNavigate}
          onResetAndBuild={onResetAndBuild}
        >
          {(resolvedComponent) => {
            const resolvedProps = { ...rendererProps, component: resolvedComponent };
            const ResolvedRenderer = rendererRegistry[resolvedComponent.type];
            if (!ResolvedRenderer) return null;
            return <ResolvedRenderer {...resolvedProps} />;
          }}
        </SmartComponentWrapper>
      </Animated.View>
    );
  }

  return (
    <GestureDetector gesture={allGestures}>
      <Animated.View style={[
        animatedStyle,
        isComponentEditing && { zIndex: 200 },
        isDrilledInto && sduiStyles.drilledIntoBorder,
        dimStyle,
      ]}>
        {isContainerSelected && (
          <View style={sduiStyles.groupSelectOutline} pointerEvents="none">
            <View style={sduiStyles.groupBadge}>
              <View><Animated.Text style={sduiStyles.groupBadgeText}>Group</Animated.Text></View>
            </View>
          </View>
        )}
        <Renderer {...rendererProps} />
        {/* Transparent overlay to capture touches for gesture handler.
            Without this, Text/TextInput native views steal touch events
            and prevent pan/pinch/rotation gestures from firing. */}
        {!isComponentEditing && (
          <View style={sduiStyles.gestureOverlay} />
        )}
      </Animated.View>
    </GestureDetector>
  );
}

const sduiStyles = StyleSheet.create({
  gestureOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  groupSelectOutline: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: "#818cf8",
    borderStyle: "dashed",
    borderRadius: 12,
    zIndex: 10,
  },
  groupBadge: {
    position: "absolute",
    top: -10,
    left: 8,
    backgroundColor: "#818cf8",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  groupBadgeText: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "700",
  },
  drilledIntoBorder: {
    borderWidth: 2,
    borderColor: "#818cf8",
    borderRadius: 12,
    zIndex: 50,
  },
});
