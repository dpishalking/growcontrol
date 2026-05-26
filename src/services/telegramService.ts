import { supabase } from "@/integrations/supabase/client";
import type { Experiment } from "@/types/experiment";
import type { Hypothesis } from "@/types/hypothesis";

export type TelegramLinkedChat = {
  chat_id: string;
  chat_title: string | null;
  chat_type: string | null;
  linked_at: string;
};

export type TelegramConnectCode = {
  code: string;
  expires_at: string;
};

const BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME?.trim() || "controlgrow_bot";

export function telegramBotUsername(): string {
  return BOT_USERNAME;
}

export function telegramDeepLink(code: string): string {
  return `https://t.me/${BOT_USERNAME}?start=connect_${code}`;
}

/** Сгенерировать одноразовый код для привязки чата к проекту. */
export async function createTelegramConnectCode(
  appProjectId: string,
): Promise<TelegramConnectCode | null> {
  const { data, error } = await supabase.rpc("create_telegram_connect_code", {
    p_app_id: appProjectId,
  });

  if (error) {
    console.warn("create_telegram_connect_code failed", error);
    return null;
  }

  const row = data as { code?: string; expires_at?: string } | null;
  if (!row?.code || !row.expires_at) return null;

  return { code: row.code, expires_at: row.expires_at };
}

/** Список чатов, привязанных к проекту. */
export async function getProjectTelegramChats(
  appProjectId: string,
): Promise<TelegramLinkedChat[]> {
  const { data, error } = await supabase.rpc("get_project_telegram_chats", {
    p_app_id: appProjectId,
  });

  if (error) {
    console.warn("get_project_telegram_chats failed", error);
    return [];
  }

  return Array.isArray(data) ? (data as TelegramLinkedChat[]) : [];
}

/** Отвязать чат от проекта. */
export async function unlinkProjectTelegramChat(
  appProjectId: string,
  chatId: string,
): Promise<boolean> {
  const { error } = await supabase.rpc("unlink_project_telegram_chat", {
    p_app_id: appProjectId,
    p_chat_id: chatId,
  });

  if (error) {
    console.warn("unlink_project_telegram_chat failed", error);
    return false;
  }
  return true;
}

/**
 * Отправляет уведомление в Telegram-чаты, привязанные к проекту.
 * Fire-and-forget: ошибки логируются, но не бросаются.
 */
export async function notifyTestStarted(
  appProjectId: string,
  hypothesis: Hypothesis,
  experiment: Experiment,
  projectName: string,
): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke("telegram-notify", {
      body: {
        event: "test_started",
        appProjectId,
        hypothesis: {
          id: hypothesis.id,
          title: hypothesis.title,
          metricName: hypothesis.metricName,
          funnelStage: hypothesis.funnelStage,
          ifChange: hypothesis.ifChange,
          thenMetric: hypothesis.thenMetric,
          priorityScore: hypothesis.priorityScore,
        },
        experiment: {
          id: experiment.id,
          owner: experiment.owner,
          startDate: experiment.startDate,
          endDate: experiment.endDate,
          budget: experiment.budget,
        },
        projectName,
      },
    });

    if (error) {
      console.warn("telegram-notify: failed to send notification", error);
    }
  } catch (err) {
    console.warn("telegram-notify: unexpected error", err);
  }
}
