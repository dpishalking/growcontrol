import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { BarChart3, FolderKanban, FlaskConical, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NewProjectDialog } from "@/features/dashboard/NewProjectDialog";
import { ActiveTestCard } from "@/features/dashboard/ActiveTestCard";
import { DashboardFrame } from "@/features/dashboard/DashboardFrame";
import { DashboardHero } from "@/features/dashboard/DashboardHero";
import { findPrimaryTestHref, findRedMetricsHref } from "@/features/dashboard/nextActionLogic";
import { DashboardProjectCard } from "@/features/dashboard/DashboardProjectCard";
import { DashboardStatusBar } from "@/features/dashboard/DashboardStatusBar";
import { DashboardZone } from "@/features/dashboard/DashboardZone";
import { useDashboardSnapshot } from "@/features/dashboard/useDashboardSnapshot";
import { getStorageScope } from "@/features/quiz/quizDraftStorage";
import { useAppData } from "@/context/AppDataContext";
import { useAuth } from "@/hooks/useAuth";
import { BILLING_ENABLED } from "@/lib/productFlags";
import { resolveProjectOpenTarget } from "@/lib/projectNavigation";

export default function DashboardPage() {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const testQueueRef = useRef<HTMLDivElement>(null);
  const { user: authUser } = useAuth();
  const scope = getStorageScope(authUser?.id);
  const {
    user,
    projects,
    canAddProject,
    projectFunnels,
    funnelHypotheses,
    funnelMetricsList,
    experimentByHypothesis,
    createEmptyProject,
    syncGenericProjectNames,
    maxProjects,
    currentPlan,
  } = useAppData();

  useEffect(() => {
    syncGenericProjectNames();
  }, [syncGenericProjectNames]);

  useEffect(() => {
    const legacyProjectId = searchParams.get("project");
    if (legacyProjectId) {
      nav(`/projects/${legacyProjectId}`, { replace: true });
    }
  }, [searchParams, nav]);

  const [newOpen, setNewOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const snapshot = useDashboardSnapshot(projects, projectFunnels, funnelHypotheses, funnelMetricsList);

  const visibleTests = snapshot.activeTests.slice(0, 5);
  const hasProjects = snapshot.totals.projects > 0;

  const handleCreate = () => {
    if (BILLING_ENABLED && !canAddProject) return;
    const p = createEmptyProject(newName || "Новый проект");
    if (!p) return;
    setNewOpen(false);
    setNewName("");
    nav(`/projects/${p.id}/funnels/new/wizard/focus`);
  };

  const openProject = (projectId: string) => {
    const funnels = projectFunnels(projectId);
    const target = resolveProjectOpenTarget(projectId, funnels, scope);
    nav(target.kind === "navigate" ? target.path : `/projects/${projectId}`);
  };

  const showSummary =
    hasProjects && (snapshot.activeTests.length > 0 || snapshot.totals.redMetrics > 0);

  const handleSummaryTestsClick = () => {
    if (visibleTests.length > 0 && testQueueRef.current) {
      testQueueRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const href = findPrimaryTestHref(snapshot);
    if (href) nav(href);
  };

  const handleSummaryRedMetricsClick = () => {
    const href = findRedMetricsHref(snapshot);
    if (href) nav(href);
  };

  return (
    <div className="dashboard-cockpit relative mx-auto max-w-4xl space-y-6 pb-8 sm:space-y-8">
      <DashboardHero
        name={user.name}
        email={user.email}
        projectCount={snapshot.totals.projects}
        onNewProject={() => setNewOpen(true)}
      />

      <DashboardZone
        title="Проекты"
        subtitle="Выберите — откроем воронку или список"
        icon={FolderKanban}
        prominent
      >
        {projects.length === 0 ? (
          <DashboardFrame variant="primary" glow innerClassName="px-6 py-14 text-center sm:px-10">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-money text-primary-foreground shadow-glow">
              <Sparkles className="h-7 w-7" />
            </div>
            <p className="font-display text-xl font-bold text-foreground">Создайте первую воронку</p>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Мастер проведёт от фокуса продукта до плана A/B-тестов. Без лишних экранов.
            </p>
            <Button
              onClick={() => setNewOpen(true)}
              size="lg"
              className="dashboard-cta-shimmer mt-8 bg-gradient-money text-primary-foreground shadow-glow"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Начать
            </Button>
          </DashboardFrame>
        ) : (
          <DashboardFrame variant="default" innerClassName="space-y-2 p-3 sm:p-4">
            {snapshot.projectCards.map((model) => (
              <DashboardProjectCard
                key={model.project.id}
                model={model}
                selected={false}
                onOpen={() => openProject(model.project.id)}
              />
            ))}
          </DashboardFrame>
        )}
      </DashboardZone>

      {showSummary ? (
        <DashboardZone
          title="Сводка"
          subtitle="Что требует внимания"
          icon={BarChart3}
          prominent
        >
          <DashboardStatusBar
            activeTests={snapshot.activeTests.length}
            redMetrics={snapshot.totals.redMetrics}
            inWork={snapshot.inWork}
            onActiveTestsClick={handleSummaryTestsClick}
            onRedMetricsClick={handleSummaryRedMetricsClick}
          />
        </DashboardZone>
      ) : null}

      {visibleTests.length > 0 ? (
        <div ref={testQueueRef} className="scroll-mt-6">
          <DashboardZone
            title="Очередь тестов"
            subtitle="Backlog и активные эксперименты"
            icon={FlaskConical}
            prominent
          >
            <DashboardFrame variant="default" innerClassName="space-y-2 p-3 sm:p-4">
              {visibleTests.map(({ hypothesis: h, projectId, projectName }) => (
                <ActiveTestCard
                  key={h.id}
                  hypothesis={h}
                  experiment={experimentByHypothesis(h.id)}
                  projectName={projectName}
                  href={`/projects/${projectId}/funnels/${h.funnelId}/wizard/plan`}
                />
              ))}
              {snapshot.activeTests.length > visibleTests.length ? (
                <p className="px-1 pt-1 text-center text-xs text-muted-foreground">
                  + ещё {snapshot.activeTests.length - visibleTests.length} в плане
                </p>
              ) : null}
            </DashboardFrame>
          </DashboardZone>
        </div>
      ) : null}

      <NewProjectDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        name={newName}
        onNameChange={setNewName}
        onCreate={handleCreate}
        canAddProject={canAddProject}
        projectCount={projects.length}
        maxProjects={maxProjects}
        planName={currentPlan.name}
      />
    </div>
  );
}
