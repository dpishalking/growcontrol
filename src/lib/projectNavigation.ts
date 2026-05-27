import type { Funnel } from "@/types/funnel";
import { loadFocusDraft } from "@/features/quiz/quizDraftStorage";
import { funnelNeedsResume, funnelResumePath } from "@/lib/funnelResume";

export type ProjectOpenTarget =
  | { kind: "navigate"; path: string }
  | { kind: "expand"; projectId: string };

/** Куда вести пользователя при выборе проекта с dashboard или /projects/:id. */
export function resolveProjectOpenTarget(
  projectId: string,
  funnels: Funnel[],
  scope: string,
): ProjectOpenTarget {
  if (funnels.length === 0) {
    return { kind: "navigate", path: `/projects/${projectId}/funnels/new/wizard/funnel-type` };
  }

  if (funnels.length === 1) {
    const funnel = funnels[0]!;
    if (funnelNeedsResume(funnel)) {
      return { kind: "navigate", path: funnelResumePath(projectId, funnel) };
    }
    return { kind: "navigate", path: `/projects/${projectId}/funnels/${funnel.id}` };
  }

  const drafts = funnels.filter((f) => funnelNeedsResume(f));
  const focusDraft = loadFocusDraft(scope, projectId);

  if (drafts.length === 1 && !focusDraft) {
    return { kind: "navigate", path: funnelResumePath(projectId, drafts[0]!) };
  }

  return { kind: "expand", projectId };
}

export function projectDashboardPath(projectId: string): string {
  return `/projects/${encodeURIComponent(projectId)}`;
}
