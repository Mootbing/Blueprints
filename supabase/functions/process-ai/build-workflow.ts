import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { ActionSchema } from "./schema.ts";
import { extractJson } from "./parse-response.ts";
import type { Component } from "./schema.ts";

interface AppSlate {
  version: number;
  initial_screen_id: string;
  theme?: any;
  screens: Record<string, { id: string; name: string; components: Component[]; variables?: any[] }>;
  variables?: any[];
}

type Variable = { id: string; name: string; type: string; defaultValue: unknown; persist?: boolean };

const WorkflowVariableSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  type: z.enum(["string", "number", "boolean", "array", "object"]),
  defaultValue: z.unknown(),
  scope: z.enum(["app", "screen"]),
  persist: z.boolean().optional(),
});

const ComponentUpdateSchema = z.object({
  componentId: z.string().uuid(),
  actions: z.record(z.string(), z.array(ActionSchema)).optional(),
  bindings: z.record(z.string(), z.string()).optional(),
  visibleWhen: z.string().optional(),
});

const WorkflowBlockSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  icon: z.string().optional(),
});

const WorkflowMetaSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  blocks: z.array(WorkflowBlockSchema),
});

export const WorkflowResultSchema = z.object({
  variables: z.array(WorkflowVariableSchema).optional(),
  componentUpdates: z.array(ComponentUpdateSchema).optional(),
  workflow: WorkflowMetaSchema.optional(),
  description: z.string(),
  pseudocode: z.array(z.string()),
});

export type WorkflowResult = z.infer<typeof WorkflowResultSchema>;

export function parseWorkflowResult(text: string): WorkflowResult {
  const json = extractJson(text);
  if (!json) throw new Error("No workflow JSON found in response");

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("Invalid JSON in workflow response");
  }

  return WorkflowResultSchema.parse(parsed);
}

export function applyWorkflow(
  slate: AppSlate,
  screenId: string,
  result: WorkflowResult,
): AppSlate {
  let updated = { ...slate };

  if (result.variables && result.variables.length > 0) {
    for (const v of result.variables) {
      const variable: Variable = {
        id: v.id,
        name: v.name,
        type: v.type,
        defaultValue: v.defaultValue,
        persist: v.persist,
      };

      if (v.scope === "app") {
        const existing = updated.variables ?? [];
        if (!existing.some((e: Variable) => e.name === v.name)) {
          updated = { ...updated, variables: [...existing, variable] };
        }
      } else {
        const screen = updated.screens[screenId];
        if (screen) {
          const existing = screen.variables ?? [];
          if (!existing.some((e: Variable) => e.name === v.name)) {
            updated = {
              ...updated,
              screens: {
                ...updated.screens,
                [screenId]: { ...screen, variables: [...existing, variable] },
              },
            };
          }
        }
      }
    }
  }

  // Save workflow metadata
  if (result.workflow) {
    const screen = updated.screens[screenId];
    if (screen) {
      const existing = (screen as any).workflows ?? [];
      const idx = existing.findIndex((w: any) => w.id === result.workflow!.id);
      const newWorkflows = idx >= 0
        ? existing.map((w: any, i: number) => i === idx ? result.workflow! : w)
        : [...existing, result.workflow];
      updated = {
        ...updated,
        screens: {
          ...updated.screens,
          [screenId]: { ...updated.screens[screenId], workflows: newWorkflows },
        },
      };
    }
  }

  if (result.componentUpdates && result.componentUpdates.length > 0) {
    const screen = updated.screens[screenId];
    if (screen) {
      let components = [...screen.components];

      for (const update of result.componentUpdates) {
        components = components.map((comp) =>
          applyUpdateToComponent(comp, update),
        );
      }

      updated = {
        ...updated,
        screens: {
          ...updated.screens,
          [screenId]: { ...screen, components },
        },
      };
    }
  }

  return updated;
}

function applyUpdateToComponent(
  comp: Component,
  update: z.infer<typeof ComponentUpdateSchema>,
): Component {
  if (comp.id === update.componentId) {
    const result = { ...comp } as any;
    if (update.actions) {
      if (Object.keys(update.actions).length === 0) {
        result.actions = undefined;
      } else {
        result.actions = { ...(comp.actions ?? {}), ...update.actions };
      }
    }
    if (update.bindings) {
      if (Object.keys(update.bindings).length === 0) {
        result.bindings = undefined;
      } else {
        result.bindings = { ...(comp.bindings ?? {}), ...update.bindings };
      }
    }
    if (update.visibleWhen !== undefined) {
      result.visibleWhen = update.visibleWhen || undefined;
    }
    return result as Component;
  }

  const kids = (comp.type === "container" || comp.type === "accordion" || comp.type === "bottomSheet") ? (comp as any).children as Component[] | undefined : undefined;
  if (kids) {
    const updatedChildren = kids.map((child) =>
      applyUpdateToComponent(child, update),
    );
    if (updatedChildren !== kids) {
      return { ...comp, children: updatedChildren } as Component;
    }
  }

  return comp;
}

export function containsWorkflowJson(text: string): boolean {
  try {
    parseWorkflowResult(text);
    return true;
  } catch {
    return false;
  }
}
