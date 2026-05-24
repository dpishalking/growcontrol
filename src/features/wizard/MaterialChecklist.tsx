import type { FunnelTypeTemplate } from "@/types/funnelType";
import type { FunnelTypeId } from "@/types/funnelType";
import type { Material, MaterialType } from "@/types/material";
import {
  materialCoversRequired,
  stageForRequiredMaterial,
  suggestedMaterialTypeForLabel,
} from "@/utils/materialAudit";

export type ChecklistItem = {
  label: string;
  done: boolean;
  stageId: string;
  suggestedType: MaterialType | null;
};

export type StageGroup = {
  stageId: string;
  stageLabel: string;
  items: ChecklistItem[];
};

export function buildMaterialChecklist(
  typeTemplate: FunnelTypeTemplate,
  materials: Material[],
  funnelTypeId: FunnelTypeId,
): { groups: StageGroup[]; covered: number; total: number } {
  const items: ChecklistItem[] = typeTemplate.requiredMaterials.map((label) => ({
    label,
    done: materialCoversRequired(label, materials, funnelTypeId),
    stageId: stageForRequiredMaterial(label, funnelTypeId),
    suggestedType: suggestedMaterialTypeForLabel(label, funnelTypeId),
  }));

  if (funnelTypeId === "webinar") {
    const covered = items.filter((i) => i.done).length;
    return {
      groups: [{ stageId: "journey", stageLabel: "", items }],
      covered,
      total: items.length,
    };
  }

  const byStage = new Map<string, ChecklistItem[]>();
  for (const item of items) {
    const list = byStage.get(item.stageId) ?? [];
    list.push(item);
    byStage.set(item.stageId, list);
  }

  const groups: StageGroup[] = [];
  for (const stage of typeTemplate.requiredStages) {
    const stageItems = byStage.get(stage.id);
    if (!stageItems?.length) continue;
    groups.push({ stageId: stage.id, stageLabel: stage.label, items: stageItems });
  }

  const orphanIds = [...byStage.keys()].filter(
    (id) => !typeTemplate.requiredStages.some((s) => s.id === id),
  );
  for (const stageId of orphanIds) {
    const stageItems = byStage.get(stageId);
    if (!stageItems?.length) continue;
    groups.push({ stageId, stageLabel: "Прочее", items: stageItems });
  }

  const covered = items.filter((i) => i.done).length;
  return { groups, covered, total: items.length };
}
