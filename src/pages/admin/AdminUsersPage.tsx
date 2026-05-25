import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Loader2, UserPlus } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { inviteUserByEmail } from "@/lib/admin/inviteUser";
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
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);

  const loadProfiles = () => {
    setLoading(true);
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

  const handleInvite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;
    setInviting(true);
    const result = await inviteUserByEmail(email);
    setInviting(false);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success(`Приглашение отправлено на ${email}`);
    setInviteOpen(false);
    setInviteEmail("");
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
        <Button onClick={() => setInviteOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Пригласить пользователя
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
                        Ничего не найдено
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Пригласить пользователя</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="invite-email">E-mail</Label>
            <Input
              id="invite-email"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="client@example.com"
            />
            <p className="text-xs text-muted-foreground">
              На почту уйдёт письмо со ссылкой для входа в GrowControl.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}>
              {inviting ? "Отправка…" : "Отправить приглашение"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
