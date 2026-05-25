import { useMemo, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronDown, Play, StopCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useAppData } from "@/context/AppDataContext";
import { WizardLayout } from "@/features/wizard/WizardLayout";
import { BUCKET_LABELS, sortByPriority } from "@/utils/icePriority";
import type { Funnel } from "@/types/funnel";
import type { Experiment, ExperimentDecision } from "@/types/experiment";
import type { Hypothesis, HypothesisBucket } from "@/types/hypothesis";
import { cn } from "@/lib/utils";

const DECISION_OPTIONS: { value: ExperimentDecision; label: string }[] = [
  { value: "scale", label: "Масштабировать" },
  { value: "iterate", label: "Доработать" },
  { value: "rerun", label: "Повторить тест" },
  { value: "stop", label: "Остановить" },
  { value: "archive", label: "В архив" },
];

const BUCKET_ORDER: HypothesisBucket[] = [
  "quick_test",
  "strategic",
  "uncertain",
  "do_not_touch",
];

const BUCKET_STYLE: Record<HypothesisBucket, string> = {
  quick_test: "border-money/40 bg-money/5",
  strategic: "border-primary/40 bg-primary/5",
  uncertain: "border-border/60",
  do_not_touch: "border-border/60 opacity-80",
};

function effectPreview(thenMetric: string): string | null {
  const t = thenMetric.trim();
  if (!t) return null;
  const cut = t.indexOf("(метрика:");
  return (cut > 0 ? t.slice(0, cut) : t).trim();
}

function statusChip(h: Hypothesis): { label: string; tone: string } | null {
  if (h.status === "testing") return { label: "В тесте", tone: "text-primary" };
  if (h.status === "success") return { label: "Сработало", tone: "text-success" };
  if (h.status === "failed") return { label: "Не сработало", tone: "text-destructive" };
  if (h.status === "backlog") return { label: "В очереди", tone: "text-muted-foreground" };
  return null;
}

