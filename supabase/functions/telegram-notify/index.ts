import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  createUserClient,
  formatDateRu,
  requireBotToken,
  sendTelegramMessage,
} from "../_shared/telegram.ts";
import {
  formatAuditStaleTelegram,
  formatHypothesisBacklogTelegram,
  formatMaterialsCompleteTelegram,
  formatMetricRedTelegram,
  formatTestFinishedTelegram,
  formatTestStartedTelegram,
} from "../_shared/telegramMessageFormat.ts";

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
  beforeValue?: string;
  afterValue?: string;
  result?: string;
  decision?: string;
}

type NotifyBody =
  | {
      event: "test_started";
      appProjectId: string;
      hypothesis: HypothesisPayload;
      experiment: ExperimentPayload;
      projectName: string;
    }
  | {
      event: "test_finished";
      appProjectId: string;
      projectName: string;
      funnelName?: string;
      hypothesis: HypothesisPayload;
      experiment: ExperimentPayload;
    }
  | {
      event: "hypothesis_backlog";
      appProjectId: string;
      projectName: string;
      funnelName: string;
      metricName: string;
      items: { title: string; priorityScore?: number }[];
    }
  | {
      event: "metric_red";
      appProjectId: string;
      projectName: string;
      funnelName: string;
      metricName: string;
      actualValue?: string | null;
      plannedValue?: string | null;
      achievementPercent?: number | null;
    }
  | {
      event: "materials_complete";
      appProjectId: string;
      projectName: string;
      funnelName: string;
      covered: number;
      total: number;
      auditUrl?: string;
    }
  | {
      event: "audit_stale";
      appProjectId: string;
      projectName: string;
      funnelName: string;
      changes: string[];
      auditUrl?: string;
    }
  | {
      event: "audit_ready";
      appProjectId: string;
      text: string;
    };

const ALLOWED_EVENTS = new Set([
  "test_started",
  "test_finished",
  "hypothesis_backlog",
  "metric_red",
  "materials_complete",
  "audit_stale",
  "audit_ready",
]);

function buildMessage(body: NotifyBody): string | null {
  switch (body.event) {
    case "audit_ready": {
      const text = body.text?.trim();
      return text || null;
    }
    case "test_started": {
      const { hypothesis: h, experiment: e, projectName } = body;
      return formatTestStartedTelegram({
        projectName,
        title: h.title,
        ifChange: h.ifChange,
        thenMetric: h.thenMetric,
        metricName: h.metricName,
        funnelStage: h.funnelStage,
        endDate: formatDateRu(e.endDate),
        owner: e.owner,
        budget: e.budget,
      });
    }
    case "test_finished": {
      const { hypothesis: h, experiment: e, projectName, funnelName } = body;
      return formatTestFinishedTelegram({
        projectName,
        funnelName,
        title: h.title,
        metricName: h.metricName,
        beforeValue: e.beforeValue ?? "",
        afterValue: e.afterValue ?? "",
        result: e.result ?? "",
        decision: e.decision ?? "pending",
        owner: e.owner,
      });
    }
    case "hypothesis_backlog":
      return formatHypothesisBacklogTelegram({
        projectName: body.projectName,
        funnelName: body.funnelName,
        metricName: body.metricName,
        items: body.items,
      });
    case "metric_red":
      return formatMetricRedTelegram({
        projectName: body.projectName,
        funnelName: body.funnelName,
        metricName: body.metricName,
        actualValue: body.actualValue,
        plannedValue: body.plannedValue,
        achievementPercent: body.achievementPercent,
      });
    case "materials_complete":
      return formatMaterialsCompleteTelegram({
        projectName: body.projectName,
        funnelName: body.funnelName,
        covered: body.covered,
        total: body.total,
        auditUrl: body.auditUrl,
      });
    case "audit_stale":
      return formatAuditStaleTelegram({
        projectName: body.projectName,
        funnelName: body.funnelName,
        changes: body.changes,
        auditUrl: body.auditUrl,
      });
    default:
      return null;
  }
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

    const body = (await req.json()) as NotifyBody;

    if (!body.event) {
      return json({ ok: false, reason: "invalid_payload" }, 400);
    }

    if (!ALLOWED_EVENTS.has(body.event)) {
      return json({ ok: false, reason: "unknown_event" }, 400);
    }

    const userClient = createUserClient(authHeader);
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) {
      return json({ ok: false, reason: "unauthorized" }, 401);
    }

    const appProjectId =
      typeof body.appProjectId === "string" ? body.appProjectId.trim() : "";
    if (!appProjectId) {
      return json({ ok: false, reason: "project_not_found" }, 400);
    }

    const { data: chatsRaw, error: chatsError } = await userClient.rpc(
      "get_project_telegram_chats",
      { p_app_id: appProjectId },
    );

    if (chatsError) {
      console.error("telegram-notify: get_project_telegram_chats", chatsError);
      const msg = chatsError.message ?? "";
      if (msg.includes("not authenticated")) {
        return json({ ok: false, reason: "unauthorized" }, 401);
      }
      return json({ ok: false, reason: "chat_lookup_failed" }, 403);
    }

    const chats = (Array.isArray(chatsRaw) ? chatsRaw : []) as { chat_id?: string }[];
    const targets: string[] = chats.map((c) => c.chat_id).filter((id): id is string => Boolean(id));

    const fallbackChatId = Deno.env.get("TELEGRAM_CHAT_ID")?.trim();
    if (targets.length === 0 && fallbackChatId) {
      targets.push(fallbackChatId);
    }

    if (targets.length === 0) {
      return json({ ok: true, reason: "no_linked_chats", sent: 0 });
    }

    const text = buildMessage(body);
    if (!text) {
      return json({ ok: false, reason: "empty_message" }, 400);
    }

    let sent = 0;
    for (const chatId of targets) {
      const result = await sendTelegramMessage(chatId, text, botToken);
      if (result.ok) sent++;
      else console.warn("telegram-notify: send failed", chatId, result.detail);
    }

    if (sent === 0) {
      return json({ ok: false, reason: "telegram_send_failed", sent: 0 }, 502);
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
