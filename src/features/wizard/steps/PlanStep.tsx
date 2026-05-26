import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  FlaskConical,
  Loader2,
  Play,
  Target,
  Trash2,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAppData } from "@/context/AppDataContext";
import { WizardLayout } from "@/features/wizard/WizardLayout";
import { PlanDateField } from "@/features/wizard/PlanDateField";
import { TrafficLightIcon } from "@/features/wizard/TrafficLightIcon";
import { metricGoalMet, parseMetricNumber } from "@/lib/metricValueParse";
import { sortByPriority } from "@/utils/icePriority";
import { cn } from "@/lib/utils";
import type { Funnel } from "@/types/funnel";
import type { FunnelMetric } from "@/types/funnelMetric";
import type { Experiment, ExperimentDecision } from "@/types/experiment";
import type { Hypothesis } from "@/types/hypothesis";

const DECISION_HISTORY_LABEL: Partial<Record<ExperimentDecision, string>> = {
  scale: "Масштаб",
  iterate: "Доработка",
  rerun: "Повтор",
  stop: "Стоп",
  archive: "Архив",
};

const DECISION_OPTIONS: { value: ExperimentDecision; label: string }[] = [
  { value: "scale", label: "Масштабировать" },
  { value: "iterate", label: "Доработать" },
  { value: "stop", label: "Стоп" },
  { value: "rerun", label: "Повторить" },
  { value: "archive", label: "В архив" },
];
function formatShort(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function toDateInput(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function PlanStep({ funnel }: { funnel: Funnel }) {
  const { projectId } = useParams<{ projectId: string }>();
  const nav = useNavigate();
  const {
    funnelHypotheses,
    funnelMetricsList,
    funnelExperiments,
    experimentByHypothesis,
    startExperimentAction,
    patchExperiment,
    finishExperimentAction,
    patchHypothesis,
    moveHypothesis,
    setFunnelStep,
  } = useAppData();

  const hypotheses = funnelHypotheses(funnel.id);
  const experiments = funnelExperiments(funnel.id);
  const metrics = funnelMetricsList(funnel.id);
  const metricById = useMemo(() => new Map(metrics.map((m) => [m.id, m])), [metrics]);

  const latestFinishedByHypothesis = useMemo(() => {
    const m = new Map<string, Experiment>();
    for (const exp of experiments) {
      if (exp.decision === "pending") continue;
      const prev = m.get(exp.hypothesisId);
      if (
        !prev ||
        new Date(exp.updatedAt).getTime() > new Date(prev.updatedAt).getTime()
      ) {
        m.set(exp.hypothesisId, exp);
      }
    }
    return m;
  }, [experiments]);

  const activeExperimentHypothesisIds = useMemo(() => {
    const ids = new Set<string>();
    for (const exp of experiments) {
      if (exp.decision === "pending") ids.add(exp.hypothesisId);
    }
    return ids;
  }, [experiments]);

  const queued = useMemo(
    () =>
      sortByPriority(
        hypotheses.filter(
          (h) => h.status === "backlog" && !activeExperimentHypothesisIds.has(h.id),
        ),
      ),
    [hypotheses, activeExperimentHypothesisIds],
  );
  const running = useMemo(
    () =>
      sortByPriority(
        hypotheses.filter(
          (h) =>
            h.status === "testing" ||
            (h.status === "backlog" && activeExperimentHypothesisIds.has(h.id)),
        ),
      ),
    [hypotheses, activeExperimentHypothesisIds],
  );
  const done = useMemo(
    () => hypotheses.filter((h) => h.status === "success" || h.status === "failed"),
    [hypotheses],
  );

  useEffect(() => {
    for (const hypothesisId of activeExperimentHypothesisIds) {
      const h = hypotheses.find((x) => x.id === hypothesisId);
      if (h?.status === "backlog") {
        moveHypothesis(hypothesisId, "testing");
      }
    }
  }, [activeExperimentHypothesisIds, hypotheses, moveHypothesis]);

  const handleNext = () => {
    setFunnelStep(funnel.id, 7);
    nav(`/projects/${projectId}/funnels/${funnel.id}`);
  };

  const empty = queued.length === 0 && running.length === 0;

  return (
    <WizardLayout
      funnel={funnel}
      activeStep="plan"
      onBack={() => nav(`/projects/${projectId}/funnels/${funnel.id}/wizard/hypotheses`)}
      onNext={handleNext}
      nextLabel="Открыть карту воронки"
      nextDisabled={empty && done.length === 0}
    >
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="text-center">
          <h2 className="font-display text-xl font-semibold tracking-tight">План тестов</h2>
        </div>

        {empty ? (
          <Card className="border-dashed border-border/60">
            <CardContent className="py-10 text-center space-y-3">
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Нет выбранных гипотез. Вернитесь назад и отметьте 1–3 идеи.
              </p>
              <Button
                variant="outline"
                onClick={() =>
                  nav(`/projects/${projectId}/funnels/${funnel.id}/wizard/hypotheses`)
                }
              >
                К гипотезам
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {queued.length > 0 ? (
              <PlanGroup
                iconNode={<TrafficLightIcon />}
                tone="queue"
                title="Очередь"
                count={queued.length}
                defaultOpen
              >
                {queued.map((h, i) => (
                  <PlanCard
                    key={h.id}
                    index={i + 1}
                    defaultOpen={queued.length === 1 || i === 0}
                    hypothesis={h}
                    linkedMetric={h.metricId ? (metricById.get(h.metricId) ?? null) : null}
                    experiment={experimentByHypothesis(h.id)}
                    mode="queue"
                    onStart={(input) => {
                      if (
                        input.testMethod !== h.testMethod ||
                        input.successCriteria !== h.successCriteria
                      ) {
                        patchHypothesis(h.id, {
                          testMethod: input.testMethod,
                          successCriteria: input.successCriteria,
                        });
                      }
                      startExperimentAction({
                        hypothesisId: h.id,
                        funnelId: funnel.id,
                        beforeValue: h.currentValue,
                        owner: input.owner,
                        endDate: input.endDate,
                      });
                      toast.success("Тест в работе", {
                        description: "Карточка переехала в раздел «В работе»",
                      });
                    }}
                    onPatchExp={patchExperiment}
                    onPatchHyp={(patch) => patchHypothesis(h.id, patch)}
                    onRemove={() => {
                      moveHypothesis(h.id, "draft");
                      toast.success("Убрали из плана");
                    }}
                    onFinish={() => {}}
                  />
                ))}
              </PlanGroup>
            ) : null}

            {running.length > 0 ? (
              <PlanGroup
                icon={Loader2}
                iconSpin
                tone="running"
                title="В работе"
                count={running.length}
                defaultOpen
              >
                {running.map((h, i) => (
                  <PlanCard
                    key={h.id}
                    index={i + 1}
                    defaultOpen={running.length === 1 || i === 0}
                    hypothesis={h}
                    linkedMetric={h.metricId ? (metricById.get(h.metricId) ?? null) : null}
                    experiment={experimentByHypothesis(h.id)}
                    mode="running"
                    onStart={() => {}}
                    onPatchExp={patchExperiment}
                    onPatchHyp={(patch) => patchHypothesis(h.id, patch)}
                    onRemove={() => {}}
                    onFinish={(experimentId, after, result, decision, opts) => {
                      finishExperimentAction(experimentId, after, result, decision, opts);
                      toast.success("Результат сохранён");
                    }}
                  />
                ))}
              </PlanGroup>
            ) : null}
          </div>
        )}

        {done.length > 0 ? (
          <Collapsible>
            <div className="rounded-xl border border-border/60 bg-card/20 overflow-hidden">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/15 transition-colors"
                >
                  <span className="text-sm font-medium text-muted-foreground">
                    Завершённые · {done.length}
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <ul className="px-4 pb-3 space-y-3 border-t border-border/40 pt-3">
                  {done.map((h) => {
                    const lexp = latestFinishedByHypothesis.get(h.id);
                    const dec =
                      lexp?.decision && DECISION_HISTORY_LABEL[lexp.decision]
                        ? DECISION_HISTORY_LABEL[lexp.decision]
                        : null;
                    const met = h.metricId ? metricById.get(h.metricId) ?? null : null;
                    const numUnit =
                      met?.unit && (met.unit === "%" || met.unit === "x")
                        ? met.unit
                        : met?.unit
                          ? ` ${met.unit}`
                          : "";
                    return (
                      <li
                        key={h.id}
                        className="rounded-lg border border-border/45 bg-muted/10 px-3 py-2.5 space-y-2"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-sm font-medium leading-snug min-w-0">
                            {h.title}
                          </span>
                          <Badge
                            variant="outline"
                            className={cn(
                              "shrink-0 text-[10px]",
                              h.status === "success"
                                ? "border-success/40 text-success"
                                : "border-destructive/40 text-destructive",
                            )}
                          >
                            {h.status === "success" ? "Успех" : "Не сработало"}
                          </Badge>
                        </div>
                        {lexp ? (
                          <div className="text-[11px] text-muted-foreground space-y-1.5 leading-relaxed">
                            <div className="flex flex-wrap gap-x-2 gap-y-1 items-center">
                              {dec ? (
                                <Badge variant="secondary" className="text-[10px]">
                                  {dec}
                                </Badge>
                              ) : null}
                              {lexp.endDate ? <span>{formatShort(lexp.endDate)}</span> : null}
                            </div>
                            {(lexp.beforeValue?.trim() || h.currentValue?.trim()) ? (
                              <p>
                                <span className="font-medium text-foreground">Было: </span>
                                {(lexp.beforeValue?.trim() || h.currentValue).trim()}
                                {typeof lexp.baselineNumeric === "number" &&
                                lexp.baselineNumeric != null &&
                                !Number.isNaN(lexp.baselineNumeric)
                                  ? ` (${lexp.baselineNumeric}${numUnit})`
                                  : null}
                              </p>
                            ) : null}
                            {lexp.afterValue?.trim() ? (
                              <p>
                                <span className="font-medium text-foreground">Стало: </span>
                                {lexp.afterValue.trim()}
                                {typeof lexp.resultNumeric === "number" &&
                                lexp.resultNumeric != null &&
                                !Number.isNaN(lexp.resultNumeric)
                                  ? ` (${lexp.resultNumeric}${numUnit})`
                                  : null}
                              </p>
                            ) : null}
                            {met &&
                            typeof lexp.resultNumeric === "number" &&
                            (lexp.targetNumeric != null || parseMetricNumber(h.targetValue)) ? (
                              <p>
                                <span className="font-medium text-foreground">
                                  По отношению к цели:{" "}
                                </span>
                                {(() => {
                                  const target =
                                    lexp.targetNumeric ??
                                    parseMetricNumber(h.targetValue);
                                  const verdict = metricGoalMet(
                                    lexp.resultNumeric,
                                    target,
                                    met.direction,
                                  );
                                  if (verdict === "met") return "достигли";
                                  if (verdict === "not_met") return "ниже порога цели";
                                  return "нет числа для авто-сравнения";
                                })()}
                              </p>
                            ) : null}
                            {lexp.result?.trim() ? (
                              <p>
                                <span className="font-medium text-foreground">Вывод: </span>
                                {lexp.result.trim()}
                              </p>
                            ) : null}
                            {lexp.notes?.trim() ? (
                              <p className="text-muted-foreground/90 border-t border-border/30 pt-1.5">
                                {lexp.notes.trim()}
                              </p>
                            ) : null}
                          </div>
                        ) : (
                          <p className="text-[11px] text-muted-foreground">
                            Запись эксперимента недоступна (старые данные).
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </CollapsibleContent>
            </div>
          </Collapsible>
        ) : null}
      </div>
    </WizardLayout>
  );
}

function PlanGroup({
  icon: Icon,
  iconNode,
  iconSpin,
  tone = "default",
  title,
  count,
  defaultOpen = true,
  children,
}: {
  icon?: typeof ClipboardList;
  iconNode?: React.ReactNode;
  iconSpin?: boolean;
  tone?: "default" | "queue" | "running";
  title: string;
  count: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const isRunning = tone === "running";
  const isQueue = tone === "queue";

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <section
        className={cn(
          "rounded-2xl border overflow-hidden bg-card/15",
          isRunning && "border-success/35",
          isQueue && "border-warning/35",
          !isRunning && !isQueue && "border-border/60",
        )}
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className={cn(
              "plan-section-tab w-full flex items-center justify-between gap-4 border-b px-4 py-4 sm:px-5 sm:py-5 text-left transition-colors",
              open
                ? isRunning
                  ? "bg-success/10 border-success/25"
                  : isQueue
                    ? "bg-warning/10 border-warning/25"
                    : "bg-muted/25 border-border/50"
                : isRunning
                  ? "bg-success/5 hover:bg-success/10 border-transparent"
                  : isQueue
                    ? "bg-warning/5 hover:bg-warning/10 border-transparent"
                    : "bg-muted/15 hover:bg-muted/25 border-transparent",
            )}
          >
            <div className="flex min-w-0 items-center gap-3">
              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                  isRunning && "bg-success/15 text-success ring-1 ring-success/20",
                  isQueue && "bg-warning/15 ring-1 ring-warning/20",
                  !isRunning && !isQueue && "bg-primary/15 text-primary",
                  open && !isRunning && !isQueue && "shadow-glow ring-1 ring-primary/25",
                  open && isRunning && "shadow-[0_0_20px_-6px_hsl(var(--success)/0.45)]",
                  open && isQueue && "shadow-[0_0_20px_-6px_hsl(var(--warning)/0.45)]",
                )}
              >
                {iconNode ?? (Icon ? <Icon className={cn("h-5 w-5", iconSpin && "animate-spin")} /> : null)}
              </span>
              <div className="min-w-0">
                <h3 className="font-display text-xl font-bold tracking-tight sm:text-2xl">{title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {count} {count === 1 ? "тест" : count < 5 ? "теста" : "тестов"}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge
                variant="secondary"
                className={cn(
                  "tabular-nums text-sm font-semibold px-2.5 py-0.5 min-w-[1.75rem] justify-center",
                  isRunning && "border-success/30 bg-success/10 text-success",
                  isQueue && "border-warning/30 bg-warning/10 text-warning",
                )}
              >
                {count}
              </Badge>
              <ChevronDown
                className={cn(
                  "h-5 w-5 text-muted-foreground transition-transform duration-200",
                  open && "rotate-180",
                )}
              />
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ul
            className={cn(
              "space-y-3 p-4 sm:p-5 transition-opacity duration-200",
              "[&:has([data-open=true])_[data-open=false]]:opacity-45",
              "[&:has([data-open=true])_[data-open=false]]:hover:opacity-70",
            )}
          >
            {children}
          </ul>
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}

function PlanSection({
  step,
  title,
  children,
  className,
}: {
  step?: number;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/50 bg-muted/10 overflow-hidden",
        className,
      )}
    >
      <div className="border-b border-border/40 bg-muted/20 px-3 py-2.5 sm:px-4">
        <h4 className="font-display text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
          {step != null ? (
            <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-primary/15 text-[10px] font-bold tabular-nums text-primary">
              {step}
            </span>
          ) : null}
          {title}
        </h4>
      </div>
      <div className="space-y-3 p-3 sm:p-4">{children}</div>
    </div>
  );
}

function PlanFieldBlock({
  label,
  value,
  onChange,
  onBlur,
  rows = 3,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-foreground">{label}</p>
      <Textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        className="min-h-0 resize-none text-sm leading-relaxed bg-background/40 border-border/50"
      />
    </div>
  );
}

type StartPayload = {
  owner: string;
  endDate: string | null;
  testMethod: string;
  successCriteria: string;
};

function SetupRow({ label, value }: { label: string; value: string }) {
  if (!value?.trim()) return null;
  return (
    <div className="rounded-lg border border-border/40 bg-background/30 px-3 py-2.5 space-y-1">
      <p className="text-xs font-semibold text-foreground">{label}</p>
      <p className="text-sm text-muted-foreground leading-relaxed break-words">{value}</p>
    </div>
  );
}

function PlanCard({
  index,
  defaultOpen = true,
  hypothesis: h,
  linkedMetric,
  experiment: exp,
  mode,
  onStart,
  onPatchExp,
  onPatchHyp,
  onRemove,
  onFinish,
}: {
  index: number;
  defaultOpen?: boolean;
  hypothesis: Hypothesis;
  linkedMetric: FunnelMetric | null;
  experiment: Experiment | null;
  mode: "queue" | "running";
  onStart: (input: StartPayload) => void;
  onPatchExp: (id: string, patch: Partial<Experiment>) => void;
  onPatchHyp: (patch: Partial<Hypothesis>) => void;
  onRemove: () => void;
  onFinish: (
    experimentId: string,
    after: string,
    result: string,
    decision: ExperimentDecision,
    options?: {
      reflection: string;
      resultNumeric: number | null;
      applyMetricActual?: boolean;
    },
  ) => void;
}) {
  const defaultEnd = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + (h.testDurationDays || 7));
    return d.toISOString().slice(0, 10);
  }, [h.testDurationDays]);

  const [cardOpen, setCardOpen] = useState(defaultOpen);
  const [owner, setOwner] = useState(exp?.owner ?? "");
  const [endDate, setEndDate] = useState(toDateInput(exp?.endDate) || defaultEnd);
  const [method, setMethod] = useState(h.testMethod);
  const [success, setSuccess] = useState(h.successCriteria);
  const [minVol, setMinVol] = useState(h.minDataVolume);

  const [after, setAfter] = useState(exp?.afterValue ?? "");
  const [resultNote, setResultNote] = useState(exp?.result ?? "");
  const [reflection, setReflection] = useState("");
  const [numericAfter, setNumericAfter] = useState("");
  const [applyMetric, setApplyMetric] = useState(false);
  const [decision, setDecision] = useState<ExperimentDecision>(
    exp?.decision && exp.decision !== "pending" ? exp.decision : "scale",
  );

  useEffect(() => {
    if (!exp) return;
    setOwner(exp.owner ?? "");
    setEndDate(toDateInput(exp.endDate) || defaultEnd);
    setAfter(exp.afterValue ?? "");
    setResultNote(exp.result ?? "");
    if (exp.decision && exp.decision !== "pending") setDecision(exp.decision);
  }, [exp, defaultEnd]);

  useEffect(() => {
    setReflection("");
    setNumericAfter("");
    setApplyMetric(false);
  }, [exp?.id]);

  useEffect(() => {
    setMethod(h.testMethod);
    setSuccess(h.successCriteria);
    setMinVol(h.minDataVolume);
  }, [h.testMethod, h.successCriteria, h.minDataVolume]);

  const resolvedResultNum =
    (numericAfter.trim() ? parseMetricNumber(numericAfter) : null) ??
    parseMetricNumber(after);
  const targetNum =
    exp?.targetNumeric ??
    parseMetricNumber(h.targetValue) ??
    linkedMetric?.plannedValue ??
    null;

  const goalPreview =
    linkedMetric && resolvedResultNum != null && targetNum != null
      ? metricGoalMet(resolvedResultNum, targetNum, linkedMetric.direction)
      : ("unknown" as const);

  const handleStart = () => {
    if (!owner.trim()) {
      toast.error("Укажите ответственного");
      return;
    }
    onStart({
      owner: owner.trim(),
      endDate: endDate ? new Date(endDate).toISOString() : null,
      testMethod: method,
      successCriteria: success,
    });
    if (minVol.trim() !== (h.minDataVolume ?? "").trim()) {
      onPatchHyp({ minDataVolume: minVol });
    }
  };

  const handleFinish = () => {
    if (!exp) return;
    if (!after.trim()) {
      toast.error("Укажите факт");
      return;
    }
    if (!reflection.trim()) {
      toast.error('Заполните блок «Вывод»: что узнали и что делаем дальше');
      return;
    }
    const explicitNum = numericAfter.trim() ? parseMetricNumber(numericAfter) : null;
    const parsedNum = explicitNum ?? parseMetricNumber(after);

    onFinish(exp.id, after.trim(), resultNote.trim(), decision, {
      reflection: reflection.trim(),
      resultNumeric: parsedNum,
      applyMetricActual:
        applyMetric && decision === "scale" && linkedMetric != null && parsedNum != null,
    });
  };

  return (
    <li
      data-open={cardOpen ? "true" : "false"}
      className={cn(
        "rounded-xl border overflow-hidden transition-all duration-200",
        cardOpen
          ? "relative z-[1] my-1 border-primary/50 border-l-[3px] border-l-primary bg-card shadow-glow ring-1 ring-primary/25"
          : cn(
              "bg-card/20 border-border/60",
              mode === "running" && "border-primary/35 ring-1 ring-primary/10",
            ),
      )}
    >
      <Collapsible open={cardOpen} onOpenChange={setCardOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className={cn(
              "w-full text-left px-4 py-3 transition-colors",
              cardOpen
                ? "border-b border-primary/20 bg-primary/10 hover:bg-primary/12"
                : "hover:bg-muted/15",
              !cardOpen && mode === "running" && "bg-primary/5",
              !cardOpen && mode === "queue" && "bg-muted/10",
            )}
          >
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold tabular-nums",
                  cardOpen
                    ? "bg-primary/20 text-primary"
                    : "bg-muted/50 text-muted-foreground",
                )}
              >
                {index}
              </span>
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3
                    className={cn(
                      "font-display text-base font-semibold leading-snug tracking-tight break-words",
                      !cardOpen && "line-clamp-2",
                    )}
                  >
                    {h.title}
                  </h3>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {mode === "running" ? (
                      <Badge
                        variant="outline"
                        className="text-[10px] gap-1 border-primary/40 bg-primary/10 text-primary"
                      >
                        <Loader2 className="h-3 w-3 animate-spin" />
                        В работе
                      </Badge>
                    ) : null}
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform",
                        cardOpen && "rotate-180",
                      )}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className="text-[10px] font-medium gap-1 border-primary/35 bg-primary/10 text-primary"
                  >
                    <Target className="h-2.5 w-2.5" />
                    {h.metricName}
                  </Badge>
                  {!cardOpen && mode === "running" && exp ? (
                    <>
                      <Badge variant="secondary" className="text-[10px] font-normal gap-1">
                        <User className="h-2.5 w-2.5" />
                        {exp.owner || "—"}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] font-normal gap-1">
                        <Calendar className="h-2.5 w-2.5" />
                        до {formatShort(exp.endDate)}
                      </Badge>
                    </>
                  ) : null}
                  {!cardOpen && mode === "queue" && owner ? (
                    <Badge variant="secondary" className="text-[10px] font-normal gap-1">
                      <User className="h-2.5 w-2.5" />
                      {owner}
                    </Badge>
                  ) : null}
                </div>
              </div>
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 py-4 space-y-4 bg-card/80">
        {mode === "queue" ? (
          <>
            <PlanSection step={1} title="Кто и когда">
              <div className="grid gap-x-3 gap-y-1.5 sm:grid-cols-2">
                <Label className="text-xs font-semibold text-foreground">Ответственный</Label>
                <Label className="text-xs font-semibold text-foreground">Завершить тест до</Label>

                <div className="relative">
                  <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    className="pl-8 h-10 bg-background/40"
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                    placeholder="Имя"
                  />
                </div>
                <PlanDateField value={endDate} onChange={setEndDate} placeholder="Выберите дату итога" />

                <div className="hidden sm:block" aria-hidden />
                <p className="text-[11px] leading-snug text-muted-foreground pt-0.5">
                  К этой дате смотрим метрику и фиксируем результат
                </p>
              </div>
            </PlanSection>

            <PlanSection step={2} title="Как проверяем">
              <PlanFieldBlock
                label="Метод"
                value={method}
                onChange={setMethod}
                onBlur={() => {
                  if (method !== h.testMethod) onPatchHyp({ testMethod: method });
                }}
                rows={3}
                placeholder="Как запускаем тест"
              />
              <PlanFieldBlock
                label="Критерий успеха"
                value={success}
                onChange={setSuccess}
                onBlur={() => {
                  if (success !== h.successCriteria) onPatchHyp({ successCriteria: success });
                }}
                rows={2}
                placeholder="По каким цифрам поймём, что сработало"
              />
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Мин. объём данных</Label>
                <Input
                  className="h-9 text-sm bg-background/40"
                  value={minVol}
                  onChange={(e) => setMinVol(e.target.value)}
                  placeholder="напр. 3000 показов"
                />
                <p className="text-[11px] text-muted-foreground">
                  При каком минимуме наблюдений можно делать вывод
                </p>
              </div>
            </PlanSection>

            <div className="flex justify-between items-center gap-2 border-t border-border/40 pt-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={onRemove}
                className="text-muted-foreground h-8 px-2"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" className="h-9" onClick={handleStart}>
                <Play className="mr-1.5 h-3.5 w-3.5" />
                Старт
              </Button>
            </div>
          </>
        ) : exp ? (
          <>
            <PlanSection step={1} title="Вводные">
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2 pb-1">
                  <Badge variant="secondary" className="text-[10px] font-normal gap-1">
                    <User className="h-2.5 w-2.5" />
                    {exp.owner || "Без ответственного"}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px] font-normal gap-1">
                    <Calendar className="h-2.5 w-2.5" />
                    до {formatShort(exp.endDate)}
                  </Badge>
                  {exp.startDate ? (
                    <Badge variant="secondary" className="text-[10px] font-normal gap-1">
                      <FlaskConical className="h-2.5 w-2.5" />
                      с {formatShort(exp.startDate)}
                    </Badge>
                  ) : null}
                </div>
                <SetupRow label="Если" value={h.ifChange} />
                <SetupRow label="То" value={h.thenMetric} />
                <SetupRow label="Метод" value={h.testMethod} />
                <SetupRow label="Успех" value={h.successCriteria} />
                {exp.beforeValue ? (
                  <SetupRow label="Было" value={exp.beforeValue} />
                ) : h.currentValue ? (
                  <SetupRow label="Было" value={h.currentValue} />
                ) : null}
                {typeof exp.baselineNumeric === "number" &&
                linkedMetric?.unit &&
                !Number.isNaN(exp.baselineNumeric) ? (
                  <SetupRow
                    label="База (число)"
                    value={`${exp.baselineNumeric}${
                      linkedMetric.unit === "%" || linkedMetric.unit === "x"
                        ? linkedMetric.unit
                        : ` ${linkedMetric.unit}`
                    }`}
                  />
                ) : null}
                {typeof exp.targetNumeric === "number" &&
                linkedMetric?.unit &&
                !Number.isNaN(exp.targetNumeric) ? (
                  <SetupRow
                    label="Цель (число)"
                    value={`${exp.targetNumeric}${
                      linkedMetric.unit === "%" || linkedMetric.unit === "x"
                        ? linkedMetric.unit
                        : ` ${linkedMetric.unit}`
                    }`}
                  />
                ) : null}
                {(exp.minDataVolume ?? h.minDataVolume)?.trim() ? (
                  <SetupRow label="Мин. объём" value={(exp.minDataVolume ?? h.minDataVolume).trim()} />
                ) : null}
              </div>
            </PlanSection>

            <PlanSection step={2} title="Результат" className="border-primary/30">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Факт (текст)</Label>
                  <Input
                    className="h-10 bg-background/40"
                    value={after}
                    onChange={(e) => setAfter(e.target.value)}
                    placeholder="Было 20% → стало 28%"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">
                    Число для учёта (опционально)
                  </Label>
                  <Input
                    className="h-10 bg-background/40 tabular-nums"
                    value={numericAfter}
                    onChange={(e) => setNumericAfter(e.target.value)}
                    placeholder={
                      linkedMetric?.unit
                        ? `напр. 2.4${linkedMetric.unit === "%" ? "%" : ""}`
                        : "если отдельно от текста"
                    }
                  />
                </div>
                {goalPreview !== "unknown" ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">К цели:</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px]",
                        goalPreview === "met"
                          ? "border-success/40 text-success"
                          : "border-warning/50 text-warning",
                      )}
                    >
                      {goalPreview === "met"
                        ? "Порог цели достигнут"
                        : "Ниже порога / не достигнуто"}
                    </Badge>
                  </div>
                ) : linkedMetric ? (
                  <p className="text-[11px] text-muted-foreground">
                    Укажите числовой результат или добавьте цифру в текст факта — тогда сравним с целью
                    автоматически.
                  </p>
                ) : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Решение</Label>
                  <Select
                    value={decision}
                    onValueChange={(v) => setDecision(v as ExperimentDecision)}
                  >
                    <SelectTrigger className="h-9">
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
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-semibold text-foreground">
                    Комментарий к результату{" "}
                    <span className="font-normal text-muted-foreground">(опционально)</span>
                  </Label>
                  <Textarea
                    rows={2}
                    className="text-sm leading-relaxed resize-none bg-background/40"
                    value={resultNote}
                    onChange={(e) => setResultNote(e.target.value)}
                    placeholder="Сухие наблюдения по тесту"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-semibold text-foreground">
                    Вывод: что узнали и что делаем дальше
                  </Label>
                  <Textarea
                    rows={3}
                    className="text-sm leading-relaxed resize-none bg-background/40"
                    value={reflection}
                    onChange={(e) => setReflection(e.target.value)}
                    placeholder="Обязательное поле: урок из теста и следующий шаг"
                  />
                </div>
              </div>
              {decision === "scale" &&
              linkedMetric &&
              resolvedResultNum != null &&
              !Number.isNaN(resolvedResultNum) ? (
                <label className="flex items-start gap-2 rounded-lg border border-border/45 bg-muted/15 px-3 py-2.5 cursor-pointer">
                  <Checkbox
                    checked={applyMetric}
                    onCheckedChange={(c) => setApplyMetric(Boolean(c))}
                    className="mt-0.5"
                  />
                  <span className="text-xs leading-snug text-muted-foreground">
                    Обновить «{linkedMetric.name}»: записать число результата в факт текущего значения
                    метрики ({resolvedResultNum}
                    {linkedMetric.unit === "%" || linkedMetric.unit === "x"
                      ? linkedMetric.unit
                      : linkedMetric.unit
                        ? ` ${linkedMetric.unit}`
                        : ""}
                    )
                  </span>
                </label>
              ) : null}
              <div className="flex justify-end pt-1">
                <Button size="sm" className="h-9" onClick={handleFinish}>
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                  Готово
                </Button>
              </div>
            </PlanSection>
          </>
        ) : null}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </li>
  );
}
