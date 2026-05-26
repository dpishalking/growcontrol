import type { Hypothesis, HypothesisInput, HypothesisStatus } from "@/types/hypothesis";
import type { FunnelMetric } from "@/types/funnelMetric";
import { createId, nowIso } from "@/utils/id";
import { classifyBucket, computeIce } from "@/utils/icePriority";
import { getDirectionsForMetricAndType } from "@/data/hypothesisDirections";
import { getFunnelTypeTemplate } from "@/data/funnelTypes/catalog";
import { buildHypothesisFromDirection } from "@/lib/buildHypothesisFromDirection";
import { auditDraftsForMetric } from "@/lib/hypothesisMetricContext";
import {
  buildMetricHypothesesAuditContext,
} from "@/lib/metricHypothesesAuditContext";
import type { FunnelAuditHypothesisDraft } from "@/types/funnelAudit";
import type { MetricHypothesesApiPayload } from "@/types/metricHypotheses";
import { linkHypothesisToMetric } from "./funnelMetricService";
import { getFunnelById } from "./funnelService";
import { getMaterialsByFunnel } from "./materialService";
import { runMetricHypothesesApi } from "./hypothesisAiApi";
import type { MockStore } from "./storage";
import { buildDiagnostics } from "@/utils/funnelDiagnostics";

function clamp(v: number | undefined, fallback: number): number {
  if (typeof v !== "number" || Number.isNaN(v)) return fallback;
  return Math.max(1, Math.min(5, v));
}

export function getHypothesesByFunnel(store: MockStore, funnelId: string): Hypothesis[] {
  return store.hypotheses
    .filter((h) => h.funnelId === funnelId)
    .sort((a, b) => b.priorityScore - a.priorityScore);
}

export function getTestingHypotheses(store: MockStore): Hypothesis[] {
  return store.hypotheses.filter((h) => h.status === "testing");
}

export function getHypothesisById(store: MockStore, id: string): Hypothesis | null {
  return store.hypotheses.find((h) => h.id === id) ?? null;
}

export function createHypothesis(store: MockStore, input: HypothesisInput): Hypothesis {
  const impact = clamp(input.impact, 3);
  const confidence = clamp(input.confidence, 3);
  const ease = clamp(input.ease, 3);
  const complexity = clamp(input.complexity, 3);

  const hypothesis: Hypothesis = {
    id: createId("hyp"),
    funnelId: input.funnelId,
    metricId: input.metricId ?? null,
    metricName: input.metricName,
    funnelStage: input.funnelStage,
    title: input.title.trim(),
    ifChange: input.ifChange.trim(),
    thenMetric: input.thenMetric.trim(),
    becauseReason: input.becauseReason.trim(),
    currentValue: input.currentValue?.trim() ?? "",
    targetValue: input.targetValue?.trim() ?? "",
    problemReason: input.problemReason?.trim() ?? "",
    whyItShouldWork: input.whyItShouldWork?.trim() ?? input.becauseReason.trim(),
    materialsToChange: input.materialsToChange ?? [],
    testMethod: input.testMethod?.trim() ?? "",
    successCriteria: input.successCriteria?.trim() ?? "",
    testDurationDays: input.testDurationDays ?? 7,
    minBudget: input.minBudget ?? "",
    risk: input.risk ?? "",
    complexity,
    impact,
    confidence,
    ease,
    priorityScore: computeIce({ impact, confidence, ease }),
    bucket: classifyBucket({ impact, confidence, ease }),
    status: "draft",
    result: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  store.hypotheses.unshift(hypothesis);
  if (hypothesis.metricId) linkHypothesisToMetric(store, hypothesis.metricId, hypothesis.id);
  return hypothesis;
}

export function updateHypothesis(
  store: MockStore,
  id: string,
  patch: Partial<Hypothesis>,
): Hypothesis | null {
  const idx = store.hypotheses.findIndex((h) => h.id === id);
  if (idx < 0) return null;

  const merged: Hypothesis = {
    ...store.hypotheses[idx],
    ...patch,
    updatedAt: nowIso(),
  };
  merged.priorityScore = computeIce(merged);
  merged.bucket = classifyBucket(merged);
  store.hypotheses[idx] = merged;
  return merged;
}

export function moveHypothesisStatus(
  store: MockStore,
  id: string,
  status: HypothesisStatus,
  result?: string | null,
): Hypothesis | null {
  return updateHypothesis(store, id, {
    status,
    result: result === undefined ? store.hypotheses.find((h) => h.id === id)?.result ?? null : result,
  });
}

export function removeHypothesis(store: MockStore, id: string): boolean {
  const before = store.hypotheses.length;
  store.hypotheses = store.hypotheses.filter((h) => h.id !== id);
  return store.hypotheses.length < before;
}

/**
 * Сгенерировать гипотезы под одну метрику на основе библиотеки направлений.
 * Возвращает массив только что созданных гипотез (без дубликатов по title).
 */
export function generateHypothesesForMetric(
  store: MockStore,
  metric: FunnelMetric,
): Hypothesis[] {
  const funnel = getFunnelById(store, metric.funnelId);
  const typeTemplate = getFunnelTypeTemplate(funnel?.funnelTypeId ?? undefined);
  const typeDirs = Object.fromEntries(
    Object.entries(typeTemplate.hypothesisDirections).map(([k, v]) => [k, v]),
  );
  const directions = getDirectionsForMetricAndType(metric.name, typeDirs);
  if (directions.length === 0) return [];

  const existing = store.hypotheses.filter((h) => h.metricId === metric.id);
  const created: Hypothesis[] = [];

  for (const d of directions) {
    const built = buildHypothesisFromDirection(metric, d);
    if (existing.some((h) => h.ifChange === built.ifChange && h.metricId === metric.id)) continue;

    const created_h = createHypothesis(store, {
      funnelId: metric.funnelId,
      ...built,
    });
    created.push(created_h);
  }

  return created;
}

/** Пакетная генерация: проходит по всем красным/жёлтым метрикам с описанными направлениями. */
export function generateHypothesesForFunnel(
  store: MockStore,
  funnelId: string,
): Hypothesis[] {
  const metrics = store.funnelMetrics.filter(
    (m) => m.funnelId === funnelId && (m.status === "red" || m.status === "yellow"),
  );
  const created: Hypothesis[] = [];
  for (const m of metrics) {
    created.push(...generateHypothesesForMetric(store, m));
  }
  return created;
}

/** Топ-N гипотез по ICE для метрики. */
export function topHypothesesForMetric(
  store: MockStore,
  funnelId: string,
  metricId: string,
  limit = 3,
): Hypothesis[] {
  return store.hypotheses
    .filter((h) => h.funnelId === funnelId && h.metricId === metricId)
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, limit);
}

