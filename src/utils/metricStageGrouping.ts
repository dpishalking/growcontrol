import type { FunnelStageDefinition, FunnelTypeMetricTemplate } from "@/types/funnelType";
import type { FunnelMetric } from "@/types/funnelMetric";

export type StageMetricGroup = {
  stage: FunnelStageDefinition;
  index: number;
  hint: string;
  items: FunnelMetric[];
};

function catalogIndex(
  catalog: FunnelTypeMetricTemplate[],
  stageId: string,
  name: string,
): number {
  const idx = catalog.findIndex((c) => c.stageId === stageId && c.name === name);
  return idx >= 0 ? idx : 999;
}

export function sortMetricsInStage(
  items: FunnelMetric[],
  stageId: string,
  catalog: FunnelTypeMetricTemplate[],
  planFactNames: string[] = [],
): FunnelMetric[] {
  return [...items].sort((a, b) => {
    const planA = planFactNames.indexOf(a.name);
    const planB = planFactNames.indexOf(b.name);
    if (planA >= 0 || planB >= 0) {
      if (planA < 0) return 1;
      if (planB < 0) return -1;
      if (planA !== planB) return planA - planB;
    }
    const catA = catalogIndex(catalog, stageId, a.name);
    const catB = catalogIndex(catalog, stageId, b.name);
    if (catA !== catB) return catA - catB;
    return a.name.localeCompare(b.name, "ru");
  });
}

const STAGE_HINTS: Record<string, string> = {
  click: "Переходы с рекламы: клики, CTR, CPC",
  traffic: "Рекламный вход: бюджет и показы",
  registration: "Сколько человек оставили контакт и по какой цене",
  confirmation: "Подтверждение после регистрации (страница «спасибо»)",
  attendance: "Доходимость: кто реально пришёл на эфир",
  retention: "Удержание на вебинаре: досмотр, вовлечённость",
  selling_block: "Дошли до продающего блока и оффера",
  webinar_lead: "Заявки и покупки прямо с вебинара",
  followup: "Дожим после эфира — кто вернулся и купил",
  sale: "Итоговые продажи, чек, выручка, ROAS",
  landing: "Посадочная: визиты и конверсия в заявку",
  lead: "Заявки и качество лидов",
  qualification: "Квалификация: целевые vs нецелевые",
  contact: "Дозвон и первый контакт",
  consultation: "Консультации и конверсия в диалог",
  offer: "Коммерческое предложение",
};

export function getStageMetricHint(
  stageId: string,
  auditQuestions?: Record<string, string[]>,
): string {
  const fromAudit = auditQuestions?.[stageId];
  if (fromAudit?.length) return fromAudit.join(" · ");
  return STAGE_HINTS[stageId] ?? "Показатели этого шага пути клиента";
}

export function groupMetricsByFunnelStages(
  stages: FunnelStageDefinition[],
  metrics: FunnelMetric[],
  catalog: FunnelTypeMetricTemplate[],
  planFactNames: string[] = [],
  auditQuestions?: Record<string, string[]>,
): StageMetricGroup[] {
  return stages.map((stage, index) => {
    const items = sortMetricsInStage(
      metrics.filter((m) => m.stage === stage.id),
      stage.id,
      catalog,
      planFactNames,
    );
    return {
      stage,
      index: index + 1,
      hint: getStageMetricHint(stage.id, auditQuestions),
      items,
    };
  });
}
