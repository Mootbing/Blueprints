import React from "react";
import { View, Pressable, Text, StyleSheet } from "react-native";
import type { Component } from "../types";
import { uuid } from "../utils/uuid";

const COMPONENT_PRESETS: {
  label: string;
  icon: string;
  create: () => Component;
}[] = [
  {
    label: "Text",
    icon: "Aa",
    create: () => ({
      type: "text" as const,
      id: uuid(),
      layout: { x: 0.15, y: 0.4, width: 0.7, height: 0.06 },
      content: "Tap to edit",
      fontSize: 20,
      color: "#ffffff",
      fontWeight: "600",
    }),
  },
  {
    label: "Button",
    icon: "\u25A2",
    create: () => ({
      type: "button" as const,
      id: uuid(),
      layout: { x: 0.2, y: 0.45, width: 0.6, height: 0.065 },
      label: "Button",
      backgroundColor: "#1a1a1a",
      textColor: "#ffffff",
    }),
  },
  {
    label: "Image",
    icon: "\u{1F5BC}",
    create: () => ({
      type: "image" as const,
      id: uuid(),
      layout: { x: 0.2, y: 0.35, width: 0.6, height: 0.25 },
      src: "https://placekitten.com/400/300",
      resizeMode: "cover" as const,
    }),
  },
];

interface AddComponentToolbarProps {
  onAdd: (component: Component) => void;
}

export function AddComponentToolbar({ onAdd }: AddComponentToolbarProps) {
  return (
    <View style={styles.container}>
      {COMPONENT_PRESETS.map((preset) => (
        <Pressable
          key={preset.label}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
          onPress={() => onAdd(preset.create())}
        >
          <Text style={styles.icon}>{preset.icon}</Text>
          <Text style={styles.label}>{preset.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#1a1a1a",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  button: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  buttonPressed: {
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  icon: {
    fontSize: 24,
    color: "#ffffff",
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    color: "#aaaaaa",
  },
});
