import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
  tone?: "default" | "primary" | "success" | "warning" | "danger";
  className?: string;
};

const TONES: Record<NonNullable<Props["tone"]>, string> = {
  default: "",
  primary: "border-primary/20 bg-primary/5",
  success: "border-success-soft bg-success-soft",
  warning: "border-warning-soft bg-warning-soft",
  danger: "border-danger-soft bg-danger-soft",
};

export function MetricCard({ title, value, hint, icon, tone = "default", className }: Props) {
  return (
    <Card className={cn("shadow-sm transition-colors", TONES[tone], className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
        <CardTitle className="text-xs font-medium text-muted-foreground">{title}</CardTitle>
        {icon ? <span className="text-muted-foreground">{icon}</span> : null}
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <p className="font-display text-2xl font-bold tracking-tight tabular-nums">{value}</p>
        {hint ? <p className="text-[11px] text-muted-foreground mt-1">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
