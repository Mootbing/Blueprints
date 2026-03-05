import React, { useState, useCallback, useEffect, useRef } from "react";
import { StatusBar } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Canvas } from "./Canvas";
import { AsyncStorageProvider } from "../storage";
import type { StorageProvider } from "../storage";
import type { AppBlueprint, Layout, Component, ComponentStyleUpdates, Screen, Variable } from "../types";
import { useRuntimeStore } from "../runtime";

const SCREEN_ID = "00000000-0000-0000-0000-000000000001";

function deepUpdateComponent(
  components: Component[],
  targetId: string,
  updater: (comp: Component) => Component
): Component[] {
  return components.map((c) => {
    if (c.id === targetId) return updater(c);
    if (c.type === "container" && c.children) {
      const updated = deepUpdateComponent(c.children, targetId, updater);
      if (updated !== c.children) return { ...c, children: updated };
    }
    return c;
  });
}

function deepDeleteComponent(
  components: Component[],
  targetId: string
): Component[] {
  const filtered = components.filter((c) => c.id !== targetId);
  if (filtered.length < components.length) return filtered;
  return components.map((c) => {
    if (c.type === "container" && c.children) {
      const updated = deepDeleteComponent(c.children, targetId);
      if (updated !== c.children) return { ...c, children: updated };
    }
    return c;
  });
}

