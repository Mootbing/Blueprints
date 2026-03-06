import type { Theme } from "../types";
import { callClaude } from "./anthropicClient";
import { generateSystemPrompt } from "./prompts";
import { parseComponentArray } from "./parseResponse";
import type { ChatMessage, AnthropicMessage } from "./types";

/**
 * Generates a screen of components from a chat conversation.
 * Returns the raw text response (which may contain explanation + JSON).
 */
export async function generateScreenChat(
  apiKey: string,
  messages: AnthropicMessage[],
  theme?: Theme,
): Promise<string> {
  const system = generateSystemPrompt(theme);
  const result = await callClaude(apiKey, system, messages);
  return result.text;
}

/**
 * Parse component array from a response text. Throws if invalid.
 */
export { parseComponentArray } from "./parseResponse";
