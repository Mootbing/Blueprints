import React, { useState } from "react";
import { Platform, Pressable, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import type { SearchBarComponent } from "../../types";

export interface SearchBarRendererProps {
  component: SearchBarComponent;
  isEditMode?: boolean;
}

export const SearchBarRenderer = React.memo(function SearchBarRenderer({ component, isEditMode }: SearchBarRendererProps) {
  const [value, setValue] = useState(component.value ?? "");

  const backgroundColor = component.backgroundColor ?? "#1a1a1a";
  const borderColor = component.borderColor ?? "#333333";
  const borderWidth = component.borderWidth ?? 1;
  const borderRadius = component.borderRadius ?? 20;
  const iconColor = component.iconColor ?? "#666666";
  const fontSize = component.fontSize ?? 16;
  const textColor = component.textColor ?? "#ffffff";
  const placeholderColor = component.placeholderColor ?? "#666666";
  const placeholder = component.placeholder ?? "Search...";
  const showClearButton = component.showClearButton ?? true;

  return (
    <View
      style={{
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor,
        borderColor,
        borderWidth,
        borderRadius,
        paddingHorizontal: 12,
        gap: 8,
      }}
    >
      <Feather name="search" size={18} color={iconColor} />
      <TextInput
        value={value}
        onChangeText={isEditMode ? undefined : setValue}
        placeholder={placeholder}
        placeholderTextColor={placeholderColor}
        editable={!isEditMode}
        pointerEvents={isEditMode ? "none" : "auto"}
        style={{
          flex: 1,
          fontSize,
          color: textColor,
          padding: 0,
          ...(Platform.OS === "web" ? { outlineStyle: "none" as any } : {}),
        }}
      />
      {showClearButton && value.length > 0 && (
        <Pressable onPress={() => setValue("")} disabled={isEditMode}>
          <Feather name="x" size={16} color={iconColor} />
        </Pressable>
      )}
    </View>
  );
});
