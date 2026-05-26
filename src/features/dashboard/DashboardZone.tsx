import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  step: string;
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
};

export function DashboardZone({ step, title, subtitle, icon: Icon, children, className }: Props) {
  return (
    <section className={cn("space-y-3", className)}>
      <header className="flex items-start gap-3">
        <div className="dashboard-zone-badge shrink-0">
          <span>{step}</span>
        </div>
        <div className="min-w-0 pt-0.5">
          <div className="flex items-center gap-2">
            {Icon ? <Icon className="h-4 w-4 shrink-0 text-primary" strokeWidth={2} /> : null}
            <h2 className="font-display text-base font-semibold tracking-tight text-foreground">
              {title}
            </h2>
          </div>
          {subtitle ? (
            <p className="mt-0.5 text-sm leading-snug text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
      </header>
      {children}
    </section>
  );
}
