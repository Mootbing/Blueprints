import { getSupabaseClient } from "../storage/supabaseClient";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface SubmitJobParams {
  slateId: string;
  sessionId?: string;
  jobType: "agent_message" | "generate_title" | "tidy" | "generate_screen" | "modify_component" | "workflow";
  request: Record<string, unknown>;
  baseSlateVersion?: number;
}

export interface JobResult {
  id: string;
  status: "pending" | "running" | "completed" | "failed" | "conflict";
  response: any;
  applied: boolean;
  error_message?: string;
}

/**
 * Insert an ai_job row and invoke the edge function (fire-and-forget).
 * Returns the job ID immediately.
 */
export async function submitJob(params: SubmitJobParams): Promise<string> {
  const supabase = getSupabaseClient();
  console.log(`[aiJobClient] submitJob: type=${params.jobType}, slateId=${params.slateId}`);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error("[aiJobClient] Not authenticated");
    throw new Error("Not authenticated");
  }
  console.log(`[aiJobClient] User: ${user.id}`);

  const insertPayload = {
    owner_id: user.id,
    slate_id: params.slateId,
    session_id: params.sessionId,
    job_type: params.jobType,
    request: params.request,
    base_slate_version: params.baseSlateVersion,
  };
  console.log(`[aiJobClient] Inserting job...`, JSON.stringify({ ...insertPayload, request: `{keys: ${Object.keys(params.request).join(", ")}}` }));

  const { data, error } = await supabase
    .from("ai_jobs")
    .insert(insertPayload)
    .select("id")
    .single();

  if (error) {
    console.error(`[aiJobClient] Insert error:`, JSON.stringify(error));
    throw new Error(`Failed to create job: ${error.message}`);
  }
  const jobId = data.id;
  console.log(`[aiJobClient] Job created: ${jobId}`);

  // Fire-and-forget: invoke edge function
  console.log(`[aiJobClient] Invoking edge function process-ai with jobId=${jobId}...`);
  supabase.functions.invoke("process-ai", {
    body: { jobId },
  }).then((res) => {
    console.log(`[aiJobClient] Edge function response:`, JSON.stringify({ status: res.data?.status, error: res.error?.message }));
  }).catch((err) => {
    console.error("[aiJobClient] Edge function invoke failed:", err);
  });

  return jobId;
}

/**
 * Subscribe to job status changes via Realtime.
 * Returns cleanup function.
 */
export function subscribeToJob(
  jobId: string,
  callbacks: {
    onThinking?: (chunk: string) => void;
    onComplete?: (job: JobResult) => void;
    onError?: (error: string) => void;
  },
): () => void {
  const supabase = getSupabaseClient();
  const channels: RealtimeChannel[] = [];

  // Subscribe to thinking broadcasts
  if (callbacks.onThinking) {
    const thinkingChannel = supabase.channel(`ai-job:${jobId}`);
    thinkingChannel
      .on("broadcast", { event: "thinking" }, (payload) => {
        callbacks.onThinking?.(payload.payload?.chunk ?? "");
      })
      .subscribe();
    channels.push(thinkingChannel);
  }

  // Subscribe to job row changes
  const jobChannel = supabase
    .channel(`ai-job-status:${jobId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "ai_jobs",
        filter: `id=eq.${jobId}`,
      },
      (payload) => {
        const row = payload.new as any;
        if ((row.status === "completed" || row.status === "conflict") && row.response) {
          callbacks.onComplete?.({
            id: row.id,
            status: row.status,
            response: row.response,
            applied: row.applied,
            error_message: row.error_message,
          });
        } else if (row.status === "failed") {
          callbacks.onError?.(row.error_message ?? "Job failed");
        }
      },
    )
    .subscribe();
  channels.push(jobChannel);

  return () => {
    for (const ch of channels) {
      supabase.removeChannel(ch);
    }
  };
}

/**
 * Poll for a job's result (fallback if Realtime fails).
 */
export async function getJobResult(jobId: string): Promise<JobResult | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("ai_jobs")
    .select("id, status, response, applied, error_message")
    .eq("id", jobId)
    .single();

  if (error || !data) return null;
  return data as JobResult;
}

/**
 * Check for completed jobs for a slate (for app foreground reconciliation).
 */
export async function checkCompletedJobs(
  slateId: string,
  since?: string,
): Promise<JobResult[]> {
  const supabase = getSupabaseClient();
  let query = supabase
    .from("ai_jobs")
    .select("id, status, response, applied, error_message, completed_at, session_id, job_type")
    .eq("slate_id", slateId)
    .in("status", ["completed", "conflict"])
    .order("completed_at", { ascending: false })
    .limit(20);

  if (since) {
    query = query.gt("completed_at", since);
  }

  const { data } = await query;
  return (data ?? []) as JobResult[];
}

/**
 * Get active (pending/running) jobs for a slate — used on mount to resume tracking.
 */
export async function getActiveJobs(
  slateId: string,
): Promise<Array<JobResult & { session_id?: string; job_type?: string; created_at?: string }>> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from("ai_jobs")
    .select("id, status, response, applied, error_message, session_id, job_type, created_at")
    .eq("slate_id", slateId)
    .in("status", ["pending", "running"])
    .order("created_at", { ascending: false })
    .limit(10);

  return (data ?? []) as any[];
}
