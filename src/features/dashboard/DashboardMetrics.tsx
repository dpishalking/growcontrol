import type { LucideIcon } from "lucide-react";
import { FlaskConical, GitBranch, Layers, Target } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  projects: number;
  funnels: number;
  activeTests: number;
  redMetrics: number;
  inWork: number;
  inQueue: number;
};

export function DashboardMetrics({
  projects,
  funnels,
  activeTests,
  redMetrics,
  inWork,
  inQueue,
}: Props) {
  return (
    <div className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <MetricTile
        icon={Layers}
        label="Проекты"
        value={projects}
        hint={projects === 0 ? "Начните с одного" : "рабочие пространства"}
      />
      <MetricTile
        icon={GitBranch}
        label="Воронки"
        value={funnels}
        hint={funnels === 0 ? "Внутри проектов" : "под управлением"}
      />
      <MetricTile
        icon={FlaskConical}
        label="В плане"
        value={activeTests}
        accent={activeTests > 0}
        hint={activeTests > 0 ? `${inWork} в работе · ${inQueue} в очереди` : "тесты и очередь"}
      />
      <MetricTile
        icon={Target}
        label="Ниже плана"
        value={redMetrics}
        alert={redMetrics > 0}
        hint={redMetrics > 0 ? "точки для гипотез" : "метрики в норме"}
      />
    </div>
  );
}

function MetricTile({
  icon: Icon,
  label,
  value,
  hint,
  accent,
  alert,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  hint: string;
  accent?: boolean;
  alert?: boolean;
}) {
  return (
    <div
      className={cn(
        "dashboard-metric group relative overflow-hidden rounded-2xl border p-4 transition-colors",
        accent && "border-success/30 bg-success/5",
        alert && "border-danger/30 bg-danger/5",
        !accent && !alert && "border-border/50 bg-card/35",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
            accent && "bg-success/15 text-success",
            alert && "bg-danger/15 text-danger",
            !accent && !alert && "bg-primary/10 text-primary group-hover:bg-primary/15",
          )}
        >
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </div>
        <span className="font-display text-3xl font-bold tabular-nums leading-none">{value}</span>
      </div>
      <p className="mt-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-[11px] text-muted-foreground/90">{hint}</p>
    </div>
  );
}
