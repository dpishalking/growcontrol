import type { FunnelMetric, FunnelMetricInput } from "@/types/funnelMetric";
import { createId, nowIso } from "@/utils/id";
import { evaluateMetric } from "@/utils/funnelDiagnostics";
import type { MockStore } from "./storage";

export function getMetricsByFunnel(store: MockStore, funnelId: string, stageOrder: string[] = []): FunnelMetric[] {
  const items = store.funnelMetrics.filter((m) => m.funnelId === funnelId);
  if (!stageOrder.length) {
    return items.sort((a, b) => a.name.localeCompare(b.name, "ru"));
  }
  const stageIndex = new Map(stageOrder.map((id, i) => [id, i]));
  return items.sort((a, b) => {
    const ai = stageIndex.get(a.stage) ?? 999;
    const bi = stageIndex.get(b.stage) ?? 999;
    if (ai !== bi) return ai - bi;
    return a.name.localeCompare(b.name, "ru");
  });
}

export function getMetricById(store: MockStore, id: string): FunnelMetric | null {
  return store.funnelMetrics.find((m) => m.id === id) ?? null;
}

function recompute(metric: FunnelMetric): FunnelMetric {
  const { status, achievementPercent } = evaluateMetric(metric);
  return { ...metric, status, achievementPercent };
}

export function createFunnelMetric(store: MockStore, input: FunnelMetricInput): FunnelMetric {
  const now = nowIso();
  const base: FunnelMetric = {
    id: createId("metric"),
    funnelId: input.funnelId,
    stage: input.stage,
    name: input.name.trim(),
    unit: input.unit ?? "",
    period: input.period ?? "Месяц",
    plannedValue: input.plannedValue ?? null,
    actualValue: input.actualValue ?? null,
    rangeNorm: input.rangeNorm,
    rangeAllowedDeviation: input.rangeAllowedDeviation,
    rangeCriticalDeviation: input.rangeCriticalDeviation,
    direction: input.direction,
    dataSource: input.dataSource ?? "",
    confidence: input.confidence ?? "medium",
    comment: input.comment ?? "",
    status: "no_data",
    achievementPercent: null,
    revenueImpact: input.revenueImpact ?? 3,
    relatedMaterialIds: [],
    relatedHypothesisIds: [],
    createdAt: now,
    updatedAt: now,
  };
  const computed = recompute(base);
  store.funnelMetrics.push(computed);
  return computed;
}

export function updateFunnelMetric(
  store: MockStore,
  id: string,
  patch: Partial<FunnelMetric>,
): FunnelMetric | null {
  const idx = store.funnelMetrics.findIndex((m) => m.id === id);
  if (idx < 0) return null;
  const merged: FunnelMetric = {
    ...store.funnelMetrics[idx],
    ...patch,
    updatedAt: nowIso(),
  };
  store.funnelMetrics[idx] = recompute(merged);
  return store.funnelMetrics[idx];
}

export function removeFunnelMetric(store: MockStore, id: string): boolean {
  const before = store.funnelMetrics.length;
  store.funnelMetrics = store.funnelMetrics.filter((m) => m.id !== id);
  return store.funnelMetrics.length < before;
}

/** Пересчитать статус и PTF у всех метрик воронки перед аудитом. */
export function recomputeAllFunnelMetrics(store: MockStore, funnelId: string): void {
  for (const m of store.funnelMetrics) {
    if (m.funnelId !== funnelId) continue;
    const idx = store.funnelMetrics.findIndex((x) => x.id === m.id);
    if (idx < 0) continue;
    store.funnelMetrics[idx] = recompute(store.funnelMetrics[idx]);
  }
}

export function linkHypothesisToMetric(store: MockStore, metricId: string, hypothesisId: string): void {
  const m = store.funnelMetrics.find((x) => x.id === metricId);
  if (!m) return;
  if (!m.relatedHypothesisIds.includes(hypothesisId)) {
    m.relatedHypothesisIds = [...m.relatedHypothesisIds, hypothesisId];
  }
}