export function PlanStep({ funnel }: { funnel: Funnel }) {
  const { projectId } = useParams<{ projectId: string }>();
  const nav = useNavigate();
  const {
    funnelHypotheses,
    funnelExperiments,
    experimentByHypothesis,
    startExperimentAction,
    finishExperimentAction,
    setFunnelStep,
  } = useAppData();
  const hypotheses = sortByPriority(funnelHypotheses(funnel.id));
  const experiments = funnelExperiments(funnel.id);

  const buckets = useMemo(() => {
    const map: Record<HypothesisBucket, Hypothesis[]> = {
      quick_test: [],
      strategic: [],
      uncertain: [],
      do_not_touch: [],
    };
    for (const h of hypotheses) map[h.bucket].push(h);
    return map;
  }, [hypotheses]);

  const [iceOpen, setIceOpen] = useState(false);
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());
  const [finishForm, setFinishForm] = useState<
    Record<string, { after: string; result: string; decision: ExperimentDecision }>
  >({});

  const toggleOpen = (id: string, open: boolean) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (open) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleStart = (hypothesisId: string) => {
    const h = hypotheses.find((x) => x.id === hypothesisId);
    if (!h) return;
    startExperimentAction({
      hypothesisId,
      funnelId: funnel.id,
      beforeValue: h.currentValue,
    });
    toast.success("Эксперимент запущен");
  };

  const handleFinish = (experimentId: string) => {
    const form = finishForm[experimentId] ?? {
      after: "",
      result: "",
      decision: "scale" as ExperimentDecision,
    };
    finishExperimentAction(experimentId, form.after, form.result, form.decision);
    toast.success("Результат зафиксирован");
  };

  const handleNext = () => {
    setFunnelStep(funnel.id, 8);
    nav(`/projects/${projectId}/funnels/${funnel.id}`);
  };

  const inQueue = hypotheses.filter((h) => h.status === "backlog" || h.status === "testing").length;

  return (
    <WizardLayout
      funnel={funnel}
      activeStep="plan"
      onBack={() => nav(`/projects/${projectId}/funnels/${funnel.id}/wizard/hypotheses`)}
      onNext={handleNext}
      nextLabel="Открыть карту воронки"
      nextDisabled={hypotheses.length === 0}
    >
      <div className="space-y-4 max-w-2xl mx-auto">
        <div className="text-center space-y-1">
          <h2 className="font-display text-lg font-semibold tracking-tight">План тестов</h2>
          <p className="text-xs text-muted-foreground">
            {inQueue > 0
              ? `${inQueue} в очереди · начните с первого · детали — по раскрытию карточки`
              : "Запускайте эксперименты сверху вниз"}
          </p>
        </div>

        {hypotheses.length > 0 ? (
          <Collapsible open={iceOpen} onOpenChange={setIceOpen}>
            <div className="rounded-xl border border-border/60 overflow-hidden bg-card/20">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/15 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Как расставлены приоритеты (ICE)</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Impact × Confidence × Ease · порядок уже посчитан
                    </p>
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                      iceOpen && "rotate-180",
                    )}
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                <div className="px-4 pb-4 pt-0 space-y-3 border-t border-border/40">
                  {BUCKET_ORDER.map((b) => {
                    const items = buckets[b];
                    if (items.length === 0) return null;
                    return (
                      <Card key={b} className={cn("border", BUCKET_STYLE[b])}>
                        <CardHeader className="pb-2 pt-3 px-3">
                          <CardTitle className="text-sm flex items-center justify-between">
                            <span>{BUCKET_LABELS[b].label}</span>
                            <Badge variant="secondary" className="text-[10px]">
                              {items.length}
                            </Badge>
                          </CardTitle>
                          <p className="text-[11px] text-muted-foreground">{BUCKET_LABELS[b].hint}</p>
                        </CardHeader>
                        <CardContent className="px-3 pb-3 space-y-1.5">
                          {items.map((h) => (
                            <div
                              key={h.id}
                              className="rounded-lg border border-border/50 bg-background/40 px-2.5 py-2"
                            >
                              <p className="text-xs font-medium leading-snug break-words line-clamp-2">
                                {h.title}
                              </p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                ICE {h.priorityScore} · I{h.impact}/C{h.confidence}/E{h.ease}
                              </p>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        ) : null}

        {hypotheses.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Гипотез ещё нет.</p>
        ) : (
          <>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium text-center">
              Очередь запуска
            </p>
            <ul className="space-y-2">
              {hypotheses.map((h, i) => {
                const exp = experimentByHypothesis(h.id);
                const form = finishForm[exp?.id ?? ""] ?? {
                  after: "",
                  result: "",
                  decision: "scale" as ExperimentDecision,
                };
                const preview = effectPreview(h.thenMetric);
                const chip = statusChip(h);

                return (
                  <li key={h.id}>
                    <PlanHypothesisCard
                      index={i + 1}
                      hypothesis={h}
                      preview={preview}
                      chip={chip}
                      open={openIds.has(h.id)}
                      onOpenChange={(open) => toggleOpen(h.id, open)}
                      experiment={exp}
                      finishForm={form}
                      onFinishFormChange={(patch) =>
                        exp &&
                        setFinishForm((s) => ({
                          ...s,
                          [exp.id]: { ...form, ...patch },
                        }))
                      }
                      onStart={() => handleStart(h.id)}
                      onFinish={() => exp && handleFinish(exp.id)}
                    />
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {experiments.filter((e) => e.decision !== "pending").length > 0 ? (
          <Card className="border-border/60">
            <CardContent className="p-4 space-y-2">
              <p className="text-xs font-medium text-center text-muted-foreground">Завершённые</p>
              {experiments
                .filter((e) => e.decision !== "pending")
                .map((e) => {
                  const h = hypotheses.find((x) => x.id === e.hypothesisId);
                  return (
                    <div
                      key={e.id}
                      className="flex items-center justify-between gap-2 text-xs border-t border-border/40 pt-2 first:border-0 first:pt-0"
                    >
                      <span className="line-clamp-1 min-w-0">{h?.title ?? e.hypothesisId}</span>
                      <span className="shrink-0 text-muted-foreground">
                        {DECISION_OPTIONS.find((d) => d.value === e.decision)?.label}
                      </span>
                    </div>
                  );
                })}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </WizardLayout>
  );
}

function PlanHypothesisCard({
  index,
  hypothesis: h,
  preview,
  chip,
  open,
  onOpenChange,
  experiment: exp,
  finishForm: form,
  onFinishFormChange,
  onStart,
  onFinish,
}: {
  index: number;
  hypothesis: Hypothesis;
  preview: string | null;
  chip: { label: string; tone: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  experiment: Experiment | undefined;
  finishForm: { after: string; result: string; decision: ExperimentDecision };
  onFinishFormChange: (patch: Partial<{ after: string; result: string; decision: ExperimentDecision }>) => void;
  onStart: () => void;
  onFinish: () => void;
}) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <div className="rounded-xl border border-border/60 overflow-hidden bg-card/25">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted/15 transition-colors"
          >
            <span className="text-[10px] tabular-nums text-muted-foreground pt-0.5 w-4 shrink-0">
              {index}
            </span>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-sm font-medium leading-snug line-clamp-2">{h.title}</p>
              {preview && !open ? (
                <p className="text-xs text-muted-foreground line-clamp-1">→ {preview}</p>
              ) : null}
              {chip ? (
                <p className="text-[11px]">
                  <span className={chip.tone}>{chip.label}</span>
                </p>
              ) : null}
            </div>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-muted-foreground transition-transform mt-0.5",
                open && "rotate-180",
              )}
            />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
          <div className="px-4 pb-4 pt-0 space-y-3 border-t border-border/40">
            <DetailBlock title="Что тестируем">
              <DetailRow label="Если" value={h.ifChange} />
              <DetailRow label="То" value={h.thenMetric} />
              <DetailRow label="Метрика" value={`${h.metricName} · цель ${h.targetValue || "—"}`} />
            </DetailBlock>

            <DetailBlock title="Как проверяем">
              <DetailRow label="Метод" value={h.testMethod} />
              <DetailRow label="Успех" value={h.successCriteria} />
              <DetailRow label="Срок" value={`${h.testDurationDays} дн.`} />
            </DetailBlock>

            {exp ? (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-3">
                <p className="text-xs font-medium">Эксперимент идёт</p>
                <p className="text-xs text-muted-foreground">
                  Было: <span className="text-foreground font-medium">{exp.beforeValue || "—"}</span>
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Стало (факт)</Label>
                    <Input
                      value={form.after}
                      onChange={(e) => onFinishFormChange({ after: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs">Вывод</Label>
                    <Textarea
                      rows={2}
                      value={form.result}
                      onChange={(e) => onFinishFormChange({ result: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Решение</Label>
                    <Select
                      value={form.decision}
                      onValueChange={(v) =>
                        onFinishFormChange({ decision: v as ExperimentDecision })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DECISION_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button size="sm" onClick={onFinish}>
                  <StopCircle className="mr-1.5 h-4 w-4" />
                  Зафиксировать
                </Button>
              </div>
            ) : (
              <Button size="sm" className="w-full sm:w-auto" onClick={onStart}>
                <Play className="mr-1.5 h-4 w-4" />
                Запустить эксперимент
              </Button>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function DetailBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5 pt-3 first:pt-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{title}</p>
      <div className="rounded-lg bg-muted/15 px-3 py-2 space-y-1.5">{children}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  if (!value?.trim()) return null;
  return (
    <div className="grid gap-0.5 sm:grid-cols-[4.5rem_1fr] sm:gap-2 text-xs">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="leading-relaxed break-words text-foreground/90">{value}</span>
    </div>
  );
}
