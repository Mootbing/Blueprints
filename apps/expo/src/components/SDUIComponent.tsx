import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { View, StyleSheet } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
  cancelAnimation,
  runOnJS,
  interpolate,
  type SharedValue,
} from "react-native-reanimated";
import type { Component, Layout, ComponentStyleUpdates } from "../types";
import { rendererRegistry } from "./renderers";
import { computeSnap } from "../utils/snapWorklet";
import type { TextEditingState } from "./EditorToolbar";
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
  onOpenAgent?: (prompt: string) => void;
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
  onDragMove?: (componentId: string, centerX: number, centerY: number) => void;
  onDragOverTrashChange?: (isOver: boolean) => void;
  onDeleteComponent?: (componentId: string) => void;
  onPickImage?: (componentId: string) => void;
  onLongPress?: (id: string, screenX: number, screenY: number) => void;
  isDimmed?: boolean;
  locked?: boolean;
  isDropTarget?: boolean;
  multiSelectMode?: boolean;
  isMultiSelected?: boolean;
  multiDragOffsetX?: SharedValue<number>;
  multiDragOffsetY?: SharedValue<number>;
  isSelected?: boolean;
  onHugContent?: (id: string, axis: "width" | "height" | "both") => void;
  onResizeStart?: () => void;
  onResizeEnd?: () => void;
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
  onOpenAgent,
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
  onDragMove,
  onDragOverTrashChange,
  onDeleteComponent,
  onPickImage,
  onLongPress,
  isDimmed,
  locked,
  isDropTarget,
  multiSelectMode,
  isMultiSelected,
  multiDragOffsetX,
  multiDragOffsetY,
  isSelected,
  onHugContent,
  onResizeStart,
  onResizeEnd,
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
    if (!multiSelectMode) setEditTapFired(true);
    onInteract?.();
    onSelect?.(component.id);
  }, [onInteract, onSelect, component.id, multiSelectMode]);

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

  // Base values as shared values — updated atomically from the UI-thread worklet on
  // gesture commit (same frame as delta reset) to prevent visual snap-back, and synced
  // from React props for external updates (AI, collab, undo).
  const baseX = useSharedValue(component.layout.x * canvasWidth);
  const baseY = useSharedValue(component.layout.y * canvasHeight);
  const baseW = useSharedValue(component.layout.width * canvasWidth);
  const baseH = useSharedValue(component.layout.height * canvasHeight);
  const baseRotation = useSharedValue(component.layout.rotation ?? 0);
  useEffect(() => {
    baseX.value = component.layout.x * canvasWidth;
    baseY.value = component.layout.y * canvasHeight;
    baseW.value = component.layout.width * canvasWidth;
    baseH.value = component.layout.height * canvasHeight;
    baseRotation.value = component.layout.rotation ?? 0;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- shared values are stable refs
  }, [component.layout.x, component.layout.y, component.layout.width, component.layout.height, component.layout.rotation, canvasWidth, canvasHeight]);

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
    return () => {
      cancelAnimation(editOffsetX);
      cancelAnimation(editOffsetY);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- editOffsetX/editOffsetY are stable shared values
  }, [shouldCenter, canvasWidth, canvasHeight, keyboardHeight, component.layout]);

  // --- Resize handles (declared before animatedStyle which references them) ---
  const resizeDeltaW = useSharedValue(0);
  const resizeDeltaH = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    const tScale = interpolate(trashProgress.value, [0, 1], [1, 0.1]);
    const tOpacity = interpolate(trashProgress.value, [0, 1], [1, 0.5]);
    if (isEditMode) {
      // Multi-selected but NOT the one being dragged → follow the group offset
      const groupOffX = (!panStarted.value && isMultiSelected && multiDragOffsetX) ? multiDragOffsetX.value : 0;
      const groupOffY = (!panStarted.value && isMultiSelected && multiDragOffsetY) ? multiDragOffsetY.value : 0;
      return {
        position: "absolute" as const,
        left: baseX.value + translateX.value + editOffsetX.value + groupOffX,
        top: baseY.value + translateY.value + editOffsetY.value + groupOffY,
        width: Math.max(20, baseW.value + resizeDeltaW.value),
        // When text editing, don't fix height so the TextInput can grow with content
        height: isTextEditing.value ? undefined : Math.max(20, baseH.value + resizeDeltaH.value),
        minHeight: isTextEditing.value ? Math.max(baseH.value + resizeDeltaH.value, 44) : 44,
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

  // Receives pre-computed pixel values from the UI-thread worklet (base values already
  // updated there to prevent visual snap-back). Just normalizes and persists.
  const commitLayout = useCallback((finalX: number, finalY: number, finalW: number, finalH: number, finalR: number, scaleFactor: number) => {
    const newLayout: Layout = {
      x: clamp(finalX / canvasWidth, 0, 1),
      y: clamp(finalY / canvasHeight, 0, 1),
      width: clamp(finalW / canvasWidth, 0, 1),
      height: clamp(finalH / canvasHeight, 0, 1),
      rotation: finalR,
    };

    onUpdate(component.id, newLayout);

    // Scale fontSize proportionally for text-containing components
    if (scaleFactor !== 1 && onStyleChange) {
      const fontSize = ('fontSize' in component) ? (component as any).fontSize as number | undefined : undefined;
      if (fontSize != null) {
        onStyleChange(component.id, { fontSize: Math.max(8, Math.round(fontSize * scaleFactor)) });
      }
    }
  }, [component, canvasWidth, canvasHeight, onUpdate, onStyleChange]);

  // Drag notification callbacks (stable refs for worklet runOnJS)
  const notifyDragStart = useCallback(() => {
    onDragStart?.(component.id);
  }, [onDragStart, component.id]);

  const notifyDragEnd = useCallback(() => {
    onDragEnd?.();
  }, [onDragEnd]);

  const notifyDragMove = useCallback((centerX: number, centerY: number) => {
    onDragMove?.(component.id, centerX, centerY);
  }, [onDragMove, component.id]);

  const notifyDragOverTrash = useCallback((isOver: boolean) => {
    onDragOverTrashChange?.(isOver);
  }, [onDragOverTrashChange]);

  const deleteThisComponent = useCallback(() => {
    onDeleteComponent?.(component.id);
  }, [onDeleteComponent, component.id]);

  // Stable callback refs — prevent gesture useMemo from recreating on callback identity changes
  const cbRefs = useRef({ commitLayout, fireEditTap, fireLongPress, notifyDragStart, notifyDragEnd, notifyDragMove, notifyDragOverTrash, deleteThisComponent, onGuidesChange, onGuidesEnd });
  cbRefs.current = { commitLayout, fireEditTap, fireLongPress, notifyDragStart, notifyDragEnd, notifyDragMove, notifyDragOverTrash, deleteThisComponent, onGuidesChange, onGuidesEnd };
  const _commitLayout = useCallback((fx: number, fy: number, fw: number, fh: number, fr: number, sf: number) => cbRefs.current.commitLayout(fx, fy, fw, fh, fr, sf), []);
  const _fireEditTap = useCallback(() => cbRefs.current.fireEditTap(), []);
  const _fireLongPress = useCallback((x: number, y: number) => cbRefs.current.fireLongPress(x, y), []);
  const _notifyDragStart = useCallback(() => cbRefs.current.notifyDragStart(), []);
  const _notifyDragEnd = useCallback(() => cbRefs.current.notifyDragEnd(), []);
  const _notifyDragMove = useCallback((cx: number, cy: number) => cbRefs.current.notifyDragMove(cx, cy), []);
  const _notifyDragOverTrash = useCallback((isOver: boolean) => cbRefs.current.notifyDragOverTrash(isOver), []);
  const _deleteThisComponent = useCallback(() => cbRefs.current.deleteThisComponent(), []);
  const _onGuidesChange = useCallback((guides: number[]) => cbRefs.current.onGuidesChange?.(guides), []);
  const _onGuidesEnd = useCallback(() => cbRefs.current.onGuidesEnd?.(), []);

  const layoutRef = useRef(component.layout);
  layoutRef.current = component.layout;

  const commitResize = useCallback((deltaW: number, deltaH: number) => {
    const current = layoutRef.current;
    const newW = current.width + deltaW / canvasWidth;
    const newH = current.height + deltaH / canvasHeight;
    resizeDeltaW.value = 0;
    resizeDeltaH.value = 0;
    onUpdate(component.id, {
      ...current,
      width: clamp(newW, 0.02, 1),
      height: clamp(newH, 0.02, 1),
    });
  }, [component.id, canvasWidth, canvasHeight, onUpdate, resizeDeltaW, resizeDeltaH]);

  const hugWidth = useCallback(() => {
    onHugContent?.(component.id, "width");
  }, [component.id, onHugContent]);
  const hugHeight = useCallback(() => {
    onHugContent?.(component.id, "height");
  }, [component.id, onHugContent]);
  const hugBoth = useCallback(() => {
    onHugContent?.(component.id, "both");
  }, [component.id, onHugContent]);

  const notifyResizeStart = useCallback(() => {
    onResizeStart?.();
  }, [onResizeStart]);
  const notifyResizeEnd = useCallback(() => {
    onResizeEnd?.();
  }, [onResizeEnd]);

  // Stable refs for resize callbacks
  const resizeCbRefs = useRef({ commitResize, hugWidth, hugHeight, hugBoth, notifyResizeStart, notifyResizeEnd });
  resizeCbRefs.current = { commitResize, hugWidth, hugHeight, hugBoth, notifyResizeStart, notifyResizeEnd };
  const _commitResize = useCallback((dw: number, dh: number) => resizeCbRefs.current.commitResize(dw, dh), []);
  const _hugWidth = useCallback(() => resizeCbRefs.current.hugWidth(), []);
  const _hugHeight = useCallback(() => resizeCbRefs.current.hugHeight(), []);
  const _hugBoth = useCallback(() => resizeCbRefs.current.hugBoth(), []);
  const _notifyResizeStart = useCallback(() => resizeCbRefs.current.notifyResizeStart(), []);
  const _notifyResizeEnd = useCallback(() => resizeCbRefs.current.notifyResizeEnd(), []);

  const rightResizeGesture = useMemo(() => {
    const pan = Gesture.Pan()
      .minDistance(5)
      .onStart(() => {
        runOnJS(_notifyResizeStart)();
      })
      .onUpdate((e) => {
        resizeDeltaW.value = e.translationX;
      })
      .onFinalize(() => {
        const dw = resizeDeltaW.value;
        baseW.value = baseW.value + dw;
        resizeDeltaW.value = 0;
        runOnJS(_commitResize)(dw, 0);
        runOnJS(_notifyResizeEnd)();
      });
    const doubleTap = Gesture.Tap()
      .numberOfTaps(2)
      .maxDuration(250)
      .onEnd(() => { runOnJS(_hugWidth)(); });
    return Gesture.Exclusive(doubleTap, pan);
  }, []);

  const bottomResizeGesture = useMemo(() => {
    const pan = Gesture.Pan()
      .minDistance(5)
      .onStart(() => {
        runOnJS(_notifyResizeStart)();
      })
      .onUpdate((e) => {
        resizeDeltaH.value = e.translationY;
      })
      .onFinalize(() => {
        const dh = resizeDeltaH.value;
        baseH.value = baseH.value + dh;
        resizeDeltaH.value = 0;
        runOnJS(_commitResize)(0, dh);
        runOnJS(_notifyResizeEnd)();
      });
    const doubleTap = Gesture.Tap()
      .numberOfTaps(2)
      .maxDuration(250)
      .onEnd(() => { runOnJS(_hugHeight)(); });
    return Gesture.Exclusive(doubleTap, pan);
  }, []);

  const diagonalResizeGesture = useMemo(() => {
    const pan = Gesture.Pan()
      .minDistance(5)
      .onStart(() => {
        runOnJS(_notifyResizeStart)();
      })
      .onUpdate((e) => {
        resizeDeltaW.value = e.translationX;
        resizeDeltaH.value = e.translationY;
      })
      .onFinalize(() => {
        const dw = resizeDeltaW.value;
        const dh = resizeDeltaH.value;
        baseW.value = baseW.value + dw;
        baseH.value = baseH.value + dh;
        resizeDeltaW.value = 0;
        resizeDeltaH.value = 0;
        runOnJS(_commitResize)(dw, dh);
        runOnJS(_notifyResizeEnd)();
      });
    const doubleTap = Gesture.Tap()
      .numberOfTaps(2)
      .maxDuration(250)
      .onEnd(() => { runOnJS(_hugBoth)(); });
    return Gesture.Exclusive(doubleTap, pan);
  }, []);

  const showResizeHandles = isEditMode && !!isSelected && !isDimmed && !locked;

  // Drop target pulse animation
  const dropPulse = useSharedValue(0);
  useEffect(() => {
    if (isDropTarget) {
      dropPulse.value = withTiming(1, { duration: 300 });
    } else {
      dropPulse.value = withTiming(0, { duration: 200 });
    }
    return () => {
      cancelAnimation(dropPulse);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- dropPulse is a stable shared value
  }, [isDropTarget]);

  const dropTargetStyle = useAnimatedStyle(() => {
    if (dropPulse.value === 0) return {};
    const opacity = interpolate(dropPulse.value, [0, 1], [0, 0.8]);
    return {
      borderWidth: interpolate(dropPulse.value, [0, 1], [0, 3]),
      borderColor: `rgba(255,255,255,${opacity})`,
      borderRadius: 12,
    };
  });

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
        runOnJS(_notifyDragStart)();
      })
      .onUpdate((e) => {
        const rawX = savedTranslateX.value + e.translationX;
        const rawY = savedTranslateY.value + e.translationY;

        if (siblingRects && componentIndex != null) {
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
          runOnJS(_onGuidesChange)(result.guides);
        } else {
          translateX.value = rawX;
          translateY.value = rawY;
        }

        // Update multi-drag offset so other selected components follow
        if (isMultiSelected && multiDragOffsetX && multiDragOffsetY) {
          multiDragOffsetX.value = translateX.value;
          multiDragOffsetY.value = translateY.value;
        }

        // Trash zone detection (center is unaffected by scale-from-center transform)
        const centerX = baseX.value + translateX.value + baseW.value / 2;
        const centerY = baseY.value + translateY.value + baseH.value / 2;
        runOnJS(_notifyDragMove)(centerX, centerY);
        const overTrash = centerY > canvasHeight - TRASH_ZONE_HEIGHT;
        if (overTrash !== isOverTrashSV.value) {
          isOverTrashSV.value = overTrash;
          trashProgress.value = withTiming(overTrash ? 1 : 0, { duration: 200 });
          runOnJS(_notifyDragOverTrash)(overTrash);
        }
      })
      .onFinalize(() => {
        if (!panStarted.value) return;
        panStarted.value = false;
        activeGestures.value--;
        runOnJS(_onGuidesEnd)();
        if (isOverTrashSV.value) {
          isOverTrashSV.value = false;
          // Don't reset translateX/Y/scale/rotation — keep visual position
          // until the component is removed from the tree to avoid teleport flash
          runOnJS(_deleteThisComponent)();
        } else {
          trashProgress.value = withTiming(0, { duration: 150 });
          if (activeGestures.value <= 0) {
            activeGestures.value = 0;
            // Compute final layout values on UI thread
            const s = scale.value;
            const soX = baseW.value * (1 - s) / 2;
            const soY = baseH.value * (1 - s) / 2;
            const fx = baseX.value + translateX.value + soX;
            const fy = baseY.value + translateY.value + soY;
            const fw = baseW.value * s;
            const fh = baseH.value * s;
            const fr = baseRotation.value + rotation.value;
            // Update bases AND reset deltas atomically — no visual snap-back
            baseX.value = fx;
            baseY.value = fy;
            baseW.value = fw;
            baseH.value = fh;
            baseRotation.value = fr;
            translateX.value = 0;
            translateY.value = 0;
            scale.value = 1;
            rotation.value = 0;
            runOnJS(_commitLayout)(fx, fy, fw, fh, fr, s);
          }
        }
        runOnJS(_notifyDragEnd)();
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
          const s = scale.value;
          const soX = baseW.value * (1 - s) / 2;
          const soY = baseH.value * (1 - s) / 2;
          const fx = baseX.value + translateX.value + soX;
          const fy = baseY.value + translateY.value + soY;
          const fw = baseW.value * s;
          const fh = baseH.value * s;
          const fr = baseRotation.value + rotation.value;
          baseX.value = fx;
          baseY.value = fy;
          baseW.value = fw;
          baseH.value = fh;
          baseRotation.value = fr;
          translateX.value = 0;
          translateY.value = 0;
          scale.value = 1;
          rotation.value = 0;
          runOnJS(_commitLayout)(fx, fy, fw, fh, fr, s);
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
          const s = scale.value;
          const soX = baseW.value * (1 - s) / 2;
          const soY = baseH.value * (1 - s) / 2;
          const fx = baseX.value + translateX.value + soX;
          const fy = baseY.value + translateY.value + soY;
          const fw = baseW.value * s;
          const fh = baseH.value * s;
          const fr = baseRotation.value + rotation.value;
          baseX.value = fx;
          baseY.value = fy;
          baseW.value = fw;
          baseH.value = fh;
          baseRotation.value = fr;
          translateX.value = 0;
          translateY.value = 0;
          scale.value = 1;
          rotation.value = 0;
          runOnJS(_commitLayout)(fx, fy, fw, fh, fr, s);
        }
      });

    const tapGesture = Gesture.Tap()
      .enabled(!gesturesDisabled)
      .maxDistance(10)
      .onEnd(() => {
        runOnJS(_fireEditTap)();
      });

    const longPressGesture = Gesture.LongPress()
      .enabled(!gesturesDisabled)
      .minDuration(500)
      .onStart((e) => {
        runOnJS(_fireLongPress)(e.absoluteX, e.absoluteY);
      });

    const tapOrLongPress = Gesture.Exclusive(longPressGesture, tapGesture);

    return Gesture.Simultaneous(
      tapOrLongPress,
      panGesture,
      pinchGesture,
      rotationGesture
    );
    // Stable callbacks (_commitLayout etc.) use refs internally so they never change identity.
    // Only re-create gestures when these captured-by-value props change:
  }, [gesturesDisabled, canvasWidth, canvasHeight, componentIndex, isMultiSelected]);

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
    rendererProps = {
      component,
      isEditMode,
      editTapFired,
      consumeEditTap,
      editState: isComponentEditing ? editState : null,
      onEditStart: handleEditStart,
      onEditStateChange,
    };
  } else if (component.type === "toggle" || component.type === "textInput") {
    rendererProps = { component, isEditMode };
  } else if (component.type === "list") {
    rendererProps = { component, isEditMode, onNavigate, onResetAndBuild };
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
          onOpenAgent={onOpenAgent}
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
        isDropTarget && { borderStyle: 'dashed' as const },
        isDropTarget && dropTargetStyle,
      ]}>
        {isContainerSelected && (
          <View style={sduiStyles.groupSelectOutline} pointerEvents="none">
            <View style={sduiStyles.groupBadge}>
              <View><Animated.Text style={sduiStyles.groupBadgeText}>Group</Animated.Text></View>
            </View>
          </View>
        )}
        {isMultiSelected && (
          <View style={sduiStyles.multiSelectOutline} pointerEvents="none" />
        )}
        <Renderer {...rendererProps} />
        {/* Transparent overlay to capture touches for gesture handler.
            Without this, Text/TextInput native views steal touch events
            and prevent pan/pinch/rotation gestures from firing. */}
        {!isComponentEditing && (
          <View style={sduiStyles.gestureOverlay} />
        )}
        {/* Resize handles: right edge (width) and bottom edge (height) */}
        {showResizeHandles && (
          <>
            <GestureDetector gesture={rightResizeGesture}>
              <Animated.View style={sduiStyles.rightResizeHandle}>
                <View style={sduiStyles.resizeBarV} />
              </Animated.View>
            </GestureDetector>
            <GestureDetector gesture={bottomResizeGesture}>
              <Animated.View style={sduiStyles.bottomResizeHandle}>
                <View style={sduiStyles.resizeBarH} />
              </Animated.View>
            </GestureDetector>
            <GestureDetector gesture={diagonalResizeGesture}>
              <Animated.View style={sduiStyles.diagonalResizeHandle}>
                <View style={sduiStyles.resizeBarDiag} />
              </Animated.View>
            </GestureDetector>
          </>
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
    borderColor: "#fff",
    borderStyle: "dashed",
    borderRadius: 12,
    zIndex: 10,
  },
  groupBadge: {
    position: "absolute",
    top: -10,
    left: 8,
    backgroundColor: "#fff",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  groupBadgeText: {
    color: "#000",
    fontSize: 9,
    fontWeight: "700",
  },
  multiSelectOutline: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: "#3b82f6",
    borderRadius: 8,
    zIndex: 10,
  },
  drilledIntoBorder: {
    borderWidth: 2,
    borderColor: "#fff",
    borderRadius: 12,
    zIndex: 50,
  },
  rightResizeHandle: {
    position: "absolute",
    right: -14,
    top: 0,
    bottom: 0,
    width: 28,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
  },
  bottomResizeHandle: {
    position: "absolute",
    bottom: -14,
    left: 0,
    right: 0,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
  },
  resizeBarV: {
    width: 4,
    height: 32,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.8)",
  },
  resizeBarH: {
    width: 32,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.8)",
  },
  diagonalResizeHandle: {
    position: "absolute",
    right: -14,
    bottom: -14,
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 21,
  },
  resizeBarDiag: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.8)",
  },
});