export const defaultBlueprint: AppBlueprint = {
  version: 1,
  initial_screen_id: SCREEN_ID,
  variables: [
    { id: "00000000-0000-0000-0000-a00000000001", name: "count", type: "number", defaultValue: 0 },
    { id: "00000000-0000-0000-0000-a00000000002", name: "greeting", type: "string", defaultValue: "Hello, Blueprints!" },
    { id: "00000000-0000-0000-0000-a00000000003", name: "showSecret", type: "boolean", defaultValue: false },
  ],
  screens: {
    [SCREEN_ID]: {
      id: SCREEN_ID,
      name: "Home",
      backgroundColor: "#0f172a",
      components: [
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000000010",
          layout: { x: 0.06, y: 0.05, width: 0.88, height: 0.025 },
          content: "VARIABLES  \u2022  BINDINGS  \u2022  ACTIONS",
          fontSize: 11,
          color: "#818cf8",
          fontWeight: "600",
          textAlign: "left",
        },
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000000011",
          layout: { x: 0.06, y: 0.085, width: 0.88, height: 0.045 },
          content: "Hello, Blueprints!",
          fontSize: 30,
          color: "#ffffff",
          fontWeight: "bold",
          textAlign: "left",
          bindings: { content: "variables.greeting" },
        },
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000000012",
          layout: { x: 0.06, y: 0.14, width: 0.88, height: 0.055 },
          content: "Tap the buttons in preview mode to see variables, bindings, and actions working live.",
          fontSize: 14,
          color: "#94a3b8",
          fontWeight: "normal",
          textAlign: "left",
        },
        {
          type: "divider",
          id: "00000000-0000-0000-0000-000000000040",
          layout: { x: 0.06, y: 0.205, width: 0.88, height: 0.005 },
          color: "#334155",
        },
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000000013",
          layout: { x: 0.06, y: 0.22, width: 0.88, height: 0.025 },
          content: "COUNTER",
          fontSize: 12,
          color: "#64748b",
          fontWeight: "700",
          textAlign: "left",
        },
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000000014",
          layout: { x: 0.06, y: 0.25, width: 0.88, height: 0.06 },
          content: "0",
          fontSize: 48,
          color: "#e2e8f0",
          fontWeight: "bold",
          textAlign: "center",
          bindings: { content: "variables.count" },
        },
        {
          type: "button",
          id: "00000000-0000-0000-0000-000000000021",
          layout: { x: 0.06, y: 0.32, width: 0.27, height: 0.055 },
          label: "\u2212 1",
          backgroundColor: "#334155",
          textColor: "#e2e8f0",
          fontSize: 18,
          fontWeight: "700",
          borderRadius: 12,
          actions: { onTap: [{ type: "SET_VARIABLE", key: "count", value: "variables.count - 1" }] },
        },
        {
          type: "button",
          id: "00000000-0000-0000-0000-000000000022",
          layout: { x: 0.36, y: 0.32, width: 0.27, height: 0.055 },
          label: "Reset",
          backgroundColor: "#1e293b",
          textColor: "#94a3b8",
          fontSize: 14,
          fontWeight: "600",
          borderRadius: 12,
          actions: { onTap: [{ type: "SET_VARIABLE", key: "count", value: "0" }] },
        },
        {
          type: "button",
          id: "00000000-0000-0000-0000-000000000023",
          layout: { x: 0.66, y: 0.32, width: 0.27, height: 0.055 },
          label: "+ 1",
          backgroundColor: "#6366f1",
          textColor: "#ffffff",
          fontSize: 18,
          fontWeight: "700",
          borderRadius: 12,
          actions: { onTap: [{ type: "SET_VARIABLE", key: "count", value: "variables.count + 1" }] },
        },
        {
          type: "divider",
          id: "00000000-0000-0000-0000-000000000041",
          layout: { x: 0.06, y: 0.39, width: 0.88, height: 0.005 },
          color: "#334155",
        },
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000000016",
          layout: { x: 0.06, y: 0.405, width: 0.88, height: 0.025 },
          content: "DYNAMIC GREETING",
          fontSize: 12,
          color: "#64748b",
          fontWeight: "700",
          textAlign: "left",
        },
        {
          type: "button",
          id: "00000000-0000-0000-0000-000000000024",
          layout: { x: 0.06, y: 0.435, width: 0.42, height: 0.055 },
          label: "Say Hello",
          backgroundColor: "#059669",
          textColor: "#ffffff",
          fontSize: 14,
          fontWeight: "600",
          borderRadius: 12,
          actions: { onTap: [{ type: "SET_VARIABLE", key: "greeting", value: "'Hello, Blueprints!'" }] },
        },
        {
          type: "button",
          id: "00000000-0000-0000-0000-000000000025",
          layout: { x: 0.52, y: 0.435, width: 0.42, height: 0.055 },
          label: "Say Goodbye",
          backgroundColor: "#dc2626",
          textColor: "#ffffff",
          fontSize: 14,
          fontWeight: "600",
          borderRadius: 12,
          actions: { onTap: [{ type: "SET_VARIABLE", key: "greeting", value: "'Goodbye, World!'" }] },
        },
        {
          type: "divider",
          id: "00000000-0000-0000-0000-000000000042",
          layout: { x: 0.06, y: 0.505, width: 0.88, height: 0.005 },
          color: "#334155",
        },
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000000017",
          layout: { x: 0.06, y: 0.52, width: 0.88, height: 0.025 },
          content: "CONDITIONAL VISIBILITY",
          fontSize: 12,
          color: "#64748b",
          fontWeight: "700",
          textAlign: "left",
        },
        {
          type: "button",
          id: "00000000-0000-0000-0000-000000000026",
          layout: { x: 0.06, y: 0.55, width: 0.88, height: 0.055 },
          label: "Toggle Secret Message",
          backgroundColor: "#7c3aed",
          textColor: "#ffffff",
          fontSize: 14,
          fontWeight: "600",
          borderRadius: 12,
          actions: { onTap: [{ type: "TOGGLE_VARIABLE", key: "showSecret" }] },
        },
        {
          type: "shape",
          id: "00000000-0000-0000-0000-000000000050",
          layout: { x: 0.06, y: 0.615, width: 0.88, height: 0.065 },
          shapeType: "rounded-rectangle",
          backgroundColor: "#1e1b4b",
          borderColor: "#818cf8",
          borderWidth: 1,
          borderRadius: 12,
          visibleWhen: "variables.showSecret",
        },
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000000018",
          layout: { x: 0.1, y: 0.63, width: 0.8, height: 0.035 },
          content: "You found the secret message!",
          fontSize: 16,
          color: "#a5b4fc",
          fontWeight: "600",
          textAlign: "center",
          visibleWhen: "variables.showSecret",
        },
        {
          type: "divider",
          id: "00000000-0000-0000-0000-000000000043",
          layout: { x: 0.06, y: 0.695, width: 0.88, height: 0.005 },
          color: "#334155",
        },
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000000019",
          layout: { x: 0.06, y: 0.71, width: 0.88, height: 0.025 },
          content: "CONDITIONAL ACTION",
          fontSize: 12,
          color: "#64748b",
          fontWeight: "700",
          textAlign: "left",
        },
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000000031",
          layout: { x: 0.06, y: 0.74, width: 0.88, height: 0.03 },
          content: "Tap below to check count",
          fontSize: 14,
          color: "#94a3b8",
          fontWeight: "normal",
          textAlign: "center",
          bindings: { content: "variables.greeting" },
        },
        {
          type: "button",
          id: "00000000-0000-0000-0000-000000000027",
          layout: { x: 0.06, y: 0.78, width: 0.88, height: 0.055 },
          label: "Check Count Status",
          backgroundColor: "#0891b2",
          textColor: "#ffffff",
          fontSize: 14,
          fontWeight: "600",
          borderRadius: 12,
          actions: {
            onTap: [{
              type: "CONDITIONAL",
              condition: "variables.count > 5",
              then: [{ type: "SET_VARIABLE", key: "greeting", value: "'Count is HIGH! (' + variables.count + ')'" }],
              else: [{ type: "SET_VARIABLE", key: "greeting", value: "'Count is low (' + variables.count + ')'" }],
            }],
          },
        },
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000000015",
          layout: { x: 0.06, y: 0.86, width: 0.88, height: 0.025 },
          content: "Long-press canvas to open menu  \u2022  Made with Blueprints",
          fontSize: 11,
          color: "#475569",
          fontWeight: "normal",
          textAlign: "center",
        },
      ],
    },
  },
};

