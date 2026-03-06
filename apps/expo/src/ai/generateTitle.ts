import type { ChatMessage } from "./types";
import { submitJob, getJobResult } from "./aiJobClient";

/**
 * Generate a short conversation title via server-side AI.
 * Returns null on failure.
 */
export async function generateSessionTitle(
  slateId: string,
  messages: ChatMessage[],
): Promise<string | null> {
  if (messages.length === 0) return null;

  try {
    const jobId = await submitJob({
      slateId,
      jobType: "generate_title",
      request: {
        messages: messages.slice(0, 4).map((m) => ({
          role: m.role,
          content: m.content,
        })),
      },
    });

    // Poll for result (title generation is fast)
    for (let i = 0; i < 15; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const result = await getJobResult(jobId);
      if (result?.status === "completed" && result.response?.title) {
        return result.response.title;
      }
      if (result?.status === "failed") return null;
    }
    return null;
  } catch {
    return null;
  }
}
