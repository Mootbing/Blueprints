import React from "react";
import { View } from "react-native";
import { MaterialIcons, Feather, Ionicons } from "@expo/vector-icons";
import type { IconComponent } from "../../types";

export interface IconRendererProps {
  component: IconComponent;
  isEditMode?: boolean;
}

export function IconRenderer({ component }: IconRendererProps) {
  const library = component.library ?? "material";
  const size = component.size ?? 24;
  const color = component.color ?? "#1a1a1a";

  let IconComp: React.ElementType;
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

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      {/* Icon libraries have incompatible name type unions; `as any` is unavoidable here */}
      <IconComp name={component.name as any} size={size} color={color} />
    </View>
  );
}
