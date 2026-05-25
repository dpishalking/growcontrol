import { useEffect, useMemo, useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/utils/format";

type ProjectRow = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  status: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  last_activity_at: string;
};

type ProfileRow = { user_id: string; email: string | null; display_name: string | null };

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileRow>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const [pr, pf] = await Promise.all([
          supabase.from("projects").select("id,user_id,name,description,status,created_at,last_activity_at,metadata").order("last_activity_at", { ascending: false }),
          supabase.from("profiles").select("user_id,email,display_name"),
        ]);
        if (cancel) return;
        if (pr.error) throw pr.error;
        if (pf.error) throw pf.error;
        setProjects((pr.data ?? []) as ProjectRow[]);
        const map: Record<string, ProfileRow> = {};
        ((pf.data ?? []) as ProfileRow[]).forEach((p) => {
          map[p.user_id] = p;
        });
        setProfiles(map);
      } catch (e) {
        if (!cancel) setError((e as Error).message);
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return projects;
    return projects.filter((p) => {
      const ownerEmail = profiles[p.user_id]?.email ?? "";
      return (
        p.name.toLowerCase().includes(query) ||
        ownerEmail.toLowerCase().includes(query)
      );
    });
  }, [projects, profiles, q]);

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск проекта или владельца" className="pl-9" />
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
                    <th className="text-left py-3 px-4 font-medium">Проект</th>
                    <th className="text-left py-3 px-4 font-medium">Владелец</th>
                    <th className="text-left py-3 px-4 font-medium">Прогресс</th>
                    <th className="text-left py-3 px-4 font-medium">Статус</th>
                    <th className="text-right py-3 px-4 font-medium">Активность</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => {
                    const owner = profiles[p.user_id];
                    const meta = (p.metadata ?? {}) as { completenessScore?: number; funnelCount?: number };
                    return (
                      <tr key={p.id} className="border-b border-border/30 last:border-0 hover:bg-secondary/30">
                        <td className="py-2.5 px-4 font-medium max-w-[260px] truncate">{p.name}</td>
                        <td className="py-2.5 px-4 text-muted-foreground max-w-[220px] truncate">
                          {owner?.display_name || owner?.email || p.user_id.slice(0, 8)}
                        </td>
                        <td className="py-2.5 px-4 text-xs text-muted-foreground">
                          {meta.completenessScore ?? 0}% · {meta.funnelCount ?? 0} воронок
                        </td>
                        <td className="py-2.5 px-4">
                          <Badge
                            variant="outline"
                            className={p.status === "active" ? "chip chip-success" : "chip"}
                          >
                            {p.status}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-4 text-right text-xs text-muted-foreground tabular-nums">
                          {formatDate(p.last_activity_at)}
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                        Проектов не найдено
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
