import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { ComponentSchema } from "./schema.ts";
import type { Component } from "./schema.ts";
import { extractJson, containsComponentJson, parseComponentArray } from "./parse-response.ts";
import { containsWorkflowJson, parseWorkflowResult, applyWorkflow } from "./build-workflow.ts";

interface AppSlate {
  version: number;
  initial_screen_id: string;
  theme?: any;
  screens: Record<string, Screen>;
  variables?: any[];
}

interface Screen {
  id: string;
  name: string;
  components: Component[];
  variables?: any[];
}

// ─── Screen management parsing ──────────────────────────────────

interface ScreenOp {
  op: "create" | "delete" | "rename" | "setComponents" | "setInitial";
  id: string;
  name?: string;
  components?: Component[];
}

interface ScreenMgmtResult {
  screenOps: ScreenOp[];
  description: string;
}

export function containsScreenOps(text: string): boolean {
  try {
    const json = extractJson(text);
    if (!json) return false;
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) && Array.isArray(parsed.screenOps);
  } catch {
    return false;
  }
}

function parseScreenOps(text: string): ScreenMgmtResult {
  const json = extractJson(text);
  if (!json) throw new Error("No JSON found");
  const parsed = JSON.parse(json);
  const ops: ScreenOp[] = [];
  for (const op of parsed.screenOps) {
    if (op.components) {
      op.components = z.array(ComponentSchema).parse(op.components);
    }
    ops.push(op);
  }
  return { screenOps: ops, description: parsed.description ?? "Screen management" };
}

function applyScreenOps(slate: AppSlate, result: ScreenMgmtResult): AppSlate {
  let updated = { ...slate, screens: { ...slate.screens } };
  for (const op of result.screenOps) {
    switch (op.op) {
      case "create": {
        const newScreen: Screen = {
          id: op.id,
          name: op.name ?? "New Screen",
          components: op.components ?? [],
        };
        updated.screens[op.id] = newScreen;
        break;
      }
      case "delete": {
        const ids = Object.keys(updated.screens);
        if (ids.length <= 1) break;
        const { [op.id]: _, ...rest } = updated.screens;
        updated.screens = rest;
        if (updated.initial_screen_id === op.id) {
          updated.initial_screen_id = Object.keys(rest)[0];
        }
        break;
      }
      case "rename": {
        const screen = updated.screens[op.id];
        if (screen && op.name) {
          updated.screens[op.id] = { ...screen, name: op.name };
        }
        break;
      }
      case "setComponents": {
        const screen = updated.screens[op.id];
        if (screen && op.components) {
          updated.screens[op.id] = { ...screen, components: op.components };
        }
        break;
      }
      case "setInitial": {
        if (updated.screens[op.id]) {
          updated.initial_screen_id = op.id;
        }
        break;
      }
    }
  }
  return updated;
}

// ─── Actionable detection & branch building ─────────────────────

export function hasActionableJson(text: string): boolean {
  return containsScreenOps(text) || containsComponentJson(text) || containsWorkflowJson(text);
}

export function buildBranchSlate(
  slate: AppSlate,
  screenId: string,
  responseText: string,
): { slate: AppSlate; description: string } | null {
  try {
    if (containsScreenOps(responseText)) {
      const result = parseScreenOps(responseText);
      return {
        slate: applyScreenOps(slate, result),
        description: result.description,
      };
    }
    if (containsWorkflowJson(responseText)) {
      const result = parseWorkflowResult(responseText);
      return {
        slate: applyWorkflow(slate, screenId, result),
        description: result.description,
      };
    }
    if (containsComponentJson(responseText)) {
      const components = parseComponentArray(responseText);
      const screen = slate.screens[screenId];
      if (!screen) return null;
      return {
        slate: {
          ...slate,
          screens: {
            ...slate.screens,
            [screenId]: { ...screen, components },
          },
        },
        description: "AI generated components",
      };
    }
  } catch {}
  return null;
}
