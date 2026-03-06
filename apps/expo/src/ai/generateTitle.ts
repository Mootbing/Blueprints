import type { ChatMessage } from "./types";

const API_URL = "https://api.anthropic.com/v1/messages";
const TITLE_MODEL = "claude-haiku-4-5-20251001";

/**
 * Generate a short conversation title from the first exchange.
 * Uses Haiku for speed/cost. Returns null on failure.
 */
export async function generateSessionTitle(
  apiKey: string,
  messages: ChatMessage[],
): Promise<string | null> {
  if (!apiKey || messages.length === 0) return null;

  const summary = messages
    .slice(0, 4)
    .map((m) => `${m.role}: ${m.content.slice(0, 300)}`)
    .join("\n");

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: TITLE_MODEL,
        max_tokens: 24,
        system:
          "Generate a short title (3-5 words) for this conversation. Output ONLY the title, no quotes, no punctuation at the end.",
        messages: [{ role: "user", content: summary }],
      }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const text = data?.content?.[0]?.text?.trim();
    if (!text) return null;

    // Clean up: remove surrounding quotes if present, limit length
    return text.replace(/^["']+|["']+$/g, "").slice(0, 40);
  } catch {
    return null;
  }
}
