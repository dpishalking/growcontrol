import type { Funnel } from "@/types/funnel";
import { wizardStepByIndex } from "@/features/wizard/wizardSteps";
import { getFocusQuizForType, isFocusComplete } from "@/features/quiz/definitions/focusQuizForType";

export function funnelResumePath(projectId: string, funnel: Funnel): string {
  if (!funnel.funnelTypeId) {
    return `/projects/${projectId}/funnels/${funnel.id}/wizard/funnel-type`;
  }
  if (!isFocusComplete(funnel)) {
    return `/projects/${projectId}/funnels/${funnel.id}/wizard/focus`;
  }
  const step = wizardStepByIndex(funnel.currentWizardStep);
  return `/projects/${projectId}/funnels/${funnel.id}/wizard/${step.id}`;
}

export function funnelNeedsResume(funnel: Funnel): boolean {
  if (funnel.status === "draft") return true;
  if (!funnel.funnelTypeId) return true;
  if (!isFocusComplete(funnel)) return true;
  if (funnel.currentWizardStep < 7) return true;
  return false;
}

export function funnelResumeLabel(funnel: Funnel): string {
  if (!funnel.funnelTypeId) {
    return "Шаг 1: Тип воронки";
  }

  if (!isFocusComplete(funnel)) {
    const idx = funnel.wizardQuizProgress?.focus?.questionIndex ?? 0;
    const quiz = getFocusQuizForType(funnel.funnelTypeId);
    const q = quiz.questions[Math.min(idx, quiz.questions.length - 1)];
    const title = q?.title?.trim();
    if (title) {
      const short = title.length > 40 ? `${title.slice(0, 40)}…` : title;
      return `Квиз: ${q?.section ?? "фокус"} — «${short}»`;
    }
    return "Продолжить квиз";
  }

  const step = wizardStepByIndex(funnel.currentWizardStep ?? 1);
  return `Шаг ${step.index}: ${step.title}`;
}
