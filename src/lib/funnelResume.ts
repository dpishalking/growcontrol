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
  if (funnel.currentWizardStep < 8) return true;

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
  const step = wizardStepByIndex(funnel.currentWizardStep ?? 1);
  if (funnel.status === "draft" && (funnel.currentWizardStep ?? 1) <= 1) {
    const idx = funnel.wizardQuizProgress?.focus?.questionIndex ?? 0;
    const q = FOCUS_QUIZ.questions[Math.min(idx, FOCUS_QUIZ.questions.length - 1)];
    const title = q?.title?.trim();
    if (title) {
      const short = title.length > 40 ? `${title.slice(0, 40)}…` : title;
      return `Квиз: ${q?.section ?? "фокус"} — «${short}»`;
    }
    return "Продолжить квиз";
  }
  return `Шаг ${step.index}: ${step.title}`;
}
