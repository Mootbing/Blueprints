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
import { getSupabaseClient } from "../storage/supabaseClient";

const SCREEN_ID = "00000000-0000-0000-0000-000000000001";

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

export const defaultSlate: AppSlate = {
  version: 1,
  initial_screen_id: SCREEN_ID,
  variables: [
    { id: "00000000-0000-0000-0000-0000000000a1", name: "prompt", type: "string", defaultValue: "" },
  ],
  theme: {
    primaryColor: "#8B5CF6",
    colors: {
      primary: "#8B5CF6",
      secondary: "#6366F1",
      error: "#EF4444",
      success: "#22C55E",
      warning: "#F97316",
    },
  },
  screens: {
    [SCREEN_ID]: {
      id: SCREEN_ID,
      name: "Home",
      components: [
        makeBackgroundShape(),

        // Welcome title
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000000011",
          layout: { x: 0.06, y: 0.08, width: 0.88, height: 0.05 },
          content: "Welcome to Slate",
          fontSize: 36,
          color: "#ffffff",
          fontWeight: "200",
          textAlign: "left",
        },

        // Subtitle
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000000012",
          layout: { x: 0.06, y: 0.15, width: 0.88, height: 0.05 },
          content: "Build beautiful app interfaces visually.\nDescribe your idea and let AI bring it to life.",
          fontSize: 15,
          color: "#666",
          fontWeight: "normal",
          textAlign: "left",
        },

        // Hero image
        {
          type: "image",
          id: "00000000-0000-0000-0000-000000000030",
          layout: { x: 0.06, y: 0.25, width: 0.88, height: 0.3 },
          src: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80",
          resizeMode: "cover",
          borderRadius: 16,
        },

        // Prompt input
        {
          type: "textInput",
          id: "00000000-0000-0000-0000-000000001002",
          layout: { x: 0.06, y: 0.59, width: 0.88, height: 0.12 },
          placeholder: "Describe an app idea...",
          fontSize: 15,
          color: "#ffffff",
          placeholderColor: "#444",
          backgroundColor: "#0a0a0a",
          borderColor: "#1a1a1a",
          borderWidth: 1,
          borderRadius: 14,
          boundVariable: "prompt",
        },

        // Build with AI button
        {
          type: "button",
          id: "00000000-0000-0000-0000-000000001003",
          layout: { x: 0.06, y: 0.74, width: 0.88, height: 0.065 },
          label: "Build with AI",
          backgroundColor: "#ffffff",
          textColor: "#000000",
          fontSize: 16,
          fontWeight: "600",
          textAlign: "center",
          borderRadius: 14,
          actions: { onTap: [{ type: "OPEN_AGENT", promptVariable: "prompt" }] },
        },

        // Or start blank
        {
          type: "button",
          id: "00000000-0000-0000-0000-000000001004",
          layout: { x: 0.06, y: 0.82, width: 0.88, height: 0.05 },
          label: "Start with a blank canvas",
          backgroundColor: "transparent",
          textColor: "#444",
          fontSize: 13,
          fontWeight: "normal",
          textAlign: "center",
          borderRadius: 0,
          borderWidth: 0,
          actions: { onTap: [{ type: "RESET_CANVAS" }] },
        },

        // Footer
        {
          type: "text",
          id: "00000000-0000-0000-0000-000000000015",
          layout: { x: 0.06, y: 0.90, width: 0.88, height: 0.03 },
          content: "v1.0  \u2022  Made with Slate",
          fontSize: 11,
          color: "#222",
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
  shareRole?: 'viewer' | 'editor';
  isNew?: boolean;
}

export function SlateEditor({
  slateId,
  slateName,
  onCloseSlate,
  onDeleteSlate,
  onRenameSlate,
  storage,
  shareRole,
  isNew,
}: SlateEditorProps) {
  const userIdRef = useRef<string | null>(null);

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
  } = useUndoHistory(defaultSlate, userIdRef.current ?? undefined);
  const isPreviewOnly = shareRole === 'viewer';
  const [isEditMode, setIsEditMode] = useState(false);
  const [loaded, setLoaded] = useState(false);
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
        // Fetch user ID for history author tracking
        try {
          const { data: { user } } = await getSupabaseClient().auth.getUser();
          if (user?.id) userIdRef.current = user.id;
        } catch {}

        const [bp, editMode, persistedJson, savedHistory] = await Promise.all([
          storage.loadSlate(slateId),
          AsyncStorage.getItem("settings_editMode"),
          AsyncStorage.getItem(`runtime_persisted_variables_${slateId}`),
          storage.loadHistory(slateId),
        ]);

        const loadedBp = bp ?? defaultSlate;

        // Restore history if available, otherwise just set the raw slate
        let activeSlate: AppSlate;
        if (savedHistory && savedHistory.entries.length > 0) {
          loadHistory(savedHistory.entries, savedHistory.currentId, savedHistory.redoMap);
          // Derive screen ID from the active history entry's slate (not loadedBp),
          // because the server may have modified the slate since history was saved.
          const currentEntry = savedHistory.entries.find((e: any) => e.id === savedHistory.currentId);
          activeSlate = currentEntry?.slate ?? loadedBp;
        } else {
          setSlateRaw(loadedBp);
          activeSlate = loadedBp;
        }
        setCurrentScreenId(activeSlate.initial_screen_id);

        if (!isNew && editMode !== null) setIsEditMode(editMode === "true");
        isEditModeLoaded.current = true;

        // Init runtime store from the active slate (which may differ from loadedBp if history was restored)
        const screenId = activeSlate.initial_screen_id;
        const screen = activeSlate.screens[screenId];
        const appVars = activeSlate.variables ?? [];
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
    const screenName = `Screen ${Object.keys(slateRef.current.screens).length + 1}`;
    const newScreen: Screen = {
      id: newId,
      name: screenName,
      components: [makeBackgroundShape()],
    };
    setSlate((prev) => ({
      ...prev,
      screens: { ...prev.screens, [newId]: newScreen },
    }), `Added page '${screenName}'`);
    setCurrentScreenId(newId);
    setNavStack([]);
  }, [setSlate]);

  const handleDeleteScreen = useCallback((screenId: string) => {
    const screenName = slateRef.current.screens[screenId]?.name ?? "Unknown";
    setSlate((prev) => {
      const ids = Object.keys(prev.screens);
      if (ids.length <= 1) return prev;
      const { [screenId]: _, ...rest } = prev.screens;
      const remainingIds = Object.keys(rest);
      const newInitial = prev.initial_screen_id === screenId
        ? remainingIds[0]
        : prev.initial_screen_id;
      return { ...prev, screens: rest, initial_screen_id: newInitial };
    }, `Deleted page '${screenName}'`);
    if (currentScreenIdRef.current === screenId) {
      const bp = slateRef.current;
      const ids = Object.keys(bp.screens).filter((id) => id !== screenId);
      setCurrentScreenId(ids[0] ?? bp.initial_screen_id);
    }
    setNavStack([]);
  }, [setSlate]);

  const handleRenameScreen = useCallback((screenId: string, name: string) => {
    const oldName = slateRef.current.screens[screenId]?.name ?? "Unknown";
    setSlate((prev) => {
      const screen = prev.screens[screenId];
      if (!screen) return prev;
      return {
        ...prev,
        screens: { ...prev.screens, [screenId]: { ...screen, name } },
      };
    }, `Renamed page '${oldName}' to '${name}'`);
  }, [setSlate]);

  const handleSetInitialScreen = useCallback((screenId: string) => {
    const screenName = slateRef.current.screens[screenId]?.name ?? "Unknown";
    setSlate((prev) => ({ ...prev, initial_screen_id: screenId }), `Set '${screenName}' as home page`);
  }, [setSlate]);


  if (!loaded) return <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#000" }} />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" />
      <Canvas
        slate={slate}
        screenId={currentScreenId}
        isEditMode={isPreviewOnly ? false : isEditMode}
        onToggleEditMode={isPreviewOnly ? () => {} : () => setIsEditMode((v) => !v)}
        isPreviewOnly={isPreviewOnly}
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
        onScreenUpdate={handleScreenUpdate}
        onDeleteComponent={handleDeleteComponent}
        onComponentReplace={handleComponentReplace}
        onAddChildComponent={handleAddChildComponent}
        onSlateChange={(updater, description) => {
          setSlate(
            typeof updater === "function" ? updater : () => updater,
            description || "Updated slate"
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
        slateId={slateId}
        storage={storage}
        currentUserId={userIdRef.current ?? undefined}
        isNew={isNew}
      />
    </GestureHandlerRootView>
  );
}
