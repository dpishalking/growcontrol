import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Fragment } from "react";
import { cn } from "@/lib/utils";
import type { StageAuditView } from "./auditStageModel";
import { getStageIcon, splitStagesIntoRows, trafficLightStyle } from "./stageVisuals";

type Props = {
  stages: StageAuditView[];
  onStageClick: (stageId: string) => void;
};

export function FunnelStageMap({ stages, onStageClick }: Props) {
  const rows = splitStagesIntoRows(stages, 5);
  const stepByStageId = new Map(stages.map((stage, index) => [stage.stageId, index + 1]));

  return (
    <div className="rounded-2xl border border-border/45 bg-gradient-to-b from-muted/15 to-transparent p-3 sm:p-4">
      <div className="space-y-0.5">
        {rows.map((row, rowIndex) => {
          const isSnakeReturn = rowIndex === 1 && rows.length > 1;
          const displayRow = isSnakeReturn ? [...row].reverse() : row;
          const arrowDirection = isSnakeReturn ? "left" : "right";

          return (
            <Fragment key={rowIndex}>
              <div className={cn(isSnakeReturn && rows[0].length > row.length && "flex justify-end")}>
                <div
                  className="grid items-start gap-0"
                  style={{
                    gridTemplateColumns: displayRow
                      .map((_, i) => (i < displayRow.length - 1 ? "1fr auto" : "1fr"))
                      .join(" "),
                  }}
                >
                  {displayRow.map((stage, i) => (
                    <Fragment key={stage.stageId}>
                      <StageMapNode
                        step={stepByStageId.get(stage.stageId) ?? i + 1}
                        stage={stage}
                        onClick={() => onStageClick(stage.stageId)}
                      />
                      {i < displayRow.length - 1 ? (
                        <StageArrowHorizontal direction={arrowDirection} />
                      ) : null}
                    </Fragment>
                  ))}
                </div>
              </div>

              {rowIndex === 0 && rows.length > 1 ? (
                <RowVerticalConnector anchorColumn={row.length} totalColumns={rows[0].length} />
              ) : null}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

function StageArrowHorizontal({ direction }: { direction: "left" | "right" }) {
  const Icon = direction === "right" ? ChevronRight : ChevronLeft;

  return (
    <div
      className="flex min-w-[1.125rem] items-center justify-center self-start px-0.5 pt-5 text-muted-foreground/60 sm:min-w-[1.5rem] sm:px-1 sm:pt-[1.375rem]"
      aria-hidden
    >
      <div className="flex w-full items-center">
        <div className="h-px min-w-1 flex-1 bg-border/75" />
        <Icon className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" strokeWidth={2.25} />
        <div className="h-px min-w-1 flex-1 bg-border/75" />
      </div>
    </div>
  );
}

/** Вертикальная связь 5 → 6: оба этапа справа, «змейка» без излома. */
function RowVerticalConnector({
  anchorColumn,
  totalColumns,
}: {
  anchorColumn: number;
  totalColumns: number;
}) {
  return (
    <div
      className="grid py-0.5"
      style={{ gridTemplateColumns: `repeat(${totalColumns}, minmax(0, 1fr))` }}
      aria-hidden
    >
      {Array.from({ length: anchorColumn - 1 }).map((_, i) => (
        <div key={i} />
      ))}
      <div className="flex flex-col items-center text-muted-foreground/60">
        <div className="h-2 w-px bg-border/75" />
        <ChevronDown className="h-4 w-4" strokeWidth={2.25} />
        <div className="h-1.5 w-px bg-border/75" />
      </div>
    </div>
  );
}

function StageMapNode({
  step,
  stage,
  onClick,
}: {
  step: number;
  stage: StageAuditView;
  onClick: () => void;
}) {
  const Icon = getStageIcon(stage.stageId);
  const light = trafficLightStyle(stage.status);

  return (
    <button
      type="button"
      onClick={onClick}
      title={`${step}. ${stage.stageLabel}`}
      className="group flex min-w-0 flex-col items-center gap-1 rounded-lg px-0.5 py-1 transition-colors hover:bg-muted/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
    >
      <div className="relative">
        <span
          className={cn(
            "absolute -left-1 -top-1 z-10 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-semibold tabular-nums ring-2 ring-background",
            stage.status === "critical"
              ? "bg-danger text-danger-foreground"
              : stage.status === "bad" || stage.status === "weak"
                ? "bg-warning text-warning-foreground"
                : stage.status === "good"
                  ? "bg-success/90 text-success-foreground"
                  : "bg-muted text-muted-foreground",
          )}
        >
          {step}
        </span>
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl border-2 transition-transform group-hover:scale-105 sm:h-11 sm:w-11",
            light.tile,
          )}
        >
          <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5", light.icon)} strokeWidth={1.75} />
        </div>
        <span
          className={cn(
            "absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-background",
            light.dot,
          )}
          aria-hidden
        />
      </div>
      <span
        className={cn(
          "line-clamp-2 w-full px-0.5 text-center text-[9px] leading-[1.15] sm:text-[10px]",
          light.label,
        )}
      >
        {stage.stageLabel}
      </span>
    </button>
  );
}
