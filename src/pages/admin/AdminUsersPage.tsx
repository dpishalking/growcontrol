import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Loader2, UserPlus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { createUserByAdmin, generateTempPassword, inviteUserByEmail } from "@/lib/admin/createUser";
import { formatDate } from "@/utils/format";

type Profile = {
  user_id: string;
  email: string | null;
  display_name: string | null;
  created_at: string;
};

export default function AdminUsersPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "invite">("create");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadProfiles = () => {
    setLoading(true);
    setError(null);
    supabase
      .from("profiles")
      .select("user_id,email,display_name,created_at")
      .order("created_at", { ascending: false })
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else setProfiles((data ?? []) as Profile[]);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return profiles;
    return profiles.filter(
      (p) =>
        (p.email ?? "").toLowerCase().includes(query) ||
        (p.display_name ?? "").toLowerCase().includes(query) ||
        p.user_id.toLowerCase().includes(query),
    );
  }, [profiles, q]);

  const resetForm = () => {
    setName("");
    setEmail("");
    setPassword("");
    setMode("create");
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
    toast.success(`Пользователь ${nextEmail} создан. Передайте ему пароль для входа.`);
    setDialogOpen(false);
    resetForm();
    loadProfiles();
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
    toast.success(`Приглашение отправлено на ${nextEmail}`);
    setDialogOpen(false);
    resetForm();
    loadProfiles();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Поиск по e-mail или имени"
            className="pl-9"
          />
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Добавить пользователя
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="p-6 text-sm text-warning">Не удалось загрузить: {error}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="text-left py-3 px-4 font-medium">Имя</th>
                    <th className="text-left py-3 px-4 font-medium">E-mail</th>
                    <th className="text-right py-3 px-4 font-medium">Создан</th>
                    <th className="text-right py-3 px-4 font-medium">Кабинет</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.user_id} className="border-b border-border/30 last:border-0 hover:bg-secondary/30 transition-colors">
                      <td className="py-2.5 px-4 font-medium truncate max-w-[200px]">
                        {p.display_name || "—"}
                      </td>
                      <td className="py-2.5 px-4 text-muted-foreground truncate max-w-[260px]">
                        {p.email || "—"}
                      </td>
                      <td className="py-2.5 px-4 text-right text-xs text-muted-foreground tabular-nums">
                        {formatDate(p.created_at)}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <Button asChild variant="ghost" size="sm">
                          <Link to={`/admin/users/${p.user_id}`}>Открыть</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                        Пользователей пока нет. Нажмите «Добавить пользователя».
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Добавить пользователя</DialogTitle>
          </DialogHeader>

          <Tabs value={mode} onValueChange={(v) => setMode(v as "create" | "invite")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create">Создать аккаунт</TabsTrigger>
              <TabsTrigger value="invite">Пригласить</TabsTrigger>
            </TabsList>

            <div className="space-y-3 pt-3">
              <div className="space-y-2">
                <Label htmlFor="user-name">Имя</Label>
                <Input
                  id="user-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Иван"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-email">E-mail</Label>
                <Input
                  id="user-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="client@example.com"
                />
              </div>

              <TabsContent value="create" className="mt-0 space-y-2">
                <Label htmlFor="user-password">Пароль</Label>
                <div className="flex gap-2">
                  <Input
                    id="user-password"
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
                  Аккаунт создаётся сразу. Передайте клиенту e-mail и пароль для входа на /auth.
                </p>
              </TabsContent>

              <TabsContent value="invite" className="mt-0">
                <p className="text-xs text-muted-foreground">
                  На почту уйдёт письмо со ссылкой — пользователь сам задаст пароль при первом входе.
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
    </div>
  );
}
