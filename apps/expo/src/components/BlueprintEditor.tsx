import React, { useState, useCallback, useEffect, useRef } from "react";
import { StatusBar } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Canvas } from "./Canvas";
import { AsyncStorageProvider } from "../storage";
import type { StorageProvider } from "../storage";
import type { AppBlueprint, Layout, Component, ComponentStyleUpdates, Screen, Variable } from "../types";
import { useRuntimeStore } from "../runtime";
import { uuid } from "../utils/uuid";
import { deepUpdateComponent, deepDeleteComponent } from "../utils/componentTree";
import { useUndoHistory } from "../hooks/useUndoHistory";

const SCREEN_ID = "00000000-0000-0000-0000-000000000001";
const TIMER_SCREEN_ID = "00000000-0000-0000-0000-000000000002";
const COUNTER_SCREEN_ID = "00000000-0000-0000-0000-000000000003";
const RANDOM_SCREEN_ID = "00000000-0000-0000-0000-000000000004";

export const BACKGROUND_ID = "00000000-0000-0000-0000-00000000000b";

export function makeBackgroundShape(color = "#ffffff"): Component {
  return {
    type: "shape" as const,
    id: BACKGROUND_ID,
    layout: { x: 0, y: 0, width: 1, height: 1 },
    shapeType: "rectangle" as const,
    backgroundColor: color,
    opacity: 1,
  };
}

function bg(id: string, color = "#0f172a"): Component {
  return { type: "shape", id, layout: { x: 0, y: 0, width: 1, height: 1 }, shapeType: "rectangle", backgroundColor: color, opacity: 1 };
}

