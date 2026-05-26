import { useMemo } from "react";
import { resolveProjectDisplayName } from "@/lib/projectDisplayName";
import { buildDiagnostics } from "@/utils/funnelDiagnostics";
import { funnelNeedsResume } from "@/lib/funnelResume";
import { wizardStepByIndex } from "@/features/wizard/wizardSteps";
import type { FunnelMetric } from "@/types/funnelMetric";
import type { Hypothesis } from "@/types/hypothesis";
import type { Project } from "@/types/project";
import type { Funnel } from "@/types/funnel";

type ActiveItem = { hypothesis: Hypothesis; projectId: string; projectName: string };

export type ProjectCardModel = {
  project: Project;
  funnels: Funnel[];
  displayName: string;
  funnelCount: number;
  resumeCount: number;
  redMetrics: number;
  activeTests: number;
  progressPercent: number;
  primaryAction: string;
  latestFunnelName: string | null;
};

export type DashboardSnapshot = {
  projects: Project[];
  projectCards: ProjectCardModel[];
  activeTests: ActiveItem[];
  inWork: number;
  inQueue: number;
  totals: {
    projects: number;
    funnels: number;
    hypotheses: number;
    redMetrics: number;
  };
};

export function useDashboardSnapshot(
  projects: Project[],
  projectFunnels: (id: string) => Funnel[],
  funnelHypotheses: (id: string) => Hypothesis[],
  funnelMetricsList: (id: string) => FunnelMetric[],
): DashboardSnapshot {
  return useMemo(() => {
    const activeTests: ActiveItem[] = [];
    let totalFunnels = 0;
    let totalHypotheses = 0;
    let totalRedMetrics = 0;

    const projectCards: ProjectCardModel[] = projects.map((project) => {
      const funnels = projectFunnels(project.id);
      const displayName = resolveProjectDisplayName(project, funnels);
      totalFunnels += funnels.length;

      let redMetrics = 0;
      let activeTestsCount = 0;

      for (const funnel of funnels) {
        const metrics = funnelMetricsList(funnel.id);
        const hypotheses = funnelHypotheses(funnel.id);
        totalHypotheses += hypotheses.length;

        const diag = buildDiagnostics(metrics);
        redMetrics += diag.red.length;
        totalRedMetrics += diag.red.length;

        for (const h of hypotheses) {
          if (h.status === "backlog" || h.status === "testing") {
            activeTestsCount += 1;
            activeTests.push({
              hypothesis: h,
              projectId: project.id,
              projectName: displayName,
            });
          }
        }
      }

      const resumeCount = funnels.filter((f) => funnelNeedsResume(f)).length;
      const avgStep =
        funnels.length > 0
          ? funnels.reduce((sum, f) => sum + wizardStepByIndex(f.currentWizardStep ?? 1).index, 0) /
            funnels.length
          : 0;
      const progressPercent = funnels.length > 0 ? Math.round((avgStep / 8) * 100) : 0;

      let primaryAction = "Создать воронку";
      if (funnels.length === 1) primaryAction = "Открыть воронку";
      else if (funnels.length > 1) primaryAction = "Выбрать воронку";
      if (resumeCount > 0) primaryAction = "Продолжить мастер";

      const latestFunnel =
        funnels.length > 0
          ? [...funnels].sort(
              (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
            )[0]?.productName ?? null
          : null;

      return {
        project,
        funnels,
        displayName,
        funnelCount: funnels.length,
        resumeCount,
        redMetrics,
        activeTests: activeTestsCount,
        progressPercent,
        primaryAction,
        latestFunnelName: latestFunnel,
      };
    });

    activeTests.sort((a, b) => {
      const order = (s: Hypothesis["status"]) => (s === "testing" ? 0 : 1);
      const d = order(a.hypothesis.status) - order(b.hypothesis.status);
      if (d !== 0) return d;
      return b.hypothesis.priorityScore - a.hypothesis.priorityScore;
    });

    return {
      projects,
      projectCards,
      activeTests,
      inWork: activeTests.filter((x) => x.hypothesis.status === "testing").length,
      inQueue: activeTests.filter((x) => x.hypothesis.status === "backlog").length,
      totals: {
        projects: projects.length,
        funnels: totalFunnels,
        hypotheses: totalHypotheses,
        redMetrics: totalRedMetrics,
      },
    };
  }, [projects, projectFunnels, funnelHypotheses, funnelMetricsList]);
}
