import type { LucideIcon } from "lucide-react";
import { GitBranch, FlaskConical, Layers, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardFrame } from "./DashboardFrame";

type Props = {
  projects: number;
  funnels: number;
  activeTests: number;
  redMetrics: number;
  inWork: number;
};

type StatDef = {
  icon: LucideIcon;
  label: string;
  value: number;
  hint: string;
  cellClass?: string;
  valueClass?: string;
};

export function DashboardStatusBar({ projects, funnels, activeTests, redMetrics, inWork }: Props) {
  const stats: StatDef[] = [
    {
      icon: Layers,
      label: "Проекты",
      value: projects,
      hint: projects === 1 ? "рабочее пространство" : "рабочих пространства",
    },
    {
      icon: GitBranch,
      label: "Воронки",
      value: funnels,
      hint: "под управлением",
    },
    {
      icon: FlaskConical,
      label: "В плане",
      value: activeTests,
      hint: inWork > 0 ? `${inWork} уже в работе` : "гипотезы и тесты",
      cellClass: activeTests > 0 ? "dashboard-stat-cell--active" : undefined,
      valueClass: activeTests > 0 ? "text-success" : undefined,
    },
    {
      icon: Target,
      label: "Ниже плана",
      value: redMetrics,
      hint: redMetrics > 0 ? "точки роста" : "метрики в норме",
      cellClass: redMetrics > 0 ? "dashboard-stat-cell--alert" : undefined,
      valueClass: redMetrics > 0 ? "text-danger" : undefined,
    },
  ];

  return (
    <DashboardFrame variant="default" innerClassName="p-3 sm:p-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        {stats.map(({ icon: Icon, label, value, hint, cellClass, valueClass }) => (
          <div
            key={label}
            className={cn(
              "dashboard-stat-cell rounded-xl px-3 py-3 sm:px-4 sm:py-3.5",
              cellClass,
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <Icon className="h-4 w-4 shrink-0 text-primary/80" strokeWidth={2} />
              <span
                className={cn(
                  "font-display text-2xl font-bold tabular-nums leading-none text-foreground sm:text-3xl",
                  valueClass,
                )}
              >
                {value}
              </span>
            </div>
            <p className="mt-2 text-xs font-semibold text-foreground">{label}</p>
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{hint}</p>
          </div>
        ))}
      </div>
    </DashboardFrame>
  );
}
