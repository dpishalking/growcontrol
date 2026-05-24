import type {
  CreateFunnelFocusInput,
  Funnel,
  AudienceDetails,
  FunnelConstraints,
  FunnelDetails,
  ProductDetails,
} from "@/types/funnel";
import {
  EMPTY_AUDIENCE_DETAILS,
  EMPTY_FUNNEL_CONSTRAINTS,
  EMPTY_FUNNEL_DETAILS,
  EMPTY_PRODUCT_DETAILS,
} from "@/types/funnel";
import { createId, nowIso } from "@/utils/id";
import type { MockStore } from "./storage";

export function getFunnelsByProject(store: MockStore, projectId: string): Funnel[] {
  return store.funnels
    .filter((f) => f.projectId === projectId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function getFunnelById(store: MockStore, funnelId: string): Funnel | null {
  return store.funnels.find((f) => f.id === funnelId) ?? null;
}

export function createFunnel(store: MockStore, input: CreateFunnelFocusInput): Funnel {
  const now = nowIso();
  const funnel: Funnel = {
    id: createId("funnel"),
    projectId: input.projectId,
    productName: input.productName.trim(),
    productDescription: input.productDescription.trim(),
    averagePrice: input.averagePrice.trim(),
    trafficSource: input.trafficSource.trim(),
    landingUrl: input.landingUrl.trim(),
    targetAudience: input.targetAudience.trim(),
    funnelGoal: input.funnelGoal.trim(),
    currentProblem: input.currentProblem.trim(),
    status: "draft",
    currentWizardStep: 1,
    funnelTypeId: null,
    stages: [],
    productDetails: { ...EMPTY_PRODUCT_DETAILS },
    audienceDetails: { ...EMPTY_AUDIENCE_DETAILS },
    funnelDetails: { ...EMPTY_FUNNEL_DETAILS },
    constraints: { ...EMPTY_FUNNEL_CONSTRAINTS },
    createdAt: now,
    updatedAt: now,
  };
  store.funnels.unshift(funnel);
  return funnel;
}

export function updateFunnel(store: MockStore, funnelId: string, patch: Partial<Funnel>): Funnel | null {
  const idx = store.funnels.findIndex((f) => f.id === funnelId);
  if (idx < 0) return null;
  const updated: Funnel = {
    ...store.funnels[idx],
    ...patch,
    productDetails: { ...store.funnels[idx].productDetails, ...(patch.productDetails ?? {}) },
    audienceDetails: { ...store.funnels[idx].audienceDetails, ...(patch.audienceDetails ?? {}) },
    funnelDetails: { ...store.funnels[idx].funnelDetails, ...(patch.funnelDetails ?? {}) },
    constraints: { ...store.funnels[idx].constraints, ...(patch.constraints ?? {}) },
    wizardQuizProgress: {
      ...store.funnels[idx].wizardQuizProgress,
      ...(patch.wizardQuizProgress ?? {}),
    },
    updatedAt: nowIso(),
  };
  store.funnels[idx] = updated;
  return updated;
}

export function setWizardStep(store: MockStore, funnelId: string, step: number): Funnel | null {
  return updateFunnel(store, funnelId, { currentWizardStep: step });
}

export function patchProductDetails(
  store: MockStore,
  funnelId: string,
  patch: Partial<ProductDetails>,
): Funnel | null {
  const f = getFunnelById(store, funnelId);
  if (!f) return null;
  return updateFunnel(store, funnelId, { productDetails: { ...f.productDetails, ...patch } });
}

export function patchAudienceDetails(
  store: MockStore,
  funnelId: string,
  patch: Partial<AudienceDetails>,
): Funnel | null {
  const f = getFunnelById(store, funnelId);
  if (!f) return null;
  return updateFunnel(store, funnelId, { audienceDetails: { ...f.audienceDetails, ...patch } });
}

export function patchFunnelDetails(
  store: MockStore,
  funnelId: string,
  patch: Partial<FunnelDetails>,
): Funnel | null {
  const f = getFunnelById(store, funnelId);
  if (!f) return null;
  return updateFunnel(store, funnelId, { funnelDetails: { ...f.funnelDetails, ...patch } });
}

export function patchConstraints(
  store: MockStore,
  funnelId: string,
  patch: Partial<FunnelConstraints>,
): Funnel | null {
  const f = getFunnelById(store, funnelId);
  if (!f) return null;
  return updateFunnel(store, funnelId, { constraints: { ...f.constraints, ...patch } });
}
