import { supabase } from "@/integrations/supabase/client";
import type { FunnelAuditHypothesisDraft } from "@/types/funnelAudit";
import type { MetricHypothesesApiPayload } from "@/types/metricHypotheses";

function sanitizeAiErrorMessage(msg: string): string {
  return msg
    .replace(/\bGemini\b/gi, "AI")
    .replace(/GEMINI_API_KEY/gi, "ключ AI-сервиса");
}

export async function runMetricHypothesesApi(
  payload: MetricHypothesesApiPayload,
): Promise<{ hypotheses: FunnelAuditHypothesisDraft[] }> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error("Supabase не настроен (VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY)");
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const userJwt = sessionData.session?.access_token;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: anonKey,
  };
  if (userJwt) {
    headers.Authorization = `Bearer ${userJwt}`;
  }

  const resp = await fetch(`${supabaseUrl}/functions/v1/generate-metric-hypotheses`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  const data = await resp.json().catch(() => ({}));

  if (!resp.ok) {
    const raw =
      (typeof data?.error === "string" && data.error) ||
      (typeof data?.message === "string" && data.message) ||
      `Ошибка генерации (HTTP ${resp.status})`;
    throw new Error(sanitizeAiErrorMessage(raw));
  }

  const list = data?.hypotheses;
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error("AI не вернул гипотезы");
  }

  return { hypotheses: list as FunnelAuditHypothesisDraft[] };
}
