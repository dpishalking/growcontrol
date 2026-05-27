import { Link } from "react-router-dom";
import { ChevronRight, FolderOpen, FolderRoot } from "lucide-react";
import type { EntityPathSegment } from "@/lib/funnelEntityPath";
import { cn } from "@/lib/utils";

type Props = {
  segments: EntityPathSegment[];
  compact?: boolean;
  className?: string;
};

export function EntityPathTitle({ segments, compact, className }: Props) {
  if (segments.length === 0) return null;

  return (
    <nav
      aria-label="Путь проекта"
      className={cn("flex min-w-0 flex-wrap items-center gap-x-1 gap-y-1.5", className)}
    >
      {segments.map((segment, index) => {
        const isLast = index === segments.length - 1;
        const Icon = segment.kind === "root" ? FolderRoot : FolderOpen;

        return (
          <span key={`${segment.kind}-${segment.label}-${index}`} className="inline-flex min-w-0 items-center gap-x-1">
            {index > 0 ? (
              <ChevronRight
                className="mx-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/45"
                aria-hidden
              />
            ) : null}

            <span
              className={cn(
                "inline-flex min-w-0 items-center gap-1.5 rounded-lg border px-2 py-1",
                segment.kind === "root"
                  ? "border-border/50 bg-muted/20"
                  : "border-primary/25 bg-primary/8",
                isLast && "shadow-sm",
              )}
            >
              <Icon
                className={cn(
                  "shrink-0",
                  compact ? "h-3.5 w-3.5" : "h-4 w-4",
                  segment.kind === "root" ? "text-muted-foreground" : "text-primary",
                )}
                strokeWidth={2}
                aria-hidden
              />

              {segment.href && !isLast ? (
                <Link
                  to={segment.href}
                  className={cn(
                    "truncate font-medium text-muted-foreground transition-colors hover:text-foreground",
                    compact ? "max-w-[9rem] text-sm sm:max-w-[12rem]" : "max-w-[10rem] text-sm sm:max-w-[14rem]",
                  )}
                  title={segment.label}
                >
                  {segment.label}
                </Link>
              ) : (
                <span
                  className={cn(
                    "truncate font-display font-bold tracking-tight text-foreground",
                    compact
                      ? "max-w-[10rem] text-base sm:max-w-[16rem] sm:text-lg"
                      : "max-w-[12rem] text-lg sm:max-w-[20rem] sm:text-2xl",
                  )}
                  title={segment.label}
                >
                  {segment.label}
                </span>
              )}
            </span>
          </span>
        );
      })}
    </nav>
  );
}
