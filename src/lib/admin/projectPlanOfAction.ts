import { wizardStepByIndex } from "@/features/wizard/wizardSteps";
import { parseHypothesisDescription } from "@/lib/hypothesisPresentation";
import { formatDate } from "@/utils/format";

export type AdminPlanHypothesis = {
  id: string;
  project_id: string;
  app_id?: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  expected_impact: string | null;
  created_at: string;
};

export type AdminPlanExperiment = {
  project_id: string;
  hypothesis_id: string | null;
  app_hyp_id: string | null;
  owner: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
};

export type AdminProjectMeta = {
  completenessScore?: number;
  funnelCount?: number;
  hypothesesTesting?: number;
  hypothesesQueued?: number;
  maxWizardStep?: number;
  wizardStepTitle?: string | null;
  mainGoal?: string;
  northStarMetric?: string;
};

export type PlanActionItem = {
  id: string;
  title: string;
  detail: string | null;
  priority: string;
  owner?: string | null;
  deadlineLabel?: string | null;
  deadlineTone?: "urgent" | "soon" | "neutral";
};

export type ProjectPlanOfAction = {
  goal: string | null;
  northStar: string | null;
  stageLabel: string | null;
  stageProgress: number;
  headline: string;
  headlineTone: "urgent" | "focus" | "idle" | "success";
  activeTests: PlanActionItem[];
  queue: PlanActionItem[];
  ideas: PlanActionItem[];
  completed: PlanActionItem[];
};

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

function sortPlanHypotheses(items: AdminPlanHypothesis[]): AdminPlanHypothesis[] {
  return [...items].sort((a, b) => {
    const pd = (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1);
    if (pd !== 0) return pd;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
}

function hypothesisDetail(h: AdminPlanHypothesis): string | null {
  if (h.expected_impact?.trim()) return h.expected_impact.trim();
  const parts = parseHypothesisDescription(h.description);
  return parts.thenMetric || parts.becauseReason || null;
}

function experimentDeadline(endDate: string): {
  label: string;
  tone: "urgent" | "soon" | "neutral";
} {
  const end = new Date(endDate);
  if (Number.isNaN(end.getTime())) return { label: formatDate(endDate), tone: "neutral" };

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const endDay = new Date(end);
  endDay.setHours(0, 0, 0, 0);
  const diffDays = Math.round((endDay.getTime() - now.getTime()) / 86400000);

  if (diffDays < 0) return { label: "Итог!", tone: "urgent" };
  if (diffDays === 0) return { label: "Сегодня", tone: "urgent" };
  if (diffDays <= 3) return { label: `${diffDays} дн.`, tone: "soon" };
  return { label: formatDate(endDate), tone: "neutral" };
}

function findExperiment(
  h: AdminPlanHypothesis,
  experiments: AdminPlanExperiment[],
): AdminPlanExperiment | null {
  return (
    experiments.find(
      (e) =>
        e.project_id === h.project_id &&
        e.status === "active" &&
        (e.hypothesis_id === h.id || (h.app_id && e.app_hyp_id === h.app_id)),
    ) ?? null
  );
}

function toPlanItem(h: AdminPlanHypothesis, exp?: AdminPlanExperiment | null): PlanActionItem {
  const deadline = exp?.end_date ? experimentDeadline(exp.end_date) : null;
  return {
    id: h.id,
    title: h.title,
    detail: hypothesisDetail(h),
    priority: h.priority,
    owner: exp?.owner,
    deadlineLabel: deadline?.label ?? null,
    deadlineTone: deadline?.tone,
  };
}

function buildHeadline(
  meta: AdminProjectMeta | null | undefined,
  activeTests: PlanActionItem[],
  queue: PlanActionItem[],
  ideas: PlanActionItem[],
  stageLabel: string | null,
): { text: string; tone: ProjectPlanOfAction["headlineTone"] } {
  const overdue = activeTests.find((t) => t.deadlineTone === "urgent");
  if (overdue) {
    return {
      text: `Нужен итог: ${truncate(overdue.title, 64)}`,
      tone: "urgent",
    };
  }

  if (activeTests.length > 0) {
    const count = activeTests.length;
    return {
      text:
        count === 1
          ? `Тест в работе: ${truncate(activeTests[0].title, 56)}`
          : `${count} теста в работе`,
      tone: "focus",
    };
  }

  if (queue.length > 0) {
    return {
      text:
        queue.length === 1
          ? `Следующий тест: ${truncate(queue[0].title, 56)}`
          : `Очередь из ${queue.length} гипотез — запустить первый тест`,
      tone: "focus",
    };
  }

  if (ideas.length > 0) {
    return {
      text: `${ideas.length} гипотез сгенерировано — собрать план тестов`,
      tone: "focus",
    };
  }

  const maxStep = meta?.maxWizardStep ?? 0;
  if (maxStep > 0 && maxStep < 8) {
    return {
      text: stageLabel ? `Мастер: ${stageLabel}` : "Продолжить мастер воронки",
      tone: "idle",
    };
  }

  if ((meta?.completenessScore ?? 0) < 40) {
    return { text: "Дозаполнить профиль проекта", tone: "idle" };
  }

  if ((meta?.funnelCount ?? 0) === 0) {
    return { text: "Создать первую воронку", tone: "idle" };
  }

  return { text: "План не сформирован", tone: "idle" };
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

export function buildProjectPlanOfAction(
  projectId: string,
  meta: AdminProjectMeta | null | undefined,
  projectDescription: string | null | undefined,
  hypotheses: AdminPlanHypothesis[],
  experiments: AdminPlanExperiment[],
): ProjectPlanOfAction {
  const projectHypos = hypotheses.filter((h) => h.project_id === projectId);
  const projectExps = experiments.filter((e) => e.project_id === projectId);

  const activeHypos = sortPlanHypotheses(projectHypos.filter((h) => h.status === "testing"));
  const queueHypos = sortPlanHypotheses(projectHypos.filter((h) => h.status === "in_progress"));
  const ideaHypos = sortPlanHypotheses(projectHypos.filter((h) => h.status === "new"));
  const completedHypos = projectHypos.filter((h) => h.status === "won" || h.status === "lost");

  const maxStep = meta?.maxWizardStep ?? 0;
  const step = maxStep > 0 ? wizardStepByIndex(maxStep) : null;
  const stageLabel =
    meta?.wizardStepTitle?.trim() ||
    (step ? `${step.index}/8 · ${step.title}` : null);
  const stageProgress = step ? Math.round((step.index / 8) * 100) : 0;

  const goal = meta?.mainGoal?.trim() || projectDescription?.trim() || null;
  const northStar = meta?.northStarMetric?.trim() || null;

  const activeTests = activeHypos.map((h) => toPlanItem(h, findExperiment(h, projectExps)));
  const queue = queueHypos.map((h) => toPlanItem(h));
  const ideas = ideaHypos.map((h) => toPlanItem(h));
  const completed = completedHypos.map((h) => toPlanItem(h));

  const { text: headline, tone: headlineTone } = buildHeadline(
    meta,
    activeTests,
    queue,
    ideas,
    stageLabel,
  );

  return {
    goal,
    northStar,
    stageLabel,
    stageProgress,
    headline,
    headlineTone,
    activeTests,
    queue,
    ideas,
    completed,
  };
}
