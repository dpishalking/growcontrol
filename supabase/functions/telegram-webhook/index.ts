import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createServiceClient, sendTelegramMessage } from "../_shared/telegram.ts";

interface TelegramUser {
  id: number;
  first_name?: string;
  username?: string;
  is_bot?: boolean;
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

interface ChatMemberUpdate {
  chat: TelegramChat;
  new_chat_member: {
    user: TelegramUser;
    status: string;
  };
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  my_chat_member?: ChatMemberUpdate;
}

const CONNECT_HINT =
  "GrowControl → откройте проект → мастер воронки → «Подключить Telegram»";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("ok");
  }

  try {
    const update: TelegramUpdate = await req.json();

    if (update.my_chat_member) {
      await handleBotAdded(update.my_chat_member);
      return new Response("ok");
    }

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

async function handleBotAdded(event: ChatMemberUpdate): Promise<void> {
  const { chat, new_chat_member } = event;
  if (!new_chat_member.user.is_bot) return;

  const chatType = chat.type;
  if (chatType !== "group" && chatType !== "supergroup") return;

  const status = new_chat_member.status;
  if (status !== "member" && status !== "administrator") return;

  const chatId = String(chat.id);
  const title = chat.title ?? "командный чат";

  await sendTelegramMessage(
    chatId,
    [
      `<b>GrowControl подключён к чату «${escapeHtml(title)}»</b>`,
      ``,
      `Чтобы получать уведомления о тестах и метриках:`,
      ``,
      `1. ${CONNECT_HINT}`,
      `2. Скопируйте код`,
      `3. Напишите здесь: <code>/connect КОД</code>`,
      ``,
      `<code>/help</code> — все команды`,
    ].join("\n"),
  );
}

async function handleCommand(
  text: string,
  chatId: string,
  chatTitle: string | null,
  chatType: string,
): Promise<string | null> {
  const service = createServiceClient();
  const isGroup = chatType === "group" || chatType === "supergroup";

  if (text.startsWith("/start")) {
    const parts = text.split(/\s+/);
    const payload = parts[1] ?? "";
    if (payload.startsWith("connect_")) {
      const code = payload.replace("connect_", "");
      return linkChat(service, code, chatId, chatTitle, chatType, isGroup);
    }
    return helpText(isGroup);
  }

  if (text.startsWith("/connect")) {
    const parts = text.split(/\s+/);
    const code = parts[1]?.trim();
    if (!code) {
      return connectHelpText(isGroup);
    }
    return linkChat(service, code, chatId, chatTitle, chatType, isGroup);
  }

  if (text.startsWith("/disconnect")) {
    const { data, error } = await service.rpc("unlink_telegram_chat_by_id", {
      p_chat_id: chatId,
    });
    if (error) {
      console.error("unlink error", error);
      return "Не удалось отвязать чат. Попробуйте позже.";
    }
    const result = data as { unlinked?: boolean };
    if (!result?.unlinked) {
      return "Этот чат не привязан к GrowControl.";
    }
    return "Чат отвязан от проекта GrowControl.";
  }

  if (text.startsWith("/status")) {
    const { data, error } = await service.rpc("get_telegram_chat_status", {
      p_chat_id: chatId,
    });
    if (error) {
      console.error("status error", error);
      return "Не удалось получить статус.";
    }
    const result = data as { linked?: boolean; linked_at?: string; project_name?: string };
    if (!result?.linked) {
      return connectHelpText(isGroup);
    }
    const linkedAt = result.linked_at
      ? new Date(result.linked_at).toLocaleDateString("ru-RU")
      : "—";
    const chatLabel = isGroup ? "Командный чат" : "Чат";
    const projectLine = result.project_name ? `\nПроект: ${result.project_name}` : "";
    return `${chatLabel} привязан к проекту GrowControl.${projectLine}\nПодключён: ${linkedAt}`;
  }

  if (text.startsWith("/help")) {
    return helpText(isGroup);
  }

  return null;
}

async function linkChat(
  service: ReturnType<typeof createServiceClient>,
  code: string,
  chatId: string,
  chatTitle: string | null,
  chatType: string,
  isGroup: boolean,
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
      return [
        `Код недействителен или истёк.`,
        ``,
        `Сгенерируйте новый код: ${CONNECT_HINT}.`,
        isGroup
          ? `Затем напишите здесь: <code>/connect НОВЫЙ_КОД</code>`
          : `Для командного чата добавьте бота в группу и выполните <code>/connect КОД</code> там.`,
      ].join("\n");
    }
    if (msg.includes("chat_already_linked")) {
      return "Этот чат уже привязан к другому проекту GrowControl.\n\nСначала напишите <code>/disconnect</code>, затем подключите заново.";
    }
    console.error("link error", error);
    return "Не удалось привязать чат. Попробуйте позже.";
  }

  const result = data as { chat_type?: string; project_name?: string };
  const chatLabel = isGroup ? "Командный чат подключён" : "Чат подключён";
  const projectName = result.project_name ? escapeHtml(result.project_name) : "проект";

  const lines = [
    `<b>${chatLabel}</b>`,
    ``,
    `Проект «${projectName}» привязан к этому чату.`,
    ``,
    `Сюда будут приходить уведомления только по <b>этому проекту</b>:`,
    `• запуск и завершение тестов`,
    `• дедлайны и просрочки`,
    `• гипотезы в бэклоге`,
    `• метрики ниже плана`,
    `• готовность материалов и устаревший аудит`,
  ];

  if (!isGroup) {
    lines.push(
      ``,
      `<b>Для командного чата:</b>`,
      `1. Добавьте @controlgrow_bot в группу`,
      `2. Тот же код (или новый из GrowControl) → <code>/connect ${escapeHtml(code)}</code> в группе`,
    );
  }

  lines.push(
    ``,
    `<code>/status</code> — проверить привязку`,
    `<code>/disconnect</code> — отключить`,
  );

  return lines.join("\n");
}

function connectHelpText(isGroup: boolean): string {
  if (isGroup) {
    return [
      `Чтобы подключить этот командный чат:`,
      ``,
      `1. ${CONNECT_HINT}`,
      `2. Скопируйте код`,
      `3. Напишите: <code>/connect КОД</code>`,
    ].join("\n");
  }
  return [
    `Чат не привязан.`,
    ``,
    `${CONNECT_HINT} → код → <code>/connect КОД</code>`,
    ``,
    `Для командного чата добавьте бота в группу и выполните команду там.`,
  ].join("\n");
}

function helpText(isGroup: boolean): string {
  const lines = [
    `<b>GrowControl Bot</b>`,
    ``,
    isGroup
      ? `Подключает этот командный чат к проекту в GrowControl.`
      : `Подключает чат к проекту в GrowControl.`,
    ``,
    `<code>/connect КОД</code> — привязать чат`,
    `<code>/status</code> — проверить привязку`,
    `<code>/disconnect</code> — отвязать чат`,
    `<code>/help</code> — эта справка`,
    ``,
    `Код: ${CONNECT_HINT}.`,
  ];

  if (!isGroup) {
    lines.push(``, `Для команды: добавьте бота в групповой чат → <code>/connect КОД</code> там.`);
  }

  return lines.join("\n");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
