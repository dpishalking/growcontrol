import type { Funnel } from "@/types/funnel";
import type { Material } from "@/types/material";
import type { FunnelAuditApiPayload } from "@/types/funnelAudit";
import { getFunnelTypeTemplate } from "@/data/funnelTypes/catalog";
import { getMetricsByFunnel } from "./funnelMetricService";
import { getFunnelById, updateFunnel } from "./funnelService";
import type { MockStore } from "./storage";
import type { FunnelAuditSnapshot } from "@/types/funnelAudit";
import { getMaterialsByFunnel } from "./materialService";

export function buildFunnelAuditPayload(store: MockStore, funnelId: string): FunnelAuditApiPayload | null {
  const funnel = getFunnelById(store, funnelId);
  if (!funnel) return null;

  const materials = getMaterialsByFunnel(store, funnelId);
  const stageOrder = funnel.stages.map((s) => s.id);
  const metrics = getMetricsByFunnel(store, funnelId, stageOrder);
  const typeId = funnel.funnelTypeId ?? "service_lead";
  const typeTemplate = getFunnelTypeTemplate(typeId);
  const stages =
    funnel.stages.length > 0
      ? funnel.stages.map((s) => ({ id: s.id, label: s.label, description: s.description }))
      : typeTemplate.stages.map((s) => ({ id: s.id, label: s.label, description: s.description }));

  return {
    landingUrl: funnel.landingUrl || undefined,
    funnel: {
      typeId,
      typeName: typeTemplate.name,
      exampleFlow: typeTemplate.exampleFlow,
      productName: funnel.productName,
      productDescription: funnel.productDescription,
      averagePrice: funnel.averagePrice,
      trafficSource: funnel.trafficSource,
      targetAudience: funnel.targetAudience,
      funnelGoal: funnel.funnelGoal,
      currentProblem: funnel.currentProblem,
      stages,
      productDetails: funnel.productDetails as unknown as Record<string, string>,
      audienceDetails: funnel.audienceDetails as unknown as Record<string, string>,
      funnelDetails: funnel.funnelDetails as unknown as Record<string, string>,
      constraints: funnel.constraints as unknown as Record<string, string>,
      commonBottlenecks: typeTemplate.commonBottlenecks,
      auditQuestions: typeTemplate.auditQuestions,
    },
    materials: materials.map((m) => ({
      id: m.id,
      type: m.type,
      title: m.title,
      stage: m.funnelStage,
      url: m.url,
      content: m.content,
      extractedText: m.attachment?.extractedText,
      source: m.source,
    })),
    metrics: metrics.map((m) => ({
      stage: m.stage,
      name: m.name,
      unit: m.unit,
      period: m.period,
      plannedValue: m.plannedValue,
      actualValue: m.actualValue,
      direction: m.direction,
      confidence: m.confidence,
      status: m.status,
      achievementPercent: m.achievementPercent,
      revenueImpact: m.revenueImpact,
      dataSource: m.dataSource,
      comment: m.comment,
    })),
  };
}

export function saveFunnelAuditSnapshot(
  store: MockStore,
  funnelId: string,
  snapshot: FunnelAuditSnapshot,
): Funnel | null {
  return updateFunnel(store, funnelId, { auditSnapshot: snapshot });
}

export function getFunnelAuditSnapshot(funnel: Funnel): FunnelAuditSnapshot | null {
  return funnel.auditSnapshot ?? null;
}

export function materialsCountForAudit(materials: Material[]): number {
  return materials.length;
}
