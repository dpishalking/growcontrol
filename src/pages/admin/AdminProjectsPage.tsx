import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdminProjectPlanPanel } from "@/components/admin/AdminProjectPlanPanel";
import { supabase } from "@/integrations/supabase/client";
import { profileIdentifier } from "@/lib/authLogin";
import { buildProjectPlanOfAction } from "@/lib/admin/projectPlanOfAction";
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

type HypothesisRow = {
  id: string;
  project_id: string;
  app_id: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  expected_impact: string | null;
  created_at: string;
};

type ExperimentRow = {
  project_id: string;
  hypothesis_id: string | null;
  app_hyp_id: string | null;
  owner: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
};

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileRow>>({});
  const [hypotheses, setHypotheses] = useState<HypothesisRow[]>([]);
  const [experiments, setExperiments] = useState<ExperimentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const [pr, pf, hy, ex] = await Promise.all([
          supabase
            .from("projects")
            .select("id,user_id,name,description,status,created_at,last_activity_at,metadata")
            .order("last_activity_at", { ascending: false }),
          supabase.from("profiles").select("user_id,email,display_name"),
          supabase
            .from("hypotheses")
            .select(
              "id,project_id,app_id,title,description,status,priority,expected_impact,created_at",
            ),
          supabase
            .from("experiments")
            .select("project_id,hypothesis_id,app_hyp_id,owner,start_date,end_date,status"),
        ]);
        if (cancel) return;
        if (pr.error) throw pr.error;
        if (pf.error) throw pf.error;
        if (hy.error) throw hy.error;
        if (ex.error) throw ex.error;

        setProjects((pr.data ?? []) as ProjectRow[]);
        const map: Record<string, ProfileRow> = {};
        ((pf.data ?? []) as ProfileRow[]).forEach((p) => {
          map[p.user_id] = p;
        });
        setProfiles(map);
        setHypotheses((hy.data ?? []) as HypothesisRow[]);
        setExperiments((ex.data ?? []) as ExperimentRow[]);
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
            <div className="divide-y divide-border/30">
              {filtered.map((p) => {
                const owner = profiles[p.user_id];
                const meta = (p.metadata ?? {}) as {
                  completenessScore?: number;
                  funnelCount?: number;
                  hypothesesTesting?: number;
                  hypothesesQueued?: number;
                  maxWizardStep?: number;
                  wizardStepTitle?: string | null;
                  mainGoal?: string;
                  northStarMetric?: string;
                };
                const plan = buildProjectPlanOfAction(
                  p.id,
                  meta,
                  p.description,
                  hypotheses,
                  experiments,
                );

                return (
                  <div key={p.id} className="p-4 space-y-3 hover:bg-secondary/20 transition-colors">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="font-medium">{p.name}</div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          {owner ? (
                            <Button asChild variant="link" size="sm" className="h-auto p-0 text-foreground">
                              <Link to={`/admin/users/${owner.user_id}`}>
                                {profileIdentifier(owner)}
                              </Link>
                            </Button>
                          ) : (
                            <span>{p.user_id.slice(0, 8)}</span>
                          )}
                          <span>
                            {meta.completenessScore ?? 0}% · {meta.funnelCount ?? 0} воронок
                          </span>
                          <span className="tabular-nums">{formatDate(p.last_activity_at)}</span>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={p.status === "active" ? "chip chip-success" : "chip"}
                      >
                        {p.status}
                      </Badge>
                    </div>

                    <div className="rounded-xl border border-border/40 bg-card/20 p-3">
                      <AdminProjectPlanPanel plan={plan} compact />
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">Проектов не найдено</div>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
