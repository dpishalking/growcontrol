import { getFunnelTypeTemplate } from "@/data/funnelTypes/catalog";
import type { Funnel } from "@/types/funnel";
import type { FunnelStageDefinition, FunnelTypeId } from "@/types/funnelType";
import {
  createFunnelMetric,
  getMetricsByFunnel,
  removeFunnelMetric,
  updateFunnelMetric,
} from "./funnelMetricService";
import { getFunnelById, updateFunnel } from "./funnelService";
import type { MockStore } from "./storage";

/** Убрать устаревшие метрики шаблона (не дублируем этапы). */
function pruneObsoleteWebinarMetrics(store: MockStore, funnelId: string): void {
  const obsolete = store.funnelMetrics.filter(
    (m) =>
      m.funnelId === funnelId &&
      (m.stage === "reg_page" || m.name.toLowerCase() === "посетители страницы регистрации"),
  );
  for (const m of obsolete) removeFunnelMetric(store, m.id);
}

/** Клики/CTR/CPC → этап click; бюджет и показы → traffic. */
function realignTrafficClickMetrics(store: MockStore, funnelId: string): void {
  const clickNames = new Set(["клики", "ctr", "cpc"]);
  const trafficNames = new Set(["показы", "рекламный бюджет"]);

  for (const m of getMetricsByFunnel(store, funnelId)) {
    const key = m.name.toLowerCase();
    if (clickNames.has(key) && m.stage !== "click") {
      updateFunnelMetric(store, m.id, { stage: "click" });
    } else if (trafficNames.has(key) && m.stage !== "traffic") {
      updateFunnelMetric(store, m.id, { stage: "traffic" });
    }
  }
}

export function applyFunnelType(
  store: MockStore,
  funnelId: string,
  typeId: FunnelTypeId,
  customStages?: FunnelStageDefinition[],
): Funnel | null {
  const template = getFunnelTypeTemplate(typeId);
  const stages =
    typeId === "custom" && customStages && customStages.length >= 3
      ? customStages
      : [...template.requiredStages, ...template.optionalStages];

  const funnel = updateFunnel(store, funnelId, {
    funnelTypeId: typeId,
    stages,
  });
  if (!funnel) return null;

  seedRequiredMetrics(store, funnelId, typeId);
  return funnel;
}

export function seedRequiredMetrics(store: MockStore, funnelId: string, typeId: FunnelTypeId): number {
  const template = getFunnelTypeTemplate(typeId);

  if (typeId === "webinar") {
    pruneObsoleteWebinarMetrics(store, funnelId);
  }

  const funnel = getFunnelById(store, funnelId);
  if (funnel?.funnelTypeId === typeId) {
    updateFunnel(store, funnelId, {
      stages: [...template.requiredStages, ...template.optionalStages],
    });
  }

  realignTrafficClickMetrics(store, funnelId);

  const existing = getMetricsByFunnel(store, funnelId);
  const existingNames = new Set(existing.map((m) => m.name.toLowerCase()));
  let added = 0;

  for (const tm of template.requiredMetrics) {
    if (existingNames.has(tm.name.toLowerCase())) continue;
    createFunnelMetric(store, {
      funnelId,
      stage: tm.stageId,
      name: tm.name,
      unit: tm.unit,
      direction: tm.direction,
      revenueImpact: tm.revenueImpact,
    });
    added += 1;
  }

  return added;
}
