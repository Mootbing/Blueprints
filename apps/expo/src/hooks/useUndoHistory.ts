import { useState, useRef, useCallback } from "react";
import type { AppSlate } from "../types";

export const ROOT_ID = "__root__";

export interface HistoryEntry {
  id: string;
  slate: AppSlate;
  timestamp: number;
  description: string;
  parentId: string;
}

let _idCounter = 0;
function historyId(): string {
  return `h_${Date.now()}_${++_idCounter}`;
}

export function useUndoHistory(initialSlate: AppSlate) {
  const [slate, setSlateState] = useState(initialSlate);
  const [historyVersion, setHistoryVersion] = useState(0);

  // All entries stored flat — tree structure is implicit via parentId
  const entriesRef = useRef<HistoryEntry[]>([
    {
      id: ROOT_ID,
      slate: initialSlate,
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
  const batchRef = useRef<{ description: string; snapshot: AppSlate } | null>(null);
  const slateRef = useRef(slate);
  slateRef.current = slate;

  const bump = useCallback(() => setHistoryVersion((v) => v + 1), []);

  const findEntry = useCallback((id: string): HistoryEntry | undefined => {
    return entriesRef.current.find((e) => e.id === id);
  }, []);

  const setSlate = useCallback(
    (
      updater: AppSlate | ((prev: AppSlate) => AppSlate),
      description = "Updated slate"
    ) => {
      const shouldRecord = !isUndoRedoRef.current && !batchRef.current;
      const newId = shouldRecord ? historyId() : "";

      setSlateState((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        if (shouldRecord && !entriesRef.current.some((e) => e.id === newId)) {
          entriesRef.current = [
            ...entriesRef.current,
            {
              id: newId,
              slate: next,
              timestamp: Date.now(),
              description,
              parentId: currentIdRef.current,
            },
          ];
          currentIdRef.current = newId;
        }
        slateRef.current = next;
        return next;
      });
      if (shouldRecord) bump();
    },
    [bump]
  );

  const setSlateRaw = useCallback(
    (updater: AppSlate | ((prev: AppSlate) => AppSlate)) => {
      setSlateState((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        slateRef.current = next;
        // Update root entry to reflect loaded slate
        entriesRef.current = entriesRef.current.map((e) =>
          e.id === ROOT_ID ? { ...e, slate: next } : e
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
    setSlateState(parent.slate);
    slateRef.current = parent.slate;
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
    setSlateState(child.slate);
    slateRef.current = child.slate;
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
      setSlateState(entry.slate);
      slateRef.current = entry.slate;
      isUndoRedoRef.current = false;
      bump();
    },
    [findEntry, bump]
  );

  const startBatch = useCallback((description: string) => {
    batchRef.current = { description, snapshot: slateRef.current };
  }, []);

  const endBatch = useCallback(() => {
    if (!batchRef.current) return;
    const { description, snapshot } = batchRef.current;
    batchRef.current = null;
    // Only record if slate actually changed
    if (snapshot !== slateRef.current) {
      const newId = historyId();
      entriesRef.current = [
        ...entriesRef.current,
        {
          id: newId,
          slate: slateRef.current,
          timestamp: Date.now(),
          description,
          parentId: currentIdRef.current,
        },
      ];
      currentIdRef.current = newId;
      bump();
    }
  }, [bump]);

  const loadHistory = useCallback(
    (loadedEntries: HistoryEntry[], loadedCurrentId: string, loadedRedoMap: [string, string][]) => {
      entriesRef.current = loadedEntries;
      currentIdRef.current = loadedCurrentId;
      redoMapRef.current = new Map(loadedRedoMap);
      // Set slate to match the current entry
      const current = loadedEntries.find((e) => e.id === loadedCurrentId);
      if (current) {
        setSlateState(current.slate);
        slateRef.current = current.slate;
      }
      bump();
    },
    [bump]
  );

  const getRedoMap = useCallback(() => {
    return Array.from(redoMapRef.current.entries()) as [string, string][];
  }, []);

  const createBranch = useCallback(
    (branchSlate: AppSlate, description: string): string => {
      const newId = historyId();
      entriesRef.current = [
        ...entriesRef.current,
        {
          id: newId,
          slate: branchSlate,
          timestamp: Date.now(),
          description,
          parentId: currentIdRef.current,
        },
      ];
      currentIdRef.current = newId;
      isUndoRedoRef.current = true;
      setSlateState(branchSlate);
      slateRef.current = branchSlate;
      isUndoRedoRef.current = false;
      bump();
      return newId;
    },
    [bump]
  );

  const addBranchEntry = useCallback(
    (branchSlate: AppSlate, description: string): string => {
      const newId = historyId();
      entriesRef.current = [
        ...entriesRef.current,
        {
          id: newId,
          slate: branchSlate,
          timestamp: Date.now(),
          description,
          parentId: currentIdRef.current,
        },
      ];
      bump();
      return newId;
    },
    [bump]
  );

  return {
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
    createBranch,
    addBranchEntry,
    startBatch,
    endBatch,
    historyVersion,
    loadHistory,
    getRedoMap,
  };
}
