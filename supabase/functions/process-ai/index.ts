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
  console.log(`[process-ai] ${req.method} request received`);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("[process-ai] Request body:", JSON.stringify(body));
    const { jobId } = body;
    if (!jobId) {
      console.error("[process-ai] Missing jobId in request");
      return new Response(JSON.stringify({ error: "jobId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[process-ai] Processing job: ${jobId}`);
    const sb = supabaseAdmin();

    // 1. Read the job
    console.log(`[process-ai] Reading job from DB...`);
    const { data: job, error: jobError } = await sb
      .from("ai_jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (jobError) {
      console.error("[process-ai] Job query error:", JSON.stringify(jobError));
      return new Response(JSON.stringify({ error: "Job not found", details: jobError.message }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!job) {
      console.error("[process-ai] Job not found (null)");
      return new Response(JSON.stringify({ error: "Job not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[process-ai] Job found: type=${job.job_type}, status=${job.status}, slate_id=${job.slate_id}`);

    if (job.status !== "pending") {
      console.warn(`[process-ai] Job already processed: ${job.status}`);
      return new Response(JSON.stringify({ error: "Job already processed", status: job.status }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Mark as running
    console.log("[process-ai] Marking job as running...");
    const { error: updateRunningError } = await sb.from("ai_jobs").update({ status: "running" }).eq("id", jobId);
    if (updateRunningError) {
      console.error("[process-ai] Failed to mark job as running:", JSON.stringify(updateRunningError));
    }

    // 3. Process based on job_type
    const request = job.request;
    console.log(`[process-ai] Dispatching job_type=${job.job_type}, request keys: ${Object.keys(request).join(", ")}`);
    let responsePayload: any;

    try {
      switch (job.job_type) {
        case "agent_message":
          console.log("[process-ai] Processing agent_message...");
          responsePayload = await processAgentMessage(sb, job, request);
          break;
        case "generate_title":
          console.log("[process-ai] Processing generate_title...");
          responsePayload = await processGenerateTitle(request);
          break;
        case "tidy":
          console.log("[process-ai] Processing tidy...");
          responsePayload = await processTidy(request);
          break;
        case "generate_screen":
          console.log("[process-ai] Processing generate_screen...");
          responsePayload = await processGenerateScreen(request);
          break;
        case "modify_component":
          console.log("[process-ai] Processing modify_component...");
          responsePayload = await processModifyComponent(request);
          break;
        case "workflow":
          console.log("[process-ai] Processing workflow...");
          responsePayload = await processWorkflow(request);
          break;
        default:
          throw new Error(`Unknown job type: ${job.job_type}`);
      }

      console.log(`[process-ai] Job completed successfully. Response keys: ${Object.keys(responsePayload).join(", ")}, applied=${responsePayload.applied}`);

      // 4. Update job as completed
      const { error: updateCompleteError } = await sb.from("ai_jobs").update({
        status: "completed",
        response: responsePayload,
        applied: responsePayload.applied ?? false,
        completed_at: new Date().toISOString(),
      }).eq("id", jobId);

      if (updateCompleteError) {
        console.error("[process-ai] Failed to update job as completed:", JSON.stringify(updateCompleteError));
      } else {
        console.log("[process-ai] Job marked as completed in DB");
      }

      return new Response(JSON.stringify({ status: "completed", jobId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      const errorStack = err instanceof Error ? err.stack : undefined;
      console.error(`[process-ai] Job processing error: ${errorMessage}`);
      if (errorStack) console.error(`[process-ai] Stack: ${errorStack}`);

      const { error: updateFailError } = await sb.from("ai_jobs").update({
        status: "failed",
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
      }).eq("id", jobId);

      if (updateFailError) {
        console.error("[process-ai] Failed to update job as failed:", JSON.stringify(updateFailError));
      }

      return new Response(JSON.stringify({ status: "failed", error: errorMessage }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    const errorStack = err instanceof Error ? err.stack : undefined;
    console.error(`[process-ai] Top-level error: ${errorMessage}`);
    if (errorStack) console.error(`[process-ai] Stack: ${errorStack}`);
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
  let channelReady = false;
  try {
    await new Promise<void>((resolve) => {
      channel.subscribe((status: string) => {
        if (status === "SUBSCRIBED") {
          channelReady = true;
          resolve();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          resolve(); // proceed without broadcasting
        }
      });
      // Don't block forever if subscribe hangs
      setTimeout(() => resolve(), 3000);
    });
  } catch {
    console.warn("[process-ai] Failed to subscribe to broadcast channel, proceeding without streaming");
  }

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
          if (channelReady) {
            channel.send({
              type: "broadcast",
              event: "thinking",
              payload: { chunk },
            }).catch(() => {});
          }
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

  try { await channel.unsubscribe(); } catch {}

  // Apply changes to slate if actionable
  let applied = false;
  let description: string | undefined;
  let builtSlate: any = undefined;
  const actionable = hasActionableJson(fullResponse);
  console.log(`[process-ai] hasActionableJson=${actionable}, slateId=${slateId}, screenId=${screenId}`);

  if (actionable && slateId && screenId) {
    // Read current slate
    const { data: slateRow } = await sb
      .from("user_slates")
      .select("slate, version")
      .eq("id", slateId)
      .single();

    console.log(`[process-ai] slateRow found=${!!slateRow}, version=${slateRow?.version}`);

    if (slateRow) {
      const branchResult = buildBranchSlate(slateRow.slate, screenId, fullResponse);
      console.log(`[process-ai] buildBranchSlate result=${!!branchResult}, description=${branchResult?.description}`);
      if (branchResult) {
        description = branchResult.description;
        builtSlate = branchResult.slate;
        // CAS write: only update if version matches
        const baseVersion = job.base_slate_version;
        console.log(`[process-ai] CAS write: baseVersion=${baseVersion}, slateRow.version=${slateRow.version}`);
        const { data: updateData, error: updateError } = await sb
          .from("user_slates")
          .update({ slate: branchResult.slate })
          .eq("id", slateId)
          .eq("version", baseVersion ?? slateRow.version)
          .select("version")
          .maybeSingle();

        console.log(`[process-ai] CAS result: updateData=${!!updateData}, updateError=${updateError?.message}`);

        if (updateError || !updateData) {
          // Version conflict - still complete the job but mark not applied
          return {
            text: fullResponse,
            thinking: thinkingText || undefined,
            thinkingSignature,
            stopReason: "end_turn",
            applied: false,
            conflict: true,
            builtSlate,
            description,
            hasActionableJson: actionable,
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
    builtSlate,
    description,
  };
}

// ─── Generate title ─────────────────────────────────────────────

async function processGenerateTitle(request: any): Promise<any> {
  const { messages } = request;

  // Only use the first user message for titling — assistant responses are full of JSON noise
  const firstUserMsg = messages.find((m: any) => m.role === "user");
  const raw = typeof firstUserMsg?.content === "string" ? firstUserMsg.content : "";
  // Strip any JSON/XML blocks and keep just the natural language
  const cleaned = raw
    .replace(/<json>[\s\S]*?<\/json>/g, "")
    .replace(/<[^>]+>[\s\S]*?<\/[^>]+>/g, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\{[\s\S]*?\}/g, "")
    .trim()
    .slice(0, 200);

  if (!cleaned) {
    return { title: "New Chat" };
  }

  const result = await callClaude(
    "Generate a short title (3-5 words) summarizing what the user is asking for. Output ONLY the title text, nothing else. No quotes, no punctuation at the end.",
    [{ role: "user", content: cleaned }],
    24,
    "claude-haiku-4-5-20251001",
  );

  const title = result.text.replace(/^["']+|["']+$/g, "").trim().slice(0, 40);
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
