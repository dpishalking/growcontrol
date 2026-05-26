import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { profileIdentifier } from "@/lib/authLogin";
import { AdminHypothesisCard } from "@/components/admin/AdminHypothesisCard";

type Row = {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  expected_impact: string | null;
  created_at: string;
};

type ProjectRow = { id: string; user_id: string; name: string };
type ProfileRow = { user_id: string; email: string | null; display_name: string | null };

export default function AdminHypothesesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [projects, setProjects] = useState<Record<string, ProjectRow>>({});
  const [profiles, setProfiles] = useState<Record<string, ProfileRow>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const [hy, pr, pf] = await Promise.all([
          supabase
            .from("hypotheses")
            .select("id,project_id,title,description,status,priority,expected_impact,created_at")
            .order("created_at", { ascending: false }),
          supabase.from("projects").select("id,user_id,name"),
          supabase.from("profiles").select("user_id,email,display_name"),
        ]);
        if (cancel) return;
        if (hy.error) throw hy.error;
        if (pr.error) throw pr.error;
        if (pf.error) throw pf.error;

        setRows((hy.data ?? []) as Row[]);
        const projectMap: Record<string, ProjectRow> = {};
        ((pr.data ?? []) as ProjectRow[]).forEach((p) => {
          projectMap[p.id] = p;
        });
        setProjects(projectMap);
        const profileMap: Record<string, ProfileRow> = {};
        ((pf.data ?? []) as ProfileRow[]).forEach((p) => {
          profileMap[p.user_id] = p;
        });
        setProfiles(profileMap);
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
    if (!query) return rows;
    return rows.filter((r) => {
      const project = projects[r.project_id];
      const owner = project ? profiles[project.user_id] : undefined;
      const ownerLabel = owner ? profileIdentifier(owner) : "";
      const projectName = project?.name ?? "";
      return (
        r.title.toLowerCase().includes(query) ||
        projectName.toLowerCase().includes(query) ||
        ownerLabel.toLowerCase().includes(query) ||
        (owner?.display_name ?? "").toLowerCase().includes(query)
      );
    });
  }, [rows, projects, profiles, q]);

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Поиск по гипотезе, проекту или участнику"
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
            <div className="divide-y divide-border/30">
              {filtered.map((h) => {
                const project = projects[h.project_id];
                const owner = project ? profiles[project.user_id] : undefined;
                return (
                  <div key={h.id} className="p-4 space-y-3 hover:bg-secondary/20 transition-colors">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {owner ? (
                        <Button asChild variant="link" size="sm" className="h-auto p-0 text-foreground">
                          <Link to={`/admin/users/${owner.user_id}`}>{profileIdentifier(owner)}</Link>
                        </Button>
                      ) : (
                        <span>—</span>
                      )}
                      <span aria-hidden>·</span>
                      <span className="truncate max-w-[240px]">{project?.name ?? "—"}</span>
                    </div>
                    <AdminHypothesisCard hypothesis={h} />
                  </div>
                );
              })}
              {filtered.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">Гипотез не найдено</div>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
