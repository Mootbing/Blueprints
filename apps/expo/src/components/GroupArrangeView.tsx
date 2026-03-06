import React, { useState, useCallback, useMemo } from "react";
import { View, Pressable, Text, ScrollView, StyleSheet } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
} from "react-native-reanimated";
import type { Component, ContainerComponent, Layout } from "../types";
import { rendererRegistry } from "./renderers";
import type { TextEditingState } from "./TextEditorModal";

function clamp(value: number, min: number, max: number) {
  "worklet";
  return Math.min(Math.max(value, min), max);
}

interface GroupArrangeViewProps {
  container: ContainerComponent;
  childComponents: Component[];
  canvasWidth: number;
  canvasHeight: number;
  editingComponentId: string | null;
  editState: TextEditingState | null;
  onChildSelect: (id: string) => void;
  onChildEditStart: (componentId: string, initialState: TextEditingState) => void;
  onChildEditStateChange: (updates: Partial<TextEditingState>) => void;
  onDrillInto: (id: string) => void;
  onChildStyleSelect: (componentId: string) => void;
  onChildPickImage?: (componentId: string) => void;
  onEditDone: () => void;
  onLongPress?: () => void;
  onChildUpdate: (id: string, layout: Layout) => void;
}

/* ── Corner resize handle ─────────────────────────────── */

function ResizeHandle({
  corner,
  childLayout,
  containerW,
  containerH,
  onCommit,
}: {
  corner: "tl" | "tr" | "bl" | "br";
  childLayout: Layout;
  containerW: number;
  containerH: number;
  onCommit: (layout: Layout) => void;
}) {
  const dx = useSharedValue(0);
  const dy = useSharedValue(0);

  const commitResize = useCallback(() => {
    const pxW = childLayout.width * containerW;
    const pxH = childLayout.height * containerH;

    let newW = pxW;
    let newH = pxH;

    if (corner === "br") {
      newW = pxW + dx.value;
      newH = pxH + dy.value;
    } else if (corner === "bl") {
      newW = pxW - dx.value;
      newH = pxH + dy.value;
    } else if (corner === "tr") {
      newW = pxW + dx.value;
      newH = pxH - dy.value;
    } else {
      newW = pxW - dx.value;
      newH = pxH - dy.value;
    }

    dx.value = 0;
    dy.value = 0;

    onCommit({
      ...childLayout,
      width: clamp(newW / containerW, 0.02, 1),
      height: clamp(newH / containerH, 0.02, 1),
    });
  }, [childLayout, containerW, containerH, corner, dx, dy, onCommit]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(0)
        .onUpdate((e) => {
          dx.value = e.translationX;
          dy.value = e.translationY;
        })
        .onFinalize(() => {
          runOnJS(commitResize)();
        }),
    [commitResize, dx, dy],
  );

  const posStyle = useMemo(() => {
    const base: Record<string, number> = {};
    if (corner.includes("t")) base.top = -6;
    else base.bottom = -6;
    if (corner.includes("l")) base.left = -6;
    else base.right = -6;
    return base;
  }, [corner]);

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.handle, posStyle]} />
    </GestureDetector>
  );
}

/* ── Single child wrapper ─────────────────────────────── */

function ArrangeChild({
  child,
  containerW,
  containerH,
  isSelected,
  isEditing,
  editState,
  onTap,
  onDoubleTap,
  onUpdate,
}: {
  child: Component;
  containerW: number;
  containerH: number;
  isSelected: boolean;
  isEditing: boolean;
  editState: TextEditingState | null;
  onTap: (child: Component) => void;
  onDoubleTap: (child: Component) => void;
  onUpdate: (id: string, layout: Layout) => void;
}) {
  const displayW = child.layout.width * containerW;
  const displayH = child.layout.height * containerH;

  const fireTap = useCallback(() => onTap(child), [child, onTap]);
  const fireDoubleTap = useCallback(() => onDoubleTap(child), [child, onDoubleTap]);

  const gesture = useMemo(() => {
    const doubleTap = Gesture.Tap()
      .numberOfTaps(2)
      .maxDelay(300)
      .onEnd(() => {
        runOnJS(fireDoubleTap)();
      });

    const singleTap = Gesture.Tap()
      .maxDuration(250)
      .onEnd(() => {
        runOnJS(fireTap)();
      });

    return Gesture.Exclusive(doubleTap, singleTap);
  }, [fireTap, fireDoubleTap]);

  const Renderer = rendererRegistry[child.type];
  if (!Renderer) return null;

  let rendererProps: Record<string, unknown> = { component: child, isEditMode: true };
  if (child.type === "text" || child.type === "button") {
    rendererProps = {
      ...rendererProps,
      editTapFired: false,
      consumeEditTap: () => {},
      editState: isEditing ? editState : null,
      onEditStart: () => {},
      onEditStateChange: () => {},
    };
  }

  const commitLayout = useCallback(
    (layout: Layout) => onUpdate(child.id, layout),
    [child.id, onUpdate],
  );

  return (
    <View style={{ width: displayW, height: displayH, alignSelf: "center", marginVertical: 4 }}>
      <GestureDetector gesture={gesture}>
        <Animated.View style={{ flex: 1 }}>
          {isSelected && (
            <View style={styles.selectionOutline} pointerEvents="none" />
          )}
          <Renderer {...rendererProps} />
        </Animated.View>
      </GestureDetector>
      {isSelected && (
        <>
          <ResizeHandle corner="tl" childLayout={child.layout} containerW={containerW} containerH={containerH} onCommit={commitLayout} />
          <ResizeHandle corner="tr" childLayout={child.layout} containerW={containerW} containerH={containerH} onCommit={commitLayout} />
          <ResizeHandle corner="bl" childLayout={child.layout} containerW={containerW} containerH={containerH} onCommit={commitLayout} />
          <ResizeHandle corner="br" childLayout={child.layout} containerW={containerW} containerH={containerH} onCommit={commitLayout} />
        </>
      )}
    </View>
  );
}

