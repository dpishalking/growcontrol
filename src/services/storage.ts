import type { User } from "@/types/user";
import type { Project } from "@/types/project";
import type { AIReport } from "@/types/ai-report";
import type { MetricPeriodNode } from "@/types/metric";
import type { Funnel } from "@/types/funnel";
import type { Material } from "@/types/material";
import type { FunnelMetric } from "@/types/funnelMetric";
import type { AuditFinding } from "@/types/audit";
import type { Hypothesis } from "@/types/hypothesis";
import type { Experiment } from "@/types/experiment";

function normalizeHypothesisFromStorage(raw: Hypothesis): Hypothesis {
  const r = raw as Hypothesis & { tags?: unknown; minDataVolume?: unknown };
  return {
    ...raw,
    tags: Array.isArray(r.tags)
      ? (r.tags as string[]).map((x) => String(x).trim()).filter(Boolean)
      : [],
    minDataVolume:
      typeof r.minDataVolume === "string" ? r.minDataVolume : "",
  };
}

function normalizeExperimentFromStorage(raw: Experiment): Experiment {
  return {
    ...raw,
    baselineNumeric:
      raw.baselineNumeric === undefined ? null : raw.baselineNumeric,
    targetNumeric: raw.targetNumeric === undefined ? null : raw.targetNumeric,
    resultNumeric:
      raw.resultNumeric === undefined ? null : raw.resultNumeric,
    minDataVolume: raw.minDataVolume ?? "",
  };
}

const STORAGE_KEY_BASE = "growcontrol_mock_v2";
const GUEST_KEY = `${STORAGE_KEY_BASE}:guest`;
const LEGACY_KEY = STORAGE_KEY_BASE;

let currentKey: string = GUEST_KEY;

/** Привязать локальное хранилище к конкретному пользователю (или гостю). */
export function setStorageScope(scope: { userId?: string | null }): void {
  currentKey = scope.userId ? `${STORAGE_KEY_BASE}:${scope.userId}` : GUEST_KEY;
}

export function getStorageKey(): string {
  return currentKey;
}

export type MockStore = {
  user: User;
  projects: Project[];
  reports: AIReport[];
  metricTrees: Record<string, MetricPeriodNode[]>;
  funnels: Funnel[];
  materials: Material[];
  funnelMetrics: FunnelMetric[];
  auditFindings: AuditFinding[];
  hypotheses: Hypothesis[];
  experiments: Experiment[];
};

export function loadStore(): MockStore | null {
  try {
    let raw = localStorage.getItem(currentKey);
    if (!raw && currentKey === GUEST_KEY) {
      // Однократно подбираем данные из старого глобального ключа.
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy) {
        localStorage.setItem(GUEST_KEY, legacy);
        localStorage.removeItem(LEGACY_KEY);
        raw = legacy;
      }
    }
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<MockStore>;
    if (!parsed.user) return null;
    return {
      user: parsed.user,
      projects: parsed.projects ?? [],
      reports: parsed.reports ?? [],
      metricTrees: parsed.metricTrees ?? {},
      funnels: parsed.funnels ?? [],
      materials: parsed.materials ?? [],
      funnelMetrics: parsed.funnelMetrics ?? [],
      auditFindings: parsed.auditFindings ?? [],
      hypotheses: (parsed.hypotheses ?? []).map((h: Hypothesis) =>
        normalizeHypothesisFromStorage(h),
      ),
      experiments: (parsed.experiments ?? []).map((e: Experiment) =>
        normalizeExperimentFromStorage(e),
      ),
    };
  } catch {
    return null;
  }
}

export function saveStore(store: MockStore): void {
  localStorage.setItem(currentKey, JSON.stringify(store));
}

export function clearCurrentStore(): void {
  localStorage.removeItem(currentKey);
}
