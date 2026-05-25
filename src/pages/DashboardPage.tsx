import { useMemo, useState } from "react";
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
import { ActiveTestCard } from "@/features/dashboard/ActiveTestCard";
import { useAppData } from "@/context/AppDataContext";
import { formatDate } from "@/utils/format";
import type { Hypothesis } from "@/types/hypothesis";

type ActiveItem = { hypothesis: Hypothesis; projectId: string };

export default function DashboardPage() {
  const nav = useNavigate();
  const {
    user,
    projects,
    canAddProject,
    currentPlan,
    projectFunnels,
    funnelHypotheses,
    experimentByHypothesis,
    createEmptyProject,
  } = useAppData();

  const [newOpen, setNewOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const activeTests = useMemo(() => {
    const items: ActiveItem[] = [];
    for (const p of projects) {
      for (const f of projectFunnels(p.id)) {
        for (const h of funnelHypotheses(f.id)) {
          if (h.status === "backlog" || h.status === "testing") {
            items.push({ hypothesis: h, projectId: p.id });
          }
        }
      }
    }
    return items.sort((a, b) => {
      const order = (s: Hypothesis["status"]) => (s === "testing" ? 0 : 1);
      const d = order(a.hypothesis.status) - order(b.hypothesis.status);
      if (d !== 0) return d;
      return b.hypothesis.priorityScore - a.hypothesis.priorityScore;
    });
  }, [projects, projectFunnels, funnelHypotheses]);

  const inWork = activeTests.filter((x) => x.hypothesis.status === "testing").length;
  const inQueue = activeTests.filter((x) => x.hypothesis.status === "backlog").length;

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
          label="В плане"
          value={String(activeTests.length)}
          accent={activeTests.length > 0}
          icon={<FlaskConical className="h-4 w-4" />}
          hint={activeTests.length > 0 ? `${inWork} в работе · ${inQueue} в очереди` : undefined}
        />
      </div>

      {activeTests.length > 0 ? (
        <section className="mb-8 space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="font-display text-lg font-semibold flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-success" />
              Активные тесты
            </h2>
            {inWork > 0 || inQueue > 0 ? (
              <p className="text-xs text-muted-foreground">
                {inWork > 0 ? `${inWork} в работе` : null}
                {inWork > 0 && inQueue > 0 ? " · " : null}
                {inQueue > 0 ? `${inQueue} в очереди` : null}
              </p>
            ) : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activeTests.map(({ hypothesis: h, projectId }) => (
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
                <Card
                  key={p.id}
                  role="button"
                  tabIndex={0}
                  className="surface h-full transition-all hover:border-primary/40 hover:shadow-glow cursor-pointer"
                  onClick={() => nav(`/projects/${p.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      nav(`/projects/${p.id}`);
                    }
                  }}
                >
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium leading-snug">{p.projectName}</p>
                      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="chip">воронок {funnels.length}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Обновлён {formatDate(p.updatedAt)}
                    </p>
                  </CardContent>
                </Card>
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
  hint,
}: {
  label: string;
  value: string;
  accent?: boolean;
  icon?: React.ReactNode;
  hint?: string;
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
        {hint ? <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p> : null}
      </div>
    </div>
  );
}
