import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ChevronDown, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { profileIdentifier } from "@/lib/authLogin";
import { AdminHypothesisCard } from "@/components/admin/AdminHypothesisCard";
import { AdminProjectPlanPanel } from "@/components/admin/AdminProjectPlanPanel";
import { buildProjectPlanOfAction } from "@/lib/admin/projectPlanOfAction";
import { formatDate } from "@/utils/format";

type Profile = {
  user_id: string;
  email: string | null;
  display_name: string | null;
  created_at: string;
};

type ProjectRow = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  last_activity_at: string;
  metadata: Record<string, unknown> | null;
};

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

type EventRow = {
  id: string;
  title: string;
  event_type: string;
  description: string | null;
  created_at: string;
  project_id: string;
};

export default function AdminUserDetailPage() {
  const { userId = "" } = useParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [hypotheses, setHypotheses] = useState<HypothesisRow[]>([]);
  const [experiments, setExperiments] = useState<ExperimentRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const [pf, pr] = await Promise.all([
          supabase
            .from("profiles")
            .select("user_id,email,display_name,created_at")
            .eq("user_id", userId)
            .maybeSingle(),
          supabase
            .from("projects")
            .select("id,name,description,status,last_activity_at,metadata")
            .eq("user_id", userId)
            .order("last_activity_at", { ascending: false }),
        ]);
        if (cancel) return;
        if (pf.error) throw pf.error;
        if (pr.error) throw pr.error;
        setProfile((pf.data as Profile | null) ?? null);
        const projectRows = (pr.data ?? []) as ProjectRow[];
        setProjects(projectRows);

        if (projectRows.length > 0) {
          const ids = projectRows.map((p) => p.id);
          const [hy, ex, ev] = await Promise.all([
            supabase
              .from("hypotheses")
              .select(
                "id,project_id,app_id,title,description,status,priority,expected_impact,created_at",
              )
              .in("project_id", ids)
              .order("created_at", { ascending: false }),
            supabase
              .from("experiments")
              .select(
                "project_id,hypothesis_id,app_hyp_id,owner,start_date,end_date,status",
              )
              .in("project_id", ids),
            supabase
              .from("project_events")
              .select("id,title,event_type,description,created_at,project_id")
              .in("project_id", ids)
              .order("created_at", { ascending: false })
              .limit(20),
          ]);
          if (!cancel) {
            if (!hy.error) setHypotheses((hy.data ?? []) as HypothesisRow[]);
            if (!ex.error) setExperiments((ex.data ?? []) as ExperimentRow[]);
            if (!ev.error) setEvents((ev.data ?? []) as EventRow[]);
          }
        } else {
          setHypotheses([]);
          setExperiments([]);
          setEvents([]);
        }
      } catch (e) {
        if (!cancel) setError((e as Error).message);
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [userId]);

  const hypothesesByProject = useMemo(() => {
    const map = new Map<string, HypothesisRow[]>();
    for (const h of hypotheses) {
      const list = map.get(h.project_id) ?? [];
      list.push(h);
      map.set(h.project_id, list);
    }
    return map;
  }, [hypotheses]);

  const avgCompleteness = useMemo(() => {
    if (!projects.length) return 0;
    const sum = projects.reduce((acc, p) => {
      const score = Number((p.metadata as { completenessScore?: number } | null)?.completenessScore ?? 0);
      return acc + score;
    }, 0);
    return Math.round(sum / projects.length);
  }, [projects]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <Card className="border-warning-soft bg-warning-soft">
        <CardContent className="p-4 text-sm text-warning">
          {error ? `Не удалось загрузить: ${error}` : "Участник не найден"}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/admin/users">
          <ArrowLeft className="mr-2 h-4 w-4" />
          К списку участников
        </Link>
      </Button>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{profile.display_name || profileIdentifier(profile)}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <span className="text-muted-foreground">Логин: </span>
            {profileIdentifier(profile)}
          </div>
          <div>
            <span className="text-muted-foreground">E-mail: </span>
            {profile.email && !profile.email.includes("@login.controlgrow.ru")
              ? profile.email
              : "—"}
          </div>
          <div>
            <span className="text-muted-foreground">Регистрация: </span>
            {formatDate(profile.created_at)}
          </div>
          <div>
            <span className="text-muted-foreground">Проектов: </span>
            {projects.length}
          </div>
          <div>
            <span className="text-muted-foreground">Гипотез: </span>
            {hypotheses.length}
          </div>
          <div>
            <span className="text-muted-foreground">Средняя заполненность: </span>
            {avgCompleteness}%
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Проекты и план действий</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {projects.length === 0 ? (
            <p className="text-muted-foreground">Участник ещё не создал проектов.</p>
          ) : (
            projects.map((p) => {
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
              const projectHypotheses = hypothesesByProject.get(p.id) ?? [];
              const plan = buildProjectPlanOfAction(
                p.id,
                meta,
                p.description,
                hypotheses,
                experiments,
              );

              return (
                <div key={p.id} className="rounded-lg border border-border/50 overflow-hidden">
                  <div className="p-3 space-y-1 bg-secondary/20">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium truncate">{p.name}</span>
                      <Badge variant="outline" className="chip">
                        {p.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                      <span>Заполненность: {meta.completenessScore ?? 0}%</span>
                      <span>Воронок: {meta.funnelCount ?? 0}</span>
                      <span>Гипотез: {projectHypotheses.length}</span>
                      <span>В тесте: {plan.activeTests.length}</span>
                      <span>В очереди: {plan.queue.length}</span>
                      <span>Активность: {formatDate(p.last_activity_at)}</span>
                    </div>
                  </div>

                  <div className="border-t border-border/30 p-3">
                    <AdminProjectPlanPanel plan={plan} />
                  </div>

                  {projectHypotheses.length === 0 ? (
                    <p className="px-3 py-2.5 text-xs text-muted-foreground border-t border-border/30">
                      Гипотез в этом проекте пока нет.
                    </p>
                  ) : (
                    <details className="border-t border-border/30 group">
                      <summary className="cursor-pointer list-none px-3 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground flex items-center justify-between">
                        <span>Подробнее по гипотезам ({projectHypotheses.length})</span>
                        <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                      </summary>
                      <div className="px-3 pb-3 space-y-3">
                        {projectHypotheses.map((h) => (
                          <AdminHypothesisCard key={h.id} hypothesis={h} />
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Последние действия</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {events.length === 0 ? (
            <p className="text-muted-foreground">Событий пока нет.</p>
          ) : (
            events.map((e) => (
              <div key={e.id} className="flex justify-between gap-3 border-b border-border/30 pb-2 last:border-0">
                <div>
                  <div className="font-medium">{e.title}</div>
                  {e.description ? <div className="text-xs text-muted-foreground">{e.description}</div> : null}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{formatDate(e.created_at)}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
