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

export type TelegramNotifyResult = {
  ok: boolean;
  sent: number;
  reason?: string;
};

export type HypothesisNotifyPayload = {
  id: string;
  title: string;
  metricName: string;
  funnelStage: string;
  ifChange: string;
  thenMetric: string;
  priorityScore: number;
};

export type ExperimentNotifyPayload = {
  id: string;
  owner: string;
  startDate: string | null;
  endDate: string | null;
  budget?: string;
  beforeValue?: string;
  afterValue?: string;
  result?: string;
  decision?: string;
};

const BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME?.trim() || "controlgrow_bot";

export function telegramBotUsername(): string {
  return BOT_USERNAME;
}

export function telegramDeepLink(code: string): string {
  return `https://t.me/${BOT_USERNAME}?start=connect_${code}`;
}

/** Ссылка для перехода в подключённый Telegram-чат. */
export function telegramChatOpenUrl(chat: TelegramLinkedChat): string {
  const bot = telegramBotUsername();

  if (chat.chat_type === "private") {
    return `https://t.me/${bot}`;
  }

  const numericId = BigInt(chat.chat_id);
  if (numericId < 0n) {
    const abs = (-numericId).toString();
    if (abs.startsWith("100") && abs.length > 3) {
      return `https://t.me/c/${abs.slice(3)}`;
    }
    return `tg://resolve?domain=${bot}`;
  }

  return `https://t.me/${bot}`;
}

/** Сгенерировать код для привязки чата к проекту. */
export async function createProjectTelegramConnectCode(
  appProjectId: string,
): Promise<{ ok: true; code: TelegramConnectCode } | { ok: false; error: string }> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    return { ok: false, error: "Сессия истекла — войдите в аккаунт заново" };
  }

  const { data, error } = await supabase.rpc("create_telegram_connect_code", {
    p_app_id: appProjectId,
  });

  if (error) {
    console.warn("create_telegram_connect_code failed", error);
    const msg = error.message ?? "unknown error";
    if (msg.includes("project not found")) {
      return {
        ok: false,
        error: "Проект ещё не синхронизирован — сохраните проект и попробуйте снова",
      };
    }
    if (msg.includes("permission denied")) {
      return { ok: false, error: "Нет доступа — перелогиньтесь и попробуйте снова" };
    }
    return { ok: false, error: msg };
  }

  const row = data as { code?: string; expires_at?: string } | null;
  if (!row?.code || !row.expires_at) {
    return { ok: false, error: "Пустой ответ от сервера" };
  }

  return { ok: true, code: { code: row.code, expires_at: row.expires_at } };
}

/** @deprecated Используйте createProjectTelegramConnectCode из мастера проекта. */
export async function createTelegramConnectCode(): Promise<
  { ok: true; code: TelegramConnectCode } | { ok: false; error: string }
> {
  return { ok: false, error: "Подключите Telegram из мастера конкретного проекта" };
}

/** Список чатов, привязанных к проекту. */
export async function getProjectTelegramChats(appProjectId: string): Promise<TelegramLinkedChat[]> {
  const { data, error } = await supabase.rpc("get_project_telegram_chats", {
    p_app_id: appProjectId,
  });

  if (error) {
    console.warn("get_project_telegram_chats failed", error);
    return [];
  }

  return Array.isArray(data) ? (data as TelegramLinkedChat[]) : [];
}

