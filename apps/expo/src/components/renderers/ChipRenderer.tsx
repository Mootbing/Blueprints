import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { MaterialIcons, Feather, Ionicons } from "@expo/vector-icons";
import type { ChipComponent } from "../../types";

export interface ChipRendererProps {
  component: ChipComponent;
  isEditMode?: boolean;
}

export const ChipRenderer = React.memo(function ChipRenderer({
  component,
  isEditMode,
}: ChipRendererProps) {
  const [selected, setSelected] = useState(component.selected ?? false);

  const selectedColor = component.selectedColor ?? "#ffffff";
  const unselectedColor = component.unselectedColor ?? "#333333";
  const selectedTextColor = component.selectedTextColor ?? "#000000";
  const unselectedTextColor = component.unselectedTextColor ?? "#cccccc";
  const borderRadius = component.borderRadius ?? 16;
  const fontSize = component.fontSize ?? 14;

  const bgColor = selected ? selectedColor : unselectedColor;
  const textColor = selected ? selectedTextColor : unselectedTextColor;

  let IconComp: React.ElementType | null = null;
  if (component.icon) {
    const library = component.iconLibrary ?? "material";
    switch (library) {
      case "feather":
        IconComp = Feather;
        break;
      case "ionicons":
        IconComp = Ionicons;
        break;
      default:
        IconComp = MaterialIcons;
        break;
    }
  }

  return (
    <View
      pointerEvents={isEditMode ? "none" : "auto"}
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Pressable
        onPress={isEditMode ? undefined : () => setSelected((v) => !v)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          borderRadius,
          paddingHorizontal: 12,
          paddingVertical: 6,
          backgroundColor: bgColor,
        }}
      >
        {IconComp && component.icon ? (
          <IconComp name={component.icon as any} size={16} color={textColor} />
        ) : null}
        <Text
          style={{
            fontSize,
            fontWeight: "500",
            color: textColor,
          }}
        >
          {component.label}
        </Text>
      </Pressable>
    </View>
  );
});
