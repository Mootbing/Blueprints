import type { AnthropicRequest, AnthropicResponse, AnthropicError } from "./types";

const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-opus-4-6";

export async function callClaude(
  apiKey: string,
  system: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  maxTokens = 4096,
): Promise<string> {
  const body: AnthropicRequest = {
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages,
  };

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let errorMessage = `API error ${res.status}`;
    try {
      const errorBody = (await res.json()) as AnthropicError;
      if (errorBody.error?.message) {
        errorMessage = errorBody.error.message;
      }
    } catch {}
    throw new Error(errorMessage);
  }

  const data = (await res.json()) as AnthropicResponse;
  const text = data.content
    .filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("");

  if (!text) {
    throw new Error("Empty response from Claude");
  }

  return text;
}
