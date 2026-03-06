import React, { useState, useCallback, useEffect, useRef } from "react";
import { StatusBar } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Canvas } from "./Canvas";
import type { StorageProvider } from "../storage";
import type { SyncableStorageProvider } from "../storage/StorageProvider";
import type { AppSlate, Layout, Component, ComponentStyleUpdates, Screen, Variable } from "../types";
import { useCollaboration } from "../hooks/useCollaboration";
import { useRuntimeStore } from "../runtime";
import { uuid } from "../utils/uuid";
import { deepUpdateComponent, deepDeleteComponent } from "../utils/componentTree";
import { useUndoHistory } from "../hooks/useUndoHistory";

const SCREEN_ID = "00000000-0000-0000-0000-000000000001";
const TIMER_SCREEN_ID = "00000000-0000-0000-0000-000000000002";
const COUNTER_SCREEN_ID = "00000000-0000-0000-0000-000000000003";
const RANDOM_SCREEN_ID = "00000000-0000-0000-0000-000000000004";

export const BACKGROUND_ID = "00000000-0000-0000-0000-00000000000b";

export function makeBackgroundShape(color = "#000000"): Component {
  return {
    type: "shape" as const,
    id: BACKGROUND_ID,
    layout: { x: 0, y: 0, width: 1, height: 1 },
    shapeType: "rectangle" as const,
    backgroundColor: color,
    opacity: 1,
  };
}

function bg(id: string, color = "#000000"): Component {
  return { type: "shape", id, layout: { x: 0, y: 0, width: 1, height: 1 }, shapeType: "rectangle", backgroundColor: color, opacity: 1 };
}

export const defaultSlate: AppSlate = {
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
          content: "CREATE  \u2022  CUSTOMIZE  \u2022  LAUNCH",
          fontSize: 11,
          color: "#444",
          fontWeight: "600",
          textAlign: "left",
        },
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000000011",
          layout: { x: 0.06, y: 0.10, width: 0.88, height: 0.05 },
          content: "Meet Slate",
          fontSize: 36,
          color: "#ffffff",
          fontWeight: "200",
          textAlign: "left",
        },
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000000012",
          layout: { x: 0.06, y: 0.17, width: 0.88, height: 0.05 },
          content: "Your no-code app builder. Design screens, wire up logic, and see it all come together — right from your device.",
          fontSize: 15,
          color: "#666",
          fontWeight: "normal",
          textAlign: "left",
        },
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000000013",
          layout: { x: 0.06, y: 0.25, width: 0.88, height: 0.03 },
          content: "Demos",
          fontSize: 20,
          color: "#ccc",
          fontWeight: "300",
          textAlign: "left",
        },
        {
          type: "button",
          id: "00000000-0000-0000-0000-000000000040",
          layout: { x: 0.06, y: 0.30, width: 0.88, height: 0.065 },
          label: "Timer",
          backgroundColor: "#1a1a1a",
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
          backgroundColor: "#1a1a1a",
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
          backgroundColor: "#1a1a1a",
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
          content: "How It Works",
          fontSize: 20,
          color: "#ccc",
          fontWeight: "300",
          textAlign: "left",
        },
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000000014",
          layout: { x: 0.06, y: 0.61, width: 0.88, height: 0.03 },
          content: "1. Click the <> button to view components & layer tree",
          fontSize: 13,
          color: "#555",
          fontWeight: "normal",
          textAlign: "left",
        },
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000000016",
          layout: { x: 0.06, y: 0.65, width: 0.88, height: 0.03 },
          content: "2. Tap components from add components to add them",
          fontSize: 13,
          color: "#555",
          fontWeight: "normal",
          textAlign: "left",
        },
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000000017",
          layout: { x: 0.06, y: 0.69, width: 0.88, height: 0.03 },
          content: "3. Drag, pinch, style, and use AI until it looks right",
          fontSize: 13,
          color: "#555",
          fontWeight: "normal",
          textAlign: "left",
        },
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000000018",
          layout: { x: 0.06, y: 0.73, width: 0.88, height: 0.03 },
          content: "4. Tap the icon to switch dev/preview modes",
          fontSize: 13,
          color: "#555",
          fontWeight: "normal",
          textAlign: "left",
        },
        {
          type: "button",
          id: "00000000-0000-0000-0000-000000000020",
          layout: { x: 0.06, y: 0.80, width: 0.88, height: 0.065 },
          label: "Blankify Project (click on me in preview)",
          backgroundColor: "#ffffff",
          textColor: "#000000",
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
          content: "v1.0  \u2022  Made with Slate",
          fontSize: 11,
          color: "#333",
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
          color: "#ffffff",
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
          color: "#444",
          fontWeight: "normal",
          textAlign: "center",
        },
        {
          type: "button",
          id: "00000000-0000-0000-0000-000000000204",
          layout: { x: 0.1, y: 0.52, width: 0.8, height: 0.07 },
          label: "Start / Stop",
          backgroundColor: "#ffffff",
          textColor: "#000000",
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
          backgroundColor: "#1a1a1a",
          textColor: "#ccc",
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
          color: "#444",
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
          color: "#ffffff",
          fontWeight: "bold",
          textAlign: "center",
          bindings: { content: "count" },
        },
        {
          type: "button",
          id: "00000000-0000-0000-0000-000000000303",
          layout: { x: 0.06, y: 0.48, width: 0.42, height: 0.08 },
          label: "- 1",
          backgroundColor: "#1a1a1a",
          textColor: "#ccc",
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
          backgroundColor: "#ffffff",
          textColor: "#000000",
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
          backgroundColor: "#111",
          textColor: "#666",
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
          color: "#444",
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
          color: "#ffffff",
          fontWeight: "bold",
          textAlign: "center",
          bindings: { content: "result" },
        },
        {
          type: "button",
          id: "00000000-0000-0000-0000-000000000403",
          layout: { x: 0.1, y: 0.48, width: 0.8, height: 0.08 },
          label: "Generate (1-100)",
          backgroundColor: "#ffffff",
          textColor: "#000000",
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
          backgroundColor: "#1a1a1a",
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
          backgroundColor: "#1a1a1a",
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
          backgroundColor: "#111",
          textColor: "#666",
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
          color: "#444",
          fontWeight: "normal",
          textAlign: "center",
        },
      ],
    },
  },
};

