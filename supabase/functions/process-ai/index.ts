import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callClaude, callClaudeStreaming } from "./anthropic.ts";
import { hasActionableJson, buildBranchSlate } from "./apply-changes.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function supabaseAdmin() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { jobId } = await req.json();
    if (!jobId) {
      return new Response(JSON.stringify({ error: "jobId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = supabaseAdmin();

    // 1. Read the job
    const { data: job, error: jobError } = await sb
      .from("ai_jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      return new Response(JSON.stringify({ error: "Job not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (job.status !== "pending") {
      return new Response(JSON.stringify({ error: "Job already processed", status: job.status }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Mark as running
    await sb.from("ai_jobs").update({ status: "running" }).eq("id", jobId);

    // 3. Process based on job_type
    const request = job.request;
    let responsePayload: any;

    try {
      switch (job.job_type) {
        case "agent_message":
          responsePayload = await processAgentMessage(sb, job, request);
          break;
        case "generate_title":
          responsePayload = await processGenerateTitle(request);
          break;
        case "tidy":
          responsePayload = await processTidy(request);
          break;
        case "generate_screen":
          responsePayload = await processGenerateScreen(request);
          break;
        case "modify_component":
          responsePayload = await processModifyComponent(request);
          break;
        case "workflow":
          responsePayload = await processWorkflow(request);
          break;
        default:
          throw new Error(`Unknown job type: ${job.job_type}`);
      }

      // 4. Update job as completed
      await sb.from("ai_jobs").update({
        status: "completed",
        response: responsePayload,
        applied: responsePayload.applied ?? false,
        completed_at: new Date().toISOString(),
      }).eq("id", jobId);

      return new Response(JSON.stringify({ status: "completed", jobId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      await sb.from("ai_jobs").update({
        status: "failed",
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
      }).eq("id", jobId);

      return new Response(JSON.stringify({ status: "failed", error: errorMessage }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ─── Agent message processing ───────────────────────────────────

async function processAgentMessage(
  sb: ReturnType<typeof supabaseAdmin>,
  job: any,
  request: any,
): Promise<any> {
  const {
    messages,
    system,
    model,
    maxTokens = 16384,
    thinkingBudget = 10000,
    screenId,
    slateId,
  } = request;

  const MAX_CONTINUATIONS = 3;
  let fullResponse = "";
  let thinkingText = "";
  let thinkingSignature: string | undefined;
  let currentMessages = messages;

  // Set up Realtime channel for streaming thinking
  const channel = sb.channel(`ai-job:${job.id}`);

  for (let i = 0; i <= MAX_CONTINUATIONS; i++) {
    let result;
    if (i === 0) {
      result = await callClaudeStreaming(
        system,
        currentMessages,
        maxTokens,
        thinkingBudget,
        (chunk) => {
          // Broadcast thinking chunks via Realtime
          channel.send({
            type: "broadcast",
            event: "thinking",
            payload: { chunk },
          });
        },
        undefined,
        model,
      );
      if (result.thinking) thinkingText = result.thinking;
      if (result.thinkingSignature) thinkingSignature = result.thinkingSignature;
    } else {
      result = await callClaude(system, currentMessages, maxTokens, model);
    }
    fullResponse += result.text;

    if (result.stopReason !== "max_tokens") break;
    if (i === MAX_CONTINUATIONS) break;

    currentMessages = [
      ...currentMessages,
      { role: "assistant" as const, content: result.text },
      { role: "user" as const, content: "Continue from where you left off. Output ONLY the remaining JSON, no explanation." },
    ];
  }

  await channel.unsubscribe();

  // Apply changes to slate if actionable
  let applied = false;
  const actionable = hasActionableJson(fullResponse);

  if (actionable && slateId && screenId) {
    // Read current slate
    const { data: slateRow } = await sb
      .from("user_slates")
      .select("slate, version")
      .eq("id", slateId)
      .single();

    if (slateRow) {
      const branchResult = buildBranchSlate(slateRow.slate, screenId, fullResponse);
      if (branchResult) {
        // CAS write: only update if version matches
        const baseVersion = job.base_slate_version;
        const { error: updateError } = await sb
          .from("user_slates")
          .update({ slate: branchResult.slate })
          .eq("id", slateId)
          .eq("version", baseVersion ?? slateRow.version);

        if (updateError) {
          // Version conflict - still complete the job but mark not applied
          return {
            text: fullResponse,
            thinking: thinkingText || undefined,
            thinkingSignature,
            stopReason: "end_turn",
            applied: false,
            conflict: true,
            description: branchResult.description,
          };
        }
        applied = true;
      }
    }
  }

  return {
    text: fullResponse,
    thinking: thinkingText || undefined,
    thinkingSignature,
    stopReason: "end_turn",
    applied,
    hasActionableJson: actionable,
  };
}

// ─── Generate title ─────────────────────────────────────────────

async function processGenerateTitle(request: any): Promise<any> {
  const { messages } = request;

  const summary = messages
    .slice(0, 4)
    .map((m: any) => {
      const cleaned = (m.content as string).replace(/<json>[\s\S]*?<\/json>/g, "").trim();
      return `${m.role}: ${cleaned.slice(0, 300)}`;
    })
    .join("\n");

  const result = await callClaude(
    "Generate a short title (3-5 words) for this conversation. Output ONLY the title, no quotes, no punctuation at the end.",
    [{ role: "user", content: summary }],
    24,
    "claude-haiku-4-5-20251001",
  );

  const title = result.text.replace(/^["']+|["']+$/g, "").slice(0, 40);
  return { title };
}

// ─── Tidy layout ────────────────────────────────────────────────

async function processTidy(request: any): Promise<any> {
  const { system, components } = request;
  const userMessage = `Here are the components to tidy:\n\n<json>${JSON.stringify(components, null, 2)}</json>`;

  const result = await callClaude(system, [{ role: "user", content: userMessage }]);
  return { text: result.text };
}

// ─── Generate screen ────────────────────────────────────────────

async function processGenerateScreen(request: any): Promise<any> {
  const { system, messages } = request;
  const result = await callClaude(system, messages);
  return { text: result.text };
}

// ─── Modify component ───────────────────────────────────────────

async function processModifyComponent(request: any): Promise<any> {
  const { system, messages } = request;
  const result = await callClaude(system, messages);
  return { text: result.text };
}

// ─── Workflow ───────────────────────────────────────────────────

async function processWorkflow(request: any): Promise<any> {
  const { system, messages } = request;
  const result = await callClaude(system, messages, 8192);
  return { text: result.text };
}
