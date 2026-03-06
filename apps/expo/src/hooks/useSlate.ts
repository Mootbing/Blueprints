import { useState, useEffect } from "react";
import { AppSlateSchema } from "@shared/schema";
import type { AppSlate } from "../types";
import { getSupabaseClient } from "../storage/supabaseClient";

const supabase = getSupabaseClient();

interface UseSlateResult {
  slate: AppSlate | null;
  loading: boolean;
  error: Error | null;
}

export function useSlate(appId: string): UseSlateResult {
  const [slate, setSlate] = useState<AppSlate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchSlate() {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("published_apps")
        .select("app_slate")
        .eq("id", appId)
        .single();

      if (cancelled) return;

      if (fetchError) {
        setError(new Error(fetchError.message));
        setLoading(false);
        return;
      }

      try {
        const parsed = AppSlateSchema.parse(data.app_slate);
        setSlate(parsed);
      } catch (e) {
        setError(e instanceof Error ? e : new Error("Invalid slate"));
      }

      setLoading(false);
    }

    fetchSlate();
    return () => {
      cancelled = true;
    };
  }, [appId]);

  return { slate, loading, error };
}
