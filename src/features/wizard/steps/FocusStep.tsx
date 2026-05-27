import { useCallback, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { useAppData } from "@/context/AppDataContext";
import { useAuth } from "@/hooks/useAuth";
import { WizardLayout } from "@/features/wizard/WizardLayout";
import type { Funnel } from "@/types/funnel";
import {
  getFocusQuizForType,
  focusRequiredIdsForType,
} from "@/features/quiz/definitions/focusQuizForType";
import {
  QuizFlow,
  focusPatchFromValues,
  quizValuesFromFocus,
} from "@/features/quiz/QuizFlow";
import {
  clearFocusDraft,
  getStorageScope,
  loadFocusDraft,
} from "@/features/quiz/quizDraftStorage";

export function FocusStep({ funnel }: { funnel: Funnel }) {
  const { projectId } = useParams<{ projectId: string }>();
  const nav = useNavigate();
  const { user: authUser } = useAuth();
  const scope = getStorageScope(authUser?.id);
  const {
    updateFunnelPatch,
    setFunnelStep,
    projectFunnels,
  } = useAppData();

  const existing = funnel;
  const focusQuiz = useMemo(
    () => getFocusQuizForType(existing.funnelTypeId),
    [existing.funnelTypeId],
  );
  const otherFunnels = projectId ? projectFunnels(projectId).filter((f) => f.id !== existing.id) : [];

  const draft = useMemo(
    () => (projectId && !existing.productName?.trim() ? loadFocusDraft(scope, projectId) : null),
    [projectId, existing.productName, scope],
  );

  const [values, setValues] = useState<Record<string, string>>(() => {
    if (existing) return quizValuesFromFocus(existing);
    if (draft?.values) return { ...draft.values };
    return Object.fromEntries(focusQuiz.questions.map((q) => [q.id, ""]));
  });

  const [questionIndex, setQuestionIndex] = useState(() => {
    if (existing.wizardQuizProgress?.focus?.questionIndex != null) {
      return existing.wizardQuizProgress.focus.questionIndex;
    }
    if (draft?.questionIndex != null) return draft.questionIndex;
    return 0;
  });

  const requiredIds = useMemo(
    () => focusRequiredIdsForType(existing.funnelTypeId),
    [existing.funnelTypeId],
  );

  const persistProgress = useCallback(
    (nextValues: Record<string, string>, qIndex: number) => {
      if (!projectId) return;

      const patch = focusPatchFromValues(nextValues);
      const quizProgress = {
        questionIndex: qIndex,
        updatedAt: new Date().toISOString(),
      };

      updateFunnelPatch(existing.id, {
        ...patch,
        status: "draft",
        wizardQuizProgress: {
          ...(existing.wizardQuizProgress ?? {}),
          focus: quizProgress,
        },
      });
      clearFocusDraft(scope, projectId);
    },
    [projectId, existing, scope, updateFunnelPatch],
  );

  const handleChange = (questionId: string, value: string) => {
    setValues((prev) => {
      const next = { ...prev, [questionId]: value };
      persistProgress(next, questionIndex);
      return next;
    });
  };

  const handleAutosave = useCallback(() => {
    persistProgress(values, questionIndex);
  }, [persistProgress, values, questionIndex]);

  const handleIndexChange = (idx: number) => {
    setQuestionIndex(idx);
    persistProgress(values, idx);
  };

  const canComplete = useCallback(
    (v: Record<string, string>) => requiredIds.every((id) => (v[id] ?? "").trim().length > 0),
    [requiredIds],
  );

  const handleComplete = () => {
    if (!projectId) {
      toast.error("Нет проекта");
      return;
    }
    if (!canComplete(values)) {
      toast.error("Заполните обязательные поля");
      return;
    }

    const patch = focusPatchFromValues(values);
    const f = updateFunnelPatch(existing.id, { ...patch, status: "active" });

    if (!f) {
      toast.error("Не удалось сохранить");
      return;
    }

    clearFocusDraft(scope, projectId);
    setFunnelStep(f.id, 3);
    toast.success("Фокус сохранён — переходим к материалам");
    nav(`/projects/${projectId}/funnels/${f.id}/wizard/materials`);
  };

  return (
    <WizardLayout
      funnel={existing}
      projectId={projectId}
      activeStep="focus"
      onBack={() => nav(`/projects/${projectId}/funnels/${funnel.id}/wizard/funnel-type`)}
      hideNav
    >
      <div className="space-y-4">
        {otherFunnels.length > 0 ? (
          <Card className="border-primary/20 bg-primary/5 max-w-xl mx-auto">
            <CardContent className="p-3 text-xs text-center">
              В проекте уже {otherFunnels.length} воронк{otherFunnels.length === 1 ? "а" : "и"} —
              создаём ещё одну отдельно.
            </CardContent>
          </Card>
        ) : null}

        <QuizFlow
          config={focusQuiz}
          values={values}
          onChange={handleChange}
          onComplete={handleComplete}
          initialIndex={questionIndex}
          onIndexChange={handleIndexChange}
          onAutosave={handleAutosave}
          canComplete={canComplete}
        />
      </div>
    </WizardLayout>
  );
}
