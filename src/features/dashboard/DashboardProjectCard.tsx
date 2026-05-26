import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProjectCardModel } from "./useDashboardSnapshot";
import { DashboardFrame } from "./DashboardFrame";

type Props = {
  model: ProjectCardModel;
  selected: boolean;
  onOpen: () => void;
};

function statusLine(model: ProjectCardModel): {
  text: string;
  tone?: "danger" | "success" | "primary";
} {
  if (model.resumeCount > 0) {
    return { text: `Продолжить мастер · ${model.progressPercent}%`, tone: "primary" };
  }
  if (model.activeTests > 0) {
    return { text: `${model.activeTests} тестов в плане`, tone: "success" };
  }
  if (model.redMetrics > 0) {
    return { text: `${model.redMetrics} метрик ниже плана`, tone: "danger" };
  }
  if (model.funnelCount === 0) {
    return { text: "Создайте первую воронку" };
  }
  return { text: model.latestFunnelName ?? `${model.funnelCount} воронок` };
}

export function DashboardProjectCard({ model, selected, onOpen }: Props) {
  const { funnelCount, progressPercent, displayName } = model;
  const status = statusLine(model);
  const gradId = `progress-${model.project.id}`;

  return (
    <DashboardFrame
      variant={selected ? "primary" : "default"}
      className="transition-transform duration-200 hover:scale-[1.01]"
    >
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          "group flex w-full items-center gap-4 px-4 py-4 text-left",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-card",
        )}
      >
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center">
          <svg className="h-12 w-12 -rotate-90" viewBox="0 0 40 40" aria-hidden>
            <circle
              cx="20"
              cy="20"
              r="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="text-muted"
            />
            <circle
              cx="20"
              cy="20"
              r="16"
              fill="none"
              stroke={`url(#${gradId})`}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={`${funnelCount > 0 ? Math.max(progressPercent, 3) : 0} 100`}
              pathLength={100}
              className="transition-all duration-700 ease-out"
            />
            <defs>
              <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--primary))" />
                <stop offset="100%" stopColor="hsl(var(--accent))" />
              </linearGradient>
            </defs>
          </svg>
          <span className="absolute text-[11px] font-bold tabular-nums text-foreground">
            {funnelCount > 0 ? `${progressPercent}` : "—"}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base font-semibold text-foreground">
            {displayName}
          </p>
          <p
            className={cn(
              "mt-1 truncate text-sm",
              status.tone === "danger" && "font-medium text-danger",
              status.tone === "success" && "font-medium text-success",
              status.tone === "primary" && "font-medium text-primary",
              !status.tone && "text-muted-foreground",
            )}
          >
            {status.text}
          </p>
        </div>

        <ChevronRight
          className={cn(
            "h-5 w-5 shrink-0 transition-transform",
            selected ? "translate-x-0.5 text-primary" : "text-muted-foreground group-hover:translate-x-0.5",
          )}
        />
      </button>
    </DashboardFrame>
  );
}
