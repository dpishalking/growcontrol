export type ExperimentDecision =
  | "scale"
  | "iterate"
  | "rerun"
  | "stop"
  | "archive"
  | "pending";

export type Experiment = {
  id: string;
  hypothesisId: string;
  funnelId: string;
  owner: string;
  startDate: string | null;
  endDate: string | null;
  budget: string;
  beforeValue: string;
  afterValue: string;
  result: string;
  decision: ExperimentDecision;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type ExperimentInput = {
  hypothesisId: string;
  funnelId: string;
  owner?: string;
  startDate?: string | null;
  endDate?: string | null;
  budget?: string;
  beforeValue?: string;
};
