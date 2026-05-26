import { useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  FlaskConical,
  Lightbulb,
  Target,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { HYPOTHESIS_PRIORITY_LABELS } from "@/lib/admin/hypothesisLabels";
import type { PlanActionItem, ProjectPlanOfAction } from "@/lib/admin/projectPlanOfAction";
import { cn } from "@/lib/utils";

const HEADLINE_TONE: Record<ProjectPlanOfAction["headlineTone"], string> = {
  urgent: "text-warning",
  focus: "text-primary",
  idle: "text-muted-foreground",
  success: "text-success",
};

function PlanSection({
  icon: Icon,
  title,
  items,
  numbered,
  defaultOpen = true,
}: {
  icon: typeof FlaskConical;
  title: string;
  items: PlanActionItem[];
  numbered?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (items.length === 0) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center gap-2 py-1.5 text-left group">
        <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-foreground" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-foreground">
          {title}
        </span>
        <Badge variant="outline" className="chip text-[10px] ml-auto mr-1">
          {items.length}
        </Badge>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ol className={cn("mt-1 space-y-2 pl-5", numbered ? "list-decimal" : "list-none")}>
          {items.map((item, index) => (
            <PlanActionRow key={item.id} item={item} index={numbered ? index + 1 : undefined} />
          ))}
        </ol>
      </CollapsibleContent>
    </Collapsible>
  );
}

function PlanActionRow({ item, index }: { item: PlanActionItem; index?: number }) {
  return (
    <li className="text-sm leading-snug">
      <div className="flex flex-wrap items-start gap-x-2 gap-y-1">
        {index != null ? (
          <span className="font-medium text-foreground break-words">{item.title}</span>
        ) : (
          <span className="font-medium text-foreground break-words before:content-['•'] before:mr-2 before:text-muted-foreground">
            {item.title}
          </span>
        )}
        <Badge variant="outline" className="chip text-[10px] shrink-0">
          {HYPOTHESIS_PRIORITY_LABELS[item.priority] ?? item.priority}
        </Badge>
        {item.owner ? (
          <span className="text-[11px] text-muted-foreground">· {item.owner}</span>
        ) : null}
        {item.deadlineLabel ? (
          <span
            className={cn(
              "text-[11px] font-medium tabular-nums",
              item.deadlineTone === "urgent"
                ? "text-warning"
                : item.deadlineTone === "soon"
                  ? "text-primary"
                  : "text-muted-foreground",
            )}
          >
            · {item.deadlineLabel}
          </span>
        ) : null}
      </div>
      {item.detail ? (
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground break-words pl-0">
          {item.detail}
        </p>
      ) : null}
    </li>
  );
}

export function AdminProjectPlanPanel({
  plan,
  compact,
}: {
  plan: ProjectPlanOfAction;
  compact?: boolean;
}) {
  const empty =
    plan.activeTests.length === 0 &&
    plan.queue.length === 0 &&
    plan.ideas.length === 0 &&
    plan.completed.length === 0;

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          План действий
        </div>
        <p className={cn("text-sm font-medium leading-snug", HEADLINE_TONE[plan.headlineTone])}>
          {plan.headline}
        </p>
      </div>

      {!compact && plan.goal ? (
        <div className="rounded-lg border border-border/40 bg-background/40 px-3 py-2 space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Target className="h-3 w-3" />
            Цель
          </div>
          <p className="text-sm leading-relaxed break-words">{plan.goal}</p>
          {plan.northStar ? (
            <p className="text-xs text-muted-foreground">
              North star: <span className="text-foreground/85">{plan.northStar}</span>
            </p>
          ) : null}
        </div>
      ) : null}

      {!compact && plan.stageLabel ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Этап мастера:</span>
          <span className="text-foreground/90">{plan.stageLabel}</span>
          {plan.stageProgress > 0 ? (
            <span className="tabular-nums text-primary">{plan.stageProgress}%</span>
          ) : null}
        </div>
      ) : null}

      {empty ? (
        <p className="text-xs text-muted-foreground">
          Участник ещё не собрал гипотезы и план тестов.
        </p>
      ) : (
        <div className="space-y-2 border-t border-border/30 pt-3">
          <PlanSection
            icon={FlaskConical}
            title="В работе"
            items={plan.activeTests}
            defaultOpen
          />
          <PlanSection
            icon={ClipboardList}
            title="Очередь"
            items={plan.queue}
            numbered
            defaultOpen={plan.activeTests.length === 0}
          />
          <PlanSection
            icon={Lightbulb}
            title="Идеи"
            items={plan.ideas}
            defaultOpen={false}
          />
          <PlanSection
            icon={CheckCircle2}
            title="Завершено"
            items={plan.completed}
            defaultOpen={false}
          />
        </div>
      )}
    </div>
  );
}
