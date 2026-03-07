import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import type { CheckboxComponent } from "../../types";

export interface CheckboxRendererProps {
  component: CheckboxComponent;
  isEditMode?: boolean;
}

export const CheckboxRenderer = React.memo(function CheckboxRenderer({ component, isEditMode }: CheckboxRendererProps) {
  const label = component.label;
  const activeColor = component.activeColor ?? "#ffffff";
  const inactiveColor = component.inactiveColor ?? "#555555";
  const checkColor = component.checkColor ?? "#000000";
  const labelColor = component.labelColor ?? "#cccccc";
  const labelFontSize = component.labelFontSize ?? 14;
  const size = component.size ?? 22;
  const labelPosition = component.labelPosition ?? "right";
  const borderRadius = component.borderRadius ?? 4;

  const [checked, setChecked] = useState(component.checked ?? false);

  const labelElement = label ? (
    <Text style={{ color: labelColor, fontSize: labelFontSize }}>
      {label}
    </Text>
  ) : null;

  const checkboxBox = (
    <View
      style={{
        width: size,
        height: size,
        borderRadius,
        borderWidth: 2,
        borderColor: checked ? activeColor : inactiveColor,
        backgroundColor: checked ? activeColor : "transparent",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {checked && (
        <Text
          style={{
            color: checkColor,
            fontSize: size * 0.7,
            textAlign: "center",
            lineHeight: size,
          }}
        >
          {"\u2713"}
        </Text>
      )}
    </View>
  );

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        paddingHorizontal: 4,
      }}
    >
      <Pressable
        onPress={() => setChecked((prev) => !prev)}
        disabled={isEditMode}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {labelPosition === "left" && labelElement}
          {checkboxBox}
          {labelPosition === "right" && labelElement}
        </View>
      </Pressable>
    </View>
  );
});
