import { normalizeMetricKey } from "@/data/hypothesisDirections";
import { resolveMetricEvaluationKind } from "@/utils/funnelDiagnostics";
import type { FunnelAuditHypothesisDraft, FunnelAuditReport } from "@/types/funnelAudit";
import type { FunnelMetric } from "@/types/funnelMetric";

// Узкие, специфичные слова для матча метрик в текстах аудита (подсказки и блоки этапов).
// Сюда НЕЛЬЗЯ класть общие слова вроде «вебинар» — они приведут к ложным срабатываниям.
const METRIC_KEYWORDS: Record<string, string[]> = {
  ctr: ["ctr", "кликабельн"],
  cpc: ["cpc", "стоимость клика"],
  "стоимость регистрации": ["стоимость регистрац", "cpl регистрац"],
  "конверсия страницы в регистрацию": ["конверс страниц в регистрац", "cr в регистрац"],
  "процент доходимости": ["доходим", "show-up", "show up"],
  "стоимость заявки": ["стоимость заявк", "cpl"],
};

export function metricGapLabel(m: FunnelMetric): string {
  if (m.achievementPercent != null) {
    const kind = resolveMetricEvaluationKind(m);
    const pct = Math.round(m.achievementPercent);
    if (kind === "higher_better") {
      if (pct < 100) return `План выполнен на ${pct}%`;
      return `План выполнен на ${pct}%`;
    }
    if (pct > 100) return `Выше плана на ${pct - 100}%`;
    return `В пределах плана (${pct}%)`;
  }
  return `Влияние на деньги: ${m.revenueImpact}/5`;
}

export function metricWhyTop(
  m: FunnelMetric,
  rank: number,
  bottleneckId: string | null,
): string {
  const parts: string[] = [];
  if (bottleneckId === m.id) parts.push("Главный ограничитель воронки");
  parts.push(metricGapLabel(m));
  parts.push(`Приоритет #${rank}`);
  return parts.join(" · ");
}

function keywordsForMetric(metricName: string): string[] {
  const key = normalizeMetricKey(metricName);
  const aliased = METRIC_KEYWORDS[key] ?? [];
  return [key, ...aliased, ...key.split(/\s+/).filter((w) => w.length > 3)];
}

function textMatchesMetric(text: string, metricName: string): boolean {
  const lower = text.toLowerCase();
  const keys = keywordsForMetric(metricName);
  return keys.some((k) => k.length >= 3 && lower.includes(k));
}

export function auditHintForMetric(
  report: FunnelAuditReport | undefined,
  metric: FunnelMetric,
): string | null {
  if (!report) return null;

  const stageBlock = report.stageBlocks?.find(
    (b) => b.stageId === metric.stage || textMatchesMetric(b.stageLabel, metric.name),
  );
  if (stageBlock?.problem) {
    return `Аудит (${stageBlock.stageLabel}): ${stageBlock.problem}`;
  }

  const problem = report.problems?.find(
    (p) => textMatchesMetric(p.title, metric.name) || textMatchesMetric(p.whyItHurts, metric.name),
  );
  if (problem) {
    return `Аудит: ${problem.title}`;
  }

  if (report.diagnosis?.mainProblem && metric.status === "red") {
    return `Аудит: ${report.diagnosis.mainProblem}`;
  }

  return null;
}

/**
 * Жёсткий матчинг: гипотезы аудита привязываем к метрике ТОЛЬКО по её `metricName`.
 * Сравнение по заголовку выключено — оно даёт ложные срабатывания
 * (например слово «вебинар» матчилось ко всему подряд).
 */
export function auditDraftsForMetric(
  drafts: FunnelAuditHypothesisDraft[],
  metric: FunnelMetric,
): FunnelAuditHypothesisDraft[] {
  const mk = normalizeMetricKey(metric.name);
  if (!mk) return [];
  return drafts.filter((d) => {
    const dk = normalizeMetricKey(d.metricName);
    if (!dk) return false;
    if (dk === mk) return true;
    // Допускаем включение только если совпадает «осмысленная» часть имени
    // (длинная подстрока ≥ 6 символов), чтобы не цеплять родовые слова.
    const minLen = 6;
    if (dk.length >= minLen && mk.includes(dk)) return true;
    if (mk.length >= minLen && dk.includes(mk)) return true;
    return false;
  });
}

export function materialsMatchHint(materialTitle: string, label: string): boolean {
  const a = materialTitle.toLowerCase();
  const b = label.toLowerCase();
  return a.includes(b) || b.includes(a) || b.split(/\s+/).some((w) => w.length > 4 && a.includes(w));
}
