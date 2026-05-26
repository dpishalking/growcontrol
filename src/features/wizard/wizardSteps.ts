export type WizardStepId =
  | "focus"
  | "funnel-type"
  | "materials"
  | "metrics"
  | "audit"
  | "hypotheses"
  | "plan";

/** Устаревший id — редирект на hypotheses. */
export type LegacyWizardStepId = WizardStepId | "signals";

export const WIZARD_STEPS: {
  id: WizardStepId;
  index: number;
  title: string;
  subtitle: string;
}[] = [
  { id: "focus", index: 1, title: "Фокус воронки", subtitle: "Один продукт, один канал, одна посадочная, одна цель" },
  { id: "funnel-type", index: 2, title: "Тип воронки", subtitle: "Шаблон этапов, метрик и материалов" },
  { id: "materials", index: 3, title: "Материалы", subtitle: "Сайт, креативы, скрипты, аналитика" },
  { id: "metrics", index: 4, title: "Метрики воронки", subtitle: "План / факт по этапам — основа для аудита и гипотез" },
  { id: "audit", index: 5, title: "Аудит", subtitle: "AI-разбор материалов и связки этапов воронки" },
  { id: "hypotheses", index: 6, title: "Гипотезы", subtitle: "Идеи под слабое место воронки" },
  { id: "plan", index: 7, title: "План тестов", subtitle: "Приоритет ICE и запуск экспериментов" },
];

/** Старый мастер: signals влит в hypotheses (7 шагов вместо 8). */
export function migrateWizardStepIndex(stored: number): number {
  if (stored <= 6) return stored;
  if (stored === 7) return 6;
  return 7;
}

export function wizardStepByIndex(index: number): typeof WIZARD_STEPS[number] {
  const migrated = migrateWizardStepIndex(index);
  return WIZARD_STEPS[Math.max(0, Math.min(WIZARD_STEPS.length - 1, migrated - 1))];
}

export function wizardStepIndexById(id: WizardStepId): number {
  return WIZARD_STEPS.find((s) => s.id === id)?.index ?? 1;
}
