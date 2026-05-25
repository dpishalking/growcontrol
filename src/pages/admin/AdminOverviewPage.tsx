import { useCallback, useEffect, useState } from "react";
import { FlaskConical, FolderKanban, Users, Activity, UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/admin/MetricCard";
import { useAdminShell } from "@/components/admin/AdminShellContext";
import { fetchAdminProfiles, type AdminProfile } from "@/lib/admin/fetchProfiles";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/utils/format";

type ProjectRow = { id: string; user_id: string; name: string; status: string; created_at: string; last_activity_at: string };
type HypothesisRow = { id: string; project_id: string; title: string; status: string; created_at: string };
type EventRow = { id: string; title: string; description: string | null; created_at: string; event_type: string };

export default function AdminOverviewPage() {
  const { refreshToken, openAddParticipant } = useAdminShell();
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [hypotheses, setHypotheses] = useState<HypothesisRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (withProfileRetry = false) => {
    setLoading(true);
    setError(null);
    try {
      const [p, pr, h, ev] = await Promise.all([
        fetchAdminProfiles(withProfileRetry ? { retries: 4, delayMs: 350 } : undefined),
        supabase.from("projects").select("id,user_id,name,status,created_at,last_activity_at").order("last_activity_at", { ascending: false }),
        supabase.from("hypotheses").select("id,project_id,title,status,created_at").order("created_at", { ascending: false }),
        supabase.from("project_events").select("id,title,description,created_at,event_type").order("created_at", { ascending: false }).limit(12),
      ]);
      if (p.error) throw new Error(p.error);
      if (pr.error) throw pr.error;
      if (h.error) throw h.error;
      if (ev.error) throw ev.error;
      setProfiles(p.data);
      setProjects((pr.data ?? []) as ProjectRow[]);
      setHypotheses((h.data ?? []) as HypothesisRow[]);
      setEvents((ev.data ?? []) as EventRow[]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(refreshToken > 0);
  }, [loadData, refreshToken]);

  const last7d = (iso: string) => Date.now() - new Date(iso).getTime() < 7 * 24 * 60 * 60 * 1000;
  const newProfiles7d = profiles.filter((p) => last7d(p.created_at)).length;
  const activeProjects = projects.filter((p) => p.status === "active").length;
  const testingHypotheses = hypotheses.filter((h) => h.status === "testing").length;

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Сводка</h2>
          <Button size="sm" variant="outline" onClick={openAddParticipant}>
            <UserPlus className="mr-2 h-4 w-4" />
            Добавить участника
          </Button>
        </header>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard title="Участников" value={profiles.length} hint={`+${newProfiles7d} за 7 дней`} icon={<Users className="h-4 w-4" />} tone="primary" />
          <MetricCard title="Проектов" value={projects.length} hint={`${activeProjects} активных`} icon={<FolderKanban className="h-4 w-4" />} />
          <MetricCard title="Гипотез" value={hypotheses.length} hint={`${testingHypotheses} в тесте`} icon={<FlaskConical className="h-4 w-4" />} tone="success" />
          <MetricCard title="Активность 7 дней" value={projects.filter((p) => last7d(p.last_activity_at)).length} hint="Обновлений проектов" icon={<Activity className="h-4 w-4" />} />
        </div>
      </section>

      {error ? (
        <Card className="border-warning-soft bg-warning-soft">
          <CardContent className="p-4 text-sm text-warning">
            Не удалось загрузить данные: {error}. Убедитесь, что миграции применены и вы добавлены в
            таблицу <code className="font-mono">admin_users</code>.
          </CardContent>
        </Card>
      ) : null}

      {!loading && profiles.length <= 1 ? (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Добавьте участника</p>
              <p className="text-xs text-muted-foreground mt-1">
                Создайте аккаунт с паролем или отправьте приглашение на e-mail.
              </p>
            </div>
            <Button onClick={openAddParticipant} className="shrink-0 bg-gradient-money text-primary-foreground">
              <UserPlus className="mr-2 h-4 w-4" />
              Добавить участника
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Последние участники</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {loading ? (
              <p className="text-muted-foreground">Загрузка…</p>
            ) : profiles.length === 0 ? (
              <p className="text-muted-foreground">Участников пока нет.</p>
            ) : (
              profiles.slice(0, 8).map((p) => (
                <div key={p.user_id} className="flex justify-between gap-3">
                  <span className="truncate">{p.display_name || p.email || p.user_id.slice(0, 8)}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{formatDate(p.created_at)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Активные проекты</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {loading ? (
              <p className="text-muted-foreground">Загрузка…</p>
            ) : projects.length === 0 ? (
              <p className="text-muted-foreground">Проектов пока нет.</p>
            ) : (
              projects.slice(0, 8).map((p) => (
                <div key={p.id} className="flex justify-between gap-3">
                  <span className="truncate">{p.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{formatDate(p.last_activity_at)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Последняя активность</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {loading ? (
            <p className="text-muted-foreground">Загрузка…</p>
          ) : events.length === 0 ? (
            <p className="text-muted-foreground">Событий пока нет. Они появятся, когда пользователи создают проекты.</p>
          ) : (
            events.map((e) => (
              <div key={e.id} className="flex justify-between gap-3">
                <span className="truncate">{e.title}</span>
                <span className="text-xs text-muted-foreground shrink-0">{formatDate(e.created_at)}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