const storage: StorageProvider = new AsyncStorageProvider();

function collectPersistedVarNames(appVars: Variable[], screenVars: Variable[]): Set<string> {
  const names = new Set<string>();
  for (const v of [...appVars, ...screenVars]) {
    if (v.persist) names.add(v.name);
  }
  return names;
}

interface BlueprintEditorProps {
  blueprintId: string;
  onCloseBlueprint: () => void;
  onDeleteBlueprint: () => void;
}

export function BlueprintEditor({
  blueprintId,
  onCloseBlueprint,
  onDeleteBlueprint,
}: BlueprintEditorProps) {
  const [blueprint, setBlueprint] = useState(defaultBlueprint);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const isEditModeLoaded = useRef(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blueprintRef = useRef(blueprint);
  blueprintRef.current = blueprint;
  const initFromBlueprint = useRuntimeStore((s) => s.initFromBlueprint);
  const runtimeVariables = useRuntimeStore((s) => s.variables);

  // Load blueprint and settings on mount
  useEffect(() => {
    (async () => {
      try {
        const [bp, editMode, persistedJson] = await Promise.all([
          storage.loadBlueprint(blueprintId),
          AsyncStorage.getItem("settings_editMode"),
          AsyncStorage.getItem(`runtime_persisted_variables_${blueprintId}`),
        ]);

        const loadedBp = bp ?? defaultBlueprint;
        setBlueprint(loadedBp);

        // Always start in preview mode
        isEditModeLoaded.current = true;

        // Init runtime store
        const screenId = loadedBp.initial_screen_id;
        const screen = loadedBp.screens[screenId];
        const appVars = loadedBp.variables ?? [];
        const screenVars = screen?.variables ?? [];
        const persisted = persistedJson ? JSON.parse(persistedJson) : {};
        initFromBlueprint(appVars, screenVars, persisted);

        setLoaded(true);
      } catch {
        setLoaded(true);
      }
    })();

    // Flush save on unmount
    return () => {
      if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
        storage.saveBlueprint(blueprintId, blueprintRef.current);
      }
      if (persistTimeout.current) {
        clearTimeout(persistTimeout.current);
      }
    };
  }, [blueprintId]);

  // Debounced save on blueprint change
  useEffect(() => {
    if (!loaded) return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      storage.saveBlueprint(blueprintId, blueprint);
    }, 500);
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [blueprint, loaded, blueprintId]);

  // Persist edit mode
  useEffect(() => {
    if (!isEditModeLoaded.current) return;
    AsyncStorage.setItem("settings_editMode", String(isEditMode));
  }, [isEditMode]);

  // Re-initialize runtime store when blueprint variables change
  useEffect(() => {
    if (!loaded) return;
    const screenId = blueprint.initial_screen_id;
    const screen = blueprint.screens[screenId];
    const appVars = blueprint.variables ?? [];
    const screenVars = screen?.variables ?? [];
    initFromBlueprint(appVars, screenVars, {});
  }, [blueprint.variables, blueprint.screens[blueprint.initial_screen_id]?.variables]);

  // Debounced persist of runtime variables
  useEffect(() => {
    if (!loaded) return;
    if (persistTimeout.current) clearTimeout(persistTimeout.current);
    persistTimeout.current = setTimeout(() => {
      const screenId = blueprint.initial_screen_id;
      const screen = blueprint.screens[screenId];
      const persistedNames = collectPersistedVarNames(
        blueprint.variables ?? [],
        screen?.variables ?? []
      );
      if (persistedNames.size === 0) return;
      const toSave: Record<string, unknown> = {};
      for (const name of persistedNames) {
        if (name in runtimeVariables) {
          toSave[name] = runtimeVariables[name];
        }
      }
      AsyncStorage.setItem(
        `runtime_persisted_variables_${blueprintId}`,
        JSON.stringify(toSave)
      );
    }, 1000);
    return () => {
      if (persistTimeout.current) clearTimeout(persistTimeout.current);
    };
  }, [runtimeVariables, loaded, blueprintId]);

  const handleCloseBlueprint = useCallback(async () => {
    // Flush pending save
    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current);
      saveTimeout.current = null;
      await storage.saveBlueprint(blueprintId, blueprintRef.current);
    }
    onCloseBlueprint();
  }, [blueprintId, onCloseBlueprint]);

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

  const handleDeleteComponent = useCallback(
    (id: string) => {
      updateScreenComponents((components) => deepDeleteComponent(components, id));
    },
    [updateScreenComponents]
  );

  const handleContentChange = useCallback(
    (id: string, content: string) => {
      updateScreenComponents((components) =>
        deepUpdateComponent(components, id, (c) =>
          c.type === "text" ? { ...c, content } : c
        )
      );
    },
    [updateScreenComponents]
  );

  const handleStyleChange = useCallback(
    (id: string, updates: ComponentStyleUpdates) => {
      updateScreenComponents((components) =>
        deepUpdateComponent(components, id, (c) => ({ ...c, ...updates }))
      );
    },
    [updateScreenComponents]
  );

  const handleComponentUpdate = useCallback(
    (id: string, layout: Layout) => {
      updateScreenComponents((components) =>
        deepUpdateComponent(components, id, (c) => ({ ...c, layout }))
      );
    },
    [updateScreenComponents]
  );

  const handleComponentReplace = useCallback(
    (id: string, replacement: Component) => {
      updateScreenComponents((components) =>
        deepUpdateComponent(components, id, () => replacement)
      );
    },
    [updateScreenComponents]
  );

  const handleAddChildComponent = useCallback(
    (parentId: string, child: Component) => {
      updateScreenComponents((components) =>
        deepUpdateComponent(components, parentId, (c) => {
          if (c.type !== "container") return c;
          return { ...c, children: [...(c.children ?? []), child] };
        })
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

  const handleScreenUpdate = useCallback(
    (updatedScreen: Screen) => {
      setBlueprint((prev) => {
        const screenId = prev.initial_screen_id;
        return {
          ...prev,
          screens: {
            ...prev.screens,
            [screenId]: updatedScreen,
          },
        };
      });
    },
    []
  );

  const handleResetAndBuild = useCallback(() => {
    setBlueprint((prev) => {
      const screenId = prev.initial_screen_id;
      return {
        ...prev,
        screens: {
          ...prev.screens,
          [screenId]: { ...prev.screens[screenId], components: [], backgroundColor: "#ffffff" },
        },
      };
    });
    setIsEditMode(true);
  }, []);

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
        onCloseBlueprint={handleCloseBlueprint}
        onDeleteBlueprint={onDeleteBlueprint}
        onResetAndBuild={handleResetAndBuild}
        onScreenUpdate={handleScreenUpdate}
        onDeleteComponent={handleDeleteComponent}
        onComponentReplace={handleComponentReplace}
        onAddChildComponent={handleAddChildComponent}
        onBlueprintChange={setBlueprint}
      />
    </GestureHandlerRootView>
  );
}
