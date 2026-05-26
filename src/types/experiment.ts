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
  /** Числовая база (из гипотезы/метрики на старт). */
  baselineNumeric?: number | null;
  /** Цель в числовом виде, если удалось распарсить. */
  targetNumeric?: number | null;
  /** Итог в числовом виде после теста. */
  resultNumeric?: number | null;
  /** Порог объёма данных (копируется из гипотезы). */
  minDataVolume?: string;
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
