import type { Funnel } from "@/types/funnel";
import { wizardStepByIndex } from "@/features/wizard/wizardSteps";
import { FOCUS_QUIZ } from "@/features/quiz/definitions/focusQuiz";
import { requiredQuestionIds } from "@/features/quiz/QuizFlow";

export function funnelResumePath(projectId: string, funnel: Funnel): string {
  const step = wizardStepByIndex(funnel.currentWizardStep);
  return `/projects/${projectId}/funnels/${funnel.id}/wizard/${step.id}`;
}

export function funnelNeedsResume(funnel: Funnel): boolean {
  if (funnel.status === "draft") return true;
  if (funnel.currentWizardStep < 9) return true;

  const focusRequired = requiredQuestionIds(FOCUS_QUIZ.questions);
  const focusValues = {
    productName: funnel.productName,
    trafficSource: funnel.trafficSource,
    landingUrl: funnel.landingUrl,
    funnelGoal: funnel.funnelGoal,
    productDescription: funnel.productDescription,
  };
  if (focusRequired.some((id) => !(focusValues as Record<string, string>)[id]?.trim())) {
    return true;
  }

  return false;
}

export function funnelResumeLabel(funnel: Funnel): string {
  const step = wizardStepByIndex(funnel.currentWizardStep);
  if (funnel.status === "draft" && funnel.currentWizardStep <= 1) {
    const idx = funnel.wizardQuizProgress?.focus?.questionIndex ?? 0;
    const q = FOCUS_QUIZ.questions[Math.min(idx, FOCUS_QUIZ.questions.length - 1)];
    return q ? `Квиз: ${q.section ?? "фокус"} — «${q.title.slice(0, 40)}…»` : "Продолжить квиз";
  }
  return `Шаг ${step.index}: ${step.title}`;
}
