import React, { useState } from "react";
import { Platform, TextInput, View } from "react-native";
import type { TextInputComponent } from "../../types";

export interface TextInputRendererProps {
  component: TextInputComponent;
  isEditMode?: boolean;
}

const KEYBOARD_TYPE_MAP: Record<string, "default" | "email-address" | "numeric" | "phone-pad" | "url"> = {
  default: "default",
  email: "email-address",
  numeric: "numeric",
  phone: "phone-pad",
  url: "url",
};

export const TextInputRenderer = React.memo(function TextInputRenderer({ component, isEditMode }: TextInputRendererProps) {
  const [value, setValue] = useState(component.defaultValue ?? "");

  const fontSize = component.fontSize ?? 16;
  const color = component.color ?? "#1a1a1a";
  const placeholderColor = component.placeholderColor ?? "#999999";
  const backgroundColor = component.backgroundColor ?? "#ffffff";
  const borderColor = component.borderColor ?? "#cccccc";
  const borderWidth = component.borderWidth ?? 1;
  const borderRadius = component.borderRadius ?? 8;
  const keyboardType = KEYBOARD_TYPE_MAP[component.keyboardType ?? "default"] ?? "default";
  const fontFamily = component.fontFamily;

  return (
    <View
      pointerEvents={isEditMode ? "none" : "auto"}
      style={{
        flex: 1,
        justifyContent: "center",
        backgroundColor,
        borderColor,
        borderWidth,
        borderRadius,
        paddingHorizontal: 12,
      }}
    >
      <TextInput
        value={value}
        onChangeText={isEditMode ? undefined : setValue}
        placeholder={component.placeholder ?? "Enter text..."}
        placeholderTextColor={placeholderColor}
        secureTextEntry={component.secure ?? false}
        keyboardType={keyboardType}
        editable={!isEditMode}
        style={{
          fontSize,
          color,
          fontFamily: fontFamily ?? undefined,
          padding: 0,
          ...(Platform.OS === "web" ? { outlineStyle: "none" } : {}),
        }}
      />
    </View>
  );
});
