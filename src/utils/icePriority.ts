import type { Hypothesis, HypothesisBucket } from "@/types/hypothesis";

const clamp = (v: number, min = 1, max = 5) => Math.max(min, Math.min(max, v));

/** ICE-приоритет: impact × confidence × ease, нормированный к 1..125. */
export function computeIce(input: { impact: number; confidence: number; ease: number }): number {
  return clamp(input.impact) * clamp(input.confidence) * clamp(input.ease);
}

/** Раскладывает гипотезу в одну из 4 групп. */
export function classifyBucket(input: {
  impact: number;
  confidence: number;
  ease: number;
}): HypothesisBucket {
  const impact = clamp(input.impact);
  const confidence = clamp(input.confidence);
  const ease = clamp(input.ease);

  if (confidence <= 2) return "uncertain";

  if (ease >= 4 && impact >= 3) return "quick_test";
  if (impact >= 4 && ease <= 2) return "strategic";
  if (impact <= 2 && ease <= 2) return "do_not_touch";
  if (impact >= 4) return "strategic";
  return "quick_test";
}

export const BUCKET_LABELS: Record<HypothesisBucket, { label: string; hint: string }> = {
  quick_test: { label: "Быстрые тесты", hint: "Быстро, дёшево, понятный эффект" },
  strategic: { label: "Стратегические", hint: "Большой эффект, дороже по ресурсам" },
  uncertain: { label: "Сомнительные", hint: "Низкая уверенность или слабые данные" },
  do_not_touch: { label: "Не трогать", hint: "Дорого/рискованно или вне ограничителя" },
};

/** Порядок секций ICE на экране выбора гипотез. */
export const BUCKET_ORDER: HypothesisBucket[] = [
  "quick_test",
  "strategic",
  "uncertain",
  "do_not_touch",
];

export const BUCKET_SECTION_STYLES: Record<
  HypothesisBucket,
  { border: string; headerBg: string; accent: string }
> = {
  quick_test: {
    border: "border-emerald-500/30",
    headerBg: "bg-emerald-500/10",
    accent: "text-emerald-400",
  },
  strategic: {
    border: "border-primary/30",
    headerBg: "bg-primary/10",
    accent: "text-primary",
  },
  uncertain: {
    border: "border-yellow-500/30",
    headerBg: "bg-yellow-500/10",
    accent: "text-yellow-400",
  },
  do_not_touch: {
    border: "border-border/50",
    headerBg: "bg-muted/25",
    accent: "text-muted-foreground",
  },
};

export function groupHypothesesByBucket(
  hypotheses: Hypothesis[],
): Partial<Record<HypothesisBucket, Hypothesis[]>> {
  const groups = Object.fromEntries(
    BUCKET_ORDER.map((bucket) => [bucket, [] as Hypothesis[]]),
  ) as Record<HypothesisBucket, Hypothesis[]>;

  for (const h of sortByPriority(hypotheses)) {
    groups[h.bucket].push(h);
  }

  return Object.fromEntries(BUCKET_ORDER.map((bucket) => [bucket, groups[bucket]]).filter(
    ([, items]) => (items as Hypothesis[]).length > 0,
  )) as Partial<Record<HypothesisBucket, Hypothesis[]>>;
}

export function sortByPriority(hypotheses: Hypothesis[]): Hypothesis[] {
  return [...hypotheses].sort((a, b) => b.priorityScore - a.priorityScore);
}
