import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, CreditCard, FlaskConical, FolderPlus, Layers, Target } from "lucide-react";
import { toast } from "sonner";
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
import { PageHeader } from "@/components/layout/PageHeader";
import { useAppData } from "@/context/AppDataContext";
import { formatDate } from "@/utils/format";

export default function DashboardPage() {
  const nav = useNavigate();
  const {
    user,
    projects,
    canAddProject,
    currentPlan,
    testingHypotheses,
    projectFunnels,
    createEmptyProject,
  } = useAppData();

  const [newOpen, setNewOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const handleCreate = () => {
    if (!canAddProject) {
      toast.error("Лимит проектов на тарифе — перейдите на Starter/Pro");
      nav("/billing");
      return;
    }
    const p = createEmptyProject(newName || "Новый проект");
    if (!p) return;
    setNewOpen(false);
    setNewName("");
    nav(`/projects/${p.id}/funnels/new/wizard/focus`);
  };

  return (
    <>
      <PageHeader
        title={`Привет, ${user.name.split(" ")[0]}`}
        subtitle="Управляйте ростом через тестирование гипотез. Каждая гипотеза — под конкретную метрику конкретной воронки."
        action={
          <Button onClick={() => setNewOpen(true)} className="bg-gradient-money text-primary-foreground">
            <FolderPlus className="mr-2 h-4 w-4" />
            Новый проект
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3 mb-8">
        <StatChip label="Тариф" value={currentPlan.name} icon={<CreditCard className="h-4 w-4" />} />
        <StatChip label="Кредиты" value={String(user.credits)} icon={<Layers className="h-4 w-4" />} />
        <StatChip
          label="В тесте"
          value={String(testingHypotheses.length)}
          accent={testingHypotheses.length > 0}
          icon={<FlaskConical className="h-4 w-4" />}
        />
      </div>

      {testingHypotheses.length > 0 ? (
        <section className="mb-8 space-y-3">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-success" />
            Активные тесты
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {testingHypotheses.map((h) => (
              <Link
                key={h.id}
                to={`/projects/${getProjectIdByFunnel(projects, h.funnelId, projectFunnels)}/funnels/${h.funnelId}/wizard/plan`}
              >
                <Card className="surface hover:border-success/40 transition-all hover:shadow-glow group h-full">
                  <CardContent className="p-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-snug">{h.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-1.5">
                        Метрика: <span className="text-foreground/80">{h.metricName}</span>
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Проекты</h2>
        {projects.length === 0 ? (
          <Card className="border-dashed border-border/60 bg-card/40">
            <CardContent className="py-14 text-center space-y-4">
              <div className="mx-auto h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                Создайте проект и пройдите мастер одной воронки: фокус → материалы → аудит →
                метрики → гипотезы → тесты.
              </p>
              <Button onClick={() => setNewOpen(true)} className="bg-gradient-money text-primary-foreground">
                <FolderPlus className="mr-2 h-4 w-4" />
                Создать проект
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => {
              const funnels = projectFunnels(p.id);
              return (
                <Link key={p.id} to={`/projects/${p.id}`} className="group">
                  <Card className="surface h-full transition-all hover:border-primary/40 hover:shadow-glow">
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium leading-snug">{p.projectName}</p>
                        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                      </div>
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="chip">воронок {funnels.length}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Обновлён {formatDate(p.updatedAt)}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Новый проект</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label className="text-xs">Название проекта</Label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Например: Клиника флебологии"
              autoFocus
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
    </>
  );
}

function StatChip({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: string;
  accent?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className={`surface px-4 py-3 flex items-center gap-3 ${
        accent ? "!border-success/30 bg-success/5" : ""
      }`}
    >
      <div
        className={`h-9 w-9 rounded-xl flex items-center justify-center ${
          accent ? "bg-success/15 text-success" : "bg-primary/10 text-primary"
        }`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="font-display text-lg font-bold tabular-nums leading-tight">{value}</p>
      </div>
    </div>
  );
}

/** Найти projectId по funnelId, перебирая projectFunnels. */
function getProjectIdByFunnel(
  projects: ReturnType<typeof useAppData>["projects"],
  funnelId: string,
  projectFunnels: ReturnType<typeof useAppData>["projectFunnels"],
): string {
  for (const p of projects) {
    if (projectFunnels(p.id).some((f) => f.id === funnelId)) return p.id;
  }
  return projects[0]?.id ?? "";
}
