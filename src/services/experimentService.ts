import type { Experiment, ExperimentDecision, ExperimentInput } from "@/types/experiment";
import type { HypothesisStatus } from "@/types/hypothesis";
import { parseMetricNumber } from "@/lib/metricValueParse";
import { createId, nowIso } from "@/utils/id";
import { getMetricById } from "./funnelMetricService";
import { getHypothesisById, moveHypothesisStatus } from "./hypothesisService";
import type { MockStore } from "./storage";

/** Активный тест: решение ещё не принято. */
export function getExperimentByHypothesis(store: MockStore, hypothesisId: string): Experiment | null {
  const list = store.experiments.filter(
    (e) => e.hypothesisId === hypothesisId && e.decision === "pending",
  );
  if (!list.length) return null;
  return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
}

export function getExperimentsByFunnel(store: MockStore, funnelId: string): Experiment[] {
  return store.experiments
    .filter((e) => e.funnelId === funnelId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function startExperiment(store: MockStore, input: ExperimentInput): Experiment {
  const pending = getExperimentByHypothesis(store, input.hypothesisId);
  if (pending) {
    moveHypothesisStatus(store, input.hypothesisId, "testing");
    return pending;
  }

  const hyp = getHypothesisById(store, input.hypothesisId);
  let baselineNumeric: number | null = null;
  let targetNumeric: number | null = null;
  if (hyp) {
    baselineNumeric = parseMetricNumber(hyp.currentValue);
    targetNumeric = parseMetricNumber(hyp.targetValue);
    if (hyp.metricId) {
      const m = getMetricById(store, hyp.metricId);
      if (m) {
        if (baselineNumeric == null) baselineNumeric = m.actualValue;
        if (targetNumeric == null) targetNumeric = m.plannedValue;
      }
    }
  }

  const exp: Experiment = {
    id: createId("exp"),
    hypothesisId: input.hypothesisId,
    funnelId: input.funnelId,
    owner: input.owner ?? "",
    startDate: input.startDate ?? nowIso(),
    endDate: input.endDate ?? null,
    budget: input.budget ?? "",
    beforeValue: input.beforeValue ?? hyp?.currentValue ?? "",
    afterValue: "",
    result: "",
    decision: "pending",
    notes: "",
    baselineNumeric,
    targetNumeric,
    resultNumeric: null,
    minDataVolume: hyp?.minDataVolume?.trim() ?? "",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  store.experiments.unshift(exp);
  moveHypothesisStatus(store, input.hypothesisId, "testing");
  return exp;
}

export function updateExperiment(
  store: MockStore,
  id: string,
  patch: Partial<Experiment>,
): Experiment | null {
  const idx = store.experiments.findIndex((e) => e.id === id);
  if (idx < 0) return null;
  store.experiments[idx] = { ...store.experiments[idx], ...patch, updatedAt: nowIso() };
  return store.experiments[idx];
}

export function finishExperiment(
  store: MockStore,
  id: string,
  afterValue: string,
  result: string,
  decision: ExperimentDecision,
  opts?: {
    reflection?: string;
    /** Явное числовое значение после теста; иначе парсится из послеValue */
    resultNumeric?: number | null;
  },
): Experiment | null {
  const idx = store.experiments.findIndex((e) => e.id === id);
  if (idx < 0) return null;
  const prev = store.experiments[idx];
  const reflection = opts?.reflection?.trim();
  const notesMerged = reflection
    ? [prev.notes?.trim(), `Рефлексия: ${reflection}`].filter(Boolean).join("\n\n")
    : (prev.notes ?? "");

  let resultNumeric =
    opts?.resultNumeric !== undefined ? opts.resultNumeric : parseMetricNumber(afterValue);
  if (resultNumeric === null || Number.isNaN(resultNumeric)) {
    resultNumeric = null;
  }

  const exp = updateExperiment(store, id, {
    afterValue,
    result,
    decision,
    endDate: nowIso(),
    notes: notesMerged,
    resultNumeric,
  });
  if (!exp) return null;

  const hypStatus: HypothesisStatus =
    decision === "scale"
      ? "success"
      : decision === "stop"
        ? "failed"
        : decision === "archive"
          ? "parked"
          : "backlog";

  moveHypothesisStatus(store, exp.hypothesisId, hypStatus, result);
  return exp;
}
