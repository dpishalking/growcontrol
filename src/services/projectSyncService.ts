import { supabase } from "@/integrations/supabase/client";
import type { Hypothesis, HypothesisStatus } from "@/types/hypothesis";
import type { Project } from "@/types/project";
import type { MockStore } from "./storage";

function projectStats(store: MockStore, projectId: string) {
  const funnels = store.funnels.filter((f) => f.projectId === projectId);
  const funnelIds = new Set(funnels.map((f) => f.id));
  const hypotheses = store.hypotheses.filter((h) => funnelIds.has(h.funnelId));
  const testing = hypotheses.filter((h) => h.status === "testing").length;
  const maxStep = funnels.reduce((max, f) => Math.max(max, f.wizardStep ?? 0), 0);

  return {
    funnelCount: funnels.length,
    hypothesesCount: hypotheses.length,
    hypothesesTesting: testing,
    maxWizardStep: maxStep,
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
  const descriptionParts = [h.ifChange, h.thenMetric, h.becauseReason].filter(Boolean);
  return {
    app_id: h.id,
    title: h.title,
    description: descriptionParts.join(" → ").slice(0, 2000) || null,
    status: mapHypothesisStatus(h.status),
    priority: mapHypothesisPriority(h.priorityScore),
    expected_impact: h.thenMetric || h.metricName || null,
  };
}

async function syncHypothesesToRemote(appProjectId: string, store: MockStore): Promise<void> {
  const payload = hypothesesForProject(store, appProjectId).map(hypothesisToRemotePayload);
  await supabase.rpc("sync_app_hypotheses", {
    p_app_id: appProjectId,
    p_hypotheses: payload,
  });
}

export async function syncProjectToRemote(project: Project, store: MockStore): Promise<void> {
  const stats = projectStats(store, project.id);
  const description =
    project.mainGoal?.trim() ||
    project.businessDescription?.trim() ||
    project.productDescription?.trim() ||
    null;

  await supabase.rpc("sync_app_project", {
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

  await syncHypothesesToRemote(project.id, store);
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
