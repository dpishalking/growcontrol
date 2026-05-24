import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ExternalLink, FileWarning, Trash2 } from "lucide-react";
import { BUCKET_LABELS } from "@/utils/icePriority";
import type { Hypothesis } from "@/types/hypothesis";
import type { Material } from "@/types/material";
import { materialsMatchHint } from "@/lib/hypothesisMetricContext";
import { cn } from "@/lib/utils";

type Props = {
  hypothesis: Hypothesis;
  stageLabel?: string;
  materials?: Material[];
  materialsStepHref?: string;
  onDelete: () => void;
};

export function HypothesisCard({
  hypothesis: h,
  stageLabel,
  materials = [],
  materialsStepHref,
  onDelete,
}: Props) {
  const statusTone =
    h.status === "backlog"
      ? "chip chip-success"
      : h.status === "parked"
        ? "chip"
        : h.status === "testing"
          ? "chip chip-warning"
          : "chip chip-primary";

  return (
    <li className="rounded-lg border border-border/60 overflow-hidden">
      <Accordion type="single" collapsible>
        <AccordionItem value="one" className="border-0">
          <div className="flex items-start gap-2 px-3 py-2">
            <AccordionTrigger className="flex-1 py-0 hover:no-underline text-left">
              <div className="min-w-0 pr-2">
                <p className="text-sm font-medium leading-snug">{h.title}</p>
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  <Badge variant="outline" className="text-[10px] font-normal">
                    {h.metricName}
                  </Badge>
                  {stageLabel ? (
                    <Badge variant="secondary" className="text-[10px] font-normal">
                      {stageLabel}
                    </Badge>
                  ) : null}
                  <Badge variant="outline" className="text-[10px] font-normal">
                    ICE {h.priorityScore}
                  </Badge>
                  <Badge variant="outline" className={cn("text-[10px] font-normal", statusTone)}>
                    {h.status === "backlog"
                      ? "В очереди"
                      : h.status === "parked"
                        ? "Отложено"
                        : BUCKET_LABELS[h.bucket].label}
                  </Badge>
                </div>
              </div>
            </AccordionTrigger>
            <Button size="sm" variant="ghost" className="shrink-0 mt-0.5" onClick={onDelete}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
          <AccordionContent className="px-3 pb-3 pt-0">
            <dl className="grid gap-2 text-xs border-t border-border/40 pt-3">
              <Row label="Если изменим">{h.ifChange}</Row>
              <Row label="То получим">{h.thenMetric}</Row>
              <Row label="Потому что">{h.becauseReason}</Row>
              {h.problemReason ? <Row label="Проблема">{h.problemReason}</Row> : null}
              <Row label="Сейчас → план">
                {h.currentValue || "—"} → {h.targetValue || "план"}
              </Row>
              {h.materialsToChange.length > 0 ? (
                <Row label="Меняем">
                  <MaterialsList
                    labels={h.materialsToChange}
                    materials={materials}
                    materialsStepHref={materialsStepHref}
                  />
                </Row>
              ) : null}
              <Row label="Как проверим">{h.testMethod || "—"}</Row>
              <Row label="Успех, если">{h.successCriteria || "—"}</Row>
              {h.risk ? <Row label="Guardrail">{h.risk}</Row> : null}
              <Row label="ICE">
                Impact {h.impact} · Confidence {h.confidence} · Ease {h.ease} · {h.testDurationDays} дн.
              </Row>
            </dl>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </li>
  );
}

function MaterialsList({
  labels,
  materials,
  materialsStepHref,
}: {
  labels: string[];
  materials: Material[];
  materialsStepHref?: string;
}) {
  return (
    <ul className="space-y-1 mt-0.5">
      {labels.map((label) => {
        const matched = materials.filter((m) => materialsMatchHint(m.title, label));
        const ok = matched.length > 0;
        return (
          <li key={label} className="flex items-center gap-1.5 flex-wrap">
            {ok ? (
              <CheckCircle2 className="h-3 w-3 text-success shrink-0" />
            ) : (
              <FileWarning className="h-3 w-3 text-warning shrink-0" />
            )}
            <span>{label}</span>
            {matched.slice(0, 2).map((m) => (
              <span key={m.id} className="text-muted-foreground">
                ({m.title.slice(0, 40)}
                {m.title.length > 40 ? "…" : ""})
              </span>
            ))}
            {!ok && materialsStepHref ? (
              <Link
                to={materialsStepHref}
                className="inline-flex items-center gap-0.5 text-primary hover:underline text-[11px]"
              >
                Добавить
                <ExternalLink className="h-3 w-3" />
              </Link>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">{label}</dt>
      <dd className="text-foreground/90 leading-relaxed">{children}</dd>
    </div>
  );
}
