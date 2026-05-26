import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useAppData } from "@/context/AppDataContext";
import { useAuth } from "@/hooks/useAuth";
import { renderRouteGuard, useProjectFunnelGuard } from "@/hooks/useRouteEntityGuard";
import { ProjectFunnelsPanel } from "@/features/dashboard/ProjectFunnelsPanel";
import { getStorageScope } from "@/features/quiz/quizDraftStorage";
import { resolveProjectOpenTarget } from "@/lib/projectNavigation";

export default function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const nav = useNavigate();
  const { projectFunnels } = useAppData();
  const { user: authUser } = useAuth();
  const scope = getStorageScope(authUser?.id);
  const guard = useProjectFunnelGuard(projectId, undefined, { requireFunnel: false });
  const guardView = renderRouteGuard(guard);
  if (guardView) return guardView;

  const { project } = guard;

  const funnels = projectFunnels(project.id);
  const target = resolveProjectOpenTarget(project.id, funnels, scope);

  if (target.kind === "navigate") {
    return <Navigate to={target.path} replace />;
  }

  return (
    <div className="mx-auto max-w-4xl pb-8">
      <ProjectFunnelsPanel project={project} onClose={() => nav("/dashboard")} />
    </div>
  );
}
