import { Link } from "react-router-dom";
import { ArrowRight, PlayCircle, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppData } from "@/context/AppDataContext";
import { useAuth } from "@/hooks/useAuth";
import { wizardStepByIndex } from "@/features/wizard/wizardSteps";
import { buildDiagnostics } from "@/utils/funnelDiagnostics";
import { funnelNeedsResume, funnelResumeLabel, funnelResumePath } from "@/lib/funnelResume";
import { getStorageScope, loadFocusDraft } from "@/features/quiz/quizDraftStorage";
import { TelegramConnectCard } from "@/features/dashboard/TelegramConnectCard";
import { DashboardFrame } from "@/features/dashboard/DashboardFrame";
import type { Project } from "@/types/project";

type Props = {
  project: Project;
  onClose: () => void;
};

export function ProjectFunnelsPanel({ project, onClose }: Props) {
  const { user: authUser, guest } = useAuth();
  const scope = getStorageScope(authUser?.id);
  const { projectFunnels, funnelMetricsList, funnelHypotheses } = useAppData();

  const projectId = project.id;
  const funnels = projectFunnels(projectId);
  const focusDraft = loadFocusDraft(scope, projectId);
  const draftFunnels = funnels.filter((f) => funnelNeedsResume(f));

  return (
    <DashboardFrame variant="primary" innerClassName="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/25 px-4 py-3.5 sm:px-5">
        <div className="min-w-0">
          <p className="truncate font-display text-base font-semibold text-foreground">
            {project.projectName}
          </p>
          <p className="text-xs text-muted-foreground">
            {funnels.length === 0 ? "Создайте первую воронку" : `${funnels.length} воронок в проекте`}
          </p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <Button asChild size="sm" className="h-8 bg-gradient-money text-primary-foreground">
            <Link to={`/projects/${projectId}/funnels/new/wizard/focus`}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Воронка
            </Link>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground"
            onClick={onClose}
            aria-label="Закрыть"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {(focusDraft || draftFunnels.length > 0) ? (
        <div className="border-b border-border bg-primary/[0.06] px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-center gap-2">
            <PlayCircle className="h-4 w-4 shrink-0 text-primary" />
            <span className="text-sm font-medium text-foreground">Незавершённый мастер</span>
            {focusDraft && !draftFunnels.some((f) => f.status === "draft") ? (
              <Button asChild size="sm" className="ml-auto h-7 bg-gradient-money text-primary-foreground">
                <Link to={`/projects/${projectId}/funnels/new/wizard/focus`}>Продолжить</Link>
              </Button>
            ) : null}
            {draftFunnels.slice(0, 2).map((f) => (
              <Button key={f.id} asChild size="sm" variant="outline" className="ml-auto h-7 border-primary/30">
                <Link to={funnelResumePath(projectId, f)}>
                  {f.productName || "Воронка"} — {funnelResumeLabel(f)}
                </Link>
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      {!guest && authUser ? (
        <div className="border-b border-border px-4 py-4 sm:px-5">
          <TelegramConnectCard projectId={projectId} projectName={project.projectName} compact />
        </div>
      ) : null}

      {funnels.length === 0 ? (
        <div className="px-4 py-12 text-center sm:px-5">
          <Button asChild className="bg-gradient-money text-primary-foreground">
            <Link to={`/projects/${projectId}/funnels/new/wizard/focus`}>Создать первую воронку</Link>
          </Button>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {funnels.map((f) => {
            const metrics = funnelMetricsList(f.id);
            const hypotheses = funnelHypotheses(f.id);
            const diag = buildDiagnostics(metrics);
            const step = wizardStepByIndex(f.currentWizardStep ?? 1);
            const testing = hypotheses.filter((h) => h.status === "testing").length;
            const targetPath = funnelNeedsResume(f)
              ? funnelResumePath(projectId, f)
              : `/projects/${projectId}/funnels/${f.id}`;

            return (
              <li key={f.id}>
                <Link
                  to={targetPath}
                  className="group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/30 sm:px-5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {f.productName || "Без названия"}
                    </p>
                    <p className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                      <span>{step.title}</span>
                      {diag.red.length > 0 ? (
                        <span className="font-medium text-danger">{diag.red.length} ниже плана</span>
                      ) : null}
                      {testing > 0 ? (
                        <span className="font-medium text-success">{testing} в тесте</span>
                      ) : null}
                      {f.status === "draft" ? (
                        <span className="font-medium text-warning">черновик</span>
                      ) : null}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </DashboardFrame>
  );
}
