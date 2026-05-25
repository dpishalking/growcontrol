import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
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
  status: string;
  last_activity_at: string;
  metadata: Record<string, unknown> | null;
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
            .select("id,name,status,last_activity_at,metadata")
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
          const ev = await supabase
            .from("project_events")
            .select("id,title,event_type,description,created_at,project_id")
            .in("project_id", ids)
            .order("created_at", { ascending: false })
            .limit(20);
          if (!cancel && !ev.error) setEvents((ev.data ?? []) as EventRow[]);
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
          {error ? `Не удалось загрузить: ${error}` : "Пользователь не найден"}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/admin/users">
          <ArrowLeft className="mr-2 h-4 w-4" />
          К списку пользователей
        </Link>
      </Button>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{profile.display_name || profile.email || "Пользователь"}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <span className="text-muted-foreground">E-mail: </span>
            {profile.email || "—"}
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
            <span className="text-muted-foreground">Средняя заполненность: </span>
            {avgCompleteness}%
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Кабинеты (проекты)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {projects.length === 0 ? (
            <p className="text-muted-foreground">Пользователь ещё не создал проектов.</p>
          ) : (
            projects.map((p) => {
              const meta = (p.metadata ?? {}) as {
                completenessScore?: number;
                funnelCount?: number;
                hypothesesTesting?: number;
                maxWizardStep?: number;
              };
              return (
                <div key={p.id} className="rounded-lg border border-border/50 p-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium truncate">{p.name}</span>
                    <Badge variant="outline" className="chip">
                      {p.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground grid gap-1 sm:grid-cols-2">
                    <span>Заполненность: {meta.completenessScore ?? 0}%</span>
                    <span>Воронок: {meta.funnelCount ?? 0}</span>
                    <span>Гипотез в тесте: {meta.hypothesesTesting ?? 0}</span>
                    <span>Шаг визарда: {meta.maxWizardStep ?? 0}</span>
                    <span>Активность: {formatDate(p.last_activity_at)}</span>
                  </div>
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
