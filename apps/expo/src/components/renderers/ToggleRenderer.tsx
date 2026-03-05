import React, { useState } from "react";
import { View, Text, Switch } from "react-native";
import type { ToggleComponent } from "../../types";

export interface ToggleRendererProps {
  component: ToggleComponent;
  isEditMode?: boolean;
}

export function ToggleRenderer({ component, isEditMode }: ToggleRendererProps) {
  const label = component.label ?? "Toggle";
  const activeColor = component.activeColor ?? "#6366f1";
  const inactiveColor = component.inactiveColor ?? "#e0e0e0";
  const thumbColor = component.thumbColor ?? "#ffffff";
  const labelColor = component.labelColor ?? "#1a1a1a";
  const labelFontSize = component.labelFontSize ?? 16;
  const labelPosition = component.labelPosition ?? "left";

  const [value, setValue] = useState(component.defaultValue ?? false);

  const labelElement = (
    <Text
      style={{
        color: labelColor,
        fontSize: labelFontSize,
        flex: 1,
      }}
      numberOfLines={1}
    >
      {label}
    </Text>
  );

  return (
    <View
      style={{
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 8,
        gap: 8,
      }}
    >
      {labelPosition === "left" && labelElement}
      <Switch
        value={value}
        onValueChange={isEditMode ? undefined : setValue}
        trackColor={{ false: inactiveColor, true: activeColor }}
        thumbColor={thumbColor}
        disabled={isEditMode}
      />
      {labelPosition === "right" && labelElement}
    </View>
  );
}
