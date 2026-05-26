import { Navigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { getFunnelTypeTemplate } from "@/data/funnelTypes/catalog";
import { TelegramConnectButton } from "@/features/dashboard/TelegramConnectButton";
import { useAppData } from "@/context/AppDataContext";
import { useAuth } from "@/hooks/useAuth";
import { renderRouteGuard, RouteLoading, useProjectFunnelGuard } from "@/hooks/useRouteEntityGuard";
import { FocusStep } from "@/features/wizard/steps/FocusStep";
import { FunnelTypeStep } from "@/features/wizard/steps/FunnelTypeStep";
import { MaterialsStep } from "@/features/wizard/steps/MaterialsStep";
import { AuditStep } from "@/features/wizard/steps/AuditStep";
import { MetricsStep } from "@/features/wizard/steps/MetricsStep";
import { HypothesesStep } from "@/features/wizard/steps/HypothesesStep";
import { PlanStep } from "@/features/wizard/steps/PlanStep";
import type { WizardStepId } from "@/features/wizard/wizardSteps";
import { projectDashboardPath } from "@/lib/projectNavigation";

const STEP_IDS: WizardStepId[] = [
  "focus",
  "funnel-type",
  "materials",
  "metrics",
  "audit",
  "hypotheses",
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
  const { getFunnel, remoteSyncing } = useAppData();
  const { guest } = useAuth();
  const guard = useProjectFunnelGuard(projectId, funnelId, { requireFunnel: false });
  const guardView = renderRouteGuard(guard);
  if (guardView) return guardView;

  const { project } = guard;
  const funnel = funnelId ? getFunnel(funnelId) : null;

  if (funnelId && !funnel && remoteSyncing) {
    return <RouteLoading />;
  }

  if (funnel && step === "details") {
    return <Navigate to={`/projects/${projectId}/funnels/${funnel.id}/wizard/metrics`} replace />;
  }

  if (funnel && (step === "diagnostics" || step === "signals")) {
    return <Navigate to={`/projects/${projectId}/funnels/${funnel.id}/wizard/hypotheses`} replace />;
  }

  if (funnel && step === "prioritization") {
    return <Navigate to={`/projects/${projectId}/funnels/${funnel.id}/wizard/plan`} replace />;
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

  const typeLabel = funnel?.funnelTypeId
    ? getFunnelTypeTemplate(funnel.funnelTypeId).name
    : null;
  const wizardTitle = funnel
    ? [funnel.productName || "без названия", typeLabel].filter(Boolean).join(" · ")
    : "Новая воронка";

  return (
    <>
      <PageHeader
        title={wizardTitle}
        subtitle={
          stepId === "focus"
            ? "Шаги мастера → одна воронка → конкретные гипотезы по метрикам"
            : undefined
        }
        backTo={projectDashboardPath(projectId)}
        backLabel="К проектам"
        compact={stepId !== "focus"}
        action={!guest ? <TelegramConnectButton appProjectId={projectId} /> : undefined}
      />

      {stepId === "focus" ? (
        <FocusStep funnel={funnel} />
      ) : funnel ? (
        <>
          {stepId === "funnel-type" && <FunnelTypeStep funnel={funnel} />}
          {stepId === "materials" && <MaterialsStep funnel={funnel} />}
          {stepId === "metrics" && <MetricsStep funnel={funnel} />}
          {stepId === "audit" && <AuditStep funnel={funnel} />}
          {stepId === "hypotheses" && <HypothesesStep funnel={funnel} />}
          {stepId === "plan" && <PlanStep funnel={funnel} />}
        </>
      ) : null}
    </>
  );
}
