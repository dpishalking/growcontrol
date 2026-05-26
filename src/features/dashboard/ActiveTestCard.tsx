import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Experiment } from "@/types/experiment";
import type { Hypothesis } from "@/types/hypothesis";

type PlanStatus = {
  label: string;
  tone: "muted" | "primary" | "warning" | "danger";
};

function formatShort(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

export function getPlanStatus(h: Hypothesis, exp: Experiment | null): PlanStatus & { label: string } {
  if (h.status === "backlog") {
    return { label: "Очередь", tone: "muted" };
  }

  if (h.status === "testing") {
    if (!exp?.endDate) {
      return { label: "В работе", tone: "primary" };
    }

    const end = new Date(exp.endDate);
    end.setHours(23, 59, 59, 999);
    const diffDays = Math.ceil((end.getTime() - Date.now()) / 86_400_000);

    if (diffDays < 0) return { label: "Итог!", tone: "danger" };
    if (diffDays === 0) return { label: "Сегодня", tone: "warning" };
    if (diffDays <= 3) return { label: `${diffDays} дн`, tone: "warning" };
    return { label: formatShort(exp.endDate), tone: "primary" };
  }

  return { label: "—", tone: "muted" };
}

const stripeClass = {
  muted: "from-muted-foreground/50 to-muted-foreground/20",
  primary: "from-primary to-accent/60",
  warning: "from-warning to-primary/60",
  danger: "from-danger to-warning/70",
} as const;

const badgeClass = {
  muted: "bg-muted text-muted-foreground",
  primary: "bg-primary/15 text-primary",
  warning: "bg-warning/15 text-warning",
  danger: "bg-danger/15 text-danger",
} as const;

export function ActiveTestCard({
  hypothesis: h,
  experiment,
  href,
  projectName,
}: {
  hypothesis: Hypothesis;
  experiment: Experiment | null;
  href: string;
  projectName?: string;
}) {
  const status = getPlanStatus(h, experiment);
  const title = h.title.length > 72 ? `${h.title.slice(0, 69)}…` : h.title;

  return (
    <Link
      to={href}
      className="group flex overflow-hidden rounded-xl border border-border/70 bg-muted/20 transition-all hover:border-primary/35 hover:bg-muted/35 hover:shadow-[0_8px_24px_-12px_hsl(var(--primary)/0.25)]"
    >
      <div
        className={cn("w-1 shrink-0 bg-gradient-to-b", stripeClass[status.tone])}
        aria-hidden
      />
      <div className="flex min-w-0 flex-1 items-center gap-3 px-3 py-3 sm:px-4">
        <span
          className={cn(
            "shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
            badgeClass[status.tone],
          )}
        >
          {status.label}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{title}</p>
          <p className="truncate text-xs text-muted-foreground">
            {projectName ? `${projectName} · ` : ""}
            {h.metricName}
          </p>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>
    </Link>
  );
}
