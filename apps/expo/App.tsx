import React, { useState } from "react";
import { SafeAreaView, StatusBar } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Canvas } from "./src/components/Canvas";
import type { AppBlueprint, Layout, Component } from "./src/types";

const SCREEN_ID = "00000000-0000-0000-0000-000000000001";

const sampleBlueprint: AppBlueprint = {
  version: 1,
  initial_screen_id: SCREEN_ID,
  screens: {
    [SCREEN_ID]: {
      id: SCREEN_ID,
      name: "Home",
      backgroundColor: "#f5f5f5",
      components: [
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000000010",
          layout: { x: 0.1, y: 0.05, width: 0.8, height: 0.06 },
          content: "Welcome to Untitled IDE",
          fontSize: 24,
          color: "#1a1a1a",
          fontWeight: "bold",
        },
        {
          type: "button",
          id: "00000000-0000-0000-0000-000000000020",
          layout: { x: 0.2, y: 0.4, width: 0.6, height: 0.07 },
          label: "Get Started",
          backgroundColor: "#6366f1",
          textColor: "#ffffff",
          interactions: [],
        },
        {
          type: "image",
          id: "00000000-0000-0000-0000-000000000030",
          layout: { x: 0.25, y: 0.15, width: 0.5, height: 0.2 },
          src: "https://placekitten.com/400/300",
          resizeMode: "cover",
        },
      ],
    },
  },
};

export default function App() {
  const [blueprint, setBlueprint] = useState(sampleBlueprint);

  const handleAddComponent = (component: Component) => {
    setBlueprint((prev) => {
      const screenId = prev.initial_screen_id;
      const screen = prev.screens[screenId];
      return {
        ...prev,
        screens: {
          ...prev.screens,
          [screenId]: {
            ...screen,
            components: [...screen.components, component],
          },
        },
      };
    });
  };

  const handleContentChange = (id: string, content: string) => {
    setBlueprint((prev) => {
      const screenId = prev.initial_screen_id;
      const screen = prev.screens[screenId];
      return {
        ...prev,
        screens: {
          ...prev.screens,
          [screenId]: {
            ...screen,
            components: screen.components.map((c) =>
              c.id === id ? { ...c, content } : c
            ),
          },
        },
      };
    });
  };

  const handleStyleChange = (id: string, updates: any) => {
    setBlueprint((prev) => {
      const screenId = prev.initial_screen_id;
      const screen = prev.screens[screenId];
      return {
        ...prev,
        screens: {
          ...prev.screens,
          [screenId]: {
            ...screen,
            components: screen.components.map((c) =>
              c.id === id ? { ...c, ...updates } : c
            ),
          },
        },
      };
    });
  };

  const handleComponentUpdate = (id: string, layout: Layout) => {
    setBlueprint((prev) => {
      const screenId = prev.initial_screen_id;
      const screen = prev.screens[screenId];
      return {
        ...prev,
        screens: {
          ...prev.screens,
          [screenId]: {
            ...screen,
            components: screen.components.map((c) =>
              c.id === id ? { ...c, layout } : c
            ),
          },
        },
      };
    });
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar barStyle="dark-content" />
        <Canvas
          blueprint={blueprint}
          screenId={blueprint.initial_screen_id}
          isEditMode={true}
          onComponentUpdate={handleComponentUpdate}
          onContentChange={handleContentChange}
          onStyleChange={handleStyleChange}
          onAddComponent={handleAddComponent}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}
