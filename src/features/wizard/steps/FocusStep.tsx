import { useCallback, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { useAppData } from "@/context/AppDataContext";
import { useAuth } from "@/hooks/useAuth";
import { WizardLayout } from "@/features/wizard/WizardLayout";
import type { CreateFunnelFocusInput, Funnel } from "@/types/funnel";
import { FOCUS_QUIZ } from "@/features/quiz/definitions/focusQuiz";
import {
  QuizFlow,
  focusPatchFromValues,
  quizValuesFromFocus,
  requiredQuestionIds,
} from "@/features/quiz/QuizFlow";
import {
  clearFocusDraft,
  getStorageScope,
  loadFocusDraft,
  saveFocusDraft,
} from "@/features/quiz/quizDraftStorage";

export function FocusStep({ funnel }: { funnel: Funnel | null }) {
  const { projectId } = useParams<{ projectId: string }>();
  const nav = useNavigate();
  const { user: authUser } = useAuth();
  const scope = getStorageScope(authUser?.id);
  const {
    createFunnelFocus,
    updateFunnelPatch,
    setFunnelStep,
    projectFunnels,
    getFunnel,
  } = useAppData();

  const existing = funnel;
  const otherFunnels = projectId ? projectFunnels(projectId).filter((f) => f.id !== existing?.id) : [];

  const draft = useMemo(
    () => (projectId && !existing ? loadFocusDraft(scope, projectId) : null),
    [projectId, existing, scope],
  );

  const [values, setValues] = useState<Record<string, string>>(() => {
    if (existing) return quizValuesFromFocus(existing);
    if (draft?.values) return { ...draft.values };
    return Object.fromEntries(FOCUS_QUIZ.questions.map((q) => [q.id, ""]));
  });

  const [questionIndex, setQuestionIndex] = useState(() => {
    if (existing?.wizardQuizProgress?.focus?.questionIndex != null) {
      return existing.wizardQuizProgress.focus.questionIndex;
    }
    if (draft?.questionIndex != null) return draft.questionIndex;
    return 0;
  });

  const [funnelId, setFunnelId] = useState<string | null>(existing?.id ?? null);
  const activeFunnel = existing ?? (funnelId ? getFunnel(funnelId) : null);

  const requiredIds = useMemo(() => requiredQuestionIds(FOCUS_QUIZ.questions), []);

  const persistProgress = useCallback(
    (nextValues: Record<string, string>, qIndex: number) => {
      if (!projectId) return;

      const patch = focusPatchFromValues(nextValues);
      const quizProgress = {
        questionIndex: qIndex,
        updatedAt: new Date().toISOString(),
      };

      if (funnelId || existing) {
        const id = funnelId ?? existing!.id;
        updateFunnelPatch(id, {
          ...patch,
          status: "draft",
          wizardQuizProgress: {
            ...(existing?.wizardQuizProgress ?? {}),
            focus: quizProgress,
          },
        });
        clearFocusDraft(scope, projectId);
        return;
      }

      saveFocusDraft(scope, projectId, {
        values: nextValues,
        questionIndex: qIndex,
        updatedAt: quizProgress.updatedAt,
      });

      if (patch.productName?.trim()) {
        const created = createFunnelFocus({
          projectId,
          ...(patch as CreateFunnelFocusInput),
        });
        if (created) {
          setFunnelId(created.id);
          updateFunnelPatch(created.id, {
            status: "draft",
            wizardQuizProgress: { focus: quizProgress },
          });
          clearFocusDraft(scope, projectId);
          nav(`/projects/${projectId}/funnels/${created.id}/wizard/focus`, { replace: true });
        }
      }
    },
    [projectId, funnelId, existing, scope, updateFunnelPatch, createFunnelFocus, nav],
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
    let f: Funnel | null = activeFunnel;

    if (f) {
      f = updateFunnelPatch(f.id, { ...patch, status: "active" });
    } else {
      f = createFunnelFocus({ projectId, ...(patch as CreateFunnelFocusInput) });
      if (f) f = updateFunnelPatch(f.id, { status: "active" });
    }

    if (!f) {
      toast.error("Не удалось сохранить");
      return;
    }

    clearFocusDraft(scope, projectId);
    setFunnelStep(f.id, 2);
    toast.success("Фокус сохранён — переходим к типу воронки");
    nav(`/projects/${projectId}/funnels/${f.id}/wizard/funnel-type`);
  };

  return (
    <WizardLayout
      funnel={activeFunnel}
      activeStep="focus"
      hideNav
      quizMode
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
          config={FOCUS_QUIZ}
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
