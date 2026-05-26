import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  subtitle?: string;
  backTo?: string;
  backLabel?: string;
  action?: React.ReactNode;
  className?: string;
  /** Компактный заголовок — мастер воронки и второстепенные экраны */
  compact?: boolean;
};

export function PageHeader({
  title,
  subtitle,
  backTo,
  backLabel = "Назад",
  action,
  className,
  compact,
}: Props) {
  return (
    <div className={cn(compact ? "mb-4 space-y-2" : "mb-6 space-y-3", className)}>
      {backTo ? (
        <Link
          to={backTo}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1
            className={cn(
              "font-display font-bold tracking-tight truncate",
              compact ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl",
            )}
          >
            {title}
          </h1>
          {subtitle ? (
            <p className={cn("text-muted-foreground max-w-2xl", compact ? "mt-0.5 text-xs" : "mt-1 text-sm")}>
              {subtitle}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}
