import React from "react";
import { View } from "react-native";
import type { DividerComponent } from "../../types";

export interface DividerRendererProps {
  component: DividerComponent;
}

export const DividerRenderer = React.memo(function DividerRenderer({ component }: DividerRendererProps) {
  const direction = component.direction ?? "horizontal";
  const thickness = component.thickness ?? 1;
  const color = component.color ?? "#1a1a1a";
  const lineStyle = component.lineStyle ?? "solid";

  const isHorizontal = direction === "horizontal";

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <View
        style={{
          width: isHorizontal ? "100%" : thickness,
          height: isHorizontal ? thickness : "100%",
          backgroundColor: lineStyle === "solid" ? color : "transparent",
          borderStyle: lineStyle,
          ...(lineStyle !== "solid"
            ? isHorizontal
              ? { borderBottomWidth: thickness, borderBottomColor: color }
              : { borderLeftWidth: thickness, borderLeftColor: color }
            : {}),
        }}
      />
    </View>
  );
});