/** Оставить в работе выбранные, остальные по метрике — в «отложено». */
export function finalizeHypothesisSelection(
  store: MockStore,
  funnelId: string,
  metricId: string,
  selectedIds: string[],
  patches: Record<string, Partial<Hypothesis>>,
): void {
  const forMetric = store.hypotheses.filter((h) => h.funnelId === funnelId && h.metricId === metricId);
  for (const h of forMetric) {
    if (selectedIds.includes(h.id)) {
      updateHypothesis(store, h.id, {
        ...(patches[h.id] ?? {}),
        status: "backlog",
      });
    } else {
      updateHypothesis(store, h.id, { status: "parked" });
    }
  }
}

/** Импорт гипотез из AI-аудита воронки. */
export function importHypothesesFromAudit(
  store: MockStore,
  funnelId: string,
  drafts: FunnelAuditHypothesisDraft[],
  metric?: FunnelMetric,
): Hypothesis[] {
  const priorityToIce = (p: "high" | "medium" | "low") => {
    if (p === "high") return { impact: 5, confidence: 4, ease: 4 };
    if (p === "low") return { impact: 2, confidence: 3, ease: 3 };
    return { impact: 4, confidence: 3, ease: 3 };
  };

  const created: Hypothesis[] = [];
  const existing = store.hypotheses.filter((h) => h.funnelId === funnelId);

  for (const d of drafts.slice(0, 10)) {
    const priorityIce = priorityToIce(d.priority);
    const ice = d.impact != null && d.confidence != null && d.ease != null
      ? {
          impact: Math.max(1, Math.min(5, d.impact)),
          confidence: Math.max(1, Math.min(5, d.confidence)),
          ease: Math.max(1, Math.min(5, d.ease)),
        }
      : priorityIce;

    const ifChange = d.ifChange?.trim()
      ? d.ifChange.trim()
      : d.title.startsWith("Если")
        ? d.title
        : `Если ${d.title.charAt(0).toLowerCase()}${d.title.slice(1)}`;

    const thenMetric = d.thenMetric?.trim() || d.expectedImpact;
    const becauseReason = d.becauseReason?.trim() || d.why;
    const testMethod = d.testMethod?.trim() || d.testWindow;

    if (existing.some((h) => h.title === d.title || h.ifChange === ifChange)) continue;

    const stageFromChannel =
      d.channel === "sales"
        ? "consultation"
        : d.channel === "creative"
          ? "traffic"
          : metric?.stage ?? "landing";

    const materialsToChange = d.materialsToChange?.length
      ? d.materialsToChange
      : inferMaterialsFromAuditDraft(d);

    created.push(
      createHypothesis(store, {
        funnelId,
        metricId: metric?.id ?? null,
        metricName: metric?.name ?? d.metricName,
        funnelStage: stageFromChannel,
        title: d.title,
        ifChange,
        thenMetric,
        becauseReason,
        whyItShouldWork: becauseReason,
        testMethod,
        successCriteria: d.successCriteria?.trim() || `${thenMetric}. Метрика: ${metric?.name ?? d.metricName}.`,
        testDurationDays: d.testDurationDays ?? 7,
        risk: d.risk ?? d.guardrail ?? "",
        materialsToChange,
        ...ice,
      }),
    );
  }
  return created;
}

