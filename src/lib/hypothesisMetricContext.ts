import { normalizeMetricKey } from "@/data/hypothesisDirections";
import { resolveMetricEvaluationKind } from "@/utils/funnelDiagnostics";
import type { FunnelAuditHypothesisDraft, FunnelAuditReport } from "@/types/funnelAudit";
import type { FunnelMetric } from "@/types/funnelMetric";

const METRIC_KEYWORDS: Record<string, string[]> = {
  ctr: ["ctr", "клик", "клики", "объяв", "креатив", "трафик"],
  cpc: ["cpc", "клик", "стоимость клика"],
  "стоимость регистрации": ["регistr", "cpl", "reg", "посадоч", "лендинг"],
  "конверсия страницы в регистрацию": ["регistr", "конверс", "лендинг", "reg"],
  "процент доходимости": ["доходим", "вебинар", "напомин"],
  "стоимость заявки": ["заявк", "лид", "форма"],
};

export function metricGapLabel(m: FunnelMetric): string {
  if (m.achievementPercent != null) {
    const kind = resolveMetricEvaluationKind(m);
    const pct = Math.round(m.achievementPercent);
    if (kind === "higher_better") {
      if (pct < 100) return `План выполнен на ${pct}%`;
      return `План выполнен на ${pct}%`;
    }
    if (pct > 100) return `Выше плана на ${pct - 100}%`;
    return `В пределах плана (${pct}%)`;
  }
  return `Влияние на деньги: ${m.revenueImpact}/5`;
}

export function metricWhyTop(
  m: FunnelMetric,
  rank: number,
  bottleneckId: string | null,
): string {
  const parts: string[] = [];
  if (bottleneckId === m.id) parts.push("Главный ограничитель воронки");
  parts.push(metricGapLabel(m));
  parts.push(`Приоритет #${rank}`);
  return parts.join(" · ");
}

function keywordsForMetric(metricName: string): string[] {
  const key = normalizeMetricKey(metricName);
  const aliased = METRIC_KEYWORDS[key] ?? [];
  return [key, ...aliased, ...key.split(/\s+/).filter((w) => w.length > 3)];
}

function textMatchesMetric(text: string, metricName: string): boolean {
  const lower = text.toLowerCase();
  const keys = keywordsForMetric(metricName);
  return keys.some((k) => k.length >= 3 && lower.includes(k));
}

export function auditHintForMetric(
  report: FunnelAuditReport | undefined,
  metric: FunnelMetric,
): string | null {
  if (!report) return null;

  const stageBlock = report.stageBlocks?.find(
    (b) => b.stageId === metric.stage || textMatchesMetric(b.stageLabel, metric.name),
  );
  if (stageBlock?.problem) {
    return `Аудит (${stageBlock.stageLabel}): ${stageBlock.problem}`;
  }

  const problem = report.problems?.find(
    (p) => textMatchesMetric(p.title, metric.name) || textMatchesMetric(p.whyItHurts, metric.name),
  );
  if (problem) {
    return `Аудит: ${problem.title}`;
  }

  if (report.diagnosis?.mainProblem && metric.status === "red") {
    return `Аудит: ${report.diagnosis.mainProblem}`;
  }

  return null;
}

export function auditDraftsForMetric(
  drafts: FunnelAuditHypothesisDraft[],
  metric: FunnelMetric,
): FunnelAuditHypothesisDraft[] {
  return drafts.filter((d) => {
    const dk = normalizeMetricKey(d.metricName);
    const mk = normalizeMetricKey(metric.name);
    if (dk === mk || dk.includes(mk) || mk.includes(dk)) return true;
    return textMatchesMetric(d.title + " " + d.expectedImpact, metric.name);
  });
}

export function materialsMatchHint(materialTitle: string, label: string): boolean {
  const a = materialTitle.toLowerCase();
  const b = label.toLowerCase();
  return a.includes(b) || b.includes(a) || b.split(/\s+/).some((w) => w.length > 4 && a.includes(w));
}
