import type { AnthropicRequest, AnthropicResponse, AnthropicError, AnthropicContentBlock } from "./types";

const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-opus-4-6";

export interface ClaudeResult {
  text: string;
  thinking?: string;
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

/** Streaming call with extended thinking. Calls onThinking/onText as chunks arrive. */
export async function callClaudeStreaming(
  apiKey: string,
  system: string,
  messages: Array<{ role: "user" | "assistant"; content: string | AnthropicContentBlock[] }>,
  maxTokens = 4096,
  thinkingBudget = 10000,
  onThinking?: (chunk: string) => void,
  onText?: (chunk: string) => void,
): Promise<ClaudeResult> {
  const body = {
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages,
    thinking: { type: "enabled", budget_tokens: thinkingBudget },
    stream: true,
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
      const text = await res.text();
      const errorBody = JSON.parse(text) as AnthropicError;
      if (errorBody.error?.message) {
        errorMessage = errorBody.error.message;
      }
    } catch {}
    throw new Error(errorMessage);
  }

  let thinking = "";
  let text = "";
  let stopReason = "";

  // Try streaming via ReadableStream
  const reader = res.body?.getReader();
  if (reader) {
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // Parse SSE events line by line
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const payload = line.slice(6).trim();
        if (payload === "[DONE]") continue;

        try {
          const event = JSON.parse(payload);
          if (event.type === "content_block_delta") {
            if (event.delta?.type === "thinking_delta" && event.delta.thinking) {
              thinking += event.delta.thinking;
              onThinking?.(event.delta.thinking);
            } else if (event.delta?.type === "text_delta" && event.delta.text) {
              text += event.delta.text;
              onText?.(event.delta.text);
            }
          } else if (event.type === "message_delta" && event.delta?.stop_reason) {
            stopReason = event.delta.stop_reason;
          } else if (event.type === "error") {
            throw new Error(event.error?.message ?? "Stream error");
          }
        } catch (e) {
          if (e instanceof SyntaxError) continue; // incomplete JSON, skip
          throw e;
        }
      }
    }
  } else {
    // Fallback: non-streaming with thinking enabled
    const fallbackRes = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({ ...body, stream: false }),
    });
    const data = await fallbackRes.json();
    for (const block of data.content ?? []) {
      if (block.type === "thinking") {
        thinking += block.thinking;
        onThinking?.(block.thinking);
      } else if (block.type === "text") {
        text += block.text;
        onText?.(block.text);
      }
    }
    stopReason = data.stop_reason ?? "";
  }

  if (!text) {
    throw new Error("Empty response from Claude");
  }

  return { text, thinking: thinking || undefined, stopReason };
}
