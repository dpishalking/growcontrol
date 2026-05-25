import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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

function statusLabel(h: Hypothesis): string {
  if (h.status === "backlog") return "В очереди";
  if (h.status === "parked") return "Отложено";
  if (h.status === "testing") return "В тесте";
  return "Черновик";
}

function effectPreview(thenMetric: string): string | null {
  const t = thenMetric.trim();
  if (!t) return null;
  const cut = t.indexOf("(метрика:");
  return (cut > 0 ? t.slice(0, cut) : t).trim();
}

export function HypothesisCard({
  hypothesis: h,
  stageLabel,
  materials = [],
  materialsStepHref,
  onDelete,
}: Props) {
  const preview = effectPreview(h.thenMetric);

  return (
    <li className="rounded-xl border border-border/60 overflow-hidden bg-card/25">
      <Accordion type="single" collapsible>
        <AccordionItem value="one" className="border-0">
          <div className="flex items-start gap-1 px-3 py-2.5">
            <AccordionTrigger className="flex-1 min-w-0 py-0 hover:no-underline text-left items-start gap-2 [&>svg]:shrink-0 [&>svg]:mt-1">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm font-medium leading-relaxed break-words">{h.title}</p>
                {preview ? (
                  <p className="text-xs text-muted-foreground leading-relaxed break-words">→ {preview}</p>
                ) : null}
                <p className="text-[11px] text-muted-foreground">
                  ICE {h.priorityScore} · {BUCKET_LABELS[h.bucket].label} · {statusLabel(h)}
                </p>
              </div>
            </AccordionTrigger>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 shrink-0"
              onClick={onDelete}
              aria-label="Удалить гипотезу"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
          <AccordionContent className="px-3 pb-3 pt-0">
            <dl className="grid gap-3 text-xs border-t border-border/40 pt-3">
              <Block title="Гипотеза">
                <Row label="Если">{h.ifChange}</Row>
                <Row label="То">{h.thenMetric}</Row>
                <Row label="Потому что">{h.becauseReason}</Row>
              </Block>
              <Block title="Проверка">
                <Row label="Метод">{h.testMethod || "—"}</Row>
                <Row label="Успех">{h.successCriteria || "—"}</Row>
                <Row label="План / факт">
                  {h.currentValue || "—"} → {h.targetValue || "план"}
                </Row>
                {h.risk ? <Row label="Ограничение">{h.risk}</Row> : null}
              </Block>
              {(h.materialsToChange.length > 0 || stageLabel) && (
                <Block title="Контекст">
                  {stageLabel ? <Row label="Этап">{stageLabel}</Row> : null}
                  {h.materialsToChange.length > 0 ? (
                    <Row label="Материалы">
                      <MaterialsList
                        labels={h.materialsToChange}
                        materials={materials}
                        materialsStepHref={materialsStepHref}
                      />
                    </Row>
                  ) : null}
                </Block>
              )}
              <p className="text-[10px] text-muted-foreground">
                Impact {h.impact} · Confidence {h.confidence} · Ease {h.ease} · {h.testDurationDays}{" "}
                дн.
              </p>
            </dl>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </li>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{title}</p>
      <div className="space-y-1.5 rounded-lg bg-muted/15 px-2.5 py-2">{children}</div>
    </div>
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
    <div className={cn("grid gap-0.5 sm:grid-cols-[5.5rem_1fr] sm:gap-2")}>
      <dt className="text-muted-foreground shrink-0">{label}</dt>
      <dd className="text-foreground/90 leading-relaxed break-words whitespace-normal min-w-0">
        {children}
      </dd>
    </div>
  );
}
