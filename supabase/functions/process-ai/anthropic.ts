const API_URL = "https://api.anthropic.com/v1/messages";
const API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;

export interface ClaudeResult {
  text: string;
  thinking?: string;
  thinkingSignature?: string;
  stopReason: string;
}

export type ContentBlock =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } };

export async function callClaude(
  system: string,
  messages: Array<{ role: "user" | "assistant"; content: string | ContentBlock[] }>,
  maxTokens = 4096,
  model = "claude-opus-4-6",
): Promise<ClaudeResult> {
  const body = {
    model,
    max_tokens: maxTokens,
    system,
    messages,
  };

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let errorMessage = `API error ${res.status}`;
    try {
      const errorBody = await res.json();
      if (errorBody.error?.message) errorMessage = errorBody.error.message;
    } catch {}
    throw new Error(errorMessage);
  }

  const data = await res.json();
  const text = data.content
    .filter((c: any) => c.type === "text")
    .map((c: any) => c.text)
    .join("");

  if (!text) throw new Error("Empty response from Claude");

  return { text, stopReason: data.stop_reason };
}

export async function callClaudeStreaming(
  system: string,
  messages: Array<{ role: "user" | "assistant"; content: string | ContentBlock[] }>,
  maxTokens = 16384,
  thinkingBudget = 10000,
  onThinking?: (chunk: string) => void,
  onText?: (chunk: string) => void,
  model = "claude-opus-4-6",
): Promise<ClaudeResult> {
  const body = {
    model,
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
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let errorMessage = `API error ${res.status}`;
    try {
      const text = await res.text();
      const errorBody = JSON.parse(text);
      if (errorBody.error?.message) errorMessage = errorBody.error.message;
    } catch {}
    throw new Error(errorMessage);
  }

  let thinking = "";
  let thinkingSignature = "";
  let text = "";
  let stopReason = "";

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

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
          } else if (event.delta?.type === "signature_delta" && event.delta.signature) {
            thinkingSignature += event.delta.signature;
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
        if (e instanceof SyntaxError) continue;
        throw e;
      }
    }
  }

  if (!text) throw new Error("Empty response from Claude");

  return {
    text,
    thinking: thinking || undefined,
    thinkingSignature: thinkingSignature || undefined,
    stopReason,
  };
}
