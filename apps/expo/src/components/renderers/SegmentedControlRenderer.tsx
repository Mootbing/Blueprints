import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import type { SegmentedControlComponent } from "../../types";

export interface SegmentedControlRendererProps {
  component: SegmentedControlComponent;
  isEditMode?: boolean;
}

export const SegmentedControlRenderer = React.memo(function SegmentedControlRenderer({
  component,
  isEditMode,
}: SegmentedControlRendererProps) {
  const [selectedValue, setSelectedValue] = useState(
    component.selectedValue ?? component.options[0]?.value ?? ""
  );

  const backgroundColor = component.backgroundColor ?? "#1a1a1a";
  const containerBorderRadius = component.borderRadius ?? 8;
  const itemBorderRadius = Math.max((component.borderRadius ?? 8) - 2, 0);
  const activeColor = component.activeColor ?? "#ffffff";
  const activeTextColor = component.activeTextColor ?? "#000000";
  const inactiveTextColor = component.inactiveTextColor ?? "#888888";
  const fontSize = component.fontSize ?? 14;

  return (
    <View
      pointerEvents={isEditMode ? "none" : "auto"}
      style={{
        flex: 1,
        justifyContent: "center",
        paddingHorizontal: 4,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          backgroundColor,
          borderRadius: containerBorderRadius,
          padding: 2,
          overflow: "hidden",
        }}
      >
        {component.options.map((option) => {
          const isActive = option.value === selectedValue;
          return (
            <Pressable
              key={option.value}
              onPress={isEditMode ? undefined : () => setSelectedValue(option.value)}
              style={{
                flex: 1,
                paddingVertical: 8,
                alignItems: "center",
                borderRadius: itemBorderRadius,
                backgroundColor: isActive ? activeColor : "transparent",
              }}
            >
              <Text
                style={{
                  fontSize,
                  fontWeight: "600",
                  color: isActive ? activeTextColor : inactiveTextColor,
                }}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
});
