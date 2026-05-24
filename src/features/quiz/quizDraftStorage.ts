import type { WizardStepId } from "@/features/wizard/wizardSteps";
import type { QuizProgress } from "./types";

const DRAFT_PREFIX = "growcontrol_quiz_draft";

function draftKey(scope: string, projectId: string, stepId: WizardStepId): string {
  return `${DRAFT_PREFIX}:${scope}:${projectId}:${stepId}`;
}

export type FocusDraft = {
  values: Record<string, string>;
  questionIndex: number;
  updatedAt: string;
};

export function loadFocusDraft(scope: string, projectId: string): FocusDraft | null {
  try {
    const raw = localStorage.getItem(draftKey(scope, projectId, "focus"));
    if (!raw) return null;
    return JSON.parse(raw) as FocusDraft;
  } catch {
    return null;
  }
}

export function saveFocusDraft(scope: string, projectId: string, draft: FocusDraft): void {
  localStorage.setItem(draftKey(scope, projectId, "focus"), JSON.stringify(draft));
}

export function clearFocusDraft(scope: string, projectId: string): void {
  localStorage.removeItem(draftKey(scope, projectId, "focus"));
}

export function getStorageScope(userId?: string | null): string {
  return userId ?? "guest";
}

export function isQuizIncomplete(
  progress: QuizProgress | undefined,
  totalQuestions: number,
  values: Record<string, string>,
  requiredIds: string[],
): boolean {
  if (!progress && requiredIds.every((id) => values[id]?.trim())) return false;
  if (progress && progress.questionIndex >= totalQuestions - 1) {
    return !requiredIds.every((id) => values[id]?.trim());
  }
  return progress !== undefined || requiredIds.some((id) => !values[id]?.trim());
}