export function importHypothesesFromAuditForMetric(
  store: MockStore,
  funnelId: string,
  metric: FunnelMetric,
): Hypothesis[] {
  const funnel = getFunnelById(store, funnelId);
  const allDrafts = funnel?.auditSnapshot?.report.hypotheses ?? [];
  const filtered = auditDraftsForMetric(allDrafts, metric);
  if (!filtered.length) return [];
  return importHypothesesFromAudit(store, funnelId, filtered, metric);
}

function inferMaterialsFromAuditDraft(d: FunnelAuditHypothesisDraft): string[] {
  const text = `${d.title} ${d.channel}`.toLowerCase();
  const out: string[] = [];
  if (text.includes("лендинг") || text.includes("страниц") || d.channel === "website") {
    out.push("Страница регистрации");
  }
  if (text.includes("креатив") || d.channel === "creative") out.push("Рекламные креативы");
  if (text.includes("скрипт") || d.channel === "sales") out.push("Сценарий вебинара");
  if (text.includes("письм") || text.includes("дожим")) out.push("Сообщения после вебинара");
  return out;
}

export function buildMetricHypothesesPayload(
  store: MockStore,
  funnelId: string,
  metric: FunnelMetric,
): MetricHypothesesApiPayload | null {
  const funnel = getFunnelById(store, funnelId);
  if (!funnel) return null;

  const typeTemplate = getFunnelTypeTemplate(funnel.funnelTypeId ?? undefined);
  const materials = getMaterialsByFunnel(store, funnelId);
  const stageMaterials = materials.filter((m) => m.funnelStage === metric.stage);
  const matsForPrompt = (stageMaterials.length > 0 ? stageMaterials : materials).slice(0, 8);

  const existing = store.hypotheses
    .filter((h) => h.funnelId === funnelId && h.metricId === metric.id)
    .flatMap((h) => [h.title, h.ifChange])
    .filter(Boolean);

  const audit = funnel.auditSnapshot?.report;
  const metrics = store.funnelMetrics.filter((fm) => fm.funnelId === funnelId);
  const diag = buildDiagnostics(metrics);
  const auditContext = buildMetricHypothesesAuditContext(
    audit,
    metric,
    diag.bottleneck?.id ?? null,
  );

  return {
    funnel: {
      typeId: funnel.funnelTypeId ?? "service_lead",
      typeName: typeTemplate.name,
      exampleFlow: typeTemplate.exampleFlow,
      productName: funnel.productName,
      productDescription: funnel.productDescription,
      trafficSource: funnel.trafficSource,
      targetAudience: funnel.targetAudience,
      funnelGoal: funnel.funnelGoal,
      currentProblem: funnel.currentProblem,
    },
    metric: {
      id: metric.id,
      name: metric.name,
      stage: metric.stage,
      unit: metric.unit,
      plannedValue: metric.plannedValue,
      actualValue: metric.actualValue,
      direction: metric.direction,
      status: metric.status,
      achievementPercent: metric.achievementPercent,
      comment: metric.comment,
    },
    materials: matsForPrompt.map((m) => ({
      type: m.type,
      title: m.title,
      stage: m.funnelStage,
      content: m.content,
      extractedText: m.attachment?.extractedText,
    })),
    existingHypotheses: existing,
    auditContext,
  };
}

/** Генерация гипотез через AI под одну метрику. */
export async function generateAiHypothesesForMetric(
  store: MockStore,
  funnelId: string,
  metric: FunnelMetric,
): Promise<Hypothesis[]> {
  const payload = buildMetricHypothesesPayload(store, funnelId, metric);
  if (!payload) throw new Error("Не удалось собрать данные воронки");

  const { hypotheses } = await runMetricHypothesesApi(payload);
  const drafts: FunnelAuditHypothesisDraft[] = hypotheses.map((h) => ({
    ...h,
    metricName: metric.name,
  }));

  return importHypothesesFromAudit(store, funnelId, drafts, metric);
}
