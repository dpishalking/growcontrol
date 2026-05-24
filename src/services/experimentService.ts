import type { Experiment, ExperimentDecision, ExperimentInput } from "@/types/experiment";
import { createId, nowIso } from "@/utils/id";
import { moveHypothesisStatus } from "./hypothesisService";
import type { MockStore } from "./storage";

export function getExperimentsByFunnel(store: MockStore, funnelId: string): Experiment[] {
  return store.experiments
    .filter((e) => e.funnelId === funnelId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getExperimentByHypothesis(store: MockStore, hypothesisId: string): Experiment | null {
  return store.experiments.find((e) => e.hypothesisId === hypothesisId) ?? null;
}

export function startExperiment(store: MockStore, input: ExperimentInput): Experiment {
  const existing = getExperimentByHypothesis(store, input.hypothesisId);
  if (existing) return existing;

  const exp: Experiment = {
    id: createId("exp"),
    hypothesisId: input.hypothesisId,
    funnelId: input.funnelId,
    owner: input.owner ?? "",
    startDate: input.startDate ?? nowIso(),
    endDate: input.endDate ?? null,
    budget: input.budget ?? "",
    beforeValue: input.beforeValue ?? "",
    afterValue: "",
    result: "",
    decision: "pending",
    notes: "",
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
): Experiment | null {
  const exp = updateExperiment(store, id, {
    afterValue,
    result,
    decision,
    endDate: nowIso(),
  });
  if (!exp) return null;

  const hypStatus =
    decision === "scale" ? "success" :
    decision === "stop" ? "failed" :
    decision === "archive" ? "parked" :
    "testing";
  moveHypothesisStatus(store, exp.hypothesisId, hypStatus, result);
  return exp;
}
