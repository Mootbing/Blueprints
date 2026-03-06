import type { Component, Theme } from "../types";
import { callClaude } from "./anthropicClient";
import { tidySystemPrompt } from "./prompts";
import { parseComponentArray } from "./parseResponse";

/**
 * Sends components to Claude for layout tidying.
 * Only layout fields (x, y, width, height) are taken from the AI response.
 * All other fields are preserved from the originals.
 */
export async function tidyLayout(
  apiKey: string,
  components: Component[],
  theme?: Theme,
): Promise<Component[]> {
  const system = tidySystemPrompt(theme);
  const userMessage = `Here are the components to tidy:\n\n<json>${JSON.stringify(components, null, 2)}</json>`;

  const { text: response } = await callClaude(apiKey, system, [
    { role: "user", content: userMessage },
  ]);

  const tidied = parseComponentArray(response);

  // Safety: only take layout from AI, preserve everything else from originals
  const componentMap = new Map(components.map((c) => [c.id, c]));
  return tidied.map((aiComp) => {
    const original = componentMap.get(aiComp.id);
    if (!original) return aiComp; // New component from AI (shouldn't happen)
    return {
      ...original,
      layout: {
        x: Math.max(0, Math.min(1, aiComp.layout.x)),
        y: Math.max(0, Math.min(1, aiComp.layout.y)),
        width: Math.max(0, Math.min(1, aiComp.layout.width)),
        height: Math.max(0, Math.min(1, aiComp.layout.height)),
      },
    };
  });
}