export const defaultBlueprint: AppBlueprint = {
  version: 1,
  initial_screen_id: SCREEN_ID,
  screens: {
    // ── Home Screen ──
    [SCREEN_ID]: {
      id: SCREEN_ID,
      name: "Home",
      components: [
        bg(BACKGROUND_ID),
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000000010",
          layout: { x: 0.06, y: 0.06, width: 0.8, height: 0.03 },
          content: "DESIGN  \u2022  BUILD  \u2022  PREVIEW",
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
          layout: { x: 0.06, y: 0.17, width: 0.88, height: 0.05 },
          content: "Build beautiful app interfaces visually. Drag, drop, and customize components to bring your ideas to life.",
          fontSize: 15,
          color: "#94a3b8",
          fontWeight: "normal",
          textAlign: "left",
        },
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000000013",
          layout: { x: 0.06, y: 0.25, width: 0.88, height: 0.03 },
          content: "Demos",
          fontSize: 20,
          color: "#e2e8f0",
          fontWeight: "bold",
          textAlign: "left",
        },
        {
          type: "button",
          id: "00000000-0000-0000-0000-000000000040",
          layout: { x: 0.06, y: 0.30, width: 0.88, height: 0.065 },
          label: "Timer",
          backgroundColor: "#6366f1",
          textColor: "#ffffff",
          fontSize: 16,
          fontWeight: "600",
          textAlign: "center",
          borderRadius: 14,
          actions: { onTap: [{ type: "NAVIGATE", target: TIMER_SCREEN_ID }] },
        },
        {
          type: "button",
          id: "00000000-0000-0000-0000-000000000041",
          layout: { x: 0.06, y: 0.38, width: 0.88, height: 0.065 },
          label: "Counter",
          backgroundColor: "#8b5cf6",
          textColor: "#ffffff",
          fontSize: 16,
          fontWeight: "600",
          textAlign: "center",
          borderRadius: 14,
          actions: { onTap: [{ type: "NAVIGATE", target: COUNTER_SCREEN_ID }] },
        },
        {
          type: "button",
          id: "00000000-0000-0000-0000-000000000042",
          layout: { x: 0.06, y: 0.46, width: 0.88, height: 0.065 },
          label: "Random Number",
          backgroundColor: "#ec4899",
          textColor: "#ffffff",
          fontSize: 16,
          fontWeight: "600",
          textAlign: "center",
          borderRadius: 14,
          actions: { onTap: [{ type: "NAVIGATE", target: RANDOM_SCREEN_ID }] },
        },
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000000050",
          layout: { x: 0.06, y: 0.56, width: 0.88, height: 0.03 },
          content: "Quick Start",
          fontSize: 20,
          color: "#e2e8f0",
          fontWeight: "bold",
          textAlign: "left",
        },
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000000014",
          layout: { x: 0.06, y: 0.61, width: 0.88, height: 0.03 },
          content: "1. Long-press the canvas to open the menu",
          fontSize: 13,
          color: "#94a3b8",
          fontWeight: "normal",
          textAlign: "left",
        },
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000000016",
          layout: { x: 0.06, y: 0.65, width: 0.88, height: 0.03 },
          content: "2. Toggle Edit Mode on, then add components",
          fontSize: 13,
          color: "#94a3b8",
          fontWeight: "normal",
          textAlign: "left",
        },
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000000017",
          layout: { x: 0.06, y: 0.69, width: 0.88, height: 0.03 },
          content: "3. Drag to move, pinch to resize, tap to edit",
          fontSize: 13,
          color: "#94a3b8",
          fontWeight: "normal",
          textAlign: "left",
        },
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000000018",
          layout: { x: 0.06, y: 0.73, width: 0.88, height: 0.03 },
          content: "4. Toggle Edit Mode off to preview your app",
          fontSize: 13,
          color: "#94a3b8",
          fontWeight: "normal",
          textAlign: "left",
        },
        {
          type: "button",
          id: "00000000-0000-0000-0000-000000000020",
          layout: { x: 0.06, y: 0.80, width: 0.88, height: 0.065 },
          label: "Start Building",
          backgroundColor: "#22c55e",
          textColor: "#ffffff",
          fontSize: 16,
          fontWeight: "600",
          textAlign: "center",
          borderRadius: 14,
          actions: { onTap: [{ type: "RESET_CANVAS" }] },
        },
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000000015",
          layout: { x: 0.06, y: 0.89, width: 0.88, height: 0.03 },
          content: "v1.0  \u2022  Made with Blueprints",
          fontSize: 11,
          color: "#475569",
          fontWeight: "normal",
          textAlign: "left",
        },
      ],
    },

    // ── Timer Screen ──
    [TIMER_SCREEN_ID]: {
      id: TIMER_SCREEN_ID,
      name: "Timer",
      variables: [
        { name: "seconds", defaultValue: 0 },
        { name: "running", defaultValue: false },
      ],
      components: [
        bg("00000000-0000-0000-0000-0000000002b0"),
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000000201",
          layout: { x: 0.06, y: 0.06, width: 0.88, height: 0.04 },
          content: "Timer",
          fontSize: 28,
          color: "#ffffff",
          fontWeight: "bold",
          textAlign: "center",
        },
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000000202",
          layout: { x: 0.1, y: 0.25, width: 0.8, height: 0.15 },
          content: "0",
          fontSize: 72,
          color: "#818cf8",
          fontWeight: "bold",
          textAlign: "center",
          bindings: { content: "seconds" },
        },
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000000203",
          layout: { x: 0.2, y: 0.42, width: 0.6, height: 0.03 },
          content: "seconds",
          fontSize: 16,
          color: "#64748b",
          fontWeight: "normal",
          textAlign: "center",
        },
        {
          type: "button",
          id: "00000000-0000-0000-0000-000000000204",
          layout: { x: 0.1, y: 0.52, width: 0.8, height: 0.07 },
          label: "Start / Stop",
          backgroundColor: "#6366f1",
          textColor: "#ffffff",
          fontSize: 18,
          fontWeight: "bold",
          textAlign: "center",
          borderRadius: 14,
          actions: { onTap: [{ type: "TOGGLE_VARIABLE", key: "running" }] },
        },
        {
          type: "button",
          id: "00000000-0000-0000-0000-000000000205",
          layout: { x: 0.1, y: 0.62, width: 0.8, height: 0.07 },
          label: "Reset",
          backgroundColor: "#334155",
          textColor: "#e2e8f0",
          fontSize: 18,
          fontWeight: "600",
          textAlign: "center",
          borderRadius: 14,
          actions: {
            onTap: [
              { type: "SET_VARIABLE", key: "seconds", value: "0" },
              { type: "SET_VARIABLE", key: "running", value: "false" },
            ],
          },
        },
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000000206",
          layout: { x: 0.1, y: 0.75, width: 0.8, height: 0.05 },
          content: "Tap Start/Stop to toggle. Uses variables to track state.",
          fontSize: 13,
          color: "#64748b",
          fontWeight: "normal",
          textAlign: "center",
        },
      ],
    },

    // ── Counter Screen ──
    [COUNTER_SCREEN_ID]: {
      id: COUNTER_SCREEN_ID,
      name: "Counter",
      variables: [{ name: "count", defaultValue: 0 }],
      components: [
        bg("00000000-0000-0000-0000-0000000003b0"),
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000000301",
          layout: { x: 0.06, y: 0.06, width: 0.88, height: 0.04 },
          content: "Counter",
          fontSize: 28,
          color: "#ffffff",
          fontWeight: "bold",
          textAlign: "center",
        },
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000000302",
          layout: { x: 0.1, y: 0.25, width: 0.8, height: 0.15 },
          content: "0",
          fontSize: 80,
          color: "#8b5cf6",
          fontWeight: "bold",
          textAlign: "center",
          bindings: { content: "count" },
        },
        {
          type: "button",
          id: "00000000-0000-0000-0000-000000000303",
          layout: { x: 0.06, y: 0.48, width: 0.42, height: 0.08 },
          label: "- 1",
          backgroundColor: "#ef4444",
          textColor: "#ffffff",
          fontSize: 24,
          fontWeight: "bold",
          textAlign: "center",
          borderRadius: 14,
          actions: { onTap: [{ type: "SET_VARIABLE", key: "count", value: "count - 1" }] },
        },
        {
          type: "button",
          id: "00000000-0000-0000-0000-000000000304",
          layout: { x: 0.52, y: 0.48, width: 0.42, height: 0.08 },
          label: "+ 1",
          backgroundColor: "#22c55e",
          textColor: "#ffffff",
          fontSize: 24,
          fontWeight: "bold",
          textAlign: "center",
          borderRadius: 14,
          actions: { onTap: [{ type: "SET_VARIABLE", key: "count", value: "count + 1" }] },
        },
        {
          type: "button",
          id: "00000000-0000-0000-0000-000000000305",
          layout: { x: 0.2, y: 0.60, width: 0.6, height: 0.065 },
          label: "Reset",
          backgroundColor: "#334155",
          textColor: "#e2e8f0",
          fontSize: 16,
          fontWeight: "600",
          textAlign: "center",
          borderRadius: 14,
          actions: { onTap: [{ type: "SET_VARIABLE", key: "count", value: "0" }] },
        },
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000000306",
          layout: { x: 0.1, y: 0.75, width: 0.8, height: 0.05 },
          content: "A simple counter using SET_VARIABLE expressions.",
          fontSize: 13,
          color: "#64748b",
          fontWeight: "normal",
          textAlign: "center",
        },
      ],
    },

    // ── Random Number Screen ──
    [RANDOM_SCREEN_ID]: {
      id: RANDOM_SCREEN_ID,
      name: "Random",
      variables: [{ name: "result", defaultValue: 0 }],
      components: [
        bg("00000000-0000-0000-0000-0000000004b0"),
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000000401",
          layout: { x: 0.06, y: 0.06, width: 0.88, height: 0.04 },
          content: "Random Number",
          fontSize: 28,
          color: "#ffffff",
          fontWeight: "bold",
          textAlign: "center",
        },
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000000402",
          layout: { x: 0.1, y: 0.25, width: 0.8, height: 0.15 },
          content: "?",
          fontSize: 80,
          color: "#ec4899",
          fontWeight: "bold",
          textAlign: "center",
          bindings: { content: "result" },
        },
        {
          type: "button",
          id: "00000000-0000-0000-0000-000000000403",
          layout: { x: 0.1, y: 0.48, width: 0.8, height: 0.08 },
          label: "Generate (1-100)",
          backgroundColor: "#ec4899",
          textColor: "#ffffff",
          fontSize: 20,
          fontWeight: "bold",
          textAlign: "center",
          borderRadius: 14,
          actions: { onTap: [{ type: "SET_VARIABLE", key: "result", value: "floor(random(100)) + 1" }] },
        },
        {
          type: "button",
          id: "00000000-0000-0000-0000-000000000404",
          layout: { x: 0.1, y: 0.59, width: 0.38, height: 0.065 },
          label: "1-10",
          backgroundColor: "#7c3aed",
          textColor: "#ffffff",
          fontSize: 16,
          fontWeight: "600",
          textAlign: "center",
          borderRadius: 14,
          actions: { onTap: [{ type: "SET_VARIABLE", key: "result", value: "floor(random(10)) + 1" }] },
        },
        {
          type: "button",
          id: "00000000-0000-0000-0000-000000000405",
          layout: { x: 0.52, y: 0.59, width: 0.38, height: 0.065 },
          label: "1-1000",
          backgroundColor: "#7c3aed",
          textColor: "#ffffff",
          fontSize: 16,
          fontWeight: "600",
          textAlign: "center",
          borderRadius: 14,
          actions: { onTap: [{ type: "SET_VARIABLE", key: "result", value: "floor(random(1000)) + 1" }] },
        },
        {
          type: "button",
          id: "00000000-0000-0000-0000-000000000406",
          layout: { x: 0.2, y: 0.68, width: 0.6, height: 0.065 },
          label: "Reset",
          backgroundColor: "#334155",
          textColor: "#e2e8f0",
          fontSize: 16,
          fontWeight: "600",
          textAlign: "center",
          borderRadius: 14,
          actions: { onTap: [{ type: "SET_VARIABLE", key: "result", value: "0" }] },
        },
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000000407",
          layout: { x: 0.1, y: 0.80, width: 0.8, height: 0.05 },
          content: "Uses random() and floor() in variable expressions.",
          fontSize: 13,
          color: "#64748b",
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
  const {
    blueprint,
    setBlueprint,
    setBlueprintRaw,
    undo,
    redo,
    canUndo,
    canRedo,
    entries,
    currentId,
    restoreToId,
    startBatch,
    endBatch,
  } = useUndoHistory(defaultBlueprint);
  const [isEditMode, setIsEditMode] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [currentScreenId, setCurrentScreenId] = useState(SCREEN_ID);
  const currentScreenIdRef = useRef(currentScreenId);
  currentScreenIdRef.current = currentScreenId;
  const [navStack, setNavStack] = useState<string[]>([]);
  const isEditModeLoaded = useRef(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blueprintRef = useRef(blueprint);
  blueprintRef.current = blueprint;
  const initFromBlueprint = useRuntimeStore((s) => s.initFromBlueprint);
  const navigateToScreen = useRuntimeStore((s) => s.navigateToScreen);
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
        setBlueprintRaw(loadedBp);
        setCurrentScreenId(loadedBp.initial_screen_id);

        // Always start in edit mode
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
    const screen = blueprint.screens[currentScreenId];
    const appVars = blueprint.variables ?? [];
    const screenVars = screen?.variables ?? [];
    initFromBlueprint(appVars, screenVars, {});
  }, [blueprint.variables, currentScreenId, blueprint.screens[currentScreenId]?.variables]);

  // Debounced persist of runtime variables
  useEffect(() => {
    if (!loaded) return;
    if (persistTimeout.current) clearTimeout(persistTimeout.current);
    persistTimeout.current = setTimeout(() => {
      const screen = blueprint.screens[currentScreenIdRef.current];
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
    (fn: (components: Component[]) => Component[], description = "Updated components") => {
      setBlueprint((prev) => {
        const sid = currentScreenIdRef.current;
        const screen = prev.screens[sid];
        if (!screen) return prev;
        return {
          ...prev,
          screens: {
            ...prev.screens,
            [sid]: { ...screen, components: fn(screen.components) },
          },
        };
      }, description);
    },
    [setBlueprint]
  );

  const handleAddComponent = useCallback(
    (component: Component) => {
      updateScreenComponents((components) => [...components, component], `Added ${component.type}`);
    },
    [updateScreenComponents]
  );

  const handleDeleteComponent = useCallback(
    (id: string) => {
      updateScreenComponents((components) => deepDeleteComponent(components, id), "Deleted component");
    },
    [updateScreenComponents]
  );

  const handleContentChange = useCallback(
    (id: string, content: string) => {
      updateScreenComponents((components) =>
        deepUpdateComponent(components, id, (c) =>
          c.type === "text" ? { ...c, content } : c
        ),
        "Edited text"
      );
    },
    [updateScreenComponents]
  );

  const handleStyleChange = useCallback(
    (id: string, updates: ComponentStyleUpdates) => {
      updateScreenComponents((components) =>
        deepUpdateComponent(components, id, (c) => ({ ...c, ...updates })),
        "Changed style"
      );
    },
    [updateScreenComponents]
  );

  const handleComponentUpdate = useCallback(
    (id: string, layout: Layout) => {
      updateScreenComponents((components) =>
        deepUpdateComponent(components, id, (c) => ({ ...c, layout })),
        "Moved component"
      );
    },
    [updateScreenComponents]
  );

  const handleComponentReplace = useCallback(
    (id: string, replacement: Component) => {
      updateScreenComponents((components) =>
        deepUpdateComponent(components, id, () => replacement),
        "Replaced component"
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
        }),
        "Added child"
      );
    },
    [updateScreenComponents]
  );

  const handleScreenUpdate = useCallback(
    (updatedScreen: Screen) => {
      setBlueprint((prev) => {
        const sid = currentScreenIdRef.current;
        return {
          ...prev,
          screens: {
            ...prev.screens,
            [sid]: updatedScreen,
          },
        };
      }, "Updated screen");
    },
    [setBlueprint]
  );

  const handleResetAndBuild = useCallback(() => {
    setBlueprint((prev) => {
      const sid = currentScreenIdRef.current;
      return {
        ...prev,
        screens: {
          ...prev.screens,
          [sid]: { ...prev.screens[sid], components: [makeBackgroundShape("#ffffff")] },
        },
      };
    }, "Reset canvas");
    setIsEditMode(true);
  }, [setBlueprint]);

  // --- Screen navigation (preview mode) ---
  const handleNavigate = useCallback((targetScreenId: string) => {
    setNavStack((prev) => [...prev, currentScreenIdRef.current]);
    setCurrentScreenId(targetScreenId);
    const bp = blueprintRef.current;
    const targetScreen = bp.screens[targetScreenId];
    navigateToScreen(bp.variables ?? [], targetScreen?.variables ?? []);
  }, [navigateToScreen]);

  const handleNavigateBack = useCallback(() => {
    setNavStack((prev) => {
      if (prev.length === 0) return prev;
      const next = [...prev];
      const previousId = next.pop()!;
      setCurrentScreenId(previousId);
      const bp = blueprintRef.current;
      const prevScreen = bp.screens[previousId];
      navigateToScreen(bp.variables ?? [], prevScreen?.variables ?? []);
      return next;
    });
  }, [navigateToScreen]);

  // --- Screen management (edit mode) ---
  const handleSwitchScreen = useCallback((screenId: string) => {
    setCurrentScreenId(screenId);
    setNavStack([]);
  }, []);

  const handleAddScreen = useCallback(() => {
    const newId = uuid();
    const newScreen: Screen = {
      id: newId,
      name: `Screen ${Object.keys(blueprintRef.current.screens).length + 1}`,
      components: [makeBackgroundShape("#ffffff")],
    };
    setBlueprint((prev) => ({
      ...prev,
      screens: { ...prev.screens, [newId]: newScreen },
    }), "Added screen");
    setCurrentScreenId(newId);
    setNavStack([]);
  }, [setBlueprint]);

  const handleDeleteScreen = useCallback((screenId: string) => {
    setBlueprint((prev) => {
      const ids = Object.keys(prev.screens);
      if (ids.length <= 1) return prev;
      const { [screenId]: _, ...rest } = prev.screens;
      const remainingIds = Object.keys(rest);
      const newInitial = prev.initial_screen_id === screenId
        ? remainingIds[0]
        : prev.initial_screen_id;
      return { ...prev, screens: rest, initial_screen_id: newInitial };
    }, "Deleted screen");
    if (currentScreenIdRef.current === screenId) {
      const bp = blueprintRef.current;
      const ids = Object.keys(bp.screens).filter((id) => id !== screenId);
      setCurrentScreenId(ids[0] ?? bp.initial_screen_id);
    }
    setNavStack([]);
  }, [setBlueprint]);

  const handleRenameScreen = useCallback((screenId: string, name: string) => {
    setBlueprint((prev) => {
      const screen = prev.screens[screenId];
      if (!screen) return prev;
      return {
        ...prev,
        screens: { ...prev.screens, [screenId]: { ...screen, name } },
      };
    }, "Renamed screen");
  }, [setBlueprint]);

  const handleSetInitialScreen = useCallback((screenId: string) => {
    setBlueprint((prev) => ({ ...prev, initial_screen_id: screenId }), "Set initial screen");
  }, [setBlueprint]);

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" />
      <Canvas
        blueprint={blueprint}
        screenId={currentScreenId}
        isEditMode={isEditMode}
        onToggleEditMode={() => setIsEditMode((v) => !v)}
        onComponentUpdate={handleComponentUpdate}
        onContentChange={handleContentChange}
        onStyleChange={handleStyleChange}
        onAddComponent={handleAddComponent}
        onCloseBlueprint={handleCloseBlueprint}
        onDeleteBlueprint={onDeleteBlueprint}
        onResetAndBuild={handleResetAndBuild}
        onNavigate={handleNavigate}
        onNavigateBack={handleNavigateBack}
        navStack={navStack}
        onScreenUpdate={handleScreenUpdate}
        onDeleteComponent={handleDeleteComponent}
        onComponentReplace={handleComponentReplace}
        onAddChildComponent={handleAddChildComponent}
        onBlueprintChange={(updater) => {
          setBlueprint(
            typeof updater === "function" ? updater : () => updater,
            "Updated blueprint"
          );
        }}
        currentScreenId={currentScreenId}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        entries={entries}
        currentId={currentId}
        restoreToId={restoreToId}
        startBatch={startBatch}
        endBatch={endBatch}
        initialScreenId={blueprint.initial_screen_id}
        screenActions={{
          onSwitchScreen: handleSwitchScreen,
          onAddScreen: handleAddScreen,
          onDeleteScreen: handleDeleteScreen,
          onRenameScreen: handleRenameScreen,
          onSetInitialScreen: handleSetInitialScreen,
        }}
      />
    </GestureHandlerRootView>
  );
}
