import type { AnthropicRequest, AnthropicResponse, AnthropicError, AnthropicContentBlock } from "./types";

const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-opus-4-6";

export interface ClaudeResult {
  text: string;
  stopReason: string;
}

/** Parse a data URI into media_type and raw base64 data */
function parseDataUri(dataUri: string): { media_type: string; data: string } | null {
  const match = dataUri.match(/^data:([^;]+);base64,(.+)$/s);
  if (!match) return null;
  return { media_type: match[1], data: match[2] };
}

/** Build multimodal content blocks from text + optional images */
function buildContent(text: string, images?: string[]): string | AnthropicContentBlock[] {
  if (!images || images.length === 0) return text;
  const blocks: AnthropicContentBlock[] = [];
  for (const img of images) {
    const parsed = parseDataUri(img);
    if (parsed) {
      blocks.push({ type: "image", source: { type: "base64", media_type: parsed.media_type, data: parsed.data } });
    }
  }
  blocks.push({ type: "text", text });
  return blocks;
}

export { buildContent };

export async function callClaude(
  apiKey: string,
  system: string,
  messages: Array<{ role: "user" | "assistant"; content: string | AnthropicContentBlock[] }>,
  maxTokens = 4096,
): Promise<ClaudeResult> {
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

  return { text, stopReason: data.stop_reason };
}
