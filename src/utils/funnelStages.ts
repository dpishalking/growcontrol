import { getAllStagesForType, getFunnelTypeTemplate } from "@/data/funnelTypes/catalog";
import { FUNNEL_STAGES, type Funnel } from "@/types/funnel";
import type { FunnelStageDefinition } from "@/types/funnelType";

/** Этапы карточки воронки и шага «Аудит»: сохранённые этапы пользователя или полный шаблон типа из каталога. */
export function getStagesForFunnel(funnel: Funnel): FunnelStageDefinition[] {
  if (funnel.stages?.length) return funnel.stages;
  if (funnel.funnelTypeId) {
    return getAllStagesForType(getFunnelTypeTemplate(funnel.funnelTypeId));
  }
  return FUNNEL_STAGES.map((s) => ({ id: s.id, label: s.label, description: s.description }));
}

export function getStageLabelForFunnel(funnel: Funnel, stageId: string): string {
  return getStagesForFunnel(funnel).find((s) => s.id === stageId)?.label ?? stageId;
}
