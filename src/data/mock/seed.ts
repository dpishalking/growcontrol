import type { MockStore } from "@/services/storage";
import type { BillingPlan, CreditPack } from "@/types/billing";
import type { AIReportType } from "@/types/ai-report";

export const DEMO_USER_ID = "user_demo";

export const BILLING_PLANS: BillingPlan[] = [
  {
    id: "free",
    name: "Free",
    priceMonthly: 0,
    creditsIncluded: 10,
    maxProjects: 1,
    features: ["1 проект", "10 AI-генераций / мес", "Базовые отчёты"],
  },
  {
    id: "starter",
    name: "Starter",
    priceMonthly: 990,
    creditsIncluded: 50,
    maxProjects: 5,
    features: ["5 проектов", "50 генераций", "Все AI-инструменты", "Экспорт PDF"],
    highlighted: true,
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 2990,
    creditsIncluded: 200,
    maxProjects: 20,
    features: [
      "20 проектов",
      "200 генераций",
      "Предиктивная модель",
      "План-факт и run rate",
      "Приоритетная очередь AI",
    ],
  },
];

export const CREDIT_PACKS: CreditPack[] = [
  { id: "pack_10", credits: 10, price: 290, label: "10 генераций" },
  { id: "pack_30", credits: 30, price: 690, label: "30 генераций" },
  { id: "pack_100", credits: 100, price: 1990, label: "100 генераций" },
];

export const AI_TOOLS: {
  type: AIReportType;
  title: string;
  description: string;
  creditCost: number;
  minCompleteness?: number;
}[] = [
  {
    type: "site_audit",
    title: "Аудит сайта",
    description: "Быстрые правки и проблемы упаковки",
    creditCost: 2,
  },
  {
    type: "offer",
    title: "Создание оффера",
    description: "Обещание, УТП и структура ценности",
    creditCost: 2,
    minCompleteness: 20,
  },
  {
    type: "jtbd",
    title: "JTBD-анализ",
    description: "Работы клиента и триггеры покупки",
    creditCost: 2,
    minCompleteness: 30,
  },
  {
    type: "landing_structure",
    title: "Структура лендинга",
    description: "Блоки страницы под вашу аудиторию",
    creditCost: 2,
    minCompleteness: 25,
  },
  {
    type: "hypotheses",
    title: "Генерация гипотез",
    description: "Идеи для тестов роста",
    creditCost: 1,
  },
  {
    type: "metrics",
    title: "Коммерческие метрики",
    description: "Набор KPI и плановые значения",
    creditCost: 2,
    minCompleteness: 40,
  },
  {
    type: "predictive_model",
    title: "Предиктивная модель",
    description: "Run rate и прогноз по периодам",
    creditCost: 3,
    minCompleteness: 50,
  },
];

export function createInitialStore(): MockStore {
  const now = new Date().toISOString();

  return {
    user: {
      id: DEMO_USER_ID,
      email: "demo@controlgrow.ru",
      name: "Демо пользователь",
      plan: "free",
      credits: 10,
      createdAt: now,
    },
    projects: [],
    reports: [],
    metricTrees: {},
    funnels: [],
    materials: [],
    funnelMetrics: [],
    auditFindings: [],
    hypotheses: [],
    experiments: [],
  };
}

export const REPORT_TYPE_LABELS: Record<AIReportType, string> = {
  site_audit: "Аудит сайта",
  offer: "Оффер",
  jtbd: "JTBD",
  landing_structure: "Структура лендинга",
  hypotheses: "Гипотезы",
  metrics: "Метрики",
  predictive_model: "Предиктивная модель",
};
