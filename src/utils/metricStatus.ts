import type { MetricStatusColor } from "@/types/metric";

export function getMetricStatusColor(plan: number, fact: number): MetricStatusColor {
  if (plan <= 0) return fact > 0 ? "green" : "yellow";
  const ratio = (fact / plan) * 100;
  if (ratio >= 100) return "green";
  if (ratio >= 90) return "yellow";
  return "red";
}

export function getAchievementPercent(plan: number, fact: number): number {
  if (plan <= 0) return fact > 0 ? 100 : 0;
  return Math.round((fact / plan) * 100);
}

export function getRunRate(fact: number, elapsedDays: number, totalDays: number): number {
  if (elapsedDays <= 0 || totalDays <= 0) return 0;
  return Math.round((fact / elapsedDays) * totalDays);
}

export const STATUS_COLORS: Record<MetricStatusColor, string> = {
  green: "bg-success/12 text-success border-success/25",
  yellow: "bg-warning/12 text-warning border-warning/25",
  red: "bg-danger/12 text-danger border-danger/25",
};

export const STATUS_DOT: Record<MetricStatusColor, string> = {
  green: "bg-success",
  yellow: "bg-warning",
  red: "bg-danger",
};
