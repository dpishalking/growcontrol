import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  createServiceClient,
  formatDateRu,
  requireBotToken,
  sendTelegramMessage,
} from "../_shared/telegram.ts";
import { formatDeadlineReminderTelegram } from "../_shared/telegramMessageFormat.ts";

type ReminderRow = {
  experiment_id: string;
  experiment_app_id: string;
  project_app_id: string;
  project_name: string;
  hypothesis_title: string;
  owner: string | null;
  end_date: string;
  reminder_kind: "day_before" | "due_day" | "overdue";
};

function authorizeCron(req: Request): boolean {
  const secret = Deno.env.get("CRON_SECRET")?.trim();
  if (!secret) return true;
  const auth = req.headers.get("Authorization") ?? "";
  if (auth === `Bearer ${secret}`) return true;
  const header = req.headers.get("x-cron-secret") ?? "";
  return header === secret;
}

serve(async (req) => {
  if (req.method !== "POST" && req.method !== "GET") {
    return new Response("ok");
  }

  if (!authorizeCron(req)) {
    return json({ ok: false, reason: "unauthorized" }, 401);
  }

  try {
    let botToken: string;
    try {
      botToken = requireBotToken();
    } catch {
      console.warn("telegram-deadline-reminder: TELEGRAM_BOT_TOKEN not configured");
      return json({ ok: false, reason: "not_configured" });
    }

    const service = createServiceClient();
    const { data: rows, error } = await service.rpc("get_experiments_for_telegram_reminders");

    if (error) {
      console.error("get_experiments_for_telegram_reminders", error);
      return json({ ok: false, reason: "query_failed", message: error.message }, 500);
    }

    const due = (Array.isArray(rows) ? rows : []) as ReminderRow[];
    let sent = 0;
    let skipped = 0;

    for (const row of due) {
      const { data: chatsRaw } = await service.rpc("get_telegram_chats_for_project", {
        p_app_id: row.project_app_id,
      });

      const targets: string[] = Array.isArray(chatsRaw)
        ? chatsRaw.filter((id): id is string => typeof id === "string" && Boolean(id))
        : [];

      const fallbackChatId = Deno.env.get("TELEGRAM_CHAT_ID")?.trim();
      if (targets.length === 0 && fallbackChatId) {
        targets.push(fallbackChatId);
      }

      if (targets.length === 0) {
        skipped++;
        continue;
      }

      const text = formatDeadlineReminderTelegram({
        projectName: row.project_name,
        title: row.hypothesis_title,
        endDate: formatDateRu(row.end_date),
        owner: row.owner ?? undefined,
        kind: row.reminder_kind,
      });

      let delivered = false;
      for (const chatId of targets) {
        const result = await sendTelegramMessage(chatId, text, botToken);
        if (result.ok) delivered = true;
        else console.warn("deadline reminder send failed", chatId, result.detail);
      }

      if (delivered) {
        await service.rpc("mark_experiment_reminder_sent", {
          p_experiment_id: row.experiment_id,
          p_reminder_kind: row.reminder_kind,
        });
        sent++;
      }
    }

    return json({ ok: true, due: due.length, sent, skipped });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("telegram-deadline-reminder error:", message);
    return json({ ok: false, reason: "internal_error", message }, 500);
  }
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
