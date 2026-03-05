import React, { useState, useCallback, useEffect, useRef } from "react";
import { SafeAreaView, StatusBar, ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Canvas } from "./src/components/Canvas";
import { AsyncStorageProvider } from "./src/storage";
import type { StorageProvider } from "./src/storage";
import type { AppBlueprint, Layout, Component, ComponentStyleUpdates } from "./src/types";

const SCREEN_ID = "00000000-0000-0000-0000-000000000001";

const defaultBlueprint: AppBlueprint = {
  version: 1,
  initial_screen_id: SCREEN_ID,
  screens: {
    [SCREEN_ID]: {
      id: SCREEN_ID,
      name: "Home",
      backgroundColor: "#0f172a",
      components: [
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000000010",
          layout: { x: 0.06, y: 0.06, width: 0.8, height: 0.03 },
          content: "DESIGN  •  BUILD  •  PREVIEW",
          fontSize: 12,
          color: "#818cf8",
          fontWeight: "600",
          textAlign: "left",
        },
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000000011",
          layout: { x: 0.06, y: 0.10, width: 0.88, height: 0.05 },
          content: "Welcome to Blueprints",
          fontSize: 36,
          color: "#ffffff",
          fontWeight: "bold",
          textAlign: "left",
        },
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000000012",
          layout: { x: 0.06, y: 0.17, width: 0.88, height: 0.07 },
          content: "Build beautiful app interfaces visually. Drag, drop, and customize components to bring your ideas to life.",
          fontSize: 15,
          color: "#94a3b8",
          fontWeight: "normal",
          textAlign: "left",
        },
        {
          type: "image",
          id: "00000000-0000-0000-0000-000000000030",
          layout: { x: 0.06, y: 0.26, width: 0.88, height: 0.22 },
          src: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&h=400&fit=crop",
          resizeMode: "cover",
        },
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000000013",
          layout: { x: 0.06, y: 0.51, width: 0.88, height: 0.03 },
          content: "Quick Start",
          fontSize: 18,
          color: "#e2e8f0",
          fontWeight: "bold",
          textAlign: "left",
        },
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000000014",
          layout: { x: 0.06, y: 0.55, width: 0.88, height: 0.03 },
          content: "1. Long-press the canvas to open the menu",
          fontSize: 13,
          color: "#94a3b8",
          fontWeight: "normal",
          textAlign: "left",
        },
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000000016",
          layout: { x: 0.06, y: 0.59, width: 0.88, height: 0.03 },
          content: "2. Toggle Edit Mode on, then add components",
          fontSize: 13,
          color: "#94a3b8",
          fontWeight: "normal",
          textAlign: "left",
        },
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000000017",
          layout: { x: 0.06, y: 0.63, width: 0.88, height: 0.03 },
          content: "3. Drag to move, pinch to resize, tap to edit",
          fontSize: 13,
          color: "#94a3b8",
          fontWeight: "normal",
          textAlign: "left",
        },
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000000018",
          layout: { x: 0.06, y: 0.67, width: 0.88, height: 0.03 },
          content: "4. Toggle Edit Mode off to preview your app",
          fontSize: 13,
          color: "#94a3b8",
          fontWeight: "normal",
          textAlign: "left",
        },
        {
          type: "button",
          id: "00000000-0000-0000-0000-000000000020",
          layout: { x: 0.06, y: 0.75, width: 0.88, height: 0.065 },
          label: "Start Building",
          backgroundColor: "#6366f1",
          textColor: "#ffffff",
          fontSize: 16,
          fontWeight: "600",
          interactions: [{ trigger: "onTap", action: "resetAndBuild", target: "" }],
        },
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000000015",
          layout: { x: 0.06, y: 0.84, width: 0.88, height: 0.03 },
          content: "v1.0  •  Made with Blueprints",
          fontSize: 11,
          color: "#475569",
          fontWeight: "normal",
          textAlign: "left",
        },
      ],
    },
  },
};

const storage: StorageProvider = new AsyncStorageProvider();

export default function App() {
  const [blueprint, setBlueprint] = useState(defaultBlueprint);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load saved blueprint on startup
  useEffect(() => {
    storage.loadBlueprint().then((saved) => {
      if (saved) setBlueprint(saved);
      setLoaded(true);
    });
  }, []);

  // Debounced save on every blueprint change (skip initial load)
  useEffect(() => {
    if (!loaded) return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      storage.saveBlueprint(blueprint);
    }, 500);
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [blueprint, loaded]);

  const updateScreenComponents = useCallback(
    (fn: (components: Component[]) => Component[]) => {
      setBlueprint((prev) => {
        const screenId = prev.initial_screen_id;
        const screen = prev.screens[screenId];
        return {
          ...prev,
          screens: {
            ...prev.screens,
            [screenId]: { ...screen, components: fn(screen.components) },
          },
        };
      });
    },
    []
  );

  const handleAddComponent = useCallback(
    (component: Component) => {
      updateScreenComponents((components) => [...components, component]);
    },
    [updateScreenComponents]
  );

  const handleContentChange = useCallback(
    (id: string, content: string) => {
      updateScreenComponents((components) =>
        components.map((c) =>
          c.id === id && c.type === "text" ? { ...c, content } : c
        )
      );
    },
    [updateScreenComponents]
  );

  const handleStyleChange = useCallback(
    (id: string, updates: ComponentStyleUpdates) => {
      updateScreenComponents((components) =>
        components.map((c) => (c.id === id ? { ...c, ...updates } : c))
      );
    },
    [updateScreenComponents]
  );

  const handleComponentUpdate = useCallback(
    (id: string, layout: Layout) => {
      updateScreenComponents((components) =>
        components.map((c) => (c.id === id ? { ...c, layout } : c))
      );
    },
    [updateScreenComponents]
  );

  const handleBackgroundColorChange = useCallback(
    (color: string) => {
      setBlueprint((prev) => {
        const screenId = prev.initial_screen_id;
        const screen = prev.screens[screenId];
        return {
          ...prev,
          screens: {
            ...prev.screens,
            [screenId]: { ...screen, backgroundColor: color },
          },
        };
      });
    },
    []
  );

  const handleResetProject = useCallback(() => {
    setBlueprint(defaultBlueprint);
  }, []);

  const handleResetAndBuild = useCallback(() => {
    setBlueprint((prev) => {
      const screenId = prev.initial_screen_id;
      return {
        ...prev,
        screens: {
          ...prev.screens,
          [screenId]: { ...prev.screens[screenId], components: [] },
        },
      };
    });
    setIsEditMode(true);
  }, []);

  if (!loaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar barStyle="dark-content" />
        <Canvas
          blueprint={blueprint}
          screenId={blueprint.initial_screen_id}
          isEditMode={isEditMode}
          onToggleEditMode={() => setIsEditMode((v) => !v)}
          onComponentUpdate={handleComponentUpdate}
          onContentChange={handleContentChange}
          onStyleChange={handleStyleChange}
          onAddComponent={handleAddComponent}
          onBackgroundColorChange={handleBackgroundColorChange}
          onResetProject={handleResetProject}
          onResetAndBuild={handleResetAndBuild}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}