function collectPersistedVarNames(appVars: Variable[], screenVars: Variable[]): Set<string> {
  const names = new Set<string>();
  for (const v of [...appVars, ...screenVars]) {
    if (v.persist) names.add(v.name);
  }
  return names;
}

interface SlateEditorProps {
  slateId: string;
  slateName: string;
  onCloseSlate: () => void;
  onDeleteSlate: () => void;
  onRenameSlate: (name: string) => void;
  storage: StorageProvider;
}

export function SlateEditor({
  slateId,
  slateName,
  onCloseSlate,
  onDeleteSlate,
  onRenameSlate,
  storage,
}: SlateEditorProps) {
  const {
    slate,
    setSlate,
    setSlateRaw,
    undo,
    redo,
    canUndo,
    canRedo,
    entries,
    currentId,
    restoreToId,
    startBatch,
    endBatch,
    historyVersion,
    loadHistory,
    getRedoMap,
    createBranch,
    addBranchEntry,
  } = useUndoHistory(defaultSlate);
  const [isEditMode, setIsEditMode] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [apiKey, setApiKey] = useState(process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? "");
  const [currentScreenId, setCurrentScreenId] = useState(SCREEN_ID);
  const currentScreenIdRef = useRef(currentScreenId);
  currentScreenIdRef.current = currentScreenId;
  const [navStack, setNavStack] = useState<string[]>([]);
  const isEditModeLoaded = useRef(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historySaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slateRef = useRef(slate);
  slateRef.current = slate;
  const initFromSlate = useRuntimeStore((s) => s.initFromSlate);
  const navigateToScreen = useRuntimeStore((s) => s.navigateToScreen);
  const runtimeVariables = useRuntimeStore((s) => s.variables);

  // Collaboration: receive remote changes via setSlateRaw (no undo history)
  const isSyncable = 'joinCollabChannel' in storage;
  const { collaborators, broadcastChange } = useCollaboration({
    storage: storage as SyncableStorageProvider,
    slateId,
    onRemoteChange: (remoteSlate) => {
      setSlateRaw(remoteSlate);
    },
    enabled: isSyncable,
  });

  // Load slate and settings on mount
  useEffect(() => {
    (async () => {
      try {
        const [bp, editMode, persistedJson, savedApiKey, savedHistory] = await Promise.all([
          storage.loadSlate(slateId),
          AsyncStorage.getItem("settings_editMode"),
          AsyncStorage.getItem(`runtime_persisted_variables_${slateId}`),
          AsyncStorage.getItem("settings_anthropic_api_key"),
          storage.loadHistory(slateId),
        ]);
        if (savedApiKey) setApiKey(savedApiKey);

        const loadedBp = bp ?? defaultSlate;

        // Restore history if available, otherwise just set the raw slate
        if (savedHistory && savedHistory.entries.length > 0) {
          loadHistory(savedHistory.entries, savedHistory.currentId, savedHistory.redoMap);
        } else {
          setSlateRaw(loadedBp);
        }
        setCurrentScreenId(loadedBp.initial_screen_id);

        // Always start in edit mode
        isEditModeLoaded.current = true;

        // Init runtime store
        const screenId = loadedBp.initial_screen_id;
        const screen = loadedBp.screens[screenId];
        const appVars = loadedBp.variables ?? [];
        const screenVars = screen?.variables ?? [];
        const persisted = persistedJson ? JSON.parse(persistedJson) : {};
        initFromSlate(appVars, screenVars, persisted);

        setLoaded(true);
      } catch {
        setLoaded(true);
      }
    })();

    // Flush save on unmount
    return () => {
      if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
        storage.saveSlate(slateId, slateRef.current);
      }
      if (persistTimeout.current) {
        clearTimeout(persistTimeout.current);
      }
      if (historySaveTimeout.current) {
        clearTimeout(historySaveTimeout.current);
      }
    };
  }, [slateId]);

  // Debounced save on slate change + broadcast for collaboration
  useEffect(() => {
    if (!loaded) return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      storage.saveSlate(slateId, slate);
    }, 500);
    // Broadcast to collaborators
    if (isSyncable) {
      broadcastChange(slate);
    }
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [slate, loaded, slateId]);

  // Debounced save of undo history
  useEffect(() => {
    if (!loaded) return;
    if (historySaveTimeout.current) clearTimeout(historySaveTimeout.current);
    historySaveTimeout.current = setTimeout(() => {
      storage.saveHistory(slateId, {
        entries,
        currentId,
        redoMap: getRedoMap(),
      });
    }, 1000);
    return () => {
      if (historySaveTimeout.current) clearTimeout(historySaveTimeout.current);
    };
  }, [historyVersion, loaded, slateId]);

  // Persist edit mode
  useEffect(() => {
    if (!isEditModeLoaded.current) return;
    AsyncStorage.setItem("settings_editMode", String(isEditMode));
  }, [isEditMode]);

  // Re-initialize runtime store when slate variables change
  useEffect(() => {
    if (!loaded) return;
    const screen = slate.screens[currentScreenId];
    const appVars = slate.variables ?? [];
    const screenVars = screen?.variables ?? [];
    initFromSlate(appVars, screenVars, {});
  }, [slate.variables, currentScreenId, slate.screens[currentScreenId]?.variables]);

  // Debounced persist of runtime variables
  useEffect(() => {
    if (!loaded) return;
    if (persistTimeout.current) clearTimeout(persistTimeout.current);
    persistTimeout.current = setTimeout(() => {
      const screen = slate.screens[currentScreenIdRef.current];
      const persistedNames = collectPersistedVarNames(
        slate.variables ?? [],
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
        `runtime_persisted_variables_${slateId}`,
        JSON.stringify(toSave)
      );
    }, 1000);
    return () => {
      if (persistTimeout.current) clearTimeout(persistTimeout.current);
    };
  }, [runtimeVariables, loaded, slateId]);

  const handleCloseSlate = useCallback(async () => {
    // Flush pending saves
    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current);
      saveTimeout.current = null;
      await storage.saveSlate(slateId, slateRef.current);
    }
    if (historySaveTimeout.current) {
      clearTimeout(historySaveTimeout.current);
      historySaveTimeout.current = null;
    }
    await storage.saveHistory(slateId, {
      entries,
      currentId,
      redoMap: getRedoMap(),
    });
    onCloseSlate();
  }, [slateId, onCloseSlate, entries, currentId, getRedoMap]);

  const updateScreenComponents = useCallback(
    (fn: (components: Component[]) => Component[], description = "Updated components") => {
      setSlate((prev) => {
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
    [setSlate]
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
      setSlate((prev) => {
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
    [setSlate]
  );

  const handleResetAndBuild = useCallback(() => {
    setSlate((prev) => {
      const sid = currentScreenIdRef.current;
      return {
        ...prev,
        screens: {
          ...prev.screens,
          [sid]: { ...prev.screens[sid], components: [makeBackgroundShape()] },
        },
      };
    }, "Reset canvas");
    setIsEditMode(true);
  }, [setSlate]);

  // --- Screen navigation (preview mode) ---
  const handleNavigate = useCallback((targetScreenId: string) => {
    setNavStack((prev) => [...prev, currentScreenIdRef.current]);
    setCurrentScreenId(targetScreenId);
    const bp = slateRef.current;
    const targetScreen = bp.screens[targetScreenId];
    navigateToScreen(bp.variables ?? [], targetScreen?.variables ?? []);
  }, [navigateToScreen]);

  const handleNavigateBack = useCallback(() => {
    setNavStack((prev) => {
      if (prev.length === 0) return prev;
      const next = [...prev];
      const previousId = next.pop()!;
      setCurrentScreenId(previousId);
      const bp = slateRef.current;
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
      name: `Screen ${Object.keys(slateRef.current.screens).length + 1}`,
      components: [makeBackgroundShape()],
    };
    setSlate((prev) => ({
      ...prev,
      screens: { ...prev.screens, [newId]: newScreen },
    }), "Added screen");
    setCurrentScreenId(newId);
    setNavStack([]);
  }, [setSlate]);

  const handleDeleteScreen = useCallback((screenId: string) => {
    setSlate((prev) => {
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
      const bp = slateRef.current;
      const ids = Object.keys(bp.screens).filter((id) => id !== screenId);
      setCurrentScreenId(ids[0] ?? bp.initial_screen_id);
    }
    setNavStack([]);
  }, [setSlate]);

  const handleRenameScreen = useCallback((screenId: string, name: string) => {
    setSlate((prev) => {
      const screen = prev.screens[screenId];
      if (!screen) return prev;
      return {
        ...prev,
        screens: { ...prev.screens, [screenId]: { ...screen, name } },
      };
    }, "Renamed screen");
  }, [setSlate]);

  const handleSetInitialScreen = useCallback((screenId: string) => {
    setSlate((prev) => ({ ...prev, initial_screen_id: screenId }), "Set initial screen");
  }, [setSlate]);

  const handleApiKeyChange = useCallback((key: string) => {
    setApiKey(key);
    AsyncStorage.setItem("settings_anthropic_api_key", key);
  }, []);

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" />
      <Canvas
        slate={slate}
        screenId={currentScreenId}
        isEditMode={isEditMode}
        onToggleEditMode={() => setIsEditMode((v) => !v)}
        onComponentUpdate={handleComponentUpdate}
        onContentChange={handleContentChange}
        onStyleChange={handleStyleChange}
        onAddComponent={handleAddComponent}
        onCloseSlate={handleCloseSlate}
        onDeleteSlate={onDeleteSlate}
        slateName={slateName}
        onRenameSlate={onRenameSlate}
        onResetAndBuild={handleResetAndBuild}
        onNavigate={handleNavigate}
        onNavigateBack={handleNavigateBack}
        navStack={navStack}
        onScreenUpdate={handleScreenUpdate}
        onDeleteComponent={handleDeleteComponent}
        onComponentReplace={handleComponentReplace}
        onAddChildComponent={handleAddChildComponent}
        onSlateChange={(updater) => {
          setSlate(
            typeof updater === "function" ? updater : () => updater,
            "Updated slate"
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
        createBranch={createBranch}
        addBranchEntry={addBranchEntry}
        startBatch={startBatch}
        endBatch={endBatch}
        initialScreenId={slate.initial_screen_id}
        screenActions={{
          onSwitchScreen: handleSwitchScreen,
          onAddScreen: handleAddScreen,
          onDeleteScreen: handleDeleteScreen,
          onRenameScreen: handleRenameScreen,
          onSetInitialScreen: handleSetInitialScreen,
        }}
        apiKey={apiKey}
        onApiKeyChange={handleApiKeyChange}
        slateId={slateId}
        storage={storage}
      />
    </GestureHandlerRootView>
  );
}
