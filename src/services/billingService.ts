import { BILLING_PLANS, CREDIT_PACKS } from "@/data/mock/seed";
import type { PlanId } from "@/types/user";
import type { MockStore } from "./storage";

export function getBillingPlans() {
  return BILLING_PLANS;
}

export function getCreditPacks() {
  return CREDIT_PACKS;
}

export function getCurrentPlan(store: MockStore) {
  return BILLING_PLANS.find((p) => p.id === store.user.plan) ?? BILLING_PLANS[0];
}

export function getMaxProjectsForPlan(plan: PlanId): number {
  return BILLING_PLANS.find((p) => p.id === plan)?.maxProjects ?? 1;
}

export type ChangePlanResult = { ok: true } | { ok: false; reason: "mock_only" };

/** Mock: смена тарифа без реальной оплаты. */
export function changePlan(store: MockStore, planId: PlanId): ChangePlanResult {
  const plan = BILLING_PLANS.find((p) => p.id === planId);
  if (!plan) return { ok: false, reason: "mock_only" };
  store.user.plan = planId;
  store.user.credits += plan.creditsIncluded;
  return { ok: true };
}

export function purchaseCredits(store: MockStore, packId: string): boolean {
  const pack = CREDIT_PACKS.find((p) => p.id === packId);
  if (!pack) return false;
  store.user.credits += pack.credits;
  return true;
}
