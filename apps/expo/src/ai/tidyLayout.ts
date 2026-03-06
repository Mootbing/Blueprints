import type { Component, Theme } from "../types";
import { tidySystemPrompt } from "./prompts";
import { parseComponentArray } from "./parseResponse";
import { submitJob, getJobResult } from "./aiJobClient";

/**
 * Sends components to Claude (via edge function) for layout tidying.
 * Only layout fields (x, y, width, height) are taken from the AI response.
 * All other fields are preserved from the originals.
 */
export async function tidyLayout(
  slateId: string,
  components: Component[],
  theme?: Theme,
): Promise<Component[]> {
  const system = tidySystemPrompt(theme);

  const jobId = await submitJob({
    slateId,
    jobType: "tidy",
    request: { system, components },
  });

  // Poll for result (tidy is relatively fast)
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const result = await getJobResult(jobId);
    if (result?.status === "completed" && result.response?.text) {
      const tidied = parseComponentArray(result.response.text);

      // Safety: only take layout from AI, preserve everything else from originals
      const componentMap = new Map(components.map((c) => [c.id, c]));
      return tidied.map((aiComp) => {
        const original = componentMap.get(aiComp.id);
        if (!original) return aiComp;
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
    if (result?.status === "failed") {
      throw new Error(result.error_message ?? "Tidy layout failed");
    }
  }

  throw new Error("Tidy layout timed out");
}
