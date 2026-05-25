import { Link } from "react-router-dom";
import { ArrowRight, Calendar, Target, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Experiment } from "@/types/experiment";
import type { Hypothesis } from "@/types/hypothesis";

type PlanStatus = {
  label: string;
  chipClass: string;
  borderClass: string;
};

function formatShort(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

export function getPlanStatus(h: Hypothesis, exp: Experiment | null): PlanStatus {
  if (h.status === "backlog") {
    return {
      label: "В очереди",
      chipClass: "bg-muted/60 text-muted-foreground border-border/60",
      borderClass: "border-l-muted-foreground/40",
    };
  }

  if (h.status === "testing") {
    if (!exp?.endDate) {
      return {
        label: "В работе",
        chipClass: "bg-primary/15 text-primary border-primary/30",
        borderClass: "border-l-primary",
      };
    }

    const end = new Date(exp.endDate);
    end.setHours(23, 59, 59, 999);
    const now = new Date();
    const diffMs = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / 86_400_000);

    if (diffDays < 0) {
      return {
        label: "Нужен результат",
        chipClass: "bg-destructive/15 text-destructive border-destructive/30",
        borderClass: "border-l-destructive",
      };
    }
    if (diffDays === 0) {
      return {
        label: "Срок сегодня",
        chipClass: "bg-warning/15 text-warning border-warning/30",
        borderClass: "border-l-warning",
      };
    }
    if (diffDays <= 3) {
      return {
        label: `Осталось ${diffDays} дн`,
        chipClass: "bg-warning/15 text-warning border-warning/30",
        borderClass: "border-l-warning",
      };
    }

    return {
      label: `До ${formatShort(exp.endDate)}`,
      chipClass: "bg-primary/15 text-primary border-primary/30",
      borderClass: "border-l-primary",
    };
  }

  return {
    label: "—",
    chipClass: "bg-muted/60 text-muted-foreground border-border/60",
    borderClass: "border-l-border",
  };
}

function shortTitle(h: Hypothesis): string {
  const t = h.title.trim();
  if (t.length <= 90) return t;
  const cut = t.slice(0, 87).trimEnd();
  return `${cut}…`;
}

export function ActiveTestCard({
  hypothesis: h,
  experiment,
  href,
}: {
  hypothesis: Hypothesis;
  experiment: Experiment | null;
  href: string;
}) {
  const status = getPlanStatus(h, experiment);

  return (
    <Link to={href} className="group block h-full">
      <Card
        className={cn(
          "h-full border-border/60 bg-card/30 transition-all",
          "hover:border-primary/35 hover:shadow-glow hover:bg-card/50",
          "border-l-[3px]",
          status.borderClass,
        )}
      >
        <CardContent className="p-4 flex flex-col gap-3 h-full">
          <div className="flex items-start justify-between gap-2">
            <Badge
              variant="outline"
              className={cn("text-[10px] font-medium shrink-0", status.chipClass)}
            >
              {status.label}
            </Badge>
            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
          </div>

          <p className="text-sm font-medium leading-snug line-clamp-2 flex-1 min-h-[2.5rem]">
            {shortTitle(h)}
          </p>

          <div className="space-y-1.5 pt-1 border-t border-border/40">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Target className="h-3 w-3 shrink-0" />
              <span className="line-clamp-1">{h.metricName}</span>
            </div>
            {experiment?.owner ? (
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <User className="h-3 w-3 shrink-0" />
                <span className="line-clamp-1">{experiment.owner}</span>
              </div>
            ) : h.status === "backlog" ? (
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
                <User className="h-3 w-3 shrink-0" />
                <span>Назначьте ответственного</span>
              </div>
            ) : null}
            {experiment?.endDate && h.status === "testing" ? (
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Calendar className="h-3 w-3 shrink-0" />
                <span>до {formatShort(experiment.endDate)}</span>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
