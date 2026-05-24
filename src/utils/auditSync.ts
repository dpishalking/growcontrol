import type { Funnel } from "@/types/funnel";
import type { Material } from "@/types/material";
import type { FunnelAuditSnapshot, AuditSyncSnapshot } from "@/types/funnelAudit";
import type { FunnelMetric } from "@/types/funnelMetric";

export function buildAuditSyncSnapshot(
  funnel: Funnel,
  metrics: FunnelMetric[],
  materials: Material[],
): AuditSyncSnapshot {
  const stagesFingerprint = funnel.stages.map((s) => s.id).join(",");
  const metricsFingerprint = metrics
    .map((m) =>
      [m.id, m.stage, m.name, m.plannedValue, m.actualValue, m.status, m.achievementPercent].join(
        ":",
      ),
    )
    .sort()
    .join("|");
  const materialsFingerprint = materials
    .map((m) => [m.id, m.funnelStage, m.title, m.url].join(":"))
    .sort()
    .join("|");

  return {
    metricsFingerprint,
    metricsCount: metrics.length,
    materialsFingerprint,
    materialsCount: materials.length,
    stagesFingerprint,
    landingUrl: funnel.landingUrl?.trim() || undefined,
  };
}

export type AuditSyncStatus = {
  inSync: boolean;
  metricsChanged: boolean;
  materialsChanged: boolean;
  stagesChanged: boolean;
  landingChanged: boolean;
  messages: string[];
};

export function getAuditSyncStatus(
  snapshot: FunnelAuditSnapshot | null | undefined,
  funnel: Funnel,
  metrics: FunnelMetric[],
  materials: Material[],
): AuditSyncStatus {
  if (!snapshot?.report) {
    return {
      inSync: true,
      metricsChanged: false,
      materialsChanged: false,
      stagesChanged: false,
      landingChanged: false,
      messages: [],
    };
  }

  const current = buildAuditSyncSnapshot(funnel, metrics, materials);
  const saved = snapshot.syncContext;

  if (!saved) {
    const metricsFilled = metrics.some((m) => m.actualValue != null || m.plannedValue != null);
    return {
      inSync: false,
      metricsChanged: metricsFilled,
      materialsChanged: false,
      stagesChanged: false,
      landingChanged: false,
      messages: metricsFilled
        ? ["Аудит нужно перезапустить, чтобы синхронизировать выводы с текущими метриками"]
        : [],
    };
  }

  const metricsChanged =
    saved.metricsFingerprint !== current.metricsFingerprint ||
    saved.metricsCount !== current.metricsCount;
  const materialsChanged =
    saved.materialsFingerprint !== current.materialsFingerprint ||
    saved.materialsCount !== current.materialsCount;
  const stagesChanged = saved.stagesFingerprint !== current.stagesFingerprint;
  const landingChanged = (saved.landingUrl ?? "") !== (current.landingUrl ?? "");

  const messages: string[] = [];
  if (metricsChanged) messages.push("метрики изменились");
  if (materialsChanged) messages.push("материалы изменились");
  if (stagesChanged) messages.push("этапы воронки изменились");
  if (landingChanged) messages.push("URL посадочной изменился");

  return {
    inSync: !metricsChanged && !materialsChanged && !stagesChanged && !landingChanged,
    metricsChanged,
    materialsChanged,
    stagesChanged,
    landingChanged,
    messages,
  };
}
