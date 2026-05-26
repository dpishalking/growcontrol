import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
  /** Крупная шапка секции — для блоков вроде «Сводка» и «Очередь тестов». */
  prominent?: boolean;
};

export function DashboardZone({
  title,
  subtitle,
  icon: Icon,
  children,
  className,
  prominent = false,
}: Props) {
  return (
    <section className={cn(prominent ? "space-y-4" : "space-y-3", className)}>
      <header
        className={cn(
          prominent &&
            "rounded-2xl border border-border/60 bg-muted/10 px-4 py-4 sm:px-5",
        )}
      >
        <div className="flex items-start gap-3">
          {Icon ? (
            <span
              className={cn(
                "flex shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary",
                prominent ? "h-10 w-10" : "h-8 w-8",
              )}
            >
              <Icon className={cn(prominent ? "h-5 w-5" : "h-4 w-4")} strokeWidth={2} />
            </span>
          ) : null}
          <div className="min-w-0 pt-0.5">
            <h2
              className={cn(
                "font-display font-bold tracking-tight text-foreground",
                prominent ? "text-xl sm:text-2xl" : "text-base font-semibold",
              )}
            >
              {title}
            </h2>
            {subtitle ? (
              <p
                className={cn(
                  "text-muted-foreground leading-snug",
                  prominent ? "mt-1 text-sm" : "mt-0.5 text-sm",
                )}
              >
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>
      </header>
      {children}
    </section>
  );
}
