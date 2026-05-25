import { supabase } from "@/integrations/supabase/client";
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
