import type { MockStore } from "@/services/storage";
import { getFunnelById } from "@/services/funnelService";
import { getMaterialsByFunnel } from "@/services/materialService";
import { getMetricsByFunnel } from "@/services/funnelMetricService";
import { getFunnelAuditSnapshot } from "@/services/funnelAuditService";
import { getHypothesisById } from "@/services/hypothesisService";
import { getProjectById } from "@/services/projectService";
import { resolveProjectIdForFunnel } from "@/services/projectSyncService";
import {
  notifyAuditStale,
  notifyHypothesisBacklog,
  notifyMaterialsComplete,
  notifyMetricRed,
  notifyTestFinished,
  type HypothesisNotifyPayload,
} from "@/services/telegramService";
import { buildMaterialChecklist } from "@/features/wizard/MaterialChecklist";
import { getFunnelTypeTemplate } from "@/data/funnelTypes/catalog";
import { buildAuditReportUrl } from "@/lib/telegramAuditFormat";
import { getAuditSyncStatus } from "@/utils/auditSync";
import type { Experiment } from "@/types/experiment";
import type { FunnelMetric } from "@/types/funnelMetric";
import type { Hypothesis } from "@/types/hypothesis";
import type { FunnelTypeId } from "@/types/funnelType";

const materialsCompleteSent = new Set<string>();
const auditStaleSent = new Set<string>();

function funnelLabel(funnelId: string, store: MockStore): string {
  const funnel = getFunnelById(store, funnelId);
  return funnel?.productName?.trim() || "Воронка";
}

function hypothesisPayload(h: Hypothesis): HypothesisNotifyPayload {
  return {
    id: h.id,
    title: h.title,
    metricName: h.metricName,
    funnelStage: h.funnelStage,
    ifChange: h.ifChange,
    thenMetric: h.thenMetric,
    priorityScore: h.priorityScore,
  };
}

function projectContext(
  store: MockStore,
  funnelId: string,
): { projectId: string; projectName: string; funnelName: string } | null {
  const projectId = resolveProjectIdForFunnel(store, funnelId);
  if (!projectId) return null;
  const project = getProjectById(store, projectId);
  if (!project) return null;
  return {
    projectId,
    projectName: project.projectName,
    funnelName: funnelLabel(funnelId, store),
  };
}

export function maybeNotifyTestFinished(
  store: MockStore,
  experiment: Experiment,
  enabled: boolean,
): void {
  if (!enabled) return;
  const ctx = projectContext(store, experiment.funnelId);
  const hypothesis = getHypothesisById(store, experiment.hypothesisId);
  if (!ctx || !hypothesis) return;

  void notifyTestFinished(ctx.projectId, {
    projectName: ctx.projectName,
    funnelName: ctx.funnelName,
    hypothesis: hypothesisPayload(hypothesis),
    experiment: {
      id: experiment.id,
      owner: experiment.owner,
      startDate: experiment.startDate,
      endDate: experiment.endDate,
      budget: experiment.budget,
      beforeValue: experiment.beforeValue,
      afterValue: experiment.afterValue,
      result: experiment.result,
      decision: experiment.decision,
    },
  });
}

export function maybeNotifyHypothesisBacklog(
  store: MockStore,
  funnelId: string,
  metricId: string | null,
  hypotheses: Hypothesis[],
  enabled: boolean,
): void {
  if (!enabled || hypotheses.length === 0) return;
  const ctx = projectContext(store, funnelId);
  if (!ctx) return;

  const metricName =
    hypotheses[0]?.metricName ||
    (metricId
      ? getMetricsByFunnel(store, funnelId).find((m) => m.id === metricId)?.name
      : null) ||
    "—";

  void notifyHypothesisBacklog(ctx.projectId, {
    projectName: ctx.projectName,
    funnelName: ctx.funnelName,
    metricName,
    items: hypotheses.map((h) => ({
      title: h.title,
      priorityScore: h.priorityScore,
    })),
  });
}

export function maybeNotifyMetricRed(
  store: MockStore,
  funnelId: string,
  before: FunnelMetric | null,
  after: FunnelMetric,
  enabled: boolean,
): void {
  if (!enabled) return;
  if (after.status !== "red") return;
  if (before?.status === "red") return;

  const ctx = projectContext(store, funnelId);
  if (!ctx) return;

  void notifyMetricRed(ctx.projectId, {
    projectName: ctx.projectName,
    funnelName: ctx.funnelName,
    metricName: after.name,
    actualValue: after.actualValue != null ? String(after.actualValue) : null,
    plannedValue: after.plannedValue != null ? String(after.plannedValue) : null,
    achievementPercent: after.achievementPercent,
  });
}

function materialsChecklistState(funnelId: string, store: MockStore): { complete: boolean; covered: number; total: number } {
  const funnel = getFunnelById(store, funnelId);
  if (!funnel) return { complete: false, covered: 0, total: 0 };

  const materials = getMaterialsByFunnel(store, funnelId);
  const typeTemplate = getFunnelTypeTemplate(funnel.funnelTypeId ?? undefined);
  const funnelTypeId = (funnel.funnelTypeId ?? "custom") as FunnelTypeId;
  const { covered, total } = buildMaterialChecklist(typeTemplate, materials, funnelTypeId);
  return { complete: total > 0 && covered === total, covered, total };
}

export function maybeNotifyMaterialsComplete(
  store: MockStore,
  funnelId: string,
  wasComplete: boolean,
  enabled: boolean,
): void {
  if (!enabled) return;

  const state = materialsChecklistState(funnelId, store);
  if (!state.complete) {
    materialsCompleteSent.delete(funnelId);
    return;
  }
  if (wasComplete || materialsCompleteSent.has(funnelId)) return;

  const ctx = projectContext(store, funnelId);
  if (!ctx) return;

  materialsCompleteSent.add(funnelId);
  void notifyMaterialsComplete(ctx.projectId, {
    projectName: ctx.projectName,
    funnelName: ctx.funnelName,
    covered: state.covered,
    total: state.total,
    auditUrl: buildAuditReportUrl(ctx.projectId, funnelId),
  });
}

export function maybeNotifyAuditStale(store: MockStore, funnelId: string, enabled: boolean): void {
  if (!enabled) return;

  const funnel = getFunnelById(store, funnelId);
  if (!funnel) return;

  const snapshot = getFunnelAuditSnapshot(funnel);
  if (!snapshot?.report) return;

  const metrics = getMetricsByFunnel(store, funnelId, funnel.stages?.map((s) => s.id) ?? []);
  const materials = getMaterialsByFunnel(store, funnelId);
  const status = getAuditSyncStatus(snapshot, funnel, metrics, materials);

  if (status.inSync || status.messages.length === 0) {
    auditStaleSent.delete(funnelId);
    return;
  }

  const dedupeKey = `${funnelId}:${status.messages.join("|")}`;
  if (auditStaleSent.has(dedupeKey)) return;

  const ctx = projectContext(store, funnelId);
  if (!ctx) return;

  auditStaleSent.add(dedupeKey);
  void notifyAuditStale(ctx.projectId, {
    projectName: ctx.projectName,
    funnelName: ctx.funnelName,
    changes: status.messages,
    auditUrl: buildAuditReportUrl(ctx.projectId, funnelId),
  });
}

export function isMaterialsChecklistComplete(funnelId: string, store: MockStore): boolean {
  return materialsChecklistState(funnelId, store).complete;
}
