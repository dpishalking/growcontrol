import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const TAGLINE = "Система управления ростом";

export function AppBrand({
  suffix,
  className,
  showTagline = true,
  iconClassName,
}: {
  suffix?: ReactNode;
  className?: string;
  showTagline?: boolean;
  iconClassName?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2 min-w-0", className)}>
      <span
        className={cn(
          "h-7 w-7 shrink-0 rounded-lg bg-gradient-money flex items-center justify-center text-primary-foreground",
          iconClassName,
        )}
      >
        <Sparkles className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-display font-semibold tracking-tight text-foreground">
            GrowControl
          </span>
          {suffix}
        </div>
        {showTagline ? (
          <p className="text-[10px] text-muted-foreground leading-tight truncate">{TAGLINE}</p>
        ) : null}
      </div>
    </div>
  );
}
