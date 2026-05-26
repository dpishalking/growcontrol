import { auditDraftsForMetric, auditHintForMetric } from "@/lib/hypothesisMetricContext";
import type { FunnelAuditReport } from "@/types/funnelAudit";
import type { FunnelMetric } from "@/types/funnelMetric";

export type MetricHypothesesAuditContext = {
  isBottleneck: boolean;
  metricHint: string | null;
  mainProblem: string | null;
  mainMoneyLeak: string | null;
  quickestWin: { action: string; why: string; expectedEffect: string } | null;
  stageBlock: {
    stageLabel: string;
    problem: string;
    howToFix: string;
    rewriteExample?: string;
  } | null;
  relatedProblems: {
    severity: string;
    title: string;
    whyItHurts: string;
    howToFix: string[];
  }[];
  auditDraftTitles: string[];
};

/** Собирает structured evidence для super-prompt генерации гипотез. */
export function buildMetricHypothesesAuditContext(
  report: FunnelAuditReport | undefined,
  metric: FunnelMetric,
  bottleneckId: string | null,
): MetricHypothesesAuditContext {
  if (!report) {
    return {
      isBottleneck: bottleneckId === metric.id,
      metricHint: null,
      mainProblem: null,
      mainMoneyLeak: null,
      quickestWin: null,
      stageBlock: null,
      relatedProblems: [],
      auditDraftTitles: [],
    };
  }

  const stageBlock = report.stageBlocks?.find(
    (b) => b.stageId === metric.stage,
  ) ?? null;

  const relatedProblems = (report.problems ?? [])
    .filter((p) => p.severity === "critical" || p.severity === "important")
    .slice(0, 4)
    .map((p) => ({
      severity: p.severity,
      title: p.title,
      whyItHurts: p.whyItHurts,
      howToFix: p.howToFix ?? [],
    }));

  const auditDrafts = auditDraftsForMetric(report.hypotheses ?? [], metric);

  return {
    isBottleneck: bottleneckId === metric.id,
    metricHint: auditHintForMetric(report, metric),
    mainProblem: report.diagnosis?.mainProblem ?? null,
    mainMoneyLeak: report.diagnosis?.mainMoneyLeak ?? null,
    quickestWin: report.quickestWin
      ? {
          action: report.quickestWin.action,
          why: report.quickestWin.why,
          expectedEffect: report.quickestWin.expectedEffect,
        }
      : null,
    stageBlock: stageBlock
      ? {
          stageLabel: stageBlock.stageLabel,
          problem: stageBlock.problem,
          howToFix: stageBlock.howToFix,
          rewriteExample: stageBlock.rewriteExample,
        }
      : null,
    relatedProblems,
    auditDraftTitles: auditDrafts.map((d) => d.title).slice(0, 5),
  };
}

/** Форматирует audit context в текст для промпта (edge function). */
export function formatMetricHypothesesAuditContext(ctx: MetricHypothesesAuditContext): string {
  const lines: string[] = [];

  if (ctx.isBottleneck) {
    lines.push("⚠ Метрика — ГЛАВНЫЙ ОГРАНИЧИТЕЛЬ воронки.");
  }
  if (ctx.metricHint) lines.push(`Подсказка аудита: ${ctx.metricHint}`);
  if (ctx.mainProblem) lines.push(`Главная проблема: ${ctx.mainProblem}`);
  if (ctx.mainMoneyLeak) lines.push(`Утечка денег: ${ctx.mainMoneyLeak}`);

  if (ctx.stageBlock) {
    lines.push(
      "",
      `ЭТАП «${ctx.stageBlock.stageLabel}»:`,
      `Проблема: ${ctx.stageBlock.problem}`,
      `Как исправить: ${ctx.stageBlock.howToFix}`,
    );
    if (ctx.stageBlock.rewriteExample) {
      lines.push(`Пример переписывания: ${ctx.stageBlock.rewriteExample}`);
    }
  }

  if (ctx.quickestWin) {
    lines.push(
      "",
      "QUICK WIN из аудита:",
      `Действие: ${ctx.quickestWin.action}`,
      `Почему: ${ctx.quickestWin.why}`,
      `Эффект: ${ctx.quickestWin.expectedEffect}`,
    );
  }

  if (ctx.relatedProblems.length > 0) {
    lines.push("", "СВЯЗАННЫЕ ПРОБЛЕМЫ:");
    for (const p of ctx.relatedProblems) {
      lines.push(`- [${p.severity}] ${p.title}: ${p.whyItHurts}`);
      if (p.howToFix[0]) lines.push(`  Fix: ${p.howToFix[0]}`);
    }
  }

  if (ctx.auditDraftTitles.length > 0) {
    lines.push("", "Черновики из аудита (не дублировать дословно):");
    ctx.auditDraftTitles.forEach((t, i) => lines.push(`${i + 1}. ${t}`));
  }

  return lines.join("\n").trim() || "Evidence из аудита не передан — опирайся на метрику и материалы.";
}
