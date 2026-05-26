import { useCallback, useEffect, useState } from "react";
import { Copy, ExternalLink, MessageCircle, RefreshCw, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { formatDate } from "@/utils/format";
import {
  createProjectTelegramConnectCode,
  getProjectTelegramChats,
  telegramBotUsername,
  telegramChatOpenUrl,
  unlinkProjectTelegramChat,
  type TelegramConnectCode,
  type TelegramLinkedChat,
} from "@/services/telegramService";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  appProjectId: string;
  compact?: boolean;
};

function chatTypeLabel(type: string | null): string {
  switch (type) {
    case "private":
      return "личный чат";
    case "group":
      return "группа";
    case "supergroup":
      return "группа";
    case "channel":
      return "канал";
    default:
      return "чат";
  }
}

export function TelegramConnectCard({ appProjectId, compact = false }: Props) {
  const [loading, setLoading] = useState(false);
  const [chats, setChats] = useState<TelegramLinkedChat[]>([]);
  const [connectCode, setConnectCode] = useState<TelegramConnectCode | null>(null);

  const loadChats = useCallback(async () => {
    const list = await getProjectTelegramChats(appProjectId);
    setChats(list);
  }, [appProjectId]);

  useEffect(() => {
    void loadChats();
  }, [loadChats]);

  const handleGenerateCode = async () => {
    setLoading(true);

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setLoading(false);
      toast.error("Войдите в аккаунт — в гостевом режиме Telegram недоступен");
      return;
    }

    const result = await createProjectTelegramConnectCode(appProjectId);
    setLoading(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    setConnectCode(result.code);
    toast.success("Код создан — действует 30 минут");
  };

  const handleCopyCommand = async () => {
    if (!connectCode) return;
    const cmd = `/connect ${connectCode.code}`;
    await navigator.clipboard.writeText(cmd);
    toast.success("Команда скопирована");
  };

  const handleUnlink = async (chatId: string) => {
    const ok = await unlinkProjectTelegramChat(appProjectId, chatId);
    if (ok) {
      toast.success("Чат отвязан от проекта");
      void loadChats();
    } else {
      toast.error("Не удалось отвязать чат");
    }
  };

  const botName = telegramBotUsername();
  const codeExpired = connectCode
    ? new Date(connectCode.expires_at).getTime() < Date.now()
    : false;

  const body = (
    <>
      {!compact ? (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-medium">
              <MessageCircle className="h-4 w-4 text-primary" />
              Telegram
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Уведомления по этому проекту — тесты, метрики, дедлайны. Чат привязывается только к
              текущему проекту.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void loadChats()}
            aria-label="Обновить список чатов"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : null}

      {chats.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Подключённые чаты
            </p>
            {compact ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 w-7 shrink-0 p-0 text-muted-foreground"
                onClick={() => void loadChats()}
                aria-label="Обновить список чатов"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            ) : null}
          </div>
          {chats.map((chat) => (
            <div
              key={chat.chat_id}
              className="flex flex-col gap-2 rounded-lg border border-border/50 bg-background/40 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {chat.chat_title || `Чат ${chat.chat_id}`}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {chatTypeLabel(chat.chat_type)} · с {formatDate(chat.linked_at)}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-1.5 sm:justify-end">
                <Button asChild size="sm" variant="outline" className="h-8">
                  <a
                    href={telegramChatOpenUrl(chat)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                    Открыть чат
                  </a>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 text-muted-foreground hover:text-destructive"
                  onClick={() => void handleUnlink(chat.chat_id)}
                >
                  <Unlink className="mr-1.5 h-3.5 w-3.5" />
                  Отвязать
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={compact ? "flex items-start justify-between gap-3" : undefined}>
          <p className="text-xs text-muted-foreground">
            Чат ещё не подключён к этому проекту. Сгенерируйте код и выполните команду в Telegram.
          </p>
          {compact ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 w-7 shrink-0 p-0 text-muted-foreground"
              onClick={() => void loadChats()}
              aria-label="Обновить список чатов"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          ) : null}
        </div>
      )}

      {connectCode && !codeExpired ? (
        <div className="space-y-3 rounded-lg border border-primary/25 bg-primary/5 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">Код активации (30 мин)</p>
            <span className="font-mono text-lg font-semibold tracking-widest text-primary">
              {connectCode.code}
            </span>
          </div>

          <ol className="space-y-1.5 text-xs text-muted-foreground">
            <li>
              1. Добавьте @{botName} в <strong className="text-foreground">командный чат</strong>
            </li>
            <li>
              2. Напишите <strong className="text-foreground">в группе</strong> (не в личке бота):{" "}
              <code className="rounded bg-background/60 px-1 py-0.5 text-foreground">
                /connect {connectCode.code}
              </code>
            </li>
            <li>3. Один код — один проект. Повторите для других проектов отдельно.</li>
          </ol>

          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => void handleCopyCommand()}>
              <Copy className="mr-1.5 h-3.5 w-3.5" />
              Скопировать команду
            </Button>
          </div>
        </div>
      ) : null}

      <Button
        type="button"
        size="sm"
        variant={chats.length > 0 ? "outline" : "default"}
        className={chats.length === 0 ? "bg-gradient-money text-primary-foreground" : undefined}
        disabled={loading}
        onClick={() => void handleGenerateCode()}
      >
        {connectCode && !codeExpired ? "Новый код" : "Подключить Telegram"}
      </Button>
    </>
  );

  if (compact) {
    return <div className="space-y-4">{body}</div>;
  }

  return (
    <Card className="border-border/60 bg-card/40">
      <CardContent className="space-y-4 p-4">{body}</CardContent>
    </Card>
  );
}
