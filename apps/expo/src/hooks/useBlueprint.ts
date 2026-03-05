import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { AppBlueprintSchema } from "@shared/schema";
import type { AppBlueprint } from "../types";

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);

interface UseBlueprintResult {
  blueprint: AppBlueprint | null;
  loading: boolean;
  error: Error | null;
}

export function useBlueprint(appId: string): UseBlueprintResult {
  const [blueprint, setBlueprint] = useState<AppBlueprint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchBlueprint() {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("published_apps")
        .select("app_blueprint")
        .eq("id", appId)
        .single();

      if (cancelled) return;

      if (fetchError) {
        setError(new Error(fetchError.message));
        setLoading(false);
        return;
      }

      try {
        const parsed = AppBlueprintSchema.parse(data.app_blueprint);
        setBlueprint(parsed);
      } catch (e) {
        setError(e instanceof Error ? e : new Error("Invalid blueprint"));
      }

      setLoading(false);
    }

    fetchBlueprint();
    return () => {
      cancelled = true;
    };
  }, [appId]);

  return { blueprint, loading, error };
}
