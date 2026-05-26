import { useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { FolderKanban, FlaskConical, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ActiveTestCard } from "@/features/dashboard/ActiveTestCard";
import { DashboardFrame } from "@/features/dashboard/DashboardFrame";
import { DashboardHero } from "@/features/dashboard/DashboardHero";
import { DashboardNextActionCard } from "@/features/dashboard/DashboardNextAction";
import { computeDashboardNextAction } from "@/features/dashboard/nextActionLogic";
import { DashboardProjectCard } from "@/features/dashboard/DashboardProjectCard";
import { DashboardStatusBar } from "@/features/dashboard/DashboardStatusBar";
import { DashboardZone } from "@/features/dashboard/DashboardZone";
import { ProjectFunnelsPanel } from "@/features/dashboard/ProjectFunnelsPanel";
import { useDashboardSnapshot } from "@/features/dashboard/useDashboardSnapshot";
import { useAppData } from "@/context/AppDataContext";
import { useAuth } from "@/hooks/useAuth";
import { BILLING_ENABLED } from "@/lib/productFlags";
import { resolveProjectOpenTarget } from "@/lib/projectNavigation";
import { getStorageScope } from "@/features/quiz/quizDraftStorage";

function contextLine(
  projectCount: number,
  nextAction: ReturnType<typeof computeDashboardNextAction>,
): string {
  if (projectCount === 0) {
    return "Один проект → одна воронка → конкретные тесты. Без хаоса в таблицах.";
  }
  if (nextAction?.tone === "urgent") {
    return "Есть срочное действие — закройте его первым, остальное подождёт.";
  }
  if (nextAction?.tone === "focus") {
    return "Фокус на одном шаге. Сделали — dopamine, поехали дальше.";
  }
  if (nextAction?.tone === "win") {
    return "Система работает. Масштабируйте победители или ставьте новый эксперимент.";
  }
  return "Ваши воронки, метрики и тесты — в одном месте. Начните с блока «Следующий шаг».";
}

export default function DashboardPage() {
  const nav = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const funnelsPanelRef = useRef<HTMLDivElement>(null);
  const { user: authUser } = useAuth();
  const scope = getStorageScope(authUser?.id);
  const {
    user,
    projects,
    canAddProject,
    getProject,
    projectFunnels,
    funnelHypotheses,
    funnelMetricsList,
    experimentByHypothesis,
    createEmptyProject,
  } = useAppData();

  const [newOpen, setNewOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const selectedProjectId = searchParams.get("project");
  const selectedProject = selectedProjectId ? getProject(selectedProjectId) : null;

  const snapshot = useDashboardSnapshot(projects, projectFunnels, funnelHypotheses, funnelMetricsList);

  const nextAction = useMemo(
    () => computeDashboardNextAction(snapshot, experimentByHypothesis),
    [snapshot, experimentByHypothesis],
  );

  const heroContext = contextLine(snapshot.totals.projects, nextAction);
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

    if (target.kind === "navigate") {
      nav(target.path);
      return;
    }

    setSearchParams({ project: projectId });
    requestAnimationFrame(() => {
      funnelsPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const closeProjectPanel = () => {
    setSearchParams({});
  };

  return (
    <div className="dashboard-cockpit relative mx-auto max-w-4xl space-y-6 pb-8 sm:space-y-8">
      <DashboardHero
        name={user.name}
        projectCount={snapshot.totals.projects}
        contextLine={heroContext}
        onNewProject={() => setNewOpen(true)}
      />

      {nextAction ? (
        <DashboardZone
          step="01"
          title="Следующий шаг"
          subtitle="Одно действие, которое двигает рост прямо сейчас"
        >
          <DashboardNextActionCard action={nextAction} onCreateProject={() => setNewOpen(true)} />
        </DashboardZone>
      ) : null}

      {hasProjects ? (
        <DashboardZone step="02" title="Пульс" subtitle="Сводка по всем проектам">
          <DashboardStatusBar
            projects={snapshot.totals.projects}
            funnels={snapshot.totals.funnels}
            activeTests={snapshot.activeTests.length}
            redMetrics={snapshot.totals.redMetrics}
            inWork={snapshot.inWork}
          />
        </DashboardZone>
      ) : null}

      <div className={hasProjects && visibleTests.length > 0 ? "grid gap-6 lg:grid-cols-2 lg:gap-8" : "space-y-6"}>
        {visibleTests.length > 0 ? (
          <DashboardZone
            step="03"
            title="Очередь тестов"
            subtitle="Backlog и активные эксперименты"
            icon={FlaskConical}
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
        ) : null}

        <DashboardZone
          step={visibleTests.length > 0 ? "04" : "03"}
          title="Проекты"
          subtitle="Выберите — откроем воронку или список"
          icon={FolderKanban}
          className={visibleTests.length === 0 ? undefined : "lg:col-span-1"}
        >
          {projects.length === 0 ? (
            <DashboardFrame variant="primary" glow innerClassName="px-6 py-14 text-center sm:px-10">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-money text-primary-foreground shadow-glow">
                <Sparkles className="h-7 w-7" />
              </div>
              <p className="font-display text-xl font-bold text-foreground">Первый проект — первый рост</p>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                Мастер проведёт от фокуса продукта до плана A/B-тестов. Без лишних экранов.
              </p>
              <Button
                onClick={() => setNewOpen(true)}
                size="lg"
                className="dashboard-cta-shimmer mt-8 bg-gradient-money text-primary-foreground shadow-glow"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Создать проект
              </Button>
            </DashboardFrame>
          ) : (
            <div className="space-y-2">
              {snapshot.projectCards.map((model) => (
                <DashboardProjectCard
                  key={model.project.id}
                  model={model}
                  selected={selectedProjectId === model.project.id}
                  onOpen={() => openProject(model.project.id)}
                />
              ))}
            </div>
          )}
        </DashboardZone>
      </div>

      {selectedProject ? (
        <DashboardZone
          step="05"
          title={selectedProject.projectName}
          subtitle="Воронки и подключения"
          className="animate-in fade-in slide-in-from-bottom-2 duration-300"
        >
          <div ref={funnelsPanelRef}>
            <ProjectFunnelsPanel project={selectedProject} onClose={closeProjectPanel} />
          </div>
        </DashboardZone>
      ) : selectedProjectId ? (
        <DashboardFrame variant="danger" innerClassName="p-4 text-sm">
          <span className="text-danger">Проект не найден.</span>{" "}
          <Link to="/dashboard" className="font-medium text-foreground underline underline-offset-2">
            Обновить список
          </Link>
        </DashboardFrame>
      ) : null}

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-sm border-border bg-card">
          <DialogHeader>
            <DialogTitle className="font-display">Новый проект</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Название</Label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Например: Продажа шарфиков"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleCreate} className="bg-gradient-money text-primary-foreground">
              Создать и перейти к воронке
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
