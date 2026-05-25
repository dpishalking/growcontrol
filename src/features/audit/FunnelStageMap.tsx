import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StageAuditView } from "./auditStageModel";
import { getStageIcon, splitStagesIntoRows, trafficLightStyle } from "./stageVisuals";

type Props = {
  stages: StageAuditView[];
  onStageClick: (stageId: string) => void;
};

export function FunnelStageMap({ stages, onStageClick }: Props) {
  const rows = splitStagesIntoRows(stages, 5);

  return (
    <div className="rounded-2xl border border-border/45 bg-gradient-to-b from-muted/15 to-transparent p-3 sm:p-4">
      <div className="space-y-2">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex}>
            <div
              className="grid gap-1.5 sm:gap-2"
              style={{ gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))` }}
            >
              {row.map((stage) => (
                <StageMapNode
                  key={stage.stageId}
                  stage={stage}
                  onClick={() => onStageClick(stage.stageId)}
                />
              ))}
            </div>
            {rowIndex < rows.length - 1 ? (
              <div className="flex justify-center py-1 text-muted-foreground/50" aria-hidden>
                <ChevronDown className="h-4 w-4" />
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function StageMapNode({ stage, onClick }: { stage: StageAuditView; onClick: () => void }) {
  const Icon = getStageIcon(stage.stageId);
  const light = trafficLightStyle(stage.status);

  return (
    <button
      type="button"
      onClick={onClick}
      title={stage.stageLabel}
      className="group flex flex-col items-center gap-1 rounded-lg px-0.5 py-1 transition-colors hover:bg-muted/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
    >
      <div className="relative">
        <div
          className={cn(
            "flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl border-2 transition-transform group-hover:scale-105",
            light.tile,
          )}
        >
          <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5", light.icon)} strokeWidth={1.75} />
        </div>
        <span
          className={cn(
            "absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-background",
            light.dot,
          )}
          aria-hidden
        />
      </div>
      <span
        className={cn(
          "w-full text-center text-[9px] sm:text-[10px] leading-[1.15] line-clamp-2 px-0.5",
          light.label,
        )}
      >
        {stage.stageLabel}
      </span>
    </button>
  );
}
