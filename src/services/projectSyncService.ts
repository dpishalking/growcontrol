import { supabase } from "@/integrations/supabase/client";
import type { Experiment } from "@/types/experiment";
import { wizardStepByIndex } from "@/features/wizard/wizardSteps";
import type { Hypothesis, HypothesisStatus } from "@/types/hypothesis";
import { buildHypothesisSyncDescription } from "@/lib/hypothesisPresentation";
import type { Project } from "@/types/project";
import type { MockStore } from "./storage";

function projectStats(store: MockStore, projectId: string) {
  const funnels = store.funnels.filter((f) => f.projectId === projectId);
  const funnelIds = new Set(funnels.map((f) => f.id));
  const hypotheses = store.hypotheses.filter((h) => funnelIds.has(h.funnelId));
  const testing = hypotheses.filter((h) => h.status === "testing").length;
  const queued = hypotheses.filter((h) => h.status === "backlog").length;
  const maxStep = funnels.reduce((max, f) => Math.max(max, f.currentWizardStep ?? 0), 0);
  const stepInfo = maxStep > 0 ? wizardStepByIndex(maxStep) : null;

  return {
    funnelCount: funnels.length,
    hypothesesCount: hypotheses.length,
    hypothesesTesting: testing,
    hypothesesQueued: queued,
    maxWizardStep: maxStep,
    wizardStepTitle: stepInfo?.title ?? null,
  };
}

function hypothesesForProject(store: MockStore, projectId: string): Hypothesis[] {
  const funnelIds = new Set(store.funnels.filter((f) => f.projectId === projectId).map((f) => f.id));
  return store.hypotheses.filter((h) => funnelIds.has(h.funnelId));
}

function mapHypothesisStatus(status: HypothesisStatus): string {
  switch (status) {
    case "testing":
      return "testing";
    case "success":
      return "won";
    case "failed":
      return "lost";
    case "parked":
      return "archived";
    case "backlog":
      return "in_progress";
    case "draft":
    default:
      return "new";
  }
}

function mapHypothesisPriority(score: number): "high" | "medium" | "low" {
  if (score >= 4) return "high";
  if (score >= 2.5) return "medium";
  return "low";
}

function hypothesisToRemotePayload(h: Hypothesis) {
  return {
    app_id: h.id,
    title: h.title,
    description: buildHypothesisSyncDescription(h),
    status: mapHypothesisStatus(h.status),
    priority: mapHypothesisPriority(h.priorityScore),
    expected_impact: h.thenMetric || h.metricName || null,
  };
}

export async function syncProjectToRemote(
  project: Project,
  store: MockStore,
): Promise<{ ok: boolean; error?: string }> {
  const stats = projectStats(store, project.id);
  const description =
    project.mainGoal?.trim() ||
    project.businessDescription?.trim() ||
    project.productDescription?.trim() ||
    null;

  const { error: projectError } = await supabase.rpc("sync_app_project", {
    p_app_id: project.id,
    p_name: project.projectName,
    p_description: description,
    p_website_url: project.websiteUrl || null,
    p_metadata: {
      completenessScore: project.projectCompletenessScore,
      mainGoal: project.mainGoal,
      northStarMetric: project.northStarMetric,
      ...stats,
      updatedAt: project.updatedAt,
    },
  });

  if (projectError) {
    return { ok: false, error: projectError.message };
  }

  const payload = hypothesesForProject(store, project.id).map(hypothesisToRemotePayload);
  const { error: hypothesesError } = await supabase.rpc("sync_app_hypotheses", {
    p_app_id: project.id,
    p_hypotheses: payload,
  });

  if (hypothesesError) {
    console.warn("sync_app_hypotheses failed (non-fatal)", hypothesesError);
  }

  return { ok: true };
}

/** Зеркалит все локальные проекты участника в Supabase (для админки). */
export async function syncAllProjectsToRemote(store: MockStore): Promise<void> {
  for (const project of store.projects) {
    await syncProjectToRemote(project, store);
  }
}

export async function logProjectActivity(
  appProjectId: string,
  eventType: string,
  title: string,
  description?: string | null,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const { data: projectRow } = await supabase
    .from("projects")
    .select("id")
    .eq("app_id", appProjectId)
    .maybeSingle();

  if (!projectRow?.id) return;

  await supabase.from("project_events").insert({
    project_id: projectRow.id,
    event_type: eventType,
    title,
    description: description ?? null,
    metadata: metadata ?? null,
  });
}

export function resolveProjectIdForFunnel(store: MockStore, funnelId: string): string | null {
  const funnel = store.funnels.find((f) => f.id === funnelId);
  return funnel?.projectId ?? null;
}

/** Синхронизирует эксперимент в Supabase для admin-видимости и scheduled reminders. */
export async function syncExperimentToRemote(
  appProjectId: string,
  experiment: Experiment,
): Promise<void> {
  const payload = {
    app_id: experiment.id,
    app_hyp_id: experiment.hypothesisId,
    owner: experiment.owner || null,
    start_date: experiment.startDate || null,
    end_date: experiment.endDate || null,
    budget: experiment.budget || null,
    status: experiment.decision === "pending" ? "active" : "finished",
  };

  await supabase.rpc("sync_app_experiment", {
    p_app_project_id: appProjectId,
    p_experiment: payload,
  });
}
