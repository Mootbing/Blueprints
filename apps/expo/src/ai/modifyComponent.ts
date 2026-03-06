import type { Component, Theme } from "../types";
import { callClaude } from "./anthropicClient";
import { modifyComponentSystemPrompt } from "./prompts";
import { parseSingleComponent } from "./parseResponse";
import type { AnthropicMessage } from "./types";

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
  const augmentedMessages = messages.map((m, i) =>
    i === 0 ? { ...m, content: contextPrefix + m.content } : m,
  );

  return callClaude(apiKey, system, augmentedMessages);
}

/**
 * Parse single component from a response text. Throws if invalid.
 */
export { parseSingleComponent } from "./parseResponse";
