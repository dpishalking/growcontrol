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
import { createUserByAdmin, generateTempPassword } from "@/lib/admin/createUser";

type Props = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
  trigger?: ReactNode;
};

export function AddParticipantDialog({ open, onOpenChange, onSuccess, trigger }: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [name, setName] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isControlled = open !== undefined;
  const dialogOpen = isControlled ? open : internalOpen;

  const resetForm = () => {
    setName("");
    setLogin("");
    setPassword("");
  };

  const setDialogOpen = (next: boolean) => {
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
    if (!next) resetForm();
  };

  const handleCreate = async () => {
    const nextLogin = login.trim();
    if (!nextLogin || password.length < 6) {
      toast.error("Укажите логин и пароль (минимум 6 символов)");
      return;
    }
    setSubmitting(true);
    const result = await createUserByAdmin({ login: nextLogin, password, name });
    setSubmitting(false);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    const createdLogin = result.login ?? nextLogin.toLowerCase();
    toast.success(`Участник «${createdLogin}» создан`);
    setDialogOpen(false);
    onSuccess?.();
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Добавить участника</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          <div className="space-y-2">
            <Label htmlFor="participant-login">Логин</Label>
            <Input
              id="participant-login"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder="ivan_petrov"
              autoComplete="off"
            />
            <p className="text-[11px] text-muted-foreground">
              Латиница, цифры, точка, _ или -. От 3 символов.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="participant-name">Имя (необязательно)</Label>
            <Input
              id="participant-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Иван"
            />
          </div>

          <div className="space-y-2">
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
              Передайте участнику логин и пароль для входа на /auth.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>
            Отмена
          </Button>
          <Button onClick={handleCreate} disabled={submitting || !login.trim() || password.length < 6}>
            {submitting ? "Создание…" : "Создать"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
