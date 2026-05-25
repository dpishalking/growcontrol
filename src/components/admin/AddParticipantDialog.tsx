import { useState, type ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createUserByAdmin, generateTempPassword, inviteUserByEmail } from "@/lib/admin/createUser";

type Props = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
  trigger?: ReactNode;
};

export function AddParticipantDialog({ open, onOpenChange, onSuccess, trigger }: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "invite">("create");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isControlled = open !== undefined;
  const dialogOpen = isControlled ? open : internalOpen;

  const resetForm = () => {
    setName("");
    setEmail("");
    setPassword("");
    setMode("create");
  };

  const setDialogOpen = (next: boolean) => {
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
    if (!next) resetForm();
  };

  const finishSuccess = (message: string) => {
    toast.success(message);
    setDialogOpen(false);
    onSuccess?.();
  };

  const handleCreate = async () => {
    const nextEmail = email.trim().toLowerCase();
    if (!nextEmail || password.length < 6) {
      toast.error("Укажите e-mail и пароль (минимум 6 символов)");
      return;
    }
    setSubmitting(true);
    const result = await createUserByAdmin({ email: nextEmail, password, name });
    setSubmitting(false);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    finishSuccess(`Участник ${nextEmail} создан. Передайте ему пароль для входа.`);
  };

  const handleInvite = async () => {
    const nextEmail = email.trim().toLowerCase();
    if (!nextEmail) {
      toast.error("Укажите e-mail");
      return;
    }
    setSubmitting(true);
    const result = await inviteUserByEmail(nextEmail, name);
    setSubmitting(false);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    finishSuccess(`Приглашение отправлено на ${nextEmail}. Участник появится в списке.`);
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Добавить участника</DialogTitle>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as "create" | "invite")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">Создать аккаунт</TabsTrigger>
            <TabsTrigger value="invite">Пригласить</TabsTrigger>
          </TabsList>

          <div className="space-y-3 pt-3">
            <div className="space-y-2">
              <Label htmlFor="participant-name">Имя</Label>
              <Input
                id="participant-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Иван"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="participant-email">E-mail</Label>
              <Input
                id="participant-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="client@example.com"
              />
            </div>

            <TabsContent value="create" className="mt-0 space-y-2">
              <Label htmlFor="participant-password">Пароль</Label>
              <div className="flex gap-2">
                <Input
                  id="participant-password"
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="минимум 6 символов"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  title="Сгенерировать пароль"
                  onClick={() => setPassword(generateTempPassword())}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Аккаунт создаётся сразу. Передайте участнику e-mail и пароль для входа на /auth.
              </p>
            </TabsContent>

            <TabsContent value="invite" className="mt-0">
              <p className="text-xs text-muted-foreground">
                На почту уйдёт письмо со ссылкой — участник сам задаст пароль при первом входе.
              </p>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>
            Отмена
          </Button>
          {mode === "create" ? (
            <Button onClick={handleCreate} disabled={submitting || !email.trim() || password.length < 6}>
              {submitting ? "Создание…" : "Создать"}
            </Button>
          ) : (
            <Button onClick={handleInvite} disabled={submitting || !email.trim()}>
              {submitting ? "Отправка…" : "Отправить приглашение"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
