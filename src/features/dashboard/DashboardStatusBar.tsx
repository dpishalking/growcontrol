import type { LucideIcon } from "lucide-react";
import { ChevronRight, FlaskConical, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardFrame } from "./DashboardFrame";

type Props = {
  activeTests: number;
  redMetrics: number;
  inWork: number;
  onActiveTestsClick?: () => void;
  onRedMetricsClick?: () => void;
};

type StatDef = {
  icon: LucideIcon;
  label: string;
  value: number;
  hint: string;
  cellClass?: string;
  valueClass?: string;
  onClick?: () => void;
  actionLabel?: string;
};

export function DashboardStatusBar({
  activeTests,
  redMetrics,
  inWork,
  onActiveTestsClick,
  onRedMetricsClick,
}: Props) {
  const stats: StatDef[] = [
    {
      icon: FlaskConical,
      label: "В тесте",
      value: activeTests,
      hint: inWork > 0 ? `${inWork} уже в работе` : "активные эксперименты",
      cellClass: activeTests > 0 ? "dashboard-stat-cell--active" : undefined,
      valueClass: activeTests > 0 ? "text-success" : undefined,
      onClick: activeTests > 0 ? onActiveTestsClick : undefined,
      actionLabel: "К очереди",
    },
    {
      icon: Target,
      label: "Красных метрик",
      value: redMetrics,
      hint: redMetrics > 0 ? "точки роста" : "всё в норме",
      cellClass: redMetrics > 0 ? "dashboard-stat-cell--alert" : undefined,
      valueClass: redMetrics > 0 ? "text-danger" : undefined,
      onClick: redMetrics > 0 ? onRedMetricsClick : undefined,
      actionLabel: "К гипотезам",
    },
  ];

  return (
    <DashboardFrame variant="default" innerClassName="p-3 sm:p-4">
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {stats.map(({ icon: Icon, label, value, hint, cellClass, valueClass, onClick, actionLabel }) => {
          const interactive = Boolean(onClick);
          const Tag = interactive ? "button" : "div";

          return (
            <Tag
              key={label}
              type={interactive ? "button" : undefined}
              onClick={onClick}
              disabled={interactive ? false : undefined}
              className={cn(
                "dashboard-stat-cell rounded-xl px-3 py-3 text-left sm:px-4 sm:py-3.5",
                cellClass,
                interactive &&
                  "group cursor-pointer transition-[transform,box-shadow,border-color] duration-200 motion-safe:hover:scale-[1.02] motion-safe:active:scale-[0.99] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
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
              {interactive && actionLabel ? (
                <p className="mt-2 flex items-center gap-0.5 text-[11px] font-medium text-primary opacity-80 transition-opacity group-hover:opacity-100">
                  {actionLabel}
                  <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </p>
              ) : null}
            </Tag>
          );
        })}
      </div>
    </DashboardFrame>
  );
}
