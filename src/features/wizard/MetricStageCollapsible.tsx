import { ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { FunnelMetricCard } from "@/features/wizard/FunnelMetricCard";
import { cn } from "@/lib/utils";
import type { FunnelMetric } from "@/types/funnelMetric";
import type { StageMetricGroup } from "@/utils/metricStageGrouping";

function stageFillSummary(items: FunnelMetric[]) {
  const filled = items.filter((m) => m.actualValue != null || m.plannedValue != null).length;
  return { filled, total: items.length };
}

type Props = {
  group: StageMetricGroup;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPatch: (id: string, patch: Partial<FunnelMetric>) => void;
  onDelete: (id: string) => void;
};

export function MetricStageCollapsible({ group, open, onOpenChange, onPatch, onDelete }: Props) {
  const { filled, total } = stageFillSummary(group.items);
  const complete = filled === total && total > 0;

  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <Card className="border-border/60 overflow-hidden">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full text-left transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums",
                    complete ? "bg-success/15 text-success" : "bg-primary/15 text-primary",
                  )}
                >
                  {group.index}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-base leading-tight">{group.stage.label}</CardTitle>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-medium tabular-nums",
                        complete
                          ? "bg-success/10 text-success"
                          : filled > 0
                            ? "bg-warning/10 text-warning"
                            : "bg-muted text-muted-foreground",
                      )}
                    >
                      {filled}/{total}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                    {group.hint}
                  </p>
                </div>
                <ChevronDown
                  className={cn(
                    "h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 mt-0.5",
                    open && "rotate-180",
                  )}
                />
              </div>
            </CardHeader>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
          <CardContent className="p-4 space-y-3">
            {group.items.map((m) => (
              <FunnelMetricCard
                key={m.id}
                metric={m}
                onPatch={onPatch}
                onDelete={onDelete}
              />
            ))}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export function buildInitialOpenStages(groups: StageMetricGroup[]): Record<string, boolean> {
  const visible = groups.filter((g) => g.items.length > 0);
  if (!visible.length) return {};

  const firstIncomplete =
    visible.find((g) =>
      g.items.some((m) => m.actualValue == null && m.plannedValue == null),
    ) ?? visible[0];

  return Object.fromEntries(
    visible.map((g) => [g.stage.id, g.stage.id === firstIncomplete.stage.id]),
  );
}
