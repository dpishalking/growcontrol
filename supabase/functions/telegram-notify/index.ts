import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  createServiceClient,
  createUserClient,
  formatDateRu,
  requireBotToken,
  sendTelegramMessage,
} from "../_shared/telegram.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface HypothesisPayload {
  id: string;
  title: string;
  metricName: string;
  funnelStage: string;
  ifChange: string;
  thenMetric: string;
  priorityScore: number;
}

interface ExperimentPayload {
  id: string;
  owner: string;
  startDate: string | null;
  endDate: string | null;
  budget?: string;
}

interface NotifyBody {
  event: "test_started";
  appProjectId: string;
  hypothesis: HypothesisPayload;
  experiment: ExperimentPayload;
  projectName: string;
}

function buildMessage(body: NotifyBody): string {
  const { hypothesis: h, experiment: e, projectName } = body;

  const lines: string[] = [
    `<b>Тест запущен</b>`,
    ``,
    `<b>${escapeHtml(h.title)}</b>`,
    ``,
    `Если ${escapeHtml(h.ifChange)}, то ${escapeHtml(h.thenMetric)}`,
    ``,
    `Метрика: ${escapeHtml(h.metricName || "—")}`,
    `Этап воронки: ${escapeHtml(h.funnelStage || "—")}`,
    `Дедлайн: ${formatDateRu(e.endDate)}`,
    e.owner ? `Владелец: ${escapeHtml(e.owner)}` : null,
    e.budget ? `Бюджет: ${escapeHtml(e.budget)}` : null,
    `Проект: ${escapeHtml(projectName)}`,
  ];

  return lines.filter((l): l is string => l !== null).join("\n");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ ok: false, reason: "unauthorized" }, 401);
    }

    let botToken: string;
    try {
      botToken = requireBotToken();
    } catch {
      console.warn("telegram-notify: TELEGRAM_BOT_TOKEN not configured — skipping");
      return json({ ok: false, reason: "not_configured" });
    }

    const body: NotifyBody = await req.json();

    if (body.event !== "test_started" || !body.appProjectId) {
      return json({ ok: false, reason: "invalid_payload" }, 400);
    }

    const userClient = createUserClient(authHeader);
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) {
      return json({ ok: false, reason: "unauthorized" }, 401);
    }

    const serviceClient = createServiceClient();

    // Проверяем, что проект принадлежит пользователю
    const { data: project } = await serviceClient
      .from("projects")
      .select("id, name, app_id")
      .eq("app_id", body.appProjectId)
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (!project) {
      return json({ ok: false, reason: "project_not_found" }, 403);
    }

    // Ищем привязанные чаты этого проекта
    const { data: chatIds, error: chatsError } = await serviceClient.rpc(
      "get_telegram_chats_for_project",
      { p_app_id: body.appProjectId },
    );

    if (chatsError) {
      console.error("telegram-notify: failed to load chats", chatsError);
      return json({ ok: false, reason: "db_error" }, 500);
    }

    const targets: string[] = Array.isArray(chatIds) ? chatIds : [];

    // Fallback: глобальный чат для внутренней команды (опционально)
    const fallbackChatId = Deno.env.get("TELEGRAM_CHAT_ID")?.trim();
    if (targets.length === 0 && fallbackChatId) {
      targets.push(fallbackChatId);
    }

    if (targets.length === 0) {
      return json({ ok: true, reason: "no_linked_chats", sent: 0 });
    }

    const text = buildMessage(body);
    let sent = 0;

    for (const chatId of targets) {
      const result = await sendTelegramMessage(chatId, text, botToken);
      if (result.ok) sent++;
    }

    return json({ ok: true, sent, total: targets.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("telegram-notify error:", message);
    return json({ ok: false, reason: "internal_error", message }, 500);
  }
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
