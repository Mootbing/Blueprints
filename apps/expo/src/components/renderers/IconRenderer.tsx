import React, { useCallback } from "react";
import { View, Pressable, Linking, Alert } from "react-native";
import { MaterialIcons, Feather, Ionicons } from "@expo/vector-icons";
import type { IconComponent } from "../../types";

export interface IconRendererProps {
  component: IconComponent;
  isEditMode?: boolean;
  onNavigate?: (screenId: string) => void;
}

const ALLOWED_URL_SCHEMES = ["http:", "https:", "mailto:"];

function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_URL_SCHEMES.includes(parsed.protocol);
  } catch {
    return false;
  }
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
          if (isSafeUrl(interaction.target)) {
            Linking.openURL(interaction.target);
          } else {
            Alert.alert("Invalid URL", "This link cannot be opened.");
          }
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
