/** Форматирует audit context (JSON с клиента) в блок evidence для промпта. */
export type MetricHypothesesAuditContextPayload = {
  isBottleneck?: boolean;
  metricHint?: string | null;
  mainProblem?: string | null;
  mainMoneyLeak?: string | null;
  quickestWin?: { action: string; why: string; expectedEffect: string } | null;
  stageBlock?: {
    stageLabel: string;
    problem: string;
    howToFix: string;
    rewriteExample?: string;
  } | null;
  relatedProblems?: {
    severity: string;
    title: string;
    whyItHurts: string;
    howToFix: string[];
  }[];
  auditDraftTitles?: string[];
};

export function formatAuditEvidenceBlock(ctx: MetricHypothesesAuditContextPayload | undefined): string {
  if (!ctx) return "Evidence из аудита не передан — опирайся на метрику и материалы.";

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

  for (const p of ctx.relatedProblems ?? []) {
    if (lines.length === 0 || !lines.at(-1)?.startsWith("СВЯЗАННЫЕ")) {
      lines.push("", "СВЯЗАННЫЕ ПРОБЛЕМЫ:");
    }
    lines.push(`- [${p.severity}] ${p.title}: ${p.whyItHurts}`);
    if (p.howToFix?.[0]) lines.push(`  Fix: ${p.howToFix[0]}`);
  }

  if (ctx.auditDraftTitles?.length) {
    lines.push("", "Черновики из аудита (не дублировать дословно):");
    ctx.auditDraftTitles.forEach((t, i) => lines.push(`${i + 1}. ${t}`));
  }

  return lines.join("\n").trim() || "Evidence из аудита не передан — опирайся на метрику и материалы.";
}
