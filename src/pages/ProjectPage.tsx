import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowRight, FlaskConical, PlayCircle, Plus, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAppData } from "@/context/AppDataContext";
import { useAuth } from "@/hooks/useAuth";
import { wizardStepByIndex } from "@/features/wizard/wizardSteps";
import { buildDiagnostics } from "@/utils/funnelDiagnostics";
import { formatDate } from "@/utils/format";
import { funnelNeedsResume, funnelResumeLabel, funnelResumePath } from "@/lib/funnelResume";
import { getStorageScope, loadFocusDraft } from "@/features/quiz/quizDraftStorage";

export default function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const {
    getProject,
    projectFunnels,
    funnelMetricsList,
    funnelHypotheses,
  } = useAppData();
  const { user: authUser } = useAuth();
  const scope = getStorageScope(authUser?.id);

  if (!projectId) return <Navigate to="/dashboard" replace />;
  const project = getProject(projectId);
  if (!project) {
    return (
      <Card className="border-warning-soft bg-warning-soft">
        <CardContent className="p-6 space-y-3">
          <p className="text-sm text-warning">Проект не найден. Возможно, он был удалён или данные ещё загружаются.</p>
          <Button asChild variant="outline" size="sm">
            <Link to="/dashboard">Вернуться к проектам</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const funnels = projectFunnels(projectId);
  const focusDraft = loadFocusDraft(scope, projectId);
  const draftFunnels = funnels.filter((f) => funnelNeedsResume(f));

  return (
    <>
      <PageHeader
        title={project.projectName}
        subtitle="Проект = набор воронок. Каждая воронка проходит свой мастер: фокус → материалы → метрики → гипотезы → тесты."
        backTo="/dashboard"
        backLabel="Все проекты"
        action={
          <Button asChild className="bg-gradient-money text-primary-foreground">
            <Link to={`/projects/${projectId}/funnels/new/wizard/focus`}>
              <Plus className="mr-1.5 h-4 w-4" />
              Новая воронка
            </Link>
          </Button>
        }
      />

      {(focusDraft || draftFunnels.length > 0) ? (
        <Card className="mb-6 border-primary/25 bg-primary/5">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <PlayCircle className="h-5 w-5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Есть незавершённый квиз</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Прогресс сохранён — можно продолжить с того же вопроса.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              {focusDraft && !draftFunnels.some((f) => f.status === "draft") ? (
                <Button asChild size="sm" className="bg-gradient-money text-primary-foreground">
                  <Link to={`/projects/${projectId}/funnels/new/wizard/focus`}>
                    Продолжить фокус
                  </Link>
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
          <CardContent className="py-10 text-center space-y-4">
            <Target className="h-8 w-8 mx-auto text-primary opacity-80" />
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              В проекте ещё нет воронок. Создайте одну — на одной воронке сосредоточимся, остальные
              добавите потом отдельно, не смешивая материалы.
            </p>
            <Button asChild>
              <Link to={`/projects/${projectId}/funnels/new/wizard/focus`}>Создать воронку</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {funnels.map((f) => {
            const metrics = funnelMetricsList(f.id);
            const hypotheses = funnelHypotheses(f.id);
            const diag = buildDiagnostics(metrics);
            const nextStep = wizardStepByIndex(f.currentWizardStep);
            const testing = hypotheses.filter((h) => h.status === "testing").length;

            return (
              <Link key={f.id} to={`/projects/${projectId}/funnels/${f.id}`}>
                <Card className="border-border/60 hover:border-primary/40 transition-colors">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium">{f.productName || "Без названия"}</p>
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {f.trafficSource || "—"} → {f.landingUrl || "—"} · Цель: {f.funnelGoal || "—"}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>

                    <div className="flex flex-wrap gap-1.5 text-[11px]">
                      {f.status === "draft" ? (
                        <span className="chip chip-warning">черновик</span>
                      ) : null}
                      <Badge variant="secondary">Шаг: {nextStep.title}</Badge>
                      <Badge variant="outline">
                        метрик {metrics.length}
                      </Badge>
                      <Badge variant="outline">
                        гипотез {hypotheses.length}
                      </Badge>
                      {diag.red.length > 0 ? (
                        <span className="chip chip-danger">
                          ниже плана {diag.red.length}
                        </span>
                      ) : null}
                      {testing > 0 ? (
                        <span className="chip chip-success">
                          <FlaskConical className="h-3 w-3" />в тесте {testing}
                        </span>
                      ) : null}
                    </div>

                    <p className="text-[10px] text-muted-foreground">
                      Обновлено {formatDate(f.updatedAt)}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
