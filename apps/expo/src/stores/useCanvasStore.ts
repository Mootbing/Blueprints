import { createStore } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Component } from "../types";
import type { TextEditingState, StyleEditingState } from "../components/EditorToolbar";

export interface CanvasState {
  // Canvas dimensions
  canvasDimensions: { width: number; height: number };

  // Menu
  menuOpen: boolean;

  // Editing
  editingInfo:
    | { mode: "text"; componentId: string; state: TextEditingState }
    | { mode: "style"; componentId: string; state: StyleEditingState; initialState: StyleEditingState }
    | null;
  selectedComponentId: string | null;
  autoEditId: string | null;

  // Drag
  draggingId: string | null;
  dragOverTrash: boolean;
  dropTargetId: string | null;

  // Drill-in
  drillPath: string[];
  selectedChildId: string | null;

  // Locked components
  lockedIds: Set<string>;

  // Settings (persisted)
  snappingEnabled: boolean;
  inspectorEnabled: boolean;
  showAdvancedCode: boolean;

  // Inspector
  inspectorOpen: boolean;
  inspectorJson: string;
  inspectorError: string | null;

  // Context menu
  contextMenu: { componentId: string | null; x: number; y: number } | null;

  // AI state
  aiChatTarget: Component | null;
  isTidying: boolean;
  pendingAIChange: { componentId: string; original: Component } | null;

  // Agent pager
  agentPagerOpen: boolean;
  agentPagerSessionId: string | null;
  agentPagerInitialMessage: string | null;

  // Version history
  versionHistoryOpen: boolean;

  // Active guides for snapping
  activeGuides: number[];
}

export interface CanvasActions {
  // Dimensions
  setCanvasDimensions: (dims: { width: number; height: number }) => void;

  // Menu
  setMenuOpen: (open: boolean) => void;

  // Editing
  setEditingInfo: (info: CanvasState["editingInfo"] | ((prev: CanvasState["editingInfo"]) => CanvasState["editingInfo"])) => void;
  setSelectedComponentId: (id: string | null) => void;
  setAutoEditId: (id: string | null) => void;

  // Drag
  setDraggingId: (id: string | null) => void;
  setDragOverTrash: (over: boolean) => void;
  setDropTargetId: (id: string | null) => void;

  // Drill-in
  drillInto: (containerId: string) => void;
  drillOut: () => void;
  drillToLevel: (level: number) => void;
  setSelectedChildId: (id: string | null) => void;

  // Locked
  toggleLock: (id: string) => void;

  // Settings
  setSnappingEnabled: (enabled: boolean) => void;
  setInspectorEnabled: (enabled: boolean) => void;
  setShowAdvancedCode: (enabled: boolean) => void;

  // Inspector
  setInspectorOpen: (open: boolean) => void;
  setInspectorJson: (json: string) => void;
  setInspectorError: (error: string | null) => void;

  // Context menu
  setContextMenu: (menu: CanvasState["contextMenu"]) => void;

  // AI
  setAiChatTarget: (target: Component | null) => void;
  setIsTidying: (tidying: boolean) => void;
  setPendingAIChange: (change: CanvasState["pendingAIChange"]) => void;

  // Agent pager
  setAgentPagerOpen: (open: boolean) => void;
  setAgentPagerSessionId: (id: string | null) => void;
  setAgentPagerInitialMessage: (msg: string | null) => void;

  // Version history
  setVersionHistoryOpen: (open: boolean) => void;

  // Guides
  setActiveGuides: (guides: number[]) => void;
  clearGuides: () => void;

  // Compound reset for drill selection
  resetDrillSelection: () => void;
}

export type CanvasStore = CanvasState & CanvasActions;

const BACKGROUND_ID = "background";

