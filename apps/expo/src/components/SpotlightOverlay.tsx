import React from "react";
import { View, Pressable, StyleSheet, type ViewStyle } from "react-native";
import { BlurView } from "expo-blur";

interface SpotlightOverlayProps {
  rect: { x: number; y: number; width: number; height: number };
  padding?: number;
  blur?: boolean;
  onPressDim?: () => void;
  style?: ViewStyle;
}

export function SpotlightOverlay({ rect: r, padding = 8, blur = false, onPressDim, style }: SpotlightOverlayProps) {
  const positions: ViewStyle[] = [
    { top: 0, left: 0, right: 0, height: Math.max(0, r.y - padding) },
    { top: r.y + r.height + padding, left: 0, right: 0, bottom: 0 },
    { top: Math.max(0, r.y - padding), left: 0, width: Math.max(0, r.x - padding), height: r.height + padding * 2 },
    { top: Math.max(0, r.y - padding), left: r.x + r.width + padding, right: 0, height: r.height + padding * 2 },
  ];

  return (
    <View style={[StyleSheet.absoluteFill, style]} pointerEvents={onPressDim ? "box-none" : "none"}>
      {positions.map((pos, i) => {
        const content = blur ? <BlurView intensity={15} tint="dark" style={StyleSheet.absoluteFill} /> : null;
        if (onPressDim) {
          return (
            <Pressable key={i} style={[styles.dimRect, !blur && styles.solidDim, pos]} onPress={onPressDim}>
              {content}
            </Pressable>
          );
        }
        return (
          <View key={i} style={[styles.dimRect, !blur && styles.solidDim, pos]}>
            {content}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  dimRect: {
    position: "absolute",
    overflow: "hidden",
  },
  solidDim: {
    backgroundColor: "rgba(0,0,0,0.6)",
  },
});
