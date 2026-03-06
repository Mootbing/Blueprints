import type { Component, Theme } from "../types";
import { callClaude } from "./anthropicClient";
import { modifyComponentSystemPrompt } from "./prompts";
import { parseSingleComponent } from "./parseResponse";
import type { AnthropicMessage, AnthropicContentBlock } from "./types";

/**
 * Modifies a single component via chat conversation with Claude.
 * Returns the raw text response.
 */
export async function modifyComponentChat(
  apiKey: string,
  component: Component,
  messages: AnthropicMessage[],
  theme?: Theme,
): Promise<string> {
  const system = modifyComponentSystemPrompt(theme);

  // Prepend component context to the first user message
  const contextPrefix = `Here is the current component JSON:\n\n<json>${JSON.stringify(component, null, 2)}</json>\n\n`;
  const augmentedMessages = messages.map((m, i) => {
    if (i !== 0) return m;
    // Handle both string and content-block array formats
    if (typeof m.content === "string") {
      return { ...m, content: contextPrefix + m.content };
    }
    // Content blocks: prepend context as a text block
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

  const result = await callClaude(apiKey, system, augmentedMessages);
  return result.text;
}

/**
 * Parse single component from a response text. Throws if invalid.
 */
export { parseSingleComponent } from "./parseResponse";
