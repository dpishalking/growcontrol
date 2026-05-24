import type { MetricDirection } from "./funnelMetric";

export type FunnelTypeId =
  | "service_lead"
  | "webinar"
  | "consultation"
  | "product_delivery"
  | "online_course"
  | "subscription"
  | "quiz"
  | "telegram_bot"
  | "offline_visit"
  | "custom";

export type FunnelStageDefinition = {
  id: string;
  label: string;
  description?: string;
};

export type FunnelTypeMetricTemplate = {
  stageId: string;
  name: string;
  unit: string;
  direction: MetricDirection;
  required: boolean;
  revenueImpact: number;
};

export type HypothesisDirectionTemplate = {
  change: string;
  rationale: string;
  materialsToChange: string[];
  testMethod: string;
  complexity: number;
  impact: number;
  confidence: number;
  ease: number;
};

/** Ключ — нормализованное имя метрики или категория (registration, attendance, …). */
export type HypothesisDirectionsMap = Record<string, HypothesisDirectionTemplate[]>;

export type FunnelTypeTemplate = {
  id: FunnelTypeId;
  name: string;
  description: string;
  exampleFlow: string;
  requiredStages: FunnelStageDefinition[];
  optionalStages: FunnelStageDefinition[];
  requiredMetrics: FunnelTypeMetricTemplate[];
  optionalMetrics: FunnelTypeMetricTemplate[];
  requiredMaterials: string[];
  auditQuestions: Record<string, string[]>;
  commonBottlenecks: string[];
  /** Направления гипотез по метрике / проблеме. */
  hypothesisDirections: HypothesisDirectionsMap;
  /** Имена метрик с повышенным весом при поиске главного ограничителя. */
  bottleneckMetricNames: string[];
  /** Порядок метрик для план-факт таблицы. */
  planFactMetrics: string[];
};

export type FunnelTypeQuizAnswer = {
  firstAction: "lead" | "register" | "quiz" | "bot" | "buy" | "visit";
  salePoint: "site" | "call" | "webinar" | "messenger" | "offline" | "delivery";
  moneyEvent: "payment" | "buyout" | "subscription" | "visit" | "contract" | "renewal";
};
