import type { Component, Theme } from "../types";
import { modifyComponentSystemPrompt } from "./prompts";
import { submitJob, getJobResult } from "./aiJobClient";
import type { AnthropicMessage, AnthropicContentBlock } from "./types";

/**
 * Modifies a single component via chat conversation with Claude (via edge function).
 * Returns the raw text response.
 */
export async function modifyComponentChat(
  slateId: string,
  component: Component,
  messages: AnthropicMessage[],
  theme?: Theme,
): Promise<string> {
  const system = modifyComponentSystemPrompt(theme);

  // Prepend component context to the first user message
  const contextPrefix = `Here is the current component JSON:\n\n<json>${JSON.stringify(component, null, 2)}</json>\n\n`;
  const augmentedMessages = messages.map((m, i) => {
    if (i !== 0) return m;
    if (typeof m.content === "string") {
      return { ...m, content: contextPrefix + m.content };
    }
    const blocks = m.content as AnthropicContentBlock[];
    const textIdx = blocks.findIndex((b) => b.type === "text");
    if (textIdx >= 0) {
      const updated = [...blocks];
      const tb = updated[textIdx] as { type: "text"; text: string };
      updated[textIdx] = { type: "text", text: contextPrefix + tb.text };
      return { ...m, content: updated };
    }
    return { ...m, content: [{ type: "text" as const, text: contextPrefix }, ...blocks] };
  });

  const jobId = await submitJob({
    slateId,
    jobType: "modify_component",
    request: { system, messages: augmentedMessages },
  });

  // Poll for result
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const result = await getJobResult(jobId);
    if (result?.status === "completed" && result.response?.text) {
      return result.response.text;
    }
    if (result?.status === "failed") {
      throw new Error(result.error_message ?? "Component modification failed");
    }
  }

  throw new Error("Component modification timed out");
}

/**
 * Parse single component from a response text. Throws if invalid.
 */
export { parseSingleComponent } from "./parseResponse";
