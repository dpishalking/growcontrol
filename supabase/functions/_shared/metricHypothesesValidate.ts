export type RawHypothesisDraft = Record<string, unknown>;

const ALLOWED_CHANNELS = new Set([
  "website",
  "funnel",
  "sales",
  "offer",
  "creative",
  "research",
]);

const GENERIC_PATTERNS = [
  /улучшить ux/i,
  /повысить довери/i,
  /оптимизир.*воронк/i,
  /улучшить дизайн/i,
  /работать над/i,
  /\bв целом\b/i,
  /как-то улучшить/i,
  /сделать лучше/i,
];

/** Заявленный эффект «+100%» / «+200%» / «×2» — нереалистично без сильного evidence. */
const UNREALISTIC_EFFECT = /(\+|\bна\s+)(100|150|200|300|500)\s*%|x\s*[23456]|×\s*[23456]/i;

const MULTI_CHANGE_HINTS = [
  / и одновременно /i,
  / а также /i,
  / плюс /i,
  /,\s*а также/i,
];

function normPriority(v: unknown): "high" | "medium" | "low" {
  const s = String(v ?? "").toLowerCase();
  if (s.includes("high") || s.includes("высок")) return "high";
  if (s.includes("low") || s.includes("низ")) return "low";
  return "medium";
}

function normChannel(v: unknown): string {
  const s = String(v ?? "").toLowerCase();
  for (const c of ALLOWED_CHANNELS) {
    if (s === c) return c;
  }
  return "website";
}

function clampIce(v: unknown, fallback: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.min(5, Math.round(n)));
}

function normKey(s: string): string {
  return s.toLowerCase().replace(/[«»"'`]/g, "").replace(/\s+/g, " ").trim();
}

function isGeneric(text: string): boolean {
  return GENERIC_PATTERNS.some((re) => re.test(text));
}

function hasUnrealisticEffect(text: string): boolean {
  return UNREALISTIC_EFFECT.test(text);
}

function looksMultiChange(text: string): boolean {
  return MULTI_CHANGE_HINTS.some((re) => re.test(text));
}

function buildIfChange(raw: RawHypothesisDraft): string {
  const direct = String(raw.ifChange ?? "").trim();
  if (direct.length >= 12) return direct;

  const title = String(raw.title ?? "").trim();
  if (title.startsWith("Если")) return title;
  if (title.length >= 8) {
    return `Если ${title.charAt(0).toLowerCase()}${title.slice(1)}`;
  }
  return "";
}

/** Похожесть строк по словам ≥ 4 символов. */
function similarMaterialTitle(name: string, available: string[]): string | null {
  if (!name) return null;
  const target = normKey(name);
  if (!target) return null;

  for (const a of available) {
    if (normKey(a) === target) return a;
  }

  const targetWords = target.split(/\s+/).filter((w) => w.length >= 4);
  for (const a of available) {
    const k = normKey(a);
    if (!k) continue;
    if (k.includes(target) || target.includes(k)) return a;
    const aWords = k.split(/\s+/).filter((w) => w.length >= 4);
    const overlap = targetWords.filter((w) => aWords.some((aw) => aw.includes(w) || w.includes(aw)));
    if (overlap.length >= 2) return a;
    if (targetWords.length === 1 && aWords.some((aw) => aw === targetWords[0])) return a;
  }
  return null;
}

/** Нормализует materialsToChange к именам из переданного списка. */
function resolveMaterials(raw: unknown, available: string[]): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const name = String(item ?? "").trim();
    if (!name) continue;
    const matched = available.length > 0 ? similarMaterialTitle(name, available) : name;
    if (!matched) continue;
    if (seen.has(matched)) continue;
    seen.add(matched);
    out.push(matched);
  }
  return out;
}

export type ValidateOptions = {
  /** Названия материалов из payload — для строгой привязки. */
  availableMaterials?: string[];
  /** Разрешить ли пустой materialsToChange (fallback на channel-based inference). */
  allowEmptyMaterials?: boolean;
};

/** Нормализует и фильтрует гипотезы от модели. */
export function validateMetricHypotheses(
  raw: unknown,
  metricName: string,
  existing: string[],
  opts: ValidateOptions = {},
): RawHypothesisDraft[] {
  const list = (raw as { hypotheses?: unknown })?.hypotheses;
  if (!Array.isArray(list)) return [];

  const availableMaterials = opts.availableMaterials ?? [];
  const allowEmptyMaterials = opts.allowEmptyMaterials ?? availableMaterials.length === 0;

  const existingKeys = new Set(existing.map(normKey));
  const seenIf = new Set<string>();
  const seenTitle = new Set<string>();
  const usedChannels = new Map<string, number>();
  const out: RawHypothesisDraft[] = [];

  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const r = item as RawHypothesisDraft;

    const title = String(r.title ?? "").trim();
    const ifChange = buildIfChange(r);
    const thenMetric = String(r.thenMetric ?? r.expectedImpact ?? "").trim();
    const becauseReason = String(r.becauseReason ?? r.why ?? "").trim();
    const testMethod = String(r.testMethod ?? r.testWindow ?? "").trim();

    if (
      title.length < 8 ||
      ifChange.length < 12 ||
      thenMetric.length < 4 ||
      becauseReason.length < 12 ||
      !testMethod ||
      testMethod.length < 6
    ) {
      continue;
    }

    const blob = `${title} ${ifChange} ${becauseReason}`;
    if (isGeneric(blob)) continue;
    if (hasUnrealisticEffect(thenMetric)) continue;
    if (looksMultiChange(ifChange)) continue;

    const dedupeKey = normKey(ifChange);
    const titleKey = normKey(title);
    if (
      seenIf.has(dedupeKey) ||
      seenTitle.has(titleKey) ||
      existingKeys.has(dedupeKey) ||
      existingKeys.has(titleKey)
    ) {
      continue;
    }

    const materials = resolveMaterials(r.materialsToChange, availableMaterials);
    if (materials.length === 0 && !allowEmptyMaterials) continue;

    const channel = normChannel(r.channel);
    const channelCount = usedChannels.get(channel) ?? 0;
    if (channelCount >= 2) continue;

    const priority = normPriority(r.priority);
    const iceDefaults = priority === "high"
      ? { impact: 5, confidence: 4, ease: 4 }
      : priority === "low"
      ? { impact: 2, confidence: 3, ease: 3 }
      : { impact: 4, confidence: 3, ease: 3 };

    seenIf.add(dedupeKey);
    seenTitle.add(titleKey);
    usedChannels.set(channel, channelCount + 1);

    out.push({
      title,
      ifChange,
      thenMetric,
      becauseReason,
      why: becauseReason,
      expectedImpact: thenMetric,
      testMethod,
      testWindow: testMethod,
      successCriteria: String(
        r.successCriteria ?? `${thenMetric}. Метрика: ${metricName}.`,
      ).trim(),
      materialsToChange: materials,
      testDurationDays: clampIce(r.testDurationDays, 7),
      priority,
      channel,
      impact: clampIce(r.impact, iceDefaults.impact),
      confidence: clampIce(r.confidence, iceDefaults.confidence),
      ease: clampIce(r.ease, iceDefaults.ease),
      risk: String(r.risk ?? "").trim(),
      guardrail: String(r.risk ?? r.guardrail ?? "").trim(),
      metricName,
    });

    if (out.length >= 5) break;
  }

  return out;
}