/** @deprecated */
export async function getUserTelegramChats(): Promise<TelegramLinkedChat[]> {
  return [];
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

/** @deprecated */
export async function unlinkUserTelegramChat(_chatId: string): Promise<boolean> {
  return false;
}

function notifyReasonMessage(reason?: string): string {
  switch (reason) {
    case "telegram_send_failed":
      return "Telegram отклонил сообщение — попробуйте ещё раз";
    case "network_error":
      return "Нет связи с сервером уведомлений";
    case "unauthorized":
    case "http_401":
    case "not_authenticated":
      return "Сессия истекла — войдите в аккаунт заново";
    case "http_403":
    case "project_not_found":
      return "Проект не синхронизирован — откройте проект и подождите пару секунд";
    case "no_linked_chats":
      return "Чат не привязан — нажмите «Подключить Telegram» в мастере проекта";
    case "not_configured":
      return "Telegram-бот не настроен на сервере";
    case "empty_message":
      return "Пустой текст уведомления";
    default:
      return "Не удалось отправить в Telegram";
  }
}

export function telegramNotifyErrorMessage(reason?: string): string {
  return notifyReasonMessage(reason);
}

/**
 * Вызов Edge Function telegram-notify с явным user JWT (надёжнее, чем functions.invoke).
 */
async function invokeTelegramNotify(body: Record<string, unknown>): Promise<TelegramNotifyResult> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !anonKey) {
    return { ok: false, sent: 0, reason: "not_configured" };
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const userJwt = sessionData.session?.access_token;
  if (!userJwt) {
    return { ok: false, sent: 0, reason: "not_authenticated" };
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: anonKey,
    Authorization: `Bearer ${userJwt}`,
  };

  try {
    const resp = await fetch(`${supabaseUrl}/functions/v1/telegram-notify`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const data = (await resp.json().catch(() => ({}))) as {
      ok?: boolean;
      reason?: string;
      sent?: number;
    };

    if (!resp.ok) {
      console.warn("telegram-notify HTTP", resp.status, data);
      return {
        ok: false,
        sent: 0,
        reason: data.reason ?? `http_${resp.status}`,
      };
    }

    if (data.ok === false) {
      return { ok: false, sent: 0, reason: data.reason };
    }

    return {
      ok: true,
      sent: typeof data.sent === "number" ? data.sent : 0,
      reason: data.reason,
    };
  } catch (err) {
    console.warn("telegram-notify fetch failed", err);
    return { ok: false, sent: 0, reason: "network_error" };
  }
}

export async function notifyTestStarted(
  appProjectId: string,
  hypothesis: Hypothesis,
  experiment: Experiment,
  projectName: string,
): Promise<void> {
  try {
    await invokeTelegramNotify({
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
    });
  } catch (err) {
    console.warn("telegram-notify: unexpected error", err);
  }
}

/** Дайджест AI-аудита в привязанные Telegram-чаты. */
export async function notifyAuditReady(
  appProjectId: string,
  text: string,
): Promise<TelegramNotifyResult> {
  return invokeTelegramNotify({
    event: "audit_ready",
    appProjectId,
    text,
  });
}

export async function notifyTestFinished(
  appProjectId: string,
  payload: {
    projectName: string;
    funnelName?: string;
    hypothesis: HypothesisNotifyPayload;
    experiment: ExperimentNotifyPayload;
  },
): Promise<void> {
  try {
    await invokeTelegramNotify({
      event: "test_finished",
      appProjectId,
      ...payload,
    });
  } catch (err) {
    console.warn("telegram-notify test_finished", err);
  }
}

export async function notifyHypothesisBacklog(
  appProjectId: string,
  payload: {
    projectName: string;
    funnelName: string;
    metricName: string;
    items: { title: string; priorityScore?: number }[];
  },
): Promise<void> {
  try {
    await invokeTelegramNotify({ event: "hypothesis_backlog", appProjectId, ...payload });
  } catch (err) {
    console.warn("telegram-notify hypothesis_backlog", err);
  }
}

export async function notifyMetricRed(
  appProjectId: string,
  payload: {
    projectName: string;
    funnelName: string;
    metricName: string;
    actualValue?: string | null;
    plannedValue?: string | null;
    achievementPercent?: number | null;
  },
): Promise<void> {
  try {
    await invokeTelegramNotify({ event: "metric_red", appProjectId, ...payload });
  } catch (err) {
    console.warn("telegram-notify metric_red", err);
  }
}

export async function notifyMaterialsComplete(
  appProjectId: string,
  payload: {
    projectName: string;
    funnelName: string;
    covered: number;
    total: number;
    auditUrl?: string;
  },
): Promise<void> {
  try {
    await invokeTelegramNotify({ event: "materials_complete", appProjectId, ...payload });
  } catch (err) {
    console.warn("telegram-notify materials_complete", err);
  }
}

export async function notifyAuditStale(
  appProjectId: string,
  payload: {
    projectName: string;
    funnelName: string;
    changes: string[];
    auditUrl?: string;
  },
): Promise<void> {
  try {
    await invokeTelegramNotify({ event: "audit_stale", appProjectId, ...payload });
  } catch (err) {
    console.warn("telegram-notify audit_stale", err);
  }
}
