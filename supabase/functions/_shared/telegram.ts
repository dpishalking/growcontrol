import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export function requireBotToken(): string {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN")?.trim();
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  return token;
}

export function createServiceClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Supabase service credentials missing");
  return createClient(url, key);
}

export function createUserClient(authHeader: string): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anonKey) throw new Error("Supabase anon credentials missing");
  return createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
}

export async function sendTelegramMessage(
  chatId: string,
  text: string,
  botToken?: string,
): Promise<{ ok: boolean; detail?: unknown }> {
  const token = botToken ?? requireBotToken();

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    console.error("Telegram sendMessage error", chatId, JSON.stringify(json));
    return { ok: false, detail: json };
  }
  return { ok: true };
}

export function formatDateRu(iso: string | null): string {
  if (!iso) return "не указан";
  const d = new Date(iso);
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}
