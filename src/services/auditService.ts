import type {
  AuditFinding,
  AuditFindingSeverity,
  AuditFindingType,
} from "@/types/audit";
import type { FunnelTypeId } from "@/types/funnelType";
import { getFunnelTypeTemplate, getAllStagesForType } from "@/data/funnelTypes/catalog";
import { createId, nowIso } from "@/utils/id";
import {
  analyzeMaterial,
  computeCoverage,
  materialCoversRequired,
  stageForRequiredMaterial,
} from "@/utils/materialAudit";
import { getMaterialsByFunnel } from "./materialService";
import { getFunnelById } from "./funnelService";
import type { MockStore } from "./storage";

export function getFindingsByFunnel(store: MockStore, funnelId: string): AuditFinding[] {
  return store.auditFindings
    .filter((f) => f.funnelId === funnelId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export type CreateFindingInput = {
  funnelId: string;
  stage: string;
  findingType: AuditFindingType;
  description: string;
  severity?: AuditFindingSeverity;
  relatedMaterialIds?: string[];
  relatedMetricIds?: string[];
};

export function createFinding(store: MockStore, input: CreateFindingInput): AuditFinding {
  const finding: AuditFinding = {
    id: createId("find"),
    funnelId: input.funnelId,
    stage: input.stage,
    findingType: input.findingType,
    description: input.description.trim(),
    severity: input.severity ?? (input.findingType === "weakness" ? "warning" : "info"),
    relatedMaterialIds: input.relatedMaterialIds ?? [],
    relatedMetricIds: input.relatedMetricIds ?? [],
    createdAt: nowIso(),
  };
  store.auditFindings.unshift(finding);
  return finding;
}

export function removeFinding(store: MockStore, id: string): boolean {
  const before = store.auditFindings.length;
  store.auditFindings = store.auditFindings.filter((f) => f.id !== id);
  return store.auditFindings.length < before;
}

/**
 * Аудит материалов: покрытие чек-листа типа воронки + эвристики по загруженным файлам.
 * Типовые слабые места показываются только в UI, не дублируются как findings.
 */
export function runMockAudit(store: MockStore, funnelId: string): AuditFinding[] {
  const materials = getMaterialsByFunnel(store, funnelId);
  const funnel = getFunnelById(store, funnelId);
  if (!funnel) return [];

  const typeId = (funnel.funnelTypeId ?? "service_lead") as FunnelTypeId;
  const typeTemplate = getFunnelTypeTemplate(typeId);
  const stageIds = getAllStagesForType(typeTemplate).map((s) => s.id);

  store.auditFindings = store.auditFindings.filter((f) => f.funnelId !== funnelId);

  const created: AuditFinding[] = [];
  const push = (input: CreateFindingInput) => {
    created.push(createFinding(store, input));
  };

  const coverage = computeCoverage(materials, typeTemplate.requiredMaterials, typeId, stageIds);

  if (materials.length === 0) {
    push({
      funnelId,
      stage: stageIds[0] ?? "traffic",
      findingType: "missing_data",
      description: `Материалы не загружены — загрузите ключевые пункты для «${typeTemplate.name}» и перепрогоните аудит`,
      severity: "warning",
    });
    return created;
  }

  push({
    funnelId,
    stage: stageIds[0] ?? "traffic",
    findingType: "strength",
    description: `Покрытие чек-листа: ${coverage.requiredCovered} из ${coverage.requiredTotal} обязательных материалов`,
    severity: coverage.requiredCovered >= coverage.requiredTotal ? "info" : "warning",
  });

  // Группируем пробелы по этапам — одно сообщение на этап
  const missingByStage = new Map<string, string[]>();
  for (const required of coverage.gaps) {
    const stage = stageForRequiredMaterial(required, typeId);
    const list = missingByStage.get(stage) ?? [];
    list.push(required);
    missingByStage.set(stage, list);
  }

  for (const [stage, items] of missingByStage) {
    push({
      funnelId,
      stage,
      findingType: "missing_data",
      description:
        items.length === 1
          ? `Не хватает: ${items[0]}`
          : `Не хватает материалов (${items.length}): ${items.join(" · ")}`,
      severity: "warning",
    });
  }

  // Анализ каждого загруженного материала
  for (const m of materials) {
    for (const finding of analyzeMaterial(m, funnelId)) {
      push(finding);
    }
  }

  // Этапы без материалов и без покрытия — мягкое предупреждение
  const stagesWithFindings = new Set(created.map((f) => f.stage));
  const stagesWithMaterials = new Set(materials.map((m) => m.funnelStage));
  for (const stageId of stageIds) {
    if (stagesWithMaterials.has(stageId) || stagesWithFindings.has(stageId)) continue;
    const hasQuestions = (typeTemplate.auditQuestions[stageId]?.length ?? 0) > 0;
    if (!hasQuestions) continue;
    const anyRequiredHere = typeTemplate.requiredMaterials.some(
      (r) => stageForRequiredMaterial(r, typeId) === stageId && !materialCoversRequired(r, materials, typeId),
    );
    if (anyRequiredHere) continue; // already in missingByStage
    push({
      funnelId,
      stage: stageId,
      findingType: "missing_data",
      description: `На этапе нет загруженных материалов — аудит по чек-листу ограничен`,
      severity: "info",
    });
  }

  return created;
}

export function getAuditCoverage(store: MockStore, funnelId: string) {
  const funnel = getFunnelById(store, funnelId);
  const materials = getMaterialsByFunnel(store, funnelId);
  if (!funnel) return null;
  const typeId = (funnel.funnelTypeId ?? "service_lead") as FunnelTypeId;
  const typeTemplate = getFunnelTypeTemplate(typeId);
  const stageIds = getAllStagesForType(typeTemplate).map((s) => s.id);
  return computeCoverage(materials, typeTemplate.requiredMaterials, typeId, stageIds);
}
