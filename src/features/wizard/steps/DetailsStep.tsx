import { useNavigate, useParams } from "react-router-dom";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { useAppData } from "@/context/AppDataContext";
import { WizardLayout } from "@/features/wizard/WizardLayout";
import type { Funnel } from "@/types/funnel";
import { DETAILS_FIELD_MAP, DETAILS_QUIZ } from "@/features/quiz/definitions/detailsQuiz";
import { QuizFlow, requiredQuestionIds } from "@/features/quiz/QuizFlow";

function valuesFromFunnel(funnel: Funnel): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [qId, { group, key }] of Object.entries(DETAILS_FIELD_MAP)) {
    const source =
      group === "product"
        ? funnel.productDetails
        : group === "audience"
          ? funnel.audienceDetails
          : group === "funnel"
            ? funnel.funnelDetails
            : funnel.constraints;
    out[qId] = (source as Record<string, string>)[key] ?? "";
  }
  return out;
}

function patchFromQuestion(funnel: Funnel, questionId: string, value: string): Partial<Funnel> {
  const map = DETAILS_FIELD_MAP[questionId];
  if (!map) return {};
  const trimmed = value.trim();
  if (map.group === "product") {
    return { productDetails: { ...funnel.productDetails, [map.key]: trimmed } };
  }
  if (map.group === "audience") {
    return { audienceDetails: { ...funnel.audienceDetails, [map.key]: trimmed } };
  }
  if (map.group === "funnel") {
    return { funnelDetails: { ...funnel.funnelDetails, [map.key]: trimmed } };
  }
  return { constraints: { ...funnel.constraints, [map.key]: trimmed } };
}

export function DetailsStep({ funnel }: { funnel: Funnel }) {
  const { projectId } = useParams<{ projectId: string }>();
  const nav = useNavigate();
  const {
    updateFunnelPatch,
    updateProductDetails,
    updateAudienceDetails,
    updateFunnelDetails,
    updateConstraints,
    setFunnelStep,
  } = useAppData();

  const [values, setValues] = useState(() => valuesFromFunnel(funnel));
  const [questionIndex, setQuestionIndex] = useState(
    () => funnel.wizardQuizProgress?.details?.questionIndex ?? 0,
  );

  const requiredIds = useMemo(() => requiredQuestionIds(DETAILS_QUIZ.questions), []);

  const persistField = useCallback(
    (questionId: string, value: string, qIndex: number) => {
      const patch = patchFromQuestion(funnel, questionId, value);
      updateFunnelPatch(funnel.id, {
        ...patch,
        wizardQuizProgress: {
          ...funnel.wizardQuizProgress,
          details: { questionIndex: qIndex, updatedAt: new Date().toISOString() },
        },
      });
    },
    [funnel, updateFunnelPatch],
  );

  const handleChange = (questionId: string, value: string) => {
    setValues((prev) => ({ ...prev, [questionId]: value }));
    const map = DETAILS_FIELD_MAP[questionId];
    if (!map) return;
    const trimmed = value.trim();
    if (map.group === "product") updateProductDetails(funnel.id, { [map.key]: trimmed });
    else if (map.group === "audience") updateAudienceDetails(funnel.id, { [map.key]: trimmed });
    else if (map.group === "funnel") updateFunnelDetails(funnel.id, { [map.key]: trimmed });
    else updateConstraints(funnel.id, { [map.key]: trimmed });
  };

  const handleAutosave = useCallback(() => {
    const q = DETAILS_QUIZ.questions[questionIndex];
    if (q) persistField(q.id, values[q.id] ?? "", questionIndex);
  }, [persistField, questionIndex, values]);

  const handleIndexChange = (idx: number) => {
    setQuestionIndex(idx);
    const q = DETAILS_QUIZ.questions[idx];
    if (q) {
      updateFunnelPatch(funnel.id, {
        wizardQuizProgress: {
          ...funnel.wizardQuizProgress,
          details: { questionIndex: idx, updatedAt: new Date().toISOString() },
        },
      });
    }
  };

  const handleComplete = () => {
    setFunnelStep(funnel.id, 6);
    toast.success("Данные сохранены");
    nav(`/projects/${projectId}/funnels/${funnel.id}/wizard/metrics`);
  };

  return (
    <WizardLayout
      funnel={funnel}
      activeStep="metrics"
      hideNav
      onBack={() => nav(`/projects/${projectId}/funnels/${funnel.id}/wizard/audit`)}
    >
      <QuizFlow
        config={DETAILS_QUIZ}
        values={values}
        onChange={handleChange}
        onComplete={handleComplete}
        initialIndex={questionIndex}
        onIndexChange={handleIndexChange}
        onAutosave={handleAutosave}
        canComplete={() => requiredIds.every((id) => true)}
      />
    </WizardLayout>
  );
}
