import { ArrowUpRight, FlaskConical, GitBranch, PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/utils/format";
import type { ProjectCardModel } from "./useDashboardSnapshot";

type Props = {
  model: ProjectCardModel;
  selected: boolean;
  onOpen: () => void;
};

export function DashboardProjectCard({ model, selected, onOpen }: Props) {
  const { project, funnelCount, resumeCount, redMetrics, activeTests, progressPercent, primaryAction, latestFunnelName } =
    model;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "dashboard-project group relative w-full overflow-hidden rounded-2xl border text-left transition-all duration-300",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        selected
          ? "border-primary/50 bg-primary/[0.06] shadow-glow"
          : "border-border/50 bg-card/30 hover:-translate-y-0.5 hover:border-primary/35 hover:bg-card/50 hover:shadow-glow",
      )}
    >
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent opacity-0 transition-opacity",
          selected ? "opacity-100" : "group-hover:opacity-100",
        )}
        aria-hidden
      />

      <div className="flex h-full flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="font-display text-lg font-semibold leading-snug">{project.projectName}</p>
            {latestFunnelName ? (
              <p className="truncate text-xs text-muted-foreground">{latestFunnelName}</p>
            ) : (
              <p className="text-xs text-muted-foreground">Воронок пока нет</p>
            )}
          </div>
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-all",
              selected
                ? "border-primary/30 bg-primary/15 text-primary"
                : "border-border/60 bg-background/40 text-muted-foreground group-hover:border-primary/25 group-hover:text-primary",
            )}
          >
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
            <span>Прогресс мастера</span>
            <span className="tabular-nums">{funnelCount > 0 ? `${progressPercent}%` : "—"}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted/60">
            <div
              className="h-full rounded-full bg-gradient-money transition-all duration-500"
              style={{ width: `${funnelCount > 0 ? Math.max(progressPercent, 4) : 0}%` }}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <span className="chip">
            <GitBranch className="h-3 w-3" />
            {funnelCount} {funnelCount === 1 ? "воронка" : funnelCount < 5 ? "воронки" : "воронок"}
          </span>
          {resumeCount > 0 ? (
            <span className="chip chip-primary">
              <PlayCircle className="h-3 w-3" />
              продолжить
            </span>
          ) : null}
          {activeTests > 0 ? (
            <span className="chip chip-success">
              <FlaskConical className="h-3 w-3" />
              {activeTests} в плане
            </span>
          ) : null}
          {redMetrics > 0 ? (
            <span className="chip chip-danger">{redMetrics} ниже плана</span>
          ) : null}
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/40 pt-3">
          <span className="text-[11px] text-muted-foreground">Обновлён {formatDate(project.updatedAt)}</span>
          <span className="text-[11px] font-medium text-primary/90 opacity-0 transition-opacity group-hover:opacity-100">
            {primaryAction}
          </span>
        </div>
      </div>
    </button>
  );
}
