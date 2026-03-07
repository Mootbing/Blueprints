import React from "react";
import { View } from "react-native";
import type { ProgressBarComponent } from "../../types";

export interface ProgressBarRendererProps {
  component: ProgressBarComponent;
}

export const ProgressBarRenderer = React.memo(function ProgressBarRenderer({ component }: ProgressBarRendererProps) {
  const value = component.value ?? 0.5;
  const clampedValue = Math.min(1, Math.max(0, value));
  const height = component.height ?? 8;
  const borderRadius = component.borderRadius ?? 4;
  const trackColor = component.trackColor ?? "#333333";
  const fillColor = component.fillColor ?? "#ffffff";

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        paddingHorizontal: 4,
      }}
    >
      <View
        style={{
          height,
          borderRadius,
          backgroundColor: trackColor,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            height: "100%",
            width: `${clampedValue * 100}%`,
            backgroundColor: fillColor,
            borderRadius,
          }}
        />
      </View>
    </View>
  );
});
