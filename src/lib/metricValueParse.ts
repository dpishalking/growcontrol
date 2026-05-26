/** Вытаскивает первое число из строки (проценты, валюта, пробелы игнорируются частично). */
export function parseMetricNumber(raw: string | null | undefined): number | null {
  if (raw == null) return null;
  const s = String(raw).replace(/\u00a0/g, " ").trim();
  if (!s) return null;
  const compact = s.replace(/[\s₽$€]/gi, "");
  const match = compact.match(/-?\d+[.,]?\d*/);
  if (!match) return null;
  const n = Number.parseFloat(match[0].replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** Сравнение факта с целью по направлению метрики. */
export function metricGoalMet(
  result: number | null | undefined,
  target: number | null | undefined,
  direction: "higher_better" | "lower_better" | "range",
): "met" | "not_met" | "unknown" {
  if (result == null || target == null) return "unknown";
  if (direction === "higher_better") return result >= target ? "met" : "not_met";
  if (direction === "lower_better") return result <= target ? "met" : "not_met";
  return "unknown";
}
