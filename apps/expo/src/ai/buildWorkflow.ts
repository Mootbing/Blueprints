import { z } from "zod";
import type { AppSlate, Theme, Action, Variable, Component } from "../types";
import { ActionSchema, VariableSchema } from "../types";
import { callClaude } from "./anthropicClient";
import { workflowSystemPrompt } from "./prompts";
import { extractJson } from "./parseResponse";
import type { AnthropicMessage } from "./types";

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

export const WorkflowResultSchema = z.object({
  variables: z.array(WorkflowVariableSchema).optional(),
  componentUpdates: z.array(ComponentUpdateSchema).optional(),
  description: z.string(),
  pseudocode: z.array(z.string()),
});

export type WorkflowResult = z.infer<typeof WorkflowResultSchema>;
export type WorkflowVariable = z.infer<typeof WorkflowVariableSchema>;

/**
 * Chat with Claude to build a workflow.
 * Returns the raw text response.
 */
export async function buildWorkflowChat(
  apiKey: string,
  slate: AppSlate,
  screenId: string,
  messages: AnthropicMessage[],
  theme?: Theme,
): Promise<string> {
  const system = workflowSystemPrompt(slate, screenId, theme);
  const result = await callClaude(apiKey, system, messages, 8192);
  return result.text;
}

/**
 * Parse a workflow result from Claude's response.
 */
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

/**
 * Apply a workflow result to a slate, returning the updated slate.
 */
export function applyWorkflow(
  slate: AppSlate,
  screenId: string,
  result: WorkflowResult,
): AppSlate {
  let updated = { ...slate };

  // Add variables
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
        // Don't duplicate by name
        if (!existing.some((e) => e.name === v.name)) {
          updated = { ...updated, variables: [...existing, variable] };
        }
      } else {
        const screen = updated.screens[screenId];
        if (screen) {
          const existing = screen.variables ?? [];
          if (!existing.some((e) => e.name === v.name)) {
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

  // Apply component updates
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
        // Empty object clears all actions
        result.actions = undefined;
      } else {
        // Merge actions: keep existing events, override specified ones
        result.actions = { ...(comp.actions ?? {}), ...update.actions };
      }
    }
    if (update.bindings) {
      if (Object.keys(update.bindings).length === 0) {
        // Empty object clears all bindings
        result.bindings = undefined;
      } else {
        result.bindings = { ...(comp.bindings ?? {}), ...update.bindings };
      }
    }
    if (update.visibleWhen !== undefined) {
      // Empty string clears visibility condition
      result.visibleWhen = update.visibleWhen || undefined;
    }
    return result as Component;
  }

  // Recurse into container children
  if (comp.type === "container" && comp.children) {
    const updatedChildren = comp.children.map((child) =>
      applyUpdateToComponent(child, update),
    );
    if (updatedChildren !== comp.children) {
      return { ...comp, children: updatedChildren };
    }
  }

  return comp;
}

/**
 * Check if a response text contains a valid workflow result.
 */
export function containsWorkflowJson(text: string): boolean {
  try {
    parseWorkflowResult(text);
    return true;
  } catch {
    return false;
  }
}
