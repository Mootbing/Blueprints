import React from "react";
import { View } from "react-native";
import type { ShapeComponent } from "../../types";
import { GradientOverlay } from "../GradientOverlay";

export interface ShapeRendererProps {
  component: ShapeComponent;
}

export const ShapeRenderer = React.memo(function ShapeRenderer({ component }: ShapeRendererProps) {
  const shapeType = component.shapeType ?? "rounded-rectangle";
  const backgroundColor = component.backgroundColor ?? "#1a1a1a";
  const borderColor = component.borderColor;
  const borderWidth = component.borderWidth ?? 0;
  const borderRadius =
    shapeType === "circle"
      ? 9999
      : shapeType === "rounded-rectangle"
      ? component.borderRadius ?? 12
      : component.borderRadius ?? 0;
  const opacity = component.opacity ?? 1;
  const shadowEnabled = component.shadowEnabled ?? false;
  const gradientEnabled = component.gradientEnabled ?? false;
  const gradientColors = component.gradientColors;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor,
        borderRadius,
        borderWidth,
        borderColor: borderColor ?? "transparent",
        opacity,
        ...(shadowEnabled
          ? {
              shadowColor: component.shadowColor ?? "#000000",
              shadowOpacity: component.shadowOpacity ?? 0.15,
              shadowRadius: component.shadowRadius ?? 8,
              shadowOffset: { width: 0, height: 2 },
              elevation: 4,
            }
          : {}),
      }}
    >
      {gradientEnabled && gradientColors && gradientColors.length >= 2 && (
        <GradientOverlay
          colors={gradientColors}
          direction={component.gradientDirection}
          borderRadius={borderRadius}
        />
      )}
    </View>
  );
});
