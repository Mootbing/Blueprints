import React from "react";
import { Pressable, Text, Linking } from "react-native";
import type { ButtonComponent } from "../../types";

interface ButtonRendererProps {
  component: ButtonComponent;
  onNavigate?: (screenId: string) => void;
}

export function ButtonRenderer({ component, onNavigate }: ButtonRendererProps) {
  const handlePress = () => {
    if (!component.interactions) return;
    for (const interaction of component.interactions) {
      if (interaction.trigger === "onTap") {
        if (interaction.action === "navigate" && onNavigate) {
          onNavigate(interaction.target);
        } else if (interaction.action === "openUrl") {
          Linking.openURL(interaction.target);
        }
      }
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      style={{
        flex: 1,
        backgroundColor: component.backgroundColor,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 8,
      }}
    >
      <Text style={{ color: component.textColor }}>{component.label}</Text>
    </Pressable>
  );
}
