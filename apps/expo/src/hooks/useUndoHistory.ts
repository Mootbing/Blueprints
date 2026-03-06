import { useState, useRef, useCallback } from "react";
import type { AppBlueprint } from "../types";

export const ROOT_ID = "__root__";

export interface HistoryEntry {
  id: string;
  blueprint: AppBlueprint;
  timestamp: number;
  description: string;
  parentId: string;
}

let _idCounter = 0;
function historyId(): string {
  return `h_${Date.now()}_${++_idCounter}`;
}

export function useUndoHistory(initialBlueprint: AppBlueprint) {
  const [blueprint, setBlueprintState] = useState(initialBlueprint);
  const [historyVersion, setHistoryVersion] = useState(0);

  // All entries stored flat — tree structure is implicit via parentId
  const entriesRef = useRef<HistoryEntry[]>([
    {
      id: ROOT_ID,
      blueprint: initialBlueprint,
      timestamp: Date.now(),
      description: "Initial state",
      parentId: "",
    },
  ]);

  // Current HEAD pointer
  const currentIdRef = useRef(ROOT_ID);

  // Redo map: parentId -> last-visited childId (like git reflog)
  const redoMapRef = useRef<Map<string, string>>(new Map());

  const isUndoRedoRef = useRef(false);
  const batchRef = useRef<{ description: string; snapshot: AppBlueprint } | null>(null);
  const blueprintRef = useRef(blueprint);
  blueprintRef.current = blueprint;

  const bump = useCallback(() => setHistoryVersion((v) => v + 1), []);

  const findEntry = useCallback((id: string): HistoryEntry | undefined => {
    return entriesRef.current.find((e) => e.id === id);
  }, []);

  const setBlueprint = useCallback(
    (
      updater: AppBlueprint | ((prev: AppBlueprint) => AppBlueprint),
      description = "Updated blueprint"
    ) => {
      const shouldRecord = !isUndoRedoRef.current && !batchRef.current;
      const newId = shouldRecord ? historyId() : "";

      setBlueprintState((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        if (shouldRecord && !entriesRef.current.some((e) => e.id === newId)) {
          entriesRef.current = [
            ...entriesRef.current,
            {
              id: newId,
              blueprint: next,
              timestamp: Date.now(),
              description,
              parentId: currentIdRef.current,
            },
          ];
          currentIdRef.current = newId;
        }
        blueprintRef.current = next;
        return next;
      });
      if (shouldRecord) bump();
    },
    [bump]
  );

  const setBlueprintRaw = useCallback(
    (updater: AppBlueprint | ((prev: AppBlueprint) => AppBlueprint)) => {
      setBlueprintState((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        blueprintRef.current = next;
        // Update root entry to reflect loaded blueprint
        entriesRef.current = entriesRef.current.map((e) =>
          e.id === ROOT_ID ? { ...e, blueprint: next } : e
        );
        return next;
      });
    },
    []
  );

  const undo = useCallback(() => {
    const current = findEntry(currentIdRef.current);
    if (!current || current.id === ROOT_ID) return;

    const parent = findEntry(current.parentId);
    if (!parent) return;

    // Record redo path so we can go forward again
    redoMapRef.current.set(parent.id, current.id);

    currentIdRef.current = parent.id;
    isUndoRedoRef.current = true;
    setBlueprintState(parent.blueprint);
    blueprintRef.current = parent.blueprint;
    isUndoRedoRef.current = false;
    bump();
  }, [findEntry, bump]);

  const redo = useCallback(() => {
    const childId = redoMapRef.current.get(currentIdRef.current);
    if (!childId) return;

    const child = findEntry(childId);
    if (!child) return;

    currentIdRef.current = child.id;
    isUndoRedoRef.current = true;
    setBlueprintState(child.blueprint);
    blueprintRef.current = child.blueprint;
    isUndoRedoRef.current = false;
    bump();
  }, [findEntry, bump]);

  const canUndo = currentIdRef.current !== ROOT_ID;
  const canRedo = redoMapRef.current.has(currentIdRef.current);

  const entries = entriesRef.current;
  const currentId = currentIdRef.current;

  const restoreToId = useCallback(
    (id: string) => {
      const entry = findEntry(id);
      if (!entry) return;

      // Set up redo path from root to old HEAD so we can get back
      const pathToCurrent: string[] = [];
      let c: string | undefined = currentIdRef.current;
      while (c) {
        pathToCurrent.unshift(c);
        const e = findEntry(c);
        if (!e || e.id === ROOT_ID) break;
        c = e.parentId;
      }
      for (let i = 0; i < pathToCurrent.length - 1; i++) {
        redoMapRef.current.set(pathToCurrent[i], pathToCurrent[i + 1]);
      }

      currentIdRef.current = id;
      isUndoRedoRef.current = true;
      setBlueprintState(entry.blueprint);
      blueprintRef.current = entry.blueprint;
      isUndoRedoRef.current = false;
      bump();
    },
    [findEntry, bump]
  );

  const startBatch = useCallback((description: string) => {
    batchRef.current = { description, snapshot: blueprintRef.current };
  }, []);

  const endBatch = useCallback(() => {
    if (!batchRef.current) return;
    const { description, snapshot } = batchRef.current;
    batchRef.current = null;
    // Only record if blueprint actually changed
    if (snapshot !== blueprintRef.current) {
      const newId = historyId();
      entriesRef.current = [
        ...entriesRef.current,
        {
          id: newId,
          blueprint: blueprintRef.current,
          timestamp: Date.now(),
          description,
          parentId: currentIdRef.current,
        },
      ];
      currentIdRef.current = newId;
      bump();
    }
  }, [bump]);

  return {
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
    historyVersion,
  };
}
