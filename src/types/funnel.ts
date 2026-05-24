import type { FunnelStageDefinition, FunnelTypeId } from "./funnelType";
import type { FunnelAuditSnapshot } from "./funnelAudit";
import type { WizardQuizProgress } from "@/features/quiz/types";

export type FunnelStage =
  | "traffic"
  | "click"
  | "landing"
  | "lead"
  | "qualification"
  | "contact"
  | "consultation"
  | "sale"
  | "delivery"
  | "repeat";

export const FUNNEL_STAGES: { id: FunnelStage; label: string; description: string }[] = [
  { id: "traffic", label: "Трафик", description: "Источник, креативы, аудитории" },
  { id: "click", label: "Клик", description: "CTR, CPC, качество клика" },
  { id: "landing", label: "Посадочная", description: "Первый экран → форма" },
  { id: "lead", label: "Заявка", description: "Лид-форма, поля, мотивация" },
  { id: "qualification", label: "Квалификация", description: "Целевые vs нецелевые" },
  { id: "contact", label: "Дозвон", description: "Скорость, касания, догрев" },
  { id: "consultation", label: "Консультация", description: "Скрипт, ценность, возражения" },
  { id: "sale", label: "Продажа", description: "Конверсия в оплату, чек" },
  { id: "delivery", label: "Доставка / выкуп", description: "Подтверждение, доставка" },
  { id: "repeat", label: "Повтор / LTV", description: "Апсейл, повторные продажи" },
];

export type FunnelStatus = "draft" | "active" | "archived";

export type Funnel = {
  id: string;
  projectId: string;
  /** Выбранный тип воронки — определяет этапы, метрики, материалы, аудит. */
  funnelTypeId: FunnelTypeId | null;
  /** Этапы воронки (из шаблона типа или кастомные). */
  stages: FunnelStageDefinition[];
  productName: string;
  productDescription: string;
  averagePrice: string;
  trafficSource: string;
  landingUrl: string;
  targetAudience: string;
  funnelGoal: string;
  currentProblem: string;
  status: FunnelStatus;
  /** Какой шаг мастера активен сейчас. */
  currentWizardStep: number;
  /** Прогресс пошагового квиза внутри шагов мастера. */
  wizardQuizProgress?: WizardQuizProgress;
  /** Дополнительные данные о воронке (Шаг 4). */
  productDetails: ProductDetails;
  audienceDetails: AudienceDetails;
  funnelDetails: FunnelDetails;
  constraints: FunnelConstraints;
  /** Последний AI-аудит воронки. */
  auditSnapshot?: FunnelAuditSnapshot | null;
  createdAt: string;
  updatedAt: string;
};

export type ProductDetails = {
  whatWeSell: string;
  price: string;
  cost: string;
  margin: string;
  installment: string;
  upsells: string;
  repeatPurchases: string;
  guarantee: string;
  whatClientGets: string;
  mainResult: string;
};

export type AudienceDetails = {
  whoBuys: string;
  currentSegment: string;
  painOrTask: string;
  alreadyTried: string;
  whyDoubt: string;
  alternatives: string;
  whyChooseUs: string;
};

export type FunnelDetails = {
  trafficSourceDetails: string;
  campaignName: string;
  landingDetails: string;
  afterLead: string;
  whoHandles: string;
  touchpointsToSale: string;
  paymentPoint: string;
  deliveryWorkflow: string;
  repeatCommunication: string;
};

export type FunnelConstraints = {
  forbiddenClaims: string;
  legalRestrictions: string;
  bannedClaims: string;
  bannedChannels: string;
  testBudget: string;
  teamResources: string;
};

export type CreateFunnelFocusInput = {
  projectId: string;
  productName: string;
  productDescription: string;
  averagePrice: string;
  trafficSource: string;
  landingUrl: string;
  targetAudience: string;
  funnelGoal: string;
  currentProblem: string;
};

export const EMPTY_PRODUCT_DETAILS: ProductDetails = {
  whatWeSell: "",
  price: "",
  cost: "",
  margin: "",
  installment: "",
  upsells: "",
  repeatPurchases: "",
  guarantee: "",
  whatClientGets: "",
  mainResult: "",
};

export const EMPTY_AUDIENCE_DETAILS: AudienceDetails = {
  whoBuys: "",
  currentSegment: "",
  painOrTask: "",
  alreadyTried: "",
  whyDoubt: "",
  alternatives: "",
  whyChooseUs: "",
};

export const EMPTY_FUNNEL_DETAILS: FunnelDetails = {
  trafficSourceDetails: "",
  campaignName: "",
  landingDetails: "",
  afterLead: "",
  whoHandles: "",
  touchpointsToSale: "",
  paymentPoint: "",
  deliveryWorkflow: "",
  repeatCommunication: "",
};

export const EMPTY_FUNNEL_CONSTRAINTS: FunnelConstraints = {
  forbiddenClaims: "",
  legalRestrictions: "",
  bannedClaims: "",
  bannedChannels: "",
  testBudget: "",
  teamResources: "",
};
