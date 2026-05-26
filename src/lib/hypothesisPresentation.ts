import type { Hypothesis } from "@/types/hypothesis";

export type HypothesisDisplayParts = {
  ifChange: string | null;
  thenMetric: string | null;
  becauseReason: string | null;
  testMethod: string | null;
  successCriteria: string | null;
};

const LABELED_LINE =
  /^(Если|То|Потому что|Как проверить|Успех):\s*(.+)$/i;

/** Разбирает description из Supabase (новый многострочный или legacy «a → b → c»). */
export function parseHypothesisDescription(
  description: string | null | undefined,
): HypothesisDisplayParts {
  const empty: HypothesisDisplayParts = {
    ifChange: null,
    thenMetric: null,
    becauseReason: null,
    testMethod: null,
    successCriteria: null,
  };
  if (!description?.trim()) return empty;

  const fromLines = { ...empty };
  let matched = false;

  for (const line of description.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const m = trimmed.match(LABELED_LINE);
    if (!m) continue;
    matched = true;
    const label = m[1].toLowerCase();
    const value = m[2].trim();
    if (label.startsWith("если")) fromLines.ifChange = value;
    else if (label === "то") fromLines.thenMetric = value;
    else if (label.startsWith("потому")) fromLines.becauseReason = value;
    else if (label.startsWith("как")) fromLines.testMethod = value;
    else if (label.startsWith("успех")) fromLines.successCriteria = value;
  }

  if (matched) return fromLines;

  const parts = description
    .split(" → ")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return empty;

  return {
    ifChange: parts[0] ?? null,
    thenMetric: parts[1] ?? null,
    becauseReason: parts.length > 2 ? parts.slice(2).join(" → ") : null,
    testMethod: null,
    successCriteria: null,
  };
}

export function hypothesisDisplayParts(
  h: Pick<
    Hypothesis,
    "title" | "ifChange" | "thenMetric" | "becauseReason" | "testMethod" | "successCriteria"
  >,
): HypothesisDisplayParts {
  return {
    ifChange: h.ifChange?.trim() || h.title?.trim() || null,
    thenMetric: h.thenMetric?.trim() || null,
    becauseReason: h.becauseReason?.trim() || null,
    testMethod: h.testMethod?.trim() || null,
    successCriteria: h.successCriteria?.trim() || null,
  };
}

/** Текст для sync в Supabase — структурированный, без дублирования title. */
export function buildHypothesisSyncDescription(
  h: Pick<
    Hypothesis,
    "title" | "ifChange" | "thenMetric" | "becauseReason" | "testMethod" | "successCriteria"
  >,
): string | null {
  const parts = hypothesisDisplayParts(h);
  const lines = [
    parts.ifChange ? `Если: ${parts.ifChange}` : null,
    parts.thenMetric ? `То: ${parts.thenMetric}` : null,
    parts.becauseReason ? `Потому что: ${parts.becauseReason}` : null,
    parts.testMethod ? `Как проверить: ${parts.testMethod}` : null,
    parts.successCriteria ? `Успех: ${parts.successCriteria}` : null,
  ].filter(Boolean);

  return lines.length > 0 ? lines.join("\n").slice(0, 2000) : null;
}
