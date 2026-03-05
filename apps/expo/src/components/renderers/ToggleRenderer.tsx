import React, { useState } from "react";
import { View, Switch } from "react-native";
import type { ToggleComponent } from "../../types";

export interface ToggleRendererProps {
  component: ToggleComponent;
  isEditMode?: boolean;
}

export function ToggleRenderer({ component, isEditMode }: ToggleRendererProps) {
  const activeColor = component.activeColor ?? "#6366f1";
  const inactiveColor = component.inactiveColor ?? "#e0e0e0";
  const thumbColor = component.thumbColor ?? "#ffffff";

  const [value, setValue] = useState(component.defaultValue ?? false);

  return (
    <View
      pointerEvents={isEditMode ? "none" : "auto"}
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Switch
        value={value}
        onValueChange={isEditMode ? undefined : setValue}
        trackColor={{ false: inactiveColor, true: activeColor }}
        thumbColor={thumbColor}
        disabled={isEditMode}
      />
    </View>
  );
}
