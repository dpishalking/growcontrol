import { Link } from "react-router-dom";
import { ArrowRight, FlaskConical, PlayCircle, Plus, Target, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAppData } from "@/context/AppDataContext";
import { useAuth } from "@/hooks/useAuth";
import { wizardStepByIndex } from "@/features/wizard/wizardSteps";
import { buildDiagnostics } from "@/utils/funnelDiagnostics";
import { formatDate } from "@/utils/format";
import { funnelNeedsResume, funnelResumeLabel, funnelResumePath } from "@/lib/funnelResume";
import { getStorageScope, loadFocusDraft } from "@/features/quiz/quizDraftStorage";
import type { Project } from "@/types/project";

type Props = {
  project: Project;
  onClose: () => void;
};

export function ProjectFunnelsPanel({ project, onClose }: Props) {
  const { user: authUser } = useAuth();
  const scope = getStorageScope(authUser?.id);
  const { projectFunnels, funnelMetricsList, funnelHypotheses } = useAppData();

  const projectId = project.id;
  const funnels = projectFunnels(projectId);
  const focusDraft = loadFocusDraft(scope, projectId);
  const draftFunnels = funnels.filter((f) => funnelNeedsResume(f));

  return (
    <section className="dashboard-funnels-panel mt-2 space-y-4 overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-b from-primary/[0.07] to-card/40 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Проект</p>
          <h2 className="font-display text-xl font-semibold">{project.projectName}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {funnels.length === 0
              ? "Создайте первую воронку — мастер проведёт по шагам."
              : `${funnels.length} воронок · выберите, с чем работать`}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button asChild size="sm" className="bg-gradient-money text-primary-foreground">
            <Link to={`/projects/${projectId}/funnels/new/wizard/focus`}>
              <Plus className="mr-1.5 h-4 w-4" />
              Новая воронка
            </Link>
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Закрыть">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {(focusDraft || draftFunnels.length > 0) ? (
        <Card className="border-primary/25 bg-primary/5">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <PlayCircle className="h-5 w-5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Есть незавершённый квиз</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Прогресс сохранён — продолжите с того же места.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              {focusDraft && !draftFunnels.some((f) => f.status === "draft") ? (
                <Button asChild size="sm" className="bg-gradient-money text-primary-foreground">
                  <Link to={`/projects/${projectId}/funnels/new/wizard/focus`}>Продолжить фокус</Link>
                </Button>
              ) : null}
              {draftFunnels.slice(0, 2).map((f) => (
                <Button key={f.id} asChild size="sm" variant={f.status === "draft" ? "default" : "outline"}>
                  <Link to={funnelResumePath(projectId, f)}>
                    {f.productName || "Воронка"} — {funnelResumeLabel(f)}
                  </Link>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {funnels.length === 0 ? (
        <Card className="border-dashed border-border/80">
          <CardContent className="space-y-4 py-10 text-center">
            <Target className="mx-auto h-8 w-8 text-primary opacity-80" />
            <Button asChild>
              <Link to={`/projects/${projectId}/funnels/new/wizard/focus`}>Создать воронку</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {funnels.map((f) => {
            const metrics = funnelMetricsList(f.id);
            const hypotheses = funnelHypotheses(f.id);
            const diag = buildDiagnostics(metrics);
            const nextStep = wizardStepByIndex(f.currentWizardStep ?? 1);
            const testing = hypotheses.filter((h) => h.status === "testing").length;
            const targetPath = funnelNeedsResume(f)
              ? funnelResumePath(projectId, f)
              : `/projects/${projectId}/funnels/${f.id}`;

            return (
              <Link key={f.id} to={targetPath}>
                <Card className="h-full border-border/60 transition-colors hover:border-primary/40">
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium">{f.productName || "Без названия"}</p>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {f.trafficSource || "—"} → {f.landingUrl || "—"} · Цель: {f.funnelGoal || "—"}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </div>
                    <div className="flex flex-wrap gap-1.5 text-[11px]">
                      {f.status === "draft" ? <span className="chip chip-warning">черновик</span> : null}
                      <Badge variant="secondary">Шаг: {nextStep.title}</Badge>
                      <Badge variant="outline">метрик {metrics.length}</Badge>
                      <Badge variant="outline">гипотез {hypotheses.length}</Badge>
                      {diag.red.length > 0 ? (
                        <span className="chip chip-danger">ниже плана {diag.red.length}</span>
                      ) : null}
                      {testing > 0 ? (
                        <span className="chip chip-success">
                          <FlaskConical className="h-3 w-3" />в тесте {testing}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-[10px] text-muted-foreground">Обновлено {formatDate(f.updatedAt)}</p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
