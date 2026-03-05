import { create } from "zustand";
import type { Variable } from "../types";

export interface RuntimeStore {
  variables: Record<string, unknown>;
  setVariable: (key: string, value: unknown) => void;
  toggleVariable: (key: string) => void;
  resetVariables: (defaults: Record<string, unknown>) => void;
  initFromBlueprint: (
    appVars: Variable[],
    screenVars: Variable[],
    persisted: Record<string, unknown>
  ) => void;
}

export const useRuntimeStore = create<RuntimeStore>((set) => ({
  variables: {},

  setVariable: (key, value) =>
    set((state) => ({
      variables: { ...state.variables, [key]: value },
    })),

  toggleVariable: (key) =>
    set((state) => ({
      variables: { ...state.variables, [key]: !state.variables[key] },
    })),

  resetVariables: (defaults) =>
    set({ variables: { ...defaults } }),

  initFromBlueprint: (appVars, screenVars, persisted) => {
    const defaults: Record<string, unknown> = {};
    for (const v of appVars) {
      defaults[v.name] = v.defaultValue;
    }
    for (const v of screenVars) {
      defaults[v.name] = v.defaultValue;
    }
    // Persisted values override defaults
    for (const [key, value] of Object.entries(persisted)) {
      if (key in defaults) {
        defaults[key] = value;
      }
    }
    set({ variables: defaults });
  },
}));
