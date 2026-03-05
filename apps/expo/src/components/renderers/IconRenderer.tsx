import React, { useCallback } from "react";
import { View, Pressable } from "react-native";
import { MaterialIcons, Feather, Ionicons } from "@expo/vector-icons";
import type { IconComponent } from "../../types";
import { safeOpenUrl } from "../../utils/safeUrl";

export interface IconRendererProps {
  component: IconComponent;
  isEditMode?: boolean;
  onNavigate?: (screenId: string) => void;
}

export function IconRenderer({ component, isEditMode, onNavigate }: IconRendererProps) {
  const library = component.library ?? "material";
  const size = component.size ?? 24;
  const color = component.color ?? "#1a1a1a";

  const handlePress = useCallback(() => {
    if (!component.interactions) return;
    for (const interaction of component.interactions) {
      if (interaction.trigger === "onTap") {
        if (interaction.action === "navigate" && onNavigate) {
          onNavigate(interaction.target);
        } else if (interaction.action === "openUrl") {
          safeOpenUrl(interaction.target);
        }
      }
    }
  }, [component.interactions, onNavigate]);

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

  const iconElement = (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      {/* Icon libraries have incompatible name type unions; `as any` is unavoidable here */}
      <IconComp name={component.name as any} size={size} color={color} />
    </View>
  );

  if (!isEditMode && component.interactions && component.interactions.length > 0) {
    return (
      <Pressable onPress={handlePress} style={{ flex: 1 }}>
        {iconElement}
      </Pressable>
    );
  }

  return iconElement;
}
