import type { HypothesisDirection } from "@/data/hypothesisDirections";
import { normalizeMetricKey } from "@/data/hypothesisDirections";
import type { HypothesisInput } from "@/types/hypothesis";
import type { FunnelMetric } from "@/types/funnelMetric";

function formatValue(v: number | null | undefined, unit: string): string {
  if (v == null || Number.isNaN(v)) return "—";
  return `${v}${unit ? (unit === "%" || unit === "x" ? unit : ` ${unit}`) : ""}`;
}

function expectedImpactPhrase(metric: FunnelMetric): string {
  const key = normalizeMetricKey(metric.name);
  const up = metric.direction === "higher_better";
  const down = metric.direction === "lower_better";

  if (key === "ctr") return up ? "CTR вырастет на 10–20%" : "CTR снизится на 10–15%";
  if (key === "cpc") return down ? "CPC снизится на 12–25%" : "CPC вырастет на 10–15%";
  if (key.includes("roas")) return up ? "ROAS вырастет на 15–30%" : "ROAS снизится";
  if (key.includes("romi")) return up ? "ROMI вырастет на 10–25%" : "ROMI снизится";
  if (key.includes("стоимость регистрации") || key.includes("cpl") || key.includes("стоимость заявки"))
    return down ? "стоимость снизится на 15–30%" : "стоимость вырастет";
  if (key.includes("конверсия") && up) return `конверсия «${metric.name}» вырастет на 15–35%`;
  if (key.includes("доходимость")) return up ? "доходимость вырастет на 8–15 п.п." : "доходимость снизится";
  if (key.includes("дозвон")) return up ? "дозвон вырастет на 5–12 п.п." : "дозвон снизится";

  if (up) return `«${metric.name}» вырастет на 10–25%`;
  if (down) return `«${metric.name}» снизится на 10–25%`;
  return `«${metric.name}» улучшится на 10–20%`;
}

function guardrailForMetric(metric: FunnelMetric): string {
  const key = normalizeMetricKey(metric.name);
  if (key.includes("ctr") || key.includes("cpc")) return "Качество заявок и CR страницы не должны упасть >5%";
  if (key.includes("стоимость")) return "Объём регистраций/заявок не должен упасть >10%";
  if (key.includes("roas") || key.includes("romi")) return "Выручка не должна упасть при перераспределении бюджета";
  return "Соседние метрики воронки не должны ухудшиться >10%";
}

function capitalizeFirst(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function ensureIfClause(change: string): string {
  const t = change.trim();
  if (/^если\s/i.test(t)) return t;
  return capitalizeFirst(t);
}

function buildTestWindow(direction: HypothesisDirection): string {
  const tm = direction.testMethod;
  if (/(\d+)\s*(дн|ден|нед|месяц)/i.test(tm)) return tm;
  return `${tm}. Окно: 7–14 дней при достаточном трафике.`;
}

/** Собирает развёрнутую SMART-гипотезу из направления и метрики. */
export function buildHypothesisFromDirection(
  metric: FunnelMetric,
  direction: HypothesisDirection,
): Omit<HypothesisInput, "funnelId"> {
  const current = formatValue(metric.actualValue, metric.unit);
  const target = formatValue(metric.plannedValue, metric.unit);
  const impact = expectedImpactPhrase(metric);
  const ifChange = ensureIfClause(direction.change);
  const thenMetric = `${impact} (метрика: ${metric.name})`;
  const becauseReason = [
    metric.comment?.trim() ? `Сейчас: ${current}, план: ${target}. ${metric.comment.trim()}` : `Сейчас: ${current}, план: ${target}.`,
    direction.rationale,
  ]
    .filter(Boolean)
    .join(" ");

  const successCriteria = [
    `${metric.name} ${metric.direction === "lower_better" ? "≤" : "≥"} ${target}`,
    `(было ${current})`,
    guardrailForMetric(metric),
  ].join(". ");

  const title = ifChange;

  return {
    metricId: metric.id,
    metricName: metric.name,
    funnelStage: metric.stage,
    title,
    ifChange,
    thenMetric,
    becauseReason,
    currentValue: current,
    targetValue: target,
    problemReason: metric.comment?.trim() || `Метрика «${metric.name}» в зоне ${metric.status === "red" ? "критического" : "рискового"} отклонения`,
    whyItShouldWork: direction.rationale,
    materialsToChange: direction.materialsToChange,
    testMethod: buildTestWindow(direction),
    successCriteria,
    testDurationDays: /14|недел/i.test(direction.testMethod) ? 14 : 7,
    risk: guardrailForMetric(metric),
    complexity: direction.complexity,
    impact: Math.min(5, metric.revenueImpact >= 4 ? direction.impact + 1 : direction.impact),
    confidence: direction.confidence,
    ease: direction.ease,
  };
}
