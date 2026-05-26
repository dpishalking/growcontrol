import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createServiceClient, sendTelegramMessage } from "../_shared/telegram.ts";

interface TelegramUser {
  id: number;
  first_name?: string;
  username?: string;
}

interface TelegramChat {
  id: number;
  type: string;
  title?: string;
}

interface TelegramMessage {
  message_id: number;
  chat: TelegramChat;
  text?: string;
  from?: TelegramUser;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("ok");
  }

  try {
    const update: TelegramUpdate = await req.json();
    const message = update.message;

    if (!message?.text || !message.chat) {
      return new Response("ok");
    }

    const chatId = String(message.chat.id);
    const chatTitle = message.chat.title ?? message.from?.first_name ?? null;
    const chatType = message.chat.type;
    const text = message.text.trim();

    const reply = await handleCommand(text, chatId, chatTitle, chatType);
    if (reply) {
      await sendTelegramMessage(chatId, reply);
    }

    return new Response("ok");
  } catch (err) {
    console.error("telegram-webhook error:", err);
    return new Response("ok");
  }
});

async function handleCommand(
  text: string,
  chatId: string,
  chatTitle: string | null,
  chatType: string,
): Promise<string | null> {
  const service = createServiceClient();

  // /start connect_CODE (deep link из приложения)
  if (text.startsWith("/start")) {
    const parts = text.split(/\s+/);
    const payload = parts[1] ?? "";
    if (payload.startsWith("connect_")) {
      const code = payload.replace("connect_", "");
      return linkChat(service, code, chatId, chatTitle, chatType);
    }
    return helpText();
  }

  if (text.startsWith("/connect")) {
    const parts = text.split(/\s+/);
    const code = parts[1]?.trim();
    if (!code) {
      return "Укажите код: <code>/connect ABC123</code>\n\nКод можно получить в GrowControl → проект → «Подключить Telegram».";
    }
    return linkChat(service, code, chatId, chatTitle, chatType);
  }

  if (text.startsWith("/disconnect")) {
    const { data, error } = await service.rpc("unlink_telegram_chat_by_id", {
      p_chat_id: chatId,
    });
    if (error) {
      console.error("unlink error", error);
      return "Не удалось отвязать чат. Попробуйте позже.";
    }
    const result = data as { unlinked?: boolean; project_name?: string };
    if (!result?.unlinked) {
      return "Этот чат не привязан ни к одному проекту.";
    }
    return `Чат отвязан от проекта «${escapeHtml(result.project_name ?? "")}».`;
  }

  if (text.startsWith("/status")) {
    const { data, error } = await service.rpc("get_telegram_chat_status", {
      p_chat_id: chatId,
    });
    if (error) {
      console.error("status error", error);
      return "Не удалось получить статус.";
    }
    const result = data as { linked?: boolean; project_name?: string; linked_at?: string };
    if (!result?.linked) {
      return "Чат не привязан.\n\nЧтобы подключить: получите код в GrowControl и напишите <code>/connect КОД</code>.";
    }
    const linkedAt = result.linked_at
      ? new Date(result.linked_at).toLocaleDateString("ru-RU")
      : "—";
    return `Привязан к проекту: <b>${escapeHtml(result.project_name ?? "")}</b>\nПодключён: ${linkedAt}`;
  }

  if (text.startsWith("/help")) {
    return helpText();
  }

  return null;
}

async function linkChat(
  service: ReturnType<typeof createServiceClient>,
  code: string,
  chatId: string,
  chatTitle: string | null,
  chatType: string,
): Promise<string> {
  const { data, error } = await service.rpc("link_telegram_chat_by_code", {
    p_code: code,
    p_chat_id: chatId,
    p_chat_title: chatTitle,
    p_chat_type: chatType,
  });

  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("invalid_or_expired_code")) {
      return "Код недействителен или истёк.\n\nСгенерируйте новый код в GrowControl → проект → «Подключить Telegram».";
    }
    if (msg.includes("chat_already_linked")) {
      return "Этот чат уже привязан к другому проекту.\n\nСначала напишите <code>/disconnect</code>, затем подключите заново.";
    }
    console.error("link error", error);
    return "Не удалось привязать чат. Попробуйте позже.";
  }

  const result = data as { project_name?: string };
  return [
    `<b>Чат подключён</b>`,
    ``,
    `Проект: <b>${escapeHtml(result.project_name ?? "")}</b>`,
    ``,
    `Сюда будут приходить уведомления о запуске тестов и напоминания по метрикам — только по этому проекту.`,
    ``,
    `<code>/status</code> — проверить привязку`,
    `<code>/disconnect</code> — отключить`,
  ].join("\n");
}

function helpText(): string {
  return [
    `<b>GrowControl Bot</b>`,
    ``,
    `Подключает командный чат к проекту в GrowControl.`,
    ``,
    `<code>/connect КОД</code> — привязать чат к проекту`,
    `<code>/status</code> — какой проект привязан`,
    `<code>/disconnect</code> — отвязать чат`,
    `<code>/help</code> — эта справка`,
    ``,
    `Код получите в приложении: проект → «Подключить Telegram».`,
  ].join("\n");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
