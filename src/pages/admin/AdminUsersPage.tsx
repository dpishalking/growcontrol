import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Loader2, UserPlus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAdminShell } from "@/components/admin/AdminShellContext";
import { fetchAdminProfiles, type AdminProfile } from "@/lib/admin/fetchProfiles";
import { profileIdentifier } from "@/lib/authLogin";
import { formatDate } from "@/utils/format";

export default function AdminUsersPage() {
  const { refreshToken, openAddParticipant } = useAdminShell();
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const loadProfiles = useCallback(async (withRetry = false) => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await fetchAdminProfiles(withRetry ? { retries: 4, delayMs: 350 } : undefined);
    if (err) setError(err);
    else setProfiles(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadProfiles(refreshToken > 0);
  }, [loadProfiles, refreshToken]);

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

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Поиск по логину или имени"
            className="pl-9"
          />
        </div>
        <Button onClick={openAddParticipant}>
          <UserPlus className="mr-2 h-4 w-4" />
          Добавить участника
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
                    <th className="text-left py-3 px-4 font-medium">Логин</th>
                    <th className="text-left py-3 px-4 font-medium">Имя</th>
                    <th className="text-right py-3 px-4 font-medium">Создан</th>
                    <th className="text-right py-3 px-4 font-medium">Кабинет</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.user_id} className="border-b border-border/30 last:border-0 hover:bg-secondary/30 transition-colors">
                      <td className="py-2.5 px-4 font-medium truncate max-w-[200px]">
                        {profileIdentifier(p)}
                      </td>
                      <td className="py-2.5 px-4 text-muted-foreground truncate max-w-[260px]">
                        {p.display_name && p.display_name !== profileIdentifier(p) ? p.display_name : "—"}
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
                        Участников пока нет. Нажмите «Добавить участника».
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
