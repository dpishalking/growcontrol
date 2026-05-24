import { normalizeMetricKey } from "@/data/hypothesisDirections";
import type { FunnelMetric, MetricStatus } from "@/types/funnelMetric";
import { getEffectivePlan } from "@/utils/metricBenchmarks";

export type MetricEvaluation = {
  status: MetricStatus;
  achievementPercent: number | null;
  referenceSource: "plan" | "benchmark" | null;
  referenceValue: number | null;
  /** Как интерпретируем PTF для светофора и подсказок. */
  evaluationKind: MetricEvaluationKind;
};

/** Режим оценки plan/fact для светофора. */
export type MetricEvaluationKind = "higher_better" | "lower_better";

export function isBudgetMetric(name: string): boolean {
  const key = normalizeMetricKey(name);
  return key.includes("рекламный бюджет") || key === "бюджет" || key.includes("медиабюджет");
}

/** Как считать светофор: бюджет и cost-метрики — «меньше плана лучше». */
export function resolveMetricEvaluationKind(
  metric: Pick<FunnelMetric, "name" | "direction">,
): MetricEvaluationKind {
  if (isBudgetMetric(metric.name)) return "lower_better";
  if (metric.direction === "lower_better") return "lower_better";
  return "higher_better";
}

export function statusFromPtf(pct: number, kind: MetricEvaluationKind): MetricStatus {
  if (kind === "higher_better") {
    if (pct >= 100) return "green";
    if (pct >= 90) return "yellow";
    return "red";
  }
  // Бюджет, CPC, CPL и т.п.: не превысить план — хорошо.
  if (pct <= 100) return "green";
  if (pct <= 110) return "yellow";
  return "red";
}

export function getMetricBarFillPercent(
  metric: Pick<FunnelMetric, "actualValue" | "direction" | "name">,
  reference: number | null,
  kind = resolveMetricEvaluationKind(metric),
): number {
  if (metric.actualValue == null || reference == null || reference <= 0) return 0;

  const ratio = (metric.actualValue / reference) * 100;

  if (kind === "lower_better") {
    if (ratio <= 100) return 100;
    return Math.max(0, 100 - (ratio - 100));
  }

  return Math.min(100, Math.max(0, ratio));
}

export function getMetricAchievementHint(
  metric: Pick<FunnelMetric, "name" | "direction" | "actualValue">,
  pct: number | null,
  refSource: "plan" | "benchmark" | null,
  kind = resolveMetricEvaluationKind(metric),
): string | null {
  if (metric.actualValue == null) {
    return "Укажите факт — покажем сравнение с планом или эталоном";
  }
  if (pct == null) {
    return refSource === "benchmark" ? "Сравниваем с рыночным эталоном" : null;
  }

  const refLabel = refSource === "benchmark" ? "эталона" : "плана";
  const rounded = Math.round(pct);
  const budget = isBudgetMetric(metric.name);

  if (kind === "lower_better") {
    if (budget) {
      if (rounded <= 100) return `${rounded}% от ${refLabel} · в рамках бюджета`;
      if (rounded <= 110) return `${rounded}% от ${refLabel} · небольшое превышение`;
      return `${rounded}% от ${refLabel} · бюджет перерасходован`;
    }
    if (rounded <= 100) return `${rounded}% от ${refLabel} · в целевом диапазоне`;
    if (rounded <= 110) return `${rounded}% от ${refLabel} · чуть выше цели`;
    return `${rounded}% от ${refLabel} · выше целевого`;
  }

  if (rounded >= 100) return `${rounded}% от ${refLabel} · цель достигнута`;
  if (rounded >= 90) return `${rounded}% от ${refLabel} · почти в норме`;
  return `${rounded}% от ${refLabel} · ниже цели`;
}

