import type { Theme } from "../types";
import { generateSystemPrompt } from "./prompts";
import { submitJob, getJobResult } from "./aiJobClient";
import type { AnthropicMessage } from "./types";

/**
 * Generates a screen of components from a chat conversation via edge function.
 * Returns the raw text response (which may contain explanation + JSON).
 */
export async function generateScreenChat(
  slateId: string,
  messages: AnthropicMessage[],
  theme?: Theme,
): Promise<string> {
  const system = generateSystemPrompt(theme);

  const jobId = await submitJob({
    slateId,
    jobType: "generate_screen",
    request: { system, messages },
  });

  // Poll for result
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const result = await getJobResult(jobId);
    if (result?.status === "completed" && result.response?.text) {
      return result.response.text;
    }
    if (result?.status === "failed") {
      throw new Error(result.error_message ?? "Screen generation failed");
    }
  }

  throw new Error("Screen generation timed out");
}

/**
 * Parse component array from a response text. Throws if invalid.
 */
export { parseComponentArray } from "./parseResponse";
