import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type DashboardFrameVariant = "default" | "primary" | "success" | "danger" | "accent";

const gradient: Record<DashboardFrameVariant, string> = {
  default:
    "bg-gradient-to-br from-primary/55 via-accent/35 to-primary/15",
  primary:
    "bg-gradient-to-br from-primary via-accent/50 to-primary/40",
  success:
    "bg-gradient-to-br from-success/70 via-primary/45 to-success/35",
  danger:
    "bg-gradient-to-br from-danger/80 via-warning/45 to-danger/40",
  accent:
    "bg-gradient-to-br from-accent/70 via-primary/50 to-accent/30",
};

type Props = {
  variant?: DashboardFrameVariant;
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  glow?: boolean;
};

export function DashboardFrame({
  variant = "default",
  children,
  className,
  innerClassName,
  glow = false,
}: Props) {
  return (
    <div className={cn("relative", glow && "dashboard-frame-glow", className)}>
      <div className={cn("rounded-2xl p-px shadow-[var(--shadow-card)]", gradient[variant])}>
        <div
          className={cn(
            "rounded-[calc(1rem-1px)] bg-card text-card-foreground",
            innerClassName,
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
