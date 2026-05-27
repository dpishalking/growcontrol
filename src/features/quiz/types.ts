import type { WizardStepId } from "@/features/wizard/wizardSteps";

export type QuizQuestion = {
  id: string;
  /** Группа внутри шага (для прогресса «Продукт · 2/6»). */
  section?: string;
  title: string;
  subtitle?: string;
  placeholder?: string;
  required?: boolean;
  multiline?: boolean;
  /** Короткая подсказка под полем. */
  hint?: string;
  examples?: string[];
  /** Несколько URL на одном шаге (клип-ленд и т.п.). */
  urlFields?: number;
  urlFieldLabels?: string[];
};

export type WizardQuizStepId = WizardStepId | "details";

export type QuizStepConfig = {
  wizardStepId: WizardQuizStepId;
  label: string;
  intro?: string;
  questions: QuizQuestion[];
};

export type QuizProgress = {
  questionIndex: number;
  updatedAt: string;
};

export type WizardQuizProgress = Partial<Record<WizardQuizStepId, QuizProgress>>;
