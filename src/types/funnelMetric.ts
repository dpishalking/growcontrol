export type MetricDirection = "higher_better" | "lower_better" | "range";

export type MetricConfidence = "high" | "medium" | "low";

export type MetricStatus = "green" | "yellow" | "red" | "no_data" | "unreliable";

export type FunnelMetric = {
  id: string;
  funnelId: string;
  /** ID этапа из шаблона типа воронки. */
  stage: string;
  name: string;
  unit: string;
  period: string;
  plannedValue: number | null;
  actualValue: number | null;
  /** Для диапазонной метрики: норма, допустимое отклонение, критическое отклонение. */
  rangeNorm?: number;
  rangeAllowedDeviation?: number;
  rangeCriticalDeviation?: number;
  direction: MetricDirection;
  dataSource: string;
  confidence: MetricConfidence;
  comment: string;
  status: MetricStatus;
  achievementPercent: number | null;
  /** Влияние на деньги: 1..5 — используется в приоритизации ограничителя. */
  revenueImpact: number;
  relatedMaterialIds: string[];
  relatedHypothesisIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type FunnelMetricInput = {
  funnelId: string;
  /** ID этапа из шаблона типа воронки. */
  stage: string;
  name: string;
  unit?: string;
  period?: string;
  plannedValue?: number | null;
  actualValue?: number | null;
  rangeNorm?: number;
  rangeAllowedDeviation?: number;
  rangeCriticalDeviation?: number;
  direction: MetricDirection;
  dataSource?: string;
  confidence?: MetricConfidence;
  comment?: string;
  revenueImpact?: number;
};

/** Каталог метрик по этапам воронки — для быстрого добавления. */
export const METRIC_CATALOG: {
  /** ID этапа из шаблона типа воронки. */
  stage: string;
  name: string;
  unit: string;
  direction: MetricDirection;
  defaultRevenueImpact: number;
}[] = [
  { stage: "traffic", name: "Рекламный бюджет", unit: "₽", direction: "lower_better", defaultRevenueImpact: 4 },
  { stage: "traffic", name: "Показы", unit: "шт", direction: "higher_better", defaultRevenueImpact: 2 },
  { stage: "traffic", name: "CPM", unit: "₽", direction: "lower_better", defaultRevenueImpact: 3 },

  { stage: "click", name: "CTR", unit: "%", direction: "higher_better", defaultRevenueImpact: 4 },
  { stage: "click", name: "CPC", unit: "₽", direction: "lower_better", defaultRevenueImpact: 4 },
  { stage: "click", name: "Клики", unit: "шт", direction: "higher_better", defaultRevenueImpact: 3 },

  { stage: "landing", name: "Конверсия из клика в заявку", unit: "%", direction: "higher_better", defaultRevenueImpact: 5 },
  { stage: "landing", name: "Показатель отказов", unit: "%", direction: "lower_better", defaultRevenueImpact: 3 },
  { stage: "landing", name: "Глубина просмотра", unit: "стр", direction: "higher_better", defaultRevenueImpact: 2 },
  { stage: "landing", name: "Стоимость заявки (CPL)", unit: "₽", direction: "lower_better", defaultRevenueImpact: 5 },

  { stage: "lead", name: "Всего заявок", unit: "шт", direction: "higher_better", defaultRevenueImpact: 4 },
  { stage: "lead", name: "Качественные заявки", unit: "шт", direction: "higher_better", defaultRevenueImpact: 4 },
  { stage: "lead", name: "Конверсия формы", unit: "%", direction: "higher_better", defaultRevenueImpact: 4 },

  { stage: "qualification", name: "Доля целевых заявок", unit: "%", direction: "higher_better", defaultRevenueImpact: 4 },
  { stage: "qualification", name: "Стоимость целевой заявки", unit: "₽", direction: "lower_better", defaultRevenueImpact: 5 },

  { stage: "contact", name: "Процент дозвона", unit: "%", direction: "higher_better", defaultRevenueImpact: 4 },
  { stage: "contact", name: "Время первого касания", unit: "мин", direction: "lower_better", defaultRevenueImpact: 3 },

  { stage: "consultation", name: "Конверсия в консультацию", unit: "%", direction: "higher_better", defaultRevenueImpact: 4 },
  { stage: "consultation", name: "Доходимость на встречу", unit: "%", direction: "higher_better", defaultRevenueImpact: 3 },

  { stage: "sale", name: "Конверсия в продажу", unit: "%", direction: "higher_better", defaultRevenueImpact: 5 },
  { stage: "sale", name: "Средний чек", unit: "₽", direction: "higher_better", defaultRevenueImpact: 5 },
  { stage: "sale", name: "Выручка", unit: "₽", direction: "higher_better", defaultRevenueImpact: 5 },
  { stage: "sale", name: "CAC", unit: "₽", direction: "lower_better", defaultRevenueImpact: 5 },
  { stage: "sale", name: "ROAS", unit: "x", direction: "higher_better", defaultRevenueImpact: 5 },
  { stage: "sale", name: "ROMI", unit: "%", direction: "higher_better", defaultRevenueImpact: 5 },

  { stage: "delivery", name: "Процент выкупа", unit: "%", direction: "higher_better", defaultRevenueImpact: 4 },
  { stage: "delivery", name: "Возвраты", unit: "%", direction: "lower_better", defaultRevenueImpact: 3 },

  { stage: "repeat", name: "Повторные продажи", unit: "%", direction: "higher_better", defaultRevenueImpact: 4 },
  { stage: "repeat", name: "LTV", unit: "₽", direction: "higher_better", defaultRevenueImpact: 5 },
];
