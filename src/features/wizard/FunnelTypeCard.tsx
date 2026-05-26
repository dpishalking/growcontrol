import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getFunnelTypeVisual } from "@/data/funnelTypes/visuals";
import type { FunnelTypeTemplate } from "@/types/funnelType";
import { cn } from "@/lib/utils";

export function FunnelTypeCard({
  type,
  active,
  onSelect,
}: {
  type: FunnelTypeTemplate;
  active: boolean;
  onSelect: () => void;
}) {
  const visual = getFunnelTypeVisual(type.id);
  const Icon = visual.icon;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group funnel-type-card text-left rounded-2xl border overflow-hidden transition-all",
        active
          ? "border-primary bg-primary/5 ring-1 ring-primary/35 shadow-glow"
          : "border-border/60 bg-card/20 hover:border-primary/35 hover:bg-muted/20",
      )}
    >
      <div
        className={cn(
          "relative flex h-[5.5rem] items-center justify-center bg-gradient-to-br border-b border-border/30",
          visual.gradient,
        )}
      >
        <div
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-background/40 backdrop-blur-sm shadow-sm",
            active && "ring-2 ring-primary/40",
          )}
        >
          <Icon className={cn("h-7 w-7", visual.iconClass)} strokeWidth={1.75} />
        </div>
        <Badge
          variant="secondary"
          className="absolute left-3 top-3 text-[10px] font-medium bg-background/60 backdrop-blur-sm"
        >
          {visual.chip}
        </Badge>
        {active ? (
          <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Check className="h-3.5 w-3.5" />
          </span>
        ) : null}
      </div>

      <div className="space-y-2.5 p-4">
        <h3 className="font-display text-base font-semibold leading-snug tracking-tight">
          {type.name}
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
          {type.description}
        </p>

        {active ? (
          <p className="rounded-lg bg-muted/25 px-2.5 py-2 text-[11px] leading-relaxed text-muted-foreground border border-border/40">
            <span className="font-medium text-foreground/80">Цепочка: </span>
            {type.exampleFlow}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-1.5 pt-0.5">
          <Badge variant="outline" className="text-[10px] font-normal tabular-nums">
            {type.requiredStages.length} этапов
          </Badge>
          <Badge variant="outline" className="text-[10px] font-normal tabular-nums">
            {type.requiredMetrics.length} метрик
          </Badge>
        </div>
      </div>
    </button>
  );
}

export function FunnelTypeStagePreview({
  stages,
  accentClass,
}: {
  stages: { id: string; label: string }[];
  accentClass?: string;
}) {
  return (
    <ol className="flex flex-wrap items-center gap-1.5">
      {stages.map((s, i) => (
        <li key={s.id} className="flex items-center gap-1.5">
          {i > 0 ? (
            <span className="text-muted-foreground/50 text-xs select-none" aria-hidden>
              →
            </span>
          ) : null}
          <Badge
            variant="secondary"
            className={cn(
              "text-xs font-normal px-2.5 py-1 bg-muted/30",
              accentClass,
            )}
          >
            <span className="tabular-nums text-muted-foreground mr-1">{i + 1}.</span>
            {s.label}
          </Badge>
        </li>
      ))}
    </ol>
  );
}