/** Светофор по метрике. Без плана — сравниваем с рыночным эталоном, если он есть. */
export function evaluateMetric(metric: FunnelMetric): MetricEvaluation {
  const evaluationKind = resolveMetricEvaluationKind(metric);

  if (metric.confidence === "low") {
    return {
      status: "unreliable",
      achievementPercent: null,
      referenceSource: null,
      referenceValue: null,
      evaluationKind,
    };
  }

  if (metric.actualValue == null) {
    return {
      status: "no_data",
      achievementPercent: null,
      referenceSource: null,
      referenceValue: null,
      evaluationKind,
    };
  }

  const { value: plan, source: referenceSource } = getEffectivePlan(metric);
  if (plan == null || plan <= 0) {
    const hasFact = metric.actualValue > 0;
    return {
      status: hasFact && evaluationKind === "higher_better" ? "green" : "no_data",
      achievementPercent: null,
      referenceSource: plan == null ? null : referenceSource,
      referenceValue: plan,
      evaluationKind,
    };
  }

  const fact = metric.actualValue;
  const pct = (fact / plan) * 100;

  return {
    status: statusFromPtf(pct, evaluationKind),
    achievementPercent: pct,
    referenceSource,
    referenceValue: plan,
    evaluationKind,
  };
}

export type DiagnosticsSummary = {
  green: FunnelMetric[];
  yellow: FunnelMetric[];
  red: FunnelMetric[];
  noData: FunnelMetric[];
  unreliable: FunnelMetric[];
  /** Главный ограничитель — красная метрика с максимальным revenueImpact, иначе жёлтая. */
  bottleneck: FunnelMetric | null;
  /** Метрики с максимальным влиянием на деньги. */
  moneyMovers: FunnelMetric[];
};

export function buildDiagnostics(
  metrics: FunnelMetric[],
  bottleneckMetricNames: string[] = [],
): DiagnosticsSummary {
  const green: FunnelMetric[] = [];
  const yellow: FunnelMetric[] = [];
  const red: FunnelMetric[] = [];
  const noData: FunnelMetric[] = [];
  const unreliable: FunnelMetric[] = [];

  for (const m of metrics) {
    switch (m.status) {
      case "green":
        green.push(m);
        break;
      case "yellow":
        yellow.push(m);
        break;
      case "red":
        red.push(m);
        break;
      case "no_data":
        noData.push(m);
        break;
      case "unreliable":
        unreliable.push(m);
        break;
    }
  }

  const sortByImpact = (a: FunnelMetric, b: FunnelMetric) => b.revenueImpact - a.revenueImpact;

  const isCritical = (m: FunnelMetric) =>
    bottleneckMetricNames.some(
      (n) =>
        normalizeMetricKey(m.name).includes(normalizeMetricKey(n)) ||
        normalizeMetricKey(n).includes(normalizeMetricKey(m.name)),
    );

  const score = (m: FunnelMetric) => {
    let s = m.revenueImpact;
    if (isCritical(m)) s += 2;
    if (m.status === "red") s += 1;
    return s;
  };

  const pickBottleneck = (pool: FunnelMetric[]) =>
    [...pool].sort((a, b) => score(b) - score(a))[0] ?? null;

  red.sort(sortByImpact);
  yellow.sort(sortByImpact);

  const bottleneck = pickBottleneck(red) ?? pickBottleneck(yellow) ?? null;

  const moneyMovers = [...metrics]
    .filter((m) => m.status === "red" || m.status === "yellow")
    .sort(sortByImpact)
    .slice(0, 5);

  return { green, yellow, red, noData, unreliable, bottleneck, moneyMovers };
}

/** Топ-N проблемных метрик для шага «Гипотезы» (красные/жёлтые, по impact и отставанию от плана). */
export function getTopProblemMetrics(metrics: FunnelMetric[], limit = 3): FunnelMetric[] {
  const pool = metrics.filter((m) => m.status === "red" || m.status === "yellow");
  const score = (m: FunnelMetric) => {
    let s = m.revenueImpact * 10;
    if (m.status === "red") s += 20;
    const kind = resolveMetricEvaluationKind(m);
    if (m.achievementPercent != null && kind === "higher_better" && m.achievementPercent < 100) {
      s += (100 - m.achievementPercent) / 5;
    }
    if (m.achievementPercent != null && kind === "lower_better" && m.achievementPercent > 100) {
      s += (m.achievementPercent - 100) / 5;
    }
    return s;
  };
  return [...pool].sort((a, b) => score(b) - score(a)).slice(0, limit);
}