export const createCanvasStore = (initialLockedIds?: Set<string>) =>
  createStore<CanvasStore>((set, get) => ({
    // --- State ---
    canvasDimensions: { width: 0, height: 0 },
    menuOpen: false,
    editingInfo: null,
    selectedComponentId: null,
    autoEditId: null,
    draggingId: null,
    dragOverTrash: false,
    dropTargetId: null,
    drillPath: [],
    selectedChildId: null,
    lockedIds: initialLockedIds ?? new Set([BACKGROUND_ID]),
    snappingEnabled: true,
    inspectorEnabled: false,
    showAdvancedCode: false,
    inspectorOpen: false,
    inspectorJson: "",
    inspectorError: null,
    contextMenu: null,
    aiChatTarget: null,
    isTidying: false,
    pendingAIChange: null,
    agentPagerOpen: false,
    agentPagerSessionId: null,
    agentPagerInitialMessage: null,
    versionHistoryOpen: false,
    activeGuides: [],

    // --- Actions ---
    setCanvasDimensions: (dims) => set({ canvasDimensions: dims }),
    setMenuOpen: (open) => set({ menuOpen: open }),

    setEditingInfo: (info) =>
      set((s) => ({
        editingInfo: typeof info === "function" ? info(s.editingInfo) : info,
      })),

    setSelectedComponentId: (id) => set({ selectedComponentId: id }),
    setAutoEditId: (id) => set({ autoEditId: id }),

    setDraggingId: (id) => set({ draggingId: id }),
    setDragOverTrash: (over) => set({ dragOverTrash: over }),
    setDropTargetId: (id) => set({ dropTargetId: id }),

    drillInto: (containerId) =>
      set((s) => ({
        drillPath: [...s.drillPath, containerId],
        selectedChildId: null,
        selectedComponentId: null,
        editingInfo: null,
      })),

    drillOut: () =>
      set((s) => ({
        drillPath: s.drillPath.slice(0, -1),
        selectedChildId: null,
        selectedComponentId: null,
        editingInfo: null,
      })),

    drillToLevel: (level) =>
      set((s) => ({
        drillPath: s.drillPath.slice(0, level),
        selectedChildId: null,
        selectedComponentId: null,
        editingInfo: null,
      })),

    setSelectedChildId: (id) => set({ selectedChildId: id }),

    toggleLock: (id) =>
      set((s) => {
        const next = new Set(s.lockedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return { lockedIds: next };
      }),

    setSnappingEnabled: (enabled) => {
      set({ snappingEnabled: enabled });
      AsyncStorage.setItem("settings_snapping", String(enabled));
    },

    setInspectorEnabled: (enabled) => {
      set({ inspectorEnabled: enabled });
      AsyncStorage.setItem("settings_inspector", String(enabled));
    },

    setShowAdvancedCode: (enabled) => {
      set({ showAdvancedCode: enabled });
      AsyncStorage.setItem("settings_advancedCode", String(enabled));
    },

    setInspectorOpen: (open) => set({ inspectorOpen: open }),
    setInspectorJson: (json) => set({ inspectorJson: json }),
    setInspectorError: (error) => set({ inspectorError: error }),

    setContextMenu: (menu) => set({ contextMenu: menu }),

    setAiChatTarget: (target) => set({ aiChatTarget: target }),
    setIsTidying: (tidying) => set({ isTidying: tidying }),
    setPendingAIChange: (change) => set({ pendingAIChange: change }),

    setAgentPagerOpen: (open) => set({ agentPagerOpen: open }),
    setAgentPagerSessionId: (id) => set({ agentPagerSessionId: id }),
    setAgentPagerInitialMessage: (msg) => set({ agentPagerInitialMessage: msg }),

    setVersionHistoryOpen: (open) => set({ versionHistoryOpen: open }),

    setActiveGuides: (guides) => set({ activeGuides: guides }),
    clearGuides: () => set({ activeGuides: [] }),

    resetDrillSelection: () =>
      set({ selectedChildId: null, selectedComponentId: null, editingInfo: null }),
  }));

// Load persisted settings into the store
export async function loadPersistedSettings(
  store: ReturnType<typeof createCanvasStore>,
) {
  const [snapping, inspector, advancedCode] = await Promise.all([
    AsyncStorage.getItem("settings_snapping"),
    AsyncStorage.getItem("settings_inspector"),
    AsyncStorage.getItem("settings_advancedCode"),
  ]);
  store.setState({
    ...(snapping !== null ? { snappingEnabled: snapping === "true" } : {}),
    ...(inspector !== null ? { inspectorEnabled: inspector === "true" } : {}),
    ...(advancedCode !== null ? { showAdvancedCode: advancedCode === "true" } : {}),
  });
}
