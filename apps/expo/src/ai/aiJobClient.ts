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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("ai_jobs")
    .insert({
      owner_id: user.id,
      slate_id: params.slateId,
      session_id: params.sessionId,
      job_type: params.jobType,
      request: params.request,
      base_slate_version: params.baseSlateVersion,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Failed to create job: ${error.message}`);
  const jobId = data.id;

  // Fire-and-forget: invoke edge function
  supabase.functions.invoke("process-ai", {
    body: { jobId },
  }).catch((err) => {
    console.warn("Edge function invoke failed (will rely on polling):", err);
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
        if (row.status === "completed" || row.status === "conflict") {
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
