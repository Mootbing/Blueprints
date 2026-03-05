import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface SnapGuidesProps {
  guides: number[];
  canvasWidth: number;
  canvasHeight: number;
}

export function SnapGuides({ guides, canvasWidth, canvasHeight }: SnapGuidesProps) {
  if (guides.length === 0) return null;

  const elements: React.ReactElement[] = [];
  const guideCount = guides.length / 6;

  for (let i = 0; i < guideCount; i++) {
    const offset = i * 6;
    const kind = guides[offset];       // 0 = alignment, 1 = spacing
    const axis = guides[offset + 1];   // 0 = horizontal, 1 = vertical
    const position = guides[offset + 2];

    if (kind === 0) {
      // Alignment guide
      if (axis === 0) {
        // Horizontal line at y=position
        elements.push(
          <View
            key={`a-h-${i}`}
            style={[
              styles.alignLine,
              {
                top: position,
                left: 0,
                width: canvasWidth,
                height: 0,
                borderTopWidth: 1,
                borderTopColor: "#ef4444",
                borderStyle: "dashed",
              },
            ]}
          />
        );
      } else {
        // Vertical line at x=position
        elements.push(
          <View
            key={`a-v-${i}`}
            style={[
              styles.alignLine,
              {
                left: position,
                top: 0,
                height: canvasHeight,
                width: 0,
                borderLeftWidth: 1,
                borderLeftColor: "#ef4444",
                borderStyle: "dashed",
              },
            ]}
          />
        );
      }
    } else {
      // Spacing guide
      const from = guides[offset + 2];
      const to = guides[offset + 3];
      const perpCenter = guides[offset + 4];
      const spacingValue = guides[offset + 5];
      const mid = (from + to) / 2;

      if (axis === 0) {
        // Horizontal spacing: line from x=from to x=to at y=perpCenter
        const left = Math.min(from, to);
        const width = Math.abs(to - from);
        elements.push(
          <View
            key={`s-h-${i}`}
            style={[
              styles.spacingLine,
              {
                top: perpCenter,
                left,
                width,
                height: 0,
                borderTopWidth: 1,
                borderTopColor: "#ef4444",
                borderStyle: "dashed",
              },
            ]}
          />
        );
        // Bubble
        elements.push(
          <View
            key={`sb-h-${i}`}
            style={[
              styles.bubble,
              { top: perpCenter - 12, left: mid - 22 },
            ]}
          >
            <Text style={styles.bubbleText}>{spacingValue}px</Text>
          </View>
        );
      } else {
        // Vertical spacing: line from y=from to y=to at x=perpCenter
        const top = Math.min(from, to);
        const height = Math.abs(to - from);
        elements.push(
          <View
            key={`s-v-${i}`}
            style={[
              styles.spacingLine,
              {
                left: perpCenter,
                top,
                height,
                width: 0,
                borderLeftWidth: 1,
                borderLeftColor: "#ef4444",
                borderStyle: "dashed",
              },
            ]}
          />
        );
        // Bubble
        elements.push(
          <View
            key={`sb-v-${i}`}
            style={[
              styles.bubble,
              { top: mid - 12, left: perpCenter - 22 },
            ]}
          >
            <Text style={styles.bubbleText}>{spacingValue}px</Text>
          </View>
        );
      }
    }
  }

  return (
    <View style={styles.container} pointerEvents="none">
      {elements}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 998,
  },
  alignLine: {
    position: "absolute",
  },
  spacingLine: {
    position: "absolute",
  },
  bubble: {
    position: "absolute",
    backgroundColor: "#dc2626",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 42,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 6,
  },
  bubbleText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
});
