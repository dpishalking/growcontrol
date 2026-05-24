import type { PlanId } from "./user";

export type BillingPlan = {
  id: PlanId;
  name: string;
  priceMonthly: number;
  creditsIncluded: number;
  maxProjects: number;
  features: string[];
  highlighted?: boolean;
};

export type CreditPack = {
  id: string;
  credits: number;
  price: number;
  label: string;
};
