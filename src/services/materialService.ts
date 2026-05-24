import type { CreateMaterialInput, Material } from "@/types/material";
import { MATERIAL_TYPE_AFFECTED_METRICS } from "@/types/material";
import { createId, nowIso } from "@/utils/id";
import type { MockStore } from "./storage";

export function getMaterialsByFunnel(store: MockStore, funnelId: string): Material[] {
  return store.materials
    .filter((m) => m.funnelId === funnelId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getMaterialById(store: MockStore, id: string): Material | null {
  return store.materials.find((m) => m.id === id) ?? null;
}

export function createMaterial(store: MockStore, input: CreateMaterialInput): Material {
  const material: Material = {
    id: createId("mat"),
    funnelId: input.funnelId,
    type: input.type,
    title: input.title.trim(),
    source: input.source?.trim() ?? "",
    url: input.url?.trim() ?? "",
    content: input.content?.trim() ?? "",
    funnelStage: input.funnelStage,
    summary: input.summary?.trim() ?? "",
    strengths: input.strengths ?? [],
    weaknesses: input.weaknesses ?? [],
    affectedMetrics: input.affectedMetrics ?? MATERIAL_TYPE_AFFECTED_METRICS[input.type] ?? [],
    focusFlag: input.focusFlag ?? "in_focus",
    attachment: input.attachment ?? null,
    createdAt: nowIso(),
  };
  store.materials.unshift(material);
  return material;
}

export function updateMaterial(
  store: MockStore,
  id: string,
  patch: Partial<Material>,
): Material | null {
  const idx = store.materials.findIndex((m) => m.id === id);
  if (idx < 0) return null;
  store.materials[idx] = { ...store.materials[idx], ...patch };
  return store.materials[idx];
}

export function removeMaterial(store: MockStore, id: string): boolean {
  const before = store.materials.length;
  store.materials = store.materials.filter((m) => m.id !== id);
  return store.materials.length < before;
}
