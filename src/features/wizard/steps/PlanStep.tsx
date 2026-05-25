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
import { sortByPriority } from "@/utils/icePriority";
import { cn } from "@/lib/utils";
import type { Funnel } from "@/types/funnel";
import type { Experiment, ExperimentDecision } from "@/types/experiment";
import type { Hypothesis } from "@/types/hypothesis";

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
    experimentByHypothesis,
    startExperimentAction,
    patchExperiment,
    finishExperimentAction,
    patchHypothesis,
    moveHypothesis,
    setFunnelStep,
  } = useAppData();

  const hypotheses = funnelHypotheses(funnel.id);

  const queued = useMemo(
    () =>
      sortByPriority(hypotheses.filter((h) => h.status === "backlog")),
    [hypotheses],
  );
  const running = useMemo(
    () =>
      sortByPriority(hypotheses.filter((h) => h.status === "testing")),
    [hypotheses],
  );
  const done = useMemo(
    () => hypotheses.filter((h) => h.status === "success" || h.status === "failed"),
    [hypotheses],
  );

  const handleNext = () => {
    setFunnelStep(funnel.id, 8);
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
        <div className="text-center space-y-1">
          <h2 className="font-display text-xl font-semibold tracking-tight">План тестов</h2>
          <p className="text-sm text-muted-foreground">
            Сначала назначьте — потом запустите — в конце зафиксируйте результат
          </p>
        </div>

        {!empty ? (
          <div className="flex flex-wrap justify-center gap-2">
            {queued.length > 0 ? (
              <Badge variant="secondary" className="text-xs font-normal">
                {queued.length} в очереди
              </Badge>
            ) : null}
            {running.length > 0 ? (
              <Badge className="text-xs font-normal bg-primary/15 text-primary border-primary/30">
                {running.length} в работе
              </Badge>
            ) : null}
          </div>
        ) : null}

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
          <div className="space-y-6">
            {queued.length > 0 ? (
              <PlanGroup
                icon={ClipboardList}
                title="Очередь"
                hint="Назначьте ответственного и срок — затем «Старт»"
              >
                {queued.map((h, i) => (
                  <PlanCard
                    key={h.id}
                    index={i + 1}
                    defaultOpen={queued.length === 1 || i === 0}
                    hypothesis={h}
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
                      toast.success("Тест запущен");
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
                title="В работе"
                hint="Когда срок подошёл — внесите факт и решение"
              >
                {running.map((h, i) => (
                  <PlanCard
                    key={h.id}
                    index={i + 1}
                    defaultOpen={running.length === 1 || i === 0}
                    hypothesis={h}
                    experiment={experimentByHypothesis(h.id)}
                    mode="running"
                    onStart={() => {}}
                    onPatchExp={patchExperiment}
                    onPatchHyp={(patch) => patchHypothesis(h.id, patch)}
                    onRemove={() => {}}
                    onFinish={(experimentId, after, result, decision) => {
                      finishExperimentAction(experimentId, after, result, decision);
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
                <ul className="px-4 pb-3 space-y-2 border-t border-border/40 pt-3">
                  {done.map((h) => (
                    <li
                      key={h.id}
                      className="flex justify-between items-center gap-2 text-xs py-1"
                    >
                      <span className="line-clamp-1 min-w-0">{h.title}</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "shrink-0 text-[10px]",
                          h.status === "success"
                            ? "border-success/40 text-success"
                            : "border-destructive/40 text-destructive",
                        )}
                      >
                        {h.status === "success" ? "✓" : "✗"}
                      </Badge>
                    </li>
                  ))}
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
  iconSpin,
  title,
  hint,
  children,
}: {
  icon: typeof ClipboardList;
  iconSpin?: boolean;
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-start gap-2 px-1">
        <Icon
          className={cn(
            "h-4 w-4 text-primary mt-0.5 shrink-0",
            iconSpin && "animate-spin",
          )}
        />
        <div>
          <h3 className="text-sm font-medium">{title}</h3>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
      </div>
      <ul className="space-y-3">{children}</ul>
    </section>
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
    <div className={cn("rounded-lg bg-muted/20 border border-border/40 p-3 space-y-2.5", className)}>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1.5">
        {step != null ? (
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-muted text-[9px] tabular-nums">
            {step}
          </span>
        ) : null}
        {title}
      </p>
      {children}
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
    <div className="grid grid-cols-[5.5rem_1fr] gap-2 text-xs">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-foreground/90 leading-relaxed break-words">{value}</span>
    </div>
  );
}

function PlanCard({
  index,
  defaultOpen = true,
  hypothesis: h,
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
  ) => void;
}) {
  const defaultEnd = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + (h.testDurationDays || 7));
    return d.toISOString().slice(0, 10);
  }, [h.testDurationDays]);

  const [cardOpen, setCardOpen] = useState(defaultOpen);
  const [methodOpen, setMethodOpen] = useState(false);
  const [owner, setOwner] = useState(exp?.owner ?? "");
  const [endDate, setEndDate] = useState(toDateInput(exp?.endDate) || defaultEnd);
  const [method, setMethod] = useState(h.testMethod);
  const [success, setSuccess] = useState(h.successCriteria);

  const [after, setAfter] = useState(exp?.afterValue ?? "");
  const [resultNote, setResultNote] = useState(exp?.result ?? "");
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
    setMethod(h.testMethod);
    setSuccess(h.successCriteria);
  }, [h.testMethod, h.successCriteria]);

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
  };

  const handleFinish = () => {
    if (!exp) return;
    if (!after.trim()) {
      toast.error("Укажите факт");
      return;
    }
    onFinish(exp.id, after.trim(), resultNote.trim(), decision);
  };

  return (
    <li
      className={cn(
        "rounded-xl border bg-card/25 overflow-hidden",
        mode === "running"
          ? "border-primary/45 shadow-glow ring-1 ring-primary/20"
          : "border-border/60",
      )}
    >
      <Collapsible open={cardOpen} onOpenChange={setCardOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className={cn(
              "w-full text-left px-4 py-3 transition-colors hover:bg-muted/10",
              cardOpen ? "border-b border-border/40" : "",
              mode === "running" ? "bg-primary/5" : "bg-muted/10",
            )}
          >
            <div className="flex items-start gap-2.5">
              <span className="text-[10px] tabular-nums text-muted-foreground pt-1 w-4 shrink-0">
                {index}
              </span>
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <p
                    className={cn(
                      "text-sm font-medium leading-relaxed break-words",
                      !cardOpen && "line-clamp-2",
                    )}
                  >
                    {h.title}
                  </p>
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
                  <Badge variant="outline" className="text-[10px] font-normal gap-1">
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

        <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
          <div className="px-4 py-3 space-y-3">
        {mode === "queue" ? (
          <>
            <PlanSection step={1} title="Кто и когда">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Ответственный</Label>
                  <div className="relative">
                    <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      className="pl-8 h-9"
                      value={owner}
                      onChange={(e) => setOwner(e.target.value)}
                      placeholder="Имя"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Срок</Label>
                  <div className="relative">
                    <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                      className="pl-8 h-9"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </PlanSection>

            <Collapsible open={methodOpen} onOpenChange={setMethodOpen}>
              <PlanSection step={2} title="Как проверяем">
                {!methodOpen && method ? (
                  <p className="text-xs text-muted-foreground leading-relaxed break-words">{method}</p>
                ) : null}
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="text-[11px] text-primary/80 hover:text-primary flex items-center gap-1"
                  >
                    <ChevronDown
                      className={cn("h-3 w-3 transition-transform", methodOpen && "rotate-180")}
                    />
                    {methodOpen ? "Свернуть" : "Изменить метод и критерий"}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 pt-1">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Метод</Label>
                    <Input
                      className="h-9 text-sm"
                      value={method}
                      onChange={(e) => setMethod(e.target.value)}
                      onBlur={() => {
                        if (method !== h.testMethod) onPatchHyp({ testMethod: method });
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Успех =</Label>
                    <Input
                      className="h-9 text-sm"
                      value={success}
                      onChange={(e) => setSuccess(e.target.value)}
                      onBlur={() => {
                        if (success !== h.successCriteria) onPatchHyp({ successCriteria: success });
                      }}
                    />
                  </div>
                </CollapsibleContent>
              </PlanSection>
            </Collapsible>

            <div className="flex justify-between items-center pt-1 gap-2">
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
              </div>
            </PlanSection>

            <PlanSection step={2} title="Результат" className="border-primary/25 bg-primary/5">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Факт</Label>
                <Input
                  className="h-9"
                  value={after}
                  onChange={(e) => setAfter(e.target.value)}
                  placeholder="Было 20% → стало 28%"
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Решение</Label>
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
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-[11px] text-muted-foreground">Вывод (необязательно)</Label>
                  <Textarea
                    rows={2}
                    className="text-sm resize-none"
                    value={resultNote}
                    onChange={(e) => setResultNote(e.target.value)}
                    placeholder="Что узнали"
                  />
                </div>
              </div>
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
