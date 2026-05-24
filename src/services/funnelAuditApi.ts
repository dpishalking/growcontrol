import { supabase } from "@/integrations/supabase/client";
import type { FunnelAuditApiPayload } from "@/types/funnelAudit";

/** Убираем технические названия провайдера из текста ошибок для UI. */
function sanitizeAiErrorMessage(msg: string): string {
  return msg
    .replace(/\bGemini\b/gi, "AI")
    .replace(/GEMINI_API_KEY/gi, "ключ AI-сервиса");
}

export type FunnelAuditApiResult = {
  audit: unknown;
  promptVersion?: string;
};

export async function runFunnelAuditApi(payload: FunnelAuditApiPayload): Promise<FunnelAuditApiResult> {
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
  // sb_publishable_ — не JWT, в Bearer класть нельзя (только user JWT после логина)
  if (userJwt) {
    headers.Authorization = `Bearer ${userJwt}`;
  }

  const resp = await fetch(`${supabaseUrl}/functions/v1/analyze-funnel-audit`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  const data = await resp.json().catch(() => ({}));

  if (!resp.ok) {
    const raw =
      (typeof data?.error === "string" && data.error) ||
      (typeof data?.message === "string" && data.message) ||
      (typeof data?.msg === "string" && data.msg) ||
      `Ошибка AI-аудита (HTTP ${resp.status})`;
    const msg = sanitizeAiErrorMessage(raw);
    const err = new Error(msg) as Error & { status?: number };
    err.status = resp.status;
    throw err;
  }

  if (!data.audit) {
    throw new Error("AI не вернул отчёт");
  }

  return { audit: data.audit, promptVersion: data.promptVersion };
}
