import { normalizeMetricKey } from "@/data/hypothesisDirections";

/** Средние ориентиры по рынку — «план», если пользователь указал только факт. */
const BENCHMARKS: Record<string, number> = {
  ctr: 1.0,
  cpc: 25,
  cpm: 200,
  cpl: 800,
  cac: 5000,
  roas: 2.5,
  romi: 150,
  "рекламный бюджет": 100000,
  показы: 50000,
  клики: 500,
  "конверсия сайта в заявку": 3,
  "конверсия из клика в заявку": 5,
  "конверсия формы": 8,
  "показатель отказов": 55,
  "стоимость заявки": 900,
  "стоимость регистрации": 400,
  регистрации: 200,
  "процент доходимости": 35,
  "количество пришедших": 70,
  "процент досмотра до продающего блока": 45,
  "конверсия участника в заявку": 8,
  "конверсия из заявки в продажу": 15,
  "конверсия в продажу": 12,
  "процент дозвона": 60,
  "доля целевых заявок": 70,
  продажи: 20,
  "средний чек": 50000,
  выручка: 500000,
};

export function getMetricBenchmark(metricName: string): number | null {
  const key = normalizeMetricKey(metricName);
  if (key in BENCHMARKS) return BENCHMARKS[key];

  for (const [pattern, value] of Object.entries(BENCHMARKS)) {
    const pk = normalizeMetricKey(pattern);
    if (key.includes(pk) || pk.includes(key)) return value;
  }
  return null;
}

export function getEffectivePlan(metric: {
  name: string;
  plannedValue: number | null;
}): { value: number | null; source: "plan" | "benchmark" | null } {
  if (metric.plannedValue != null) {
    return { value: metric.plannedValue, source: "plan" };
  }
  const benchmark = getMetricBenchmark(metric.name);
  if (benchmark != null) {
    return { value: benchmark, source: "benchmark" };
  }
  return { value: null, source: null };
}
