import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { profileIdentifier } from "@/lib/authLogin";
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
  const [hypothesisCounts, setHypothesisCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const [pr, pf, hy] = await Promise.all([
          supabase
            .from("projects")
            .select("id,user_id,name,description,status,created_at,last_activity_at,metadata")
            .order("last_activity_at", { ascending: false }),
          supabase.from("profiles").select("user_id,email,display_name"),
          supabase.from("hypotheses").select("project_id"),
        ]);
        if (cancel) return;
        if (pr.error) throw pr.error;
        if (pf.error) throw pf.error;
        if (hy.error) throw hy.error;

        setProjects((pr.data ?? []) as ProjectRow[]);
        const map: Record<string, ProfileRow> = {};
        ((pf.data ?? []) as ProfileRow[]).forEach((p) => {
          map[p.user_id] = p;
        });
        setProfiles(map);

        const counts: Record<string, number> = {};
        ((hy.data ?? []) as { project_id: string }[]).forEach((h) => {
          counts[h.project_id] = (counts[h.project_id] ?? 0) + 1;
        });
        setHypothesisCounts(counts);
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
      const owner = profiles[p.user_id];
      const ownerLabel = owner ? profileIdentifier(owner) : "";
      return (
        p.name.toLowerCase().includes(query) ||
        ownerLabel.toLowerCase().includes(query) ||
        (owner?.display_name ?? "").toLowerCase().includes(query)
      );
    });
  }, [projects, profiles, q]);

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Поиск проекта или участника"
          className="pl-9"
        />
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
                    <th className="text-left py-3 px-4 font-medium">Участник</th>
                    <th className="text-left py-3 px-4 font-medium">Прогресс</th>
                    <th className="text-left py-3 px-4 font-medium">Гипотез</th>
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
                        <td className="py-2.5 px-4 max-w-[200px]">
                          {owner ? (
                            <Button asChild variant="link" size="sm" className="h-auto p-0 text-foreground">
                              <Link to={`/admin/users/${owner.user_id}`}>{profileIdentifier(owner)}</Link>
                            </Button>
                          ) : (
                            <span className="text-muted-foreground">{p.user_id.slice(0, 8)}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-xs text-muted-foreground">
                          {meta.completenessScore ?? 0}% · {meta.funnelCount ?? 0} воронок
                        </td>
                        <td className="py-2.5 px-4 text-muted-foreground tabular-nums">
                          {hypothesisCounts[p.id] ?? 0}
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
                      <td colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
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