/* ── Main arrange view ────────────────────────────────── */

export function GroupArrangeView({
  container,
  childComponents,
  canvasWidth,
  canvasHeight,
  editingComponentId,
  editState,
  onChildSelect,
  onChildEditStart,
  onChildEditStateChange,
  onDrillInto,
  onChildStyleSelect,
  onChildPickImage,
  onEditDone,
  onLongPress,
  onChildUpdate,
}: GroupArrangeViewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const isEditing = editingComponentId != null;

  // Container dimensions in pixels (the mini-canvas is this size)
  const containerW = canvasWidth * 0.92;
  const containerH = canvasHeight * 0.65;

  // Single tap → select/deselect
  const handleChildTap = useCallback(
    (child: Component) => {
      if (selectedId === child.id) {
        setSelectedId(null);
      } else {
        setSelectedId(child.id);
        onChildSelect(child.id);
      }
    },
    [selectedId, onChildSelect],
  );

  // Double tap → open editor / drill into container
  const handleChildDoubleTap = useCallback(
    (child: Component) => {
      setSelectedId(child.id);
      onChildSelect(child.id);

      if (child.type === "text" || child.type === "button") {
        const isButton = child.type === "button";
        const fw = child.fontWeight;
        const initialState: TextEditingState = {
          text: isButton ? (child.label ?? "Button") : (child.content ?? ""),
          fontSize: child.fontSize ?? 16,
          color: isButton ? (child.textColor ?? "#ffffff") : (child.color ?? "#1a1a1a"),
          backgroundColor: isButton
            ? (child.backgroundColor ?? "#6366f1")
            : (child.backgroundColor ?? "transparent"),
          fontFamily: child.fontFamily ?? "System",
          fontWeight: fw === "normal" || fw === "bold" ? fw : "normal",
          textAlign: child.textAlign ?? "left",
          wrapMode:
            !isButton && "wrapMode" in child && child.wrapMode
              ? child.wrapMode
              : "wrap-word",
          fontStyle: "normal",
          textDecorationLine: "none",
        };
        onChildEditStart(child.id, initialState);
      } else if (child.type === "container") {
        onDrillInto(child.id);
      } else if (child.type === "image") {
        onChildPickImage?.(child.id);
      } else {
        onChildStyleSelect(child.id);
      }
    },
    [onChildSelect, onChildEditStart, onDrillInto, onChildStyleSelect, onChildPickImage],
  );

  const handleBackgroundTap = useCallback(() => {
    if (isEditing) {
      onEditDone();
    } else {
      setSelectedId(null);
    }
  }, [isEditing, onEditDone]);

  return (
    <View style={[styles.overlay, { width: canvasWidth, height: canvasHeight }]}>
      <Pressable
        style={styles.centerContainer}
        onPress={handleBackgroundTap}
        onLongPress={onLongPress}
        delayLongPress={500}
      >
        <View style={[styles.miniCanvas, { width: containerW, height: containerH }]}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {childComponents.map((child) => (
              <ArrangeChild
                key={child.id}
                child={child}
                containerW={containerW}
                containerH={containerH}
                isSelected={selectedId === child.id}
                isEditing={editingComponentId === child.id}
                editState={editState}
                onTap={handleChildTap}
                onDoubleTap={handleChildDoubleTap}
                onUpdate={onChildUpdate}
              />
            ))}
          </ScrollView>
        </View>
        {childComponents.length === 0 && (
          <Text style={styles.emptyHint}>Long press to add</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 60,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 80,
  },
  miniCanvas: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    overflow: "hidden",
    padding: 8,
  },
  scrollContent: {
    paddingVertical: 4,
  },
  selectionOutline: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: "#818cf8",
    borderRadius: 4,
    zIndex: 10,
  },
  handle: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#818cf8",
    borderWidth: 2,
    borderColor: "#ffffff",
    zIndex: 20,
  },
  emptyHint: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 12,
    marginTop: 16,
    textAlign: "center",
  },
});
