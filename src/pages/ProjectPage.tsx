import { Navigate, useParams } from "react-router-dom";
import { useAppData } from "@/context/AppDataContext";
import { useAuth } from "@/hooks/useAuth";
import { getStorageScope } from "@/features/quiz/quizDraftStorage";
import { projectDashboardPath, resolveProjectOpenTarget } from "@/lib/projectNavigation";

/** Старые ссылки /projects/:id → умный редирект (не отдельная страница). */
export default function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { getProject, projectFunnels } = useAppData();
  const { user: authUser } = useAuth();
  const scope = getStorageScope(authUser?.id);

  if (!projectId) return <Navigate to="/dashboard" replace />;

  const project = getProject(projectId);
  if (!project) return <Navigate to="/dashboard" replace />;

  const funnels = projectFunnels(projectId);
  const target = resolveProjectOpenTarget(projectId, funnels, scope);

  if (target.kind === "navigate") {
    return <Navigate to={target.path} replace />;
  }

  return <Navigate to={projectDashboardPath(projectId)} replace />;
}
