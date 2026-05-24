import { Navigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAppData } from "@/context/AppDataContext";
import { FocusStep } from "@/features/wizard/steps/FocusStep";
import { FunnelTypeStep } from "@/features/wizard/steps/FunnelTypeStep";
import { MaterialsStep } from "@/features/wizard/steps/MaterialsStep";
import { AuditStep } from "@/features/wizard/steps/AuditStep";
import { MetricsStep } from "@/features/wizard/steps/MetricsStep";
import { DiagnosticsStep } from "@/features/wizard/steps/DiagnosticsStep";
import { HypothesesStep } from "@/features/wizard/steps/HypothesesStep";
import { PrioritizationStep } from "@/features/wizard/steps/PrioritizationStep";
import { PlanStep } from "@/features/wizard/steps/PlanStep";
import type { WizardStepId } from "@/features/wizard/wizardSteps";

const STEP_IDS: WizardStepId[] = [
  "focus",
  "funnel-type",
  "materials",
  "metrics",
  "audit",
  "diagnostics",
  "hypotheses",
  "prioritization",
  "plan",
];

function isStepId(value: string | undefined): value is WizardStepId {
  return !!value && (STEP_IDS as string[]).includes(value);
}

const STEPS_AFTER_TYPE: WizardStepId[] = STEP_IDS.slice(2);

export default function FunnelWizardPage() {
  const { projectId, funnelId, step } = useParams<{
    projectId: string;
    funnelId?: string;
    step?: string;
  }>();
  const { getProject, getFunnel } = useAppData();

  if (!projectId) return <Navigate to="/dashboard" replace />;
  const project = getProject(projectId);
  if (!project) return <Navigate to="/dashboard" replace />;

  const funnel = funnelId ? getFunnel(funnelId) : null;

  if (funnel && step === "details") {
    return <Navigate to={`/projects/${projectId}/funnels/${funnel.id}/wizard/metrics`} replace />;
  }

  const stepId: WizardStepId = isStepId(step) ? step : "focus";

  if (stepId !== "focus" && !funnel) {
    return <Navigate to={`/projects/${projectId}/funnels/new/wizard/focus`} replace />;
  }

  if (
    funnel &&
    STEPS_AFTER_TYPE.includes(stepId) &&
    !funnel.funnelTypeId
  ) {
    return <Navigate to={`/projects/${projectId}/funnels/${funnel.id}/wizard/funnel-type`} replace />;
  }

  return (
    <>
      <PageHeader
        title={funnel ? `Воронка: ${funnel.productName || "без названия"}` : "Новая воронка"}
        subtitle="Шаги мастера → одна воронка → конкретные гипотезы по метрикам"
        backTo={`/projects/${projectId}`}
        backLabel="К проекту"
      />

      {stepId === "focus" ? (
        <FocusStep funnel={funnel} />
      ) : funnel ? (
        <>
          {stepId === "funnel-type" && <FunnelTypeStep funnel={funnel} />}
          {stepId === "materials" && <MaterialsStep funnel={funnel} />}
          {stepId === "metrics" && <MetricsStep funnel={funnel} />}
          {stepId === "audit" && <AuditStep funnel={funnel} />}
          {stepId === "diagnostics" && <DiagnosticsStep funnel={funnel} />}
          {stepId === "hypotheses" && <HypothesesStep funnel={funnel} />}
          {stepId === "prioritization" && <PrioritizationStep funnel={funnel} />}
          {stepId === "plan" && <PlanStep funnel={funnel} />}
        </>
      ) : null}
    </>
  );
}
