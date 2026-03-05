import React, { useState, useRef } from "react";
import { Pressable, Text, StyleSheet, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import type { Component } from "../types";
import { uuid } from "../utils/uuid";

const PRESETS: { label: string; create: () => Component }[] = [
  {
    label: "+ Text",
    create: () => ({
      type: "text" as const,
      id: uuid(),
      layout: { x: 0.15, y: 0.4, width: 0.7, height: 0.06 },
      content: "Tap to edit",
      fontSize: 20,
      color: "#ffffff",
      fontWeight: "600",
    }),
  },
  {
    label: "+ Button",
    create: () => ({
      type: "container" as const,
      id: uuid(),
      layout: { x: 0.15, y: 0.4, width: 0.7, height: 0.07 },
      backgroundColor: "#6366f1",
      borderRadius: 12,
      children: [
        {
          type: "text" as const,
          id: uuid(),
          layout: { x: 0.0, y: 0.0, width: 1.0, height: 1.0 },
          content: "Button",
          fontSize: 16,
          color: "#ffffff",
          fontWeight: "600" as const,
          textAlign: "center" as const,
        },
      ],
    }),
  },
  {
    label: "+ Image",
    create: () => ({
      type: "container" as const,
      id: uuid(),
      layout: { x: 0.2, y: 0.35, width: 0.6, height: 0.25 },
      backgroundColor: "transparent",
      borderRadius: 12,
      children: [
        {
          type: "image" as const,
          id: uuid(),
          layout: { x: 0.0, y: 0.0, width: 1.0, height: 1.0 },
          src: "https://placekitten.com/400/300",
          resizeMode: "cover" as const,
        },
      ],
    }),
  },
  {
    label: "+ Card",
    create: () => ({
      type: "container" as const,
      id: uuid(),
      layout: { x: 0.075, y: 0.3, width: 0.85, height: 0.35 },
      backgroundColor: "#ffffff",
      borderRadius: 16,
      shadowEnabled: true,
      children: [
        {
          type: "image" as const,
          id: uuid(),
          layout: { x: 0.0, y: 0.0, width: 1.0, height: 0.55 },
          src: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&h=400&fit=crop",
          resizeMode: "cover" as const,
          borderRadius: 0,
        },
        {
          type: "text" as const,
          id: uuid(),
          layout: { x: 0.05, y: 0.6, width: 0.9, height: 0.15 },
          content: "Card Title",
          fontSize: 18,
          color: "#1a1a1a",
          fontWeight: "bold" as const,
        },
        {
          type: "text" as const,
          id: uuid(),
          layout: { x: 0.05, y: 0.78, width: 0.9, height: 0.15 },
          content: "Card subtitle goes here",
          fontSize: 13,
          color: "#94a3b8",
          fontWeight: "normal" as const,
        },
      ],
    }),
  },
];

interface FloatingAddButtonProps {
  onAdd: (component: Component) => void;
}

export function FloatingAddButton({ onAdd }: FloatingAddButtonProps) {
  const { width: screenW, height: screenH } = useWindowDimensions();
  const [expanded, setExpanded] = useState(false);
  const didDrag = useRef(false);

  const translateX = useSharedValue(screenW - 76);
  const translateY = useSharedValue(screenH - 160);
  const savedX = useSharedValue(screenW - 76);
  const savedY = useSharedValue(screenH - 160);

  const pillsOpacity = useSharedValue(0);

  const toggleExpanded = () => {
    setExpanded((prev) => {
      const next = !prev;
      pillsOpacity.value = withTiming(next ? 1 : 0, { duration: 150 });
      return next;
    });
  };

  const handleAdd = (preset: (typeof PRESETS)[number]) => {
    onAdd(preset.create());
    setExpanded(false);
    pillsOpacity.value = withTiming(0, { duration: 150 });
  };

  const panGesture = Gesture.Pan()
    .minDistance(10)
    .onStart(() => {
      savedX.value = translateX.value;
      savedY.value = translateY.value;
      didDrag.current = false;
    })
    .onUpdate((e) => {
      didDrag.current = true;
      translateX.value = savedX.value + e.translationX;
      translateY.value = savedY.value + e.translationY;
    })
    .onEnd(() => {
      const size = 56;
      translateX.value = Math.min(Math.max(0, translateX.value), screenW - size);
      translateY.value = Math.min(Math.max(0, translateY.value), screenH - size);
    });

  const fabStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  const pillsStyle = useAnimatedStyle(() => ({
    opacity: pillsOpacity.value,
  }));

  return (
    <>
      {expanded && (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => {
            setExpanded(false);
            pillsOpacity.value = withTiming(0, { duration: 150 });
          }}
        />
      )}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.fabContainer, fabStyle]}>
          <Animated.View style={[styles.pillsContainer, pillsStyle]}>
            {expanded &&
              PRESETS.map((preset) => (
                <Pressable
                  key={preset.label}
                  style={({ pressed }) => [
                    styles.pill,
                    pressed && styles.pillPressed,
                  ]}
                  onPress={() => handleAdd(preset)}
                >
                  <Text style={styles.pillText}>{preset.label}</Text>
                </Pressable>
              ))}
          </Animated.View>
          <Pressable
            style={styles.fab}
            onPress={() => {
              if (!didDrag.current) toggleExpanded();
              didDrag.current = false;
            }}
          >
            <Text style={styles.fabText}>{expanded ? "\u00D7" : "+"}</Text>
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </>
  );
}

const styles = StyleSheet.create({
  fabContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    alignItems: "center",
    zIndex: 1000,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#6366f1",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  fabText: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "300",
    lineHeight: 32,
  },
  pillsContainer: {
    alignItems: "center",
    marginBottom: 12,
  },
  pill: {
    backgroundColor: "#1a1a1a",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 8,
  },
  pillPressed: {
    backgroundColor: "#333333",
  },
  pillText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
});
