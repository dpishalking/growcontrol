export type WizardStepId =
  | "focus"
  | "funnel-type"
  | "materials"
  | "metrics"
  | "audit"
  | "diagnostics"
  | "hypotheses"
  | "prioritization"
  | "plan";

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
  { id: "audit", index: 5, title: "Аудит", subtitle: "Разбор материалов и цифр по этапам воронки" },
  { id: "diagnostics", index: 6, title: "Диагностика", subtitle: "Светофор, главный ограничитель, метрики денег" },
  { id: "hypotheses", index: 7, title: "Гипотезы", subtitle: "Топ-3 проблемных метрики → выбор одной → генерация гипотез" },
  { id: "prioritization", index: 8, title: "Приоритизация", subtitle: "ICE и группы: быстрые, стратегические, отложить" },
  { id: "plan", index: 9, title: "План тестов", subtitle: "Что тестируем первым, до и после" },
];

/** Старый мастер: details(5) убран, metrics(6) → 4, audit(4) → 5. */
export function migrateWizardStepIndex(stored: number): number {
  if (stored <= 3) return stored;
  if (stored === 4) return 5;
  if (stored === 5 || stored === 6) return 4;
  if (stored === 7) return 6;
  if (stored === 8) return 7;
  if (stored === 9) return 8;
  return 9;
}

export function wizardStepByIndex(index: number): typeof WIZARD_STEPS[number] {
  const migrated = migrateWizardStepIndex(index);
  return WIZARD_STEPS[Math.max(0, Math.min(WIZARD_STEPS.length - 1, migrated - 1))];
}

export function wizardStepIndexById(id: WizardStepId): number {
  return WIZARD_STEPS.find((s) => s.id === id)?.index ?? 1;
}
