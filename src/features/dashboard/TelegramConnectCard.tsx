import { useCallback, useEffect, useState } from "react";
import { Copy, MessageCircle, RefreshCw, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { formatDate } from "@/utils/format";
import {
  createTelegramConnectCode,
  getProjectTelegramChats,
  telegramBotUsername,
  unlinkProjectTelegramChat,
  type TelegramConnectCode,
  type TelegramLinkedChat,
} from "@/services/telegramService";
import { useAppData } from "@/context/AppDataContext";
import { syncProjectToRemote } from "@/services/projectSyncService";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  projectId: string;
  projectName: string;
  compact?: boolean;
};

export function TelegramConnectCard({ projectId, projectName, compact = false }: Props) {
  const { store, getProject } = useAppData();
  const [loading, setLoading] = useState(false);
  const [chats, setChats] = useState<TelegramLinkedChat[]>([]);
  const [connectCode, setConnectCode] = useState<TelegramConnectCode | null>(null);

  const loadChats = useCallback(async () => {
    const list = await getProjectTelegramChats(projectId);
    setChats(list);
  }, [projectId]);

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

    const project = getProject(projectId);
    if (project) {
      const syncResult = await syncProjectToRemote(project, store);
      if (!syncResult.ok) {
        setLoading(false);
        toast.error(`Синхронизация проекта: ${syncResult.error ?? "ошибка"}`);
        return;
      }
    }

    const result = await createTelegramConnectCode(projectId);
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
    const ok = await unlinkProjectTelegramChat(projectId, chatId);
    if (ok) {
      toast.success("Чат отвязан");
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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-medium">
              <MessageCircle className="h-4 w-4 text-primary" />
              Telegram для команды
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Уведомления о тестах и напоминания по метрикам — только для «{projectName}»
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

        {chats.length > 0 ? (
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Подключённые чаты
            </p>
            {chats.map((chat) => (
              <div
                key={chat.chat_id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-background/40 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {chat.chat_title || `Чат ${chat.chat_id}`}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {chat.chat_type ?? "чат"} · с {formatDate(chat.linked_at)}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => void handleUnlink(chat.chat_id)}
                >
                  <Unlink className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Чат ещё не подключён. Сгенерируйте код и выполните команду в Telegram.
          </p>
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
              <li>1. Добавьте @{botName} в <strong className="text-foreground">командный чат</strong></li>
              <li>
                2. Напишите <strong className="text-foreground">в группе</strong> (не в личке бота):{" "}
                <code className="rounded bg-background/60 px-1 py-0.5 text-foreground">
                  /connect {connectCode.code}
                </code>
              </li>
              <li>3. Один код можно использовать и в личке, и в группе — пока не истёк (30 мин)</li>
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
