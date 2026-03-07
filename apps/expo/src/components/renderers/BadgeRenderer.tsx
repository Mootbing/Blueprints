import React from "react";
import { View, Text } from "react-native";
import type { BadgeComponent } from "../../types";

export interface BadgeRendererProps {
  component: BadgeComponent;
}

export const BadgeRenderer = React.memo(function BadgeRenderer({ component }: BadgeRendererProps) {
  const backgroundColor = component.backgroundColor ?? "#ffffff";
  const textColor = component.textColor ?? "#000000";
  const fontSize = component.fontSize ?? 12;
  const borderRadius = component.borderRadius ?? 999;
  const paddingHorizontal = component.paddingHorizontal ?? 8;
  const paddingVertical = component.paddingVertical ?? 2;

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
          backgroundColor,
          borderRadius,
          paddingHorizontal,
          paddingVertical,
          alignSelf: "center",
        }}
      >
        <Text
          style={{
            color: textColor,
            fontSize,
            fontWeight: "600",
          }}
        >
          {component.text}
        </Text>
      </View>
    </View>
  );
});
