import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAppData } from "@/context/AppDataContext";
import type { Funnel } from "@/types/funnel";
import type { Project } from "@/types/project";

export function RouteLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

type ProjectFunnelGuard =
  | { status: "loading" }
  | { status: "redirect"; to: string }
  | { status: "ready"; project: Project; funnel: Funnel | null };

export function useProjectFunnelGuard(
  projectId: string | undefined,
  funnelId?: string,
  options?: { requireFunnel?: boolean },
): ProjectFunnelGuard {
  const { getProject, getFunnel, remoteSyncing } = useAppData();
  const requireFunnel = options?.requireFunnel ?? Boolean(funnelId);

  if (!projectId) return { status: "redirect", to: "/dashboard" };

  const project = getProject(projectId);
  const funnel = funnelId ? getFunnel(funnelId) : null;
  const missingProject = !project;
  const missingFunnel = requireFunnel && !funnel;

  if ((missingProject || missingFunnel) && remoteSyncing) {
    return { status: "loading" };
  }

  if (missingProject || missingFunnel) {
    return { status: "redirect", to: "/dashboard" };
  }

  return { status: "ready", project, funnel };
}

export function renderRouteGuard(guard: ProjectFunnelGuard) {
  if (guard.status === "loading") return <RouteLoading />;
  if (guard.status === "redirect") return <Navigate to={guard.to} replace />;
  return null;
}
