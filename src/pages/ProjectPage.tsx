import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useAppData } from "@/context/AppDataContext";
import { useAuth } from "@/hooks/useAuth";
import { ProjectFunnelsPanel } from "@/features/dashboard/ProjectFunnelsPanel";
import { getStorageScope } from "@/features/quiz/quizDraftStorage";
import { resolveProjectOpenTarget } from "@/lib/projectNavigation";

export default function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const nav = useNavigate();
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

  return (
    <div className="mx-auto max-w-4xl pb-8">
      <ProjectFunnelsPanel project={project} onClose={() => nav("/dashboard")} />
    </div>
  );
}
