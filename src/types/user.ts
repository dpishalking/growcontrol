export type PlanId = "free" | "starter" | "pro";

export type User = {
  id: string;
  email: string;
  name: string;
  plan: PlanId;
  credits: number;
  createdAt: string;
};
