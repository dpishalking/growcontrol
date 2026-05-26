import type { Experiment } from "@/types/experiment";
import { funnelNeedsResume, funnelResumePath } from "@/lib/funnelResume";
import { getPlanStatus } from "./ActiveTestCard";
import type { DashboardSnapshot } from "./useDashboardSnapshot";

export type DashboardNextAction = {
  tone: "urgent" | "focus" | "win" | "start";
  eyebrow: string;
  title: string;
  description: string;
  cta: string;
  href: string;
  progress?: number;
};

export function computeDashboardNextAction(
  snapshot: DashboardSnapshot,
  experimentByHypothesis: (id: string) => Experiment | null,
): DashboardNextAction | null {
  if (snapshot.totals.projects === 0) {
    return {
      tone: "start",
      eyebrow: "Старт",
      title: "Создайте первый проект",
      description: "Один продукт, одна воронка — мастер проведёт от фокуса до плана тестов.",
      cta: "Начать",
      href: "#create-project",
    };
  }

  for (const { hypothesis: h, projectId } of snapshot.activeTests) {
    if (h.status !== "testing") continue;
    const exp = experimentByHypothesis(h.id);
    const status = getPlanStatus(h, exp);
    if (status.label === "Итог!") {
      return {
        tone: "urgent",
        eyebrow: "Нужен результат",
        title: h.title.length > 72 ? `${h.title.slice(0, 69)}…` : h.title,
        description: `Зафиксируйте итог по «${h.metricName}» — тест уже завершён по сроку.`,
        cta: "Записать результат",
        href: `/projects/${projectId}/funnels/${h.funnelId}/wizard/plan`,
      };
    }
    if (status.label === "Сегодня") {
      return {
        tone: "urgent",
        eyebrow: "Дедлайн сегодня",
        title: h.title.length > 72 ? `${h.title.slice(0, 69)}…` : h.title,
        description: `Проверьте метрику «${h.metricName}» и закройте тест.`,
        cta: "Открыть тест",
        href: `/projects/${projectId}/funnels/${h.funnelId}/wizard/plan`,
      };
    }
  }

  for (const card of snapshot.projectCards) {
    const resumeFunnel = card.funnels.find((f) => funnelNeedsResume(f));
    if (resumeFunnel) {
      return {
        tone: "focus",
        eyebrow: card.displayName,
        title: resumeFunnel.productName || "Продолжить воронку",
        description: `Мастер на ${card.progressPercent}% — следующий шаг уже ждёт.`,
        cta: "Продолжить",
        href: funnelResumePath(card.project.id, resumeFunnel),
        progress: card.progressPercent,
      };
    }
  }

  const backlog = snapshot.activeTests.find((x) => x.hypothesis.status === "backlog");
  if (backlog) {
    const h = backlog.hypothesis;
    return {
      tone: "focus",
      eyebrow: backlog.projectName,
      title: h.title.length > 72 ? `${h.title.slice(0, 69)}…` : h.title,
      description: `Гипотеза в очереди · метрика «${h.metricName}». Запустите тест.`,
      cta: "Запустить тест",
      href: `/projects/${backlog.projectId}/funnels/${h.funnelId}/wizard/plan`,
    };
  }

  if (snapshot.totals.redMetrics > 0) {
    const target = snapshot.projectCards.find((c) => c.redMetrics > 0);
    if (target?.funnels[0]) {
      const f = target.funnels[0];
      return {
        tone: "focus",
        eyebrow: target.displayName,
        title: `${target.redMetrics} ${target.redMetrics === 1 ? "метрика" : "метрик"} ниже плана`,
        description: "Сгенерируйте гипотезы по узкому месту и поставьте тест.",
        cta: "К гипотезам",
        href: `/projects/${target.project.id}/funnels/${f.id}/wizard/hypotheses`,
      };
    }
  }

  const best = snapshot.projectCards[0];
  if (best) {
    const href =
      best.funnelCount === 1 && best.funnels[0]
        ? `/projects/${best.project.id}/funnels/${best.funnels[0].id}`
        : `/dashboard?project=${best.project.id}`;

    return {
      tone: "win",
      eyebrow: "На волне",
      title: "Воронки под контролем",
      description:
        snapshot.inWork > 0
          ? `${snapshot.inWork} ${snapshot.inWork === 1 ? "тест" : "теста"} в работе — держите темп.`
          : "Метрики в норме. Масштабируйте победители или добавьте новую гипотезу.",
      cta: best.funnelCount === 1 ? "Открыть воронку" : "К проектам",
      href,
      progress: best.progressPercent,
    };
  }

  return null;
}

export function findRedMetricsHref(snapshot: DashboardSnapshot): string | null {
  const target = snapshot.projectCards.find((c) => c.redMetrics > 0);
  const funnel = target?.funnels[0];
  if (!target || !funnel) return null;
  return `/projects/${target.project.id}/funnels/${funnel.id}/wizard/hypotheses`;
}

export function findPrimaryTestHref(snapshot: DashboardSnapshot): string | null {
  const item = snapshot.activeTests[0];
  if (!item) return null;
  return `/projects/${item.projectId}/funnels/${item.hypothesis.funnelId}/wizard/plan`;
}

export type DashboardSummaryStats = {
  inQueue: number;
  urgentTests: number;
  resumeCount: number;
  queueHref: string | null;
  urgentHref: string | null;
  resumeHref: string | null;
};

export function computeDashboardSummaryStats(
  snapshot: DashboardSnapshot,
  experimentByHypothesis: (id: string) => Experiment | null,
): DashboardSummaryStats {
  let urgentTests = 0;
  let urgentHref: string | null = null;

  for (const { hypothesis: h, projectId } of snapshot.activeTests) {
    if (h.status !== "testing") continue;
    const status = getPlanStatus(h, experimentByHypothesis(h.id));
    if (status.label === "Итог!" || status.label === "Сегодня") {
      urgentTests += 1;
      urgentHref ??= `/projects/${projectId}/funnels/${h.funnelId}/wizard/plan`;
    }
  }

  let resumeCount = 0;
  let resumeHref: string | null = null;
  for (const card of snapshot.projectCards) {
    resumeCount += card.resumeCount;
    if (!resumeHref) {
      const funnel = card.funnels.find((f) => funnelNeedsResume(f));
      if (funnel) resumeHref = funnelResumePath(card.project.id, funnel);
    }
  }

  const queueItem = snapshot.activeTests.find((x) => x.hypothesis.status === "backlog");
  const queueHref = queueItem
    ? `/projects/${queueItem.projectId}/funnels/${queueItem.hypothesis.funnelId}/wizard/plan`
    : null;

  return {
    inQueue: snapshot.inQueue,
    urgentTests,
    resumeCount,
    queueHref,
    urgentHref,
    resumeHref,
  };
}

export function findQueueHref(snapshot: DashboardSnapshot): string | null {
  const item = snapshot.activeTests.find((x) => x.hypothesis.status === "backlog");
  if (!item) return null;
  return `/projects/${item.projectId}/funnels/${item.hypothesis.funnelId}/wizard/plan`;
}
