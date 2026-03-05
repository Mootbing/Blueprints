import React, { useState, useCallback } from "react";
import { View, Pressable, Text, StyleSheet } from "react-native";
import type { AppBlueprint, Layout, Component } from "../types";
import { SDUIComponent } from "./SDUIComponent";

function uuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

interface CanvasProps {
  blueprint: AppBlueprint;
  screenId: string;
  isEditMode: boolean;
  onComponentUpdate: (id: string, layout: Layout) => void;
  onContentChange?: (id: string, content: string) => void;
  onStyleChange?: (id: string, updates: any) => void;
  onAddComponent: (component: Component) => void;
  onNavigate?: (screenId: string) => void;
}

const PRESETS: { label: string; create: (x: number, y: number) => Component }[] = [
  {
    label: "+ Text",
    create: (x, y) => ({
      type: "text" as const,
      id: uuid(),
      layout: { x, y, width: 0.5, height: 0.06 },
      content: "Tap to edit",
      fontSize: 20,
      color: "#1a1a1a",
      fontWeight: "600",
    }),
  },
  {
    label: "+ Button",
    create: (x, y) => ({
      type: "button" as const,
      id: uuid(),
      layout: { x, y, width: 0.4, height: 0.065 },
      label: "Button",
      backgroundColor: "#6366f1",
      textColor: "#ffffff",
      interactions: [],
    }),
  },
  {
    label: "+ Image",
    create: (x, y) => ({
      type: "image" as const,
      id: uuid(),
      layout: { x, y, width: 0.4, height: 0.25 },
      src: "https://placekitten.com/400/300",
      resizeMode: "cover" as const,
    }),
  },
];

export function Canvas({
  blueprint,
  screenId,
  isEditMode,
  onComponentUpdate,
  onContentChange,
  onStyleChange,
  onAddComponent,
  onNavigate,
}: CanvasProps) {
  const [canvasDimensions, setCanvasDimensions] = useState({
    width: 0,
    height: 0,
  });
  const [menu, setMenu] = useState<{ x: number; y: number; normX: number; normY: number } | null>(null);

  const screen = blueprint.screens[screenId];
  if (!screen) return null;

  const handleLongPress = useCallback(
    (e: any) => {
      if (!isEditMode || canvasDimensions.width === 0) return;
      const { locationX, locationY } = e.nativeEvent;
      setMenu({
        x: locationX,
        y: locationY,
        normX: Math.min(Math.max(locationX / canvasDimensions.width, 0), 1),
        normY: Math.min(Math.max(locationY / canvasDimensions.height, 0), 1),
      });
    },
    [isEditMode, canvasDimensions]
  );

  const handleAdd = (preset: (typeof PRESETS)[number]) => {
    if (!menu) return;
    onAddComponent(preset.create(menu.normX, menu.normY));
    setMenu(null);
  };

  return (
    <View
      style={{
        flex: 1,
        position: "relative",
        backgroundColor: screen.backgroundColor ?? "#ffffff",
      }}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setCanvasDimensions({ width, height });
      }}
    >
      <Pressable
        style={StyleSheet.absoluteFill}
        onLongPress={handleLongPress}
        delayLongPress={500}
        onPress={() => setMenu(null)}
      />
      {canvasDimensions.width > 0 &&
        screen.components.map((component) => (
          <SDUIComponent
            key={component.id}
            component={component}
            canvasWidth={canvasDimensions.width}
            canvasHeight={canvasDimensions.height}
            isEditMode={isEditMode}
            onUpdate={onComponentUpdate}
            onContentChange={onContentChange}
            onStyleChange={onStyleChange}
            onNavigate={onNavigate}
          />
        ))}
      {menu && (
        <View style={[styles.menu, { left: menu.x, top: menu.y }]}>
          {PRESETS.map((preset) => (
            <Pressable
              key={preset.label}
              style={({ pressed }) => [
                styles.pill,
                pressed && styles.pillPressed,
              ]}
              onPress={() => handleAdd(preset)}
            >
              <Text style={styles.pillText}>{preset.label}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  menu: {
    position: "absolute",
    zIndex: 999,
    flexDirection: "column",
    gap: 4,
    padding: 6,
    backgroundColor: "#1a1a1a",
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "#2a2a2a",
  },
  pillPressed: {
    backgroundColor: "#444444",
  },
  pillText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
  },
});
