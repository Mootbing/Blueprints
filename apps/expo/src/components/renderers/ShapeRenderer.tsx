import React from "react";
import { View } from "react-native";
import type { ShapeComponent } from "../../types";

export interface ShapeRendererProps {
  component: ShapeComponent;
}

export function ShapeRenderer({ component }: ShapeRendererProps) {
  const shapeType = component.shapeType ?? "rounded-rectangle";
  const backgroundColor = component.backgroundColor ?? "#6366f1";
  const borderColor = component.borderColor;
  const borderWidth = component.borderWidth ?? 0;
  const borderRadius =
    shapeType === "circle"
      ? 9999
      : shapeType === "rounded-rectangle"
      ? component.borderRadius ?? 12
      : component.borderRadius ?? 0;
  const opacity = component.opacity ?? 1;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor,
        borderRadius,
        borderWidth,
        borderColor: borderColor ?? "transparent",
        opacity,
      }}
    />
  );
}
