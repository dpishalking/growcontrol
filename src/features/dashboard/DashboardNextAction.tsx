import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DashboardNextAction } from "./nextActionLogic";
import { DashboardFrame, type DashboardFrameVariant } from "./DashboardFrame";

type Props = {
  action: DashboardNextAction;
  onCreateProject?: () => void;
};

const toneMap: Record<
  DashboardNextAction["tone"],
  { frame: DashboardFrameVariant; label: string; icon: typeof Zap }
> = {
  urgent: { frame: "danger", label: "Срочно", icon: Zap },
  focus: { frame: "primary", label: "Сейчас", icon: Zap },
  win: { frame: "success", label: "Отлично", icon: Sparkles },
  start: { frame: "primary", label: "Старт", icon: Sparkles },
};

export function DashboardNextActionCard({ action, onCreateProject }: Props) {
  const tone = toneMap[action.tone];
  const ToneIcon = tone.icon;
  const isCreate = action.href === "#create-project";

  return (
    <DashboardFrame variant={tone.frame} glow innerClassName="p-5 sm:p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-muted/50 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-foreground">
              <ToneIcon className="h-3 w-3 text-primary" />
              {tone.label}
            </span>
            <span className="text-xs font-medium text-muted-foreground">{action.eyebrow}</span>
          </div>

          <div className="space-y-2">
            <h2 className="font-display text-2xl font-bold leading-tight text-foreground sm:text-[1.65rem]">
              {action.title}
            </h2>
            <p className="max-w-xl text-sm leading-relaxed text-foreground/75">{action.description}</p>
          </div>

          {action.progress != null && action.progress > 0 && action.progress < 100 ? (
            <div className="max-w-sm space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-muted-foreground">Прогресс мастера</span>
                <span className="tabular-nums text-primary">{action.progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-money transition-all duration-700 ease-out"
                  style={{ width: `${Math.max(action.progress, 5)}%` }}
                />
              </div>
            </div>
          ) : null}
        </div>

        {isCreate ? (
          <Button
            size="lg"
            onClick={onCreateProject}
            className={cn(
              "dashboard-cta-shimmer h-12 shrink-0 px-8 text-base font-semibold",
              "bg-gradient-money text-primary-foreground shadow-glow",
              "transition-transform hover:scale-[1.03] active:scale-[0.98]",
            )}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {action.cta}
          </Button>
        ) : (
          <Button
            asChild
            size="lg"
            className={cn(
              "dashboard-cta-shimmer h-12 shrink-0 px-8 text-base font-semibold",
              "bg-gradient-money text-primary-foreground shadow-glow",
              "transition-transform hover:scale-[1.03] active:scale-[0.98]",
            )}
          >
            <Link to={action.href}>
              {action.cta}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>
    </DashboardFrame>
  );
}
