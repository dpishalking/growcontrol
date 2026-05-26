export type HypothesisStatus = "draft" | "backlog" | "testing" | "success" | "failed" | "parked";

export type HypothesisBucket =
  | "quick_test"
  | "strategic"
  | "uncertain"
  | "do_not_touch";

export type Hypothesis = {
  id: string;
  funnelId: string;
  metricId: string | null;
  /** Имя метрики (на случай, если метрика ещё не создана как объект). */
  metricName: string;
  funnelStage: string;
  title: string;
  /** Шаблон: «Если ... то ... потому что ...» */
  ifChange: string;
  thenMetric: string;
  becauseReason: string;
  currentValue: string;
  targetValue: string;
  problemReason: string;
  whyItShouldWork: string;
  materialsToChange: string[];
  testMethod: string;
  successCriteria: string;
  testDurationDays: number;
  /** Мин. объём данных для вывода (показы, сессии, заявки). */
  minDataVolume: string;
  /** Теги для группировки и поиска. */
  tags: string[];
  minBudget: string;
  risk: string;
  /** Сложность 1..5 (5 — самое сложное). */
  complexity: number;
  /** ICE-параметры 1..5. */
  impact: number;
  confidence: number;
  ease: number;
  priorityScore: number;
  bucket: HypothesisBucket;
  status: HypothesisStatus;
  result: string | null;
  createdAt: string;
  updatedAt: string;
};

export type HypothesisInput = {
  funnelId: string;
  metricId: string | null;
  metricName: string;
  funnelStage: string;
  title: string;
  ifChange: string;
  thenMetric: string;
  becauseReason: string;
  currentValue?: string;
  targetValue?: string;
  problemReason?: string;
  whyItShouldWork?: string;
  materialsToChange?: string[];
  testMethod?: string;
  successCriteria?: string;
  testDurationDays?: number;
  minDataVolume?: string;
  tags?: string[];
  minBudget?: string;
  risk?: string;
  complexity?: number;
  impact?: number;
  confidence?: number;
  ease?: number;
};
