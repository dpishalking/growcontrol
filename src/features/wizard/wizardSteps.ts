export type WizardStepId =
  | "focus"
  | "funnel-type"
  | "materials"
  | "metrics"
  | "audit"
  | "signals"
  | "hypotheses"
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
  { id: "audit", index: 5, title: "Аудит", subtitle: "AI-разбор материалов и связки этапов воронки" },
  { id: "signals", index: 6, title: "Сигналы", subtitle: "Светофор план/факт, главный ограничитель, влияние на деньги" },
  { id: "hypotheses", index: 7, title: "Гипотезы", subtitle: "ТОП-3 баттлнека — фокус в первую очередь" },
  { id: "plan", index: 8, title: "План тестов", subtitle: "Приоритет ICE и запуск экспериментов" },
];

/** Старый мастер: details(5) убран, metrics(6) → 4, audit(4) → 5. */
export function migrateWizardStepIndex(stored: number): number {
  if (stored <= 3) return stored;
  if (stored === 4) return 5;
  if (stored === 5 || stored === 6) return 4;
  if (stored === 7) return 6;
  // 9 шагов → 8: приорitization влит в plan (оба → 8)
  if (stored >= 8) return 8;
  return 8;
}

export function wizardStepByIndex(index: number): typeof WIZARD_STEPS[number] {
  const migrated = migrateWizardStepIndex(index);
  return WIZARD_STEPS[Math.max(0, Math.min(WIZARD_STEPS.length - 1, migrated - 1))];
}

export function wizardStepIndexById(id: WizardStepId): number {
  return WIZARD_STEPS.find((s) => s.id === id)?.index ?? 1;
}
