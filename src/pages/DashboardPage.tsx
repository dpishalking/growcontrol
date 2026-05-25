import { useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { FolderPlus, FlaskConical, Sparkles, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { DashboardHero } from "@/features/dashboard/DashboardHero";
import { DashboardMetrics } from "@/features/dashboard/DashboardMetrics";
import { DashboardProjectCard } from "@/features/dashboard/DashboardProjectCard";
import { ProjectFunnelsPanel } from "@/features/dashboard/ProjectFunnelsPanel";
import { useDashboardSnapshot } from "@/features/dashboard/useDashboardSnapshot";
import { useAppData } from "@/context/AppDataContext";
import { useAuth } from "@/hooks/useAuth";
import { BILLING_ENABLED } from "@/lib/productFlags";
import { resolveProjectOpenTarget } from "@/lib/projectNavigation";
import { getStorageScope } from "@/features/quiz/quizDraftStorage";

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
    <div className="dashboard-page pb-4">
      <DashboardHero
        name={user.name}
        projectCount={snapshot.totals.projects}
        activeTests={snapshot.activeTests.length}
        redMetrics={snapshot.totals.redMetrics}
        onNewProject={() => setNewOpen(true)}
      />

      <DashboardMetrics
        projects={snapshot.totals.projects}
        funnels={snapshot.totals.funnels}
        activeTests={snapshot.activeTests.length}
        redMetrics={snapshot.totals.redMetrics}
        inWork={snapshot.inWork}
        inQueue={snapshot.inQueue}
      />

      {snapshot.activeTests.length > 0 ? (
        <section className="mb-10 space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
                <FlaskConical className="h-5 w-5 text-success" />
                Сейчас в фокусе
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Тесты, которые уже в работе или ждут старта
              </p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {snapshot.activeTests.map(({ hypothesis: h, projectId }) => (
              <ActiveTestCard
                key={h.id}
                hypothesis={h}
                experiment={experimentByHypothesis(h.id)}
                href={`/projects/${projectId}/funnels/${h.funnelId}/wizard/plan`}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold">Ваши проекты</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Нажмите на карточку — откроем воронку или покажем список
            </p>
          </div>
          {projects.length > 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setNewOpen(true)}
              className="border-border/60 bg-background/40"
            >
              <FolderPlus className="mr-1.5 h-4 w-4" />
              Добавить
            </Button>
          ) : null}
        </div>

        {projects.length === 0 ? (
          <Card className="dashboard-empty overflow-hidden border-dashed border-primary/20 bg-card/20">
            <CardContent className="relative space-y-5 py-16 text-center">
              <div className="dashboard-empty-glow pointer-events-none" aria-hidden />
              <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
                <Target className="h-7 w-7 text-primary" />
              </div>
              <div className="relative mx-auto max-w-md space-y-2">
                <p className="font-display text-lg font-semibold">Первый проект — первый рост</p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Один продукт, одна воронка, конкретные метрики. Мастер проведёт от фокуса до плана
                  тестов — без лишних экранов.
                </p>
              </div>
              <Button
                onClick={() => setNewOpen(true)}
                className="relative bg-gradient-money text-primary-foreground shadow-glow"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Начать
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
      </section>

      {selectedProject ? (
        <div ref={funnelsPanelRef} className="mt-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <ProjectFunnelsPanel project={selectedProject} onClose={closeProjectPanel} />
        </div>
      ) : selectedProjectId ? (
        <Card className="mt-8 border-warning-soft bg-warning-soft">
          <CardContent className="space-y-3 p-5">
            <p className="text-sm text-warning">Проект не найден.</p>
            <Button asChild variant="outline" size="sm">
              <Link to="/dashboard">Обновить список</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-sm border-border/60 bg-card">
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
