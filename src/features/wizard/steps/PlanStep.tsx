import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronDown, ChevronRight, Play, StopCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { useAppData } from "@/context/AppDataContext";
import { WizardLayout } from "@/features/wizard/WizardLayout";
import { BUCKET_LABELS, sortByPriority } from "@/utils/icePriority";
import type { Funnel } from "@/types/funnel";
import type { ExperimentDecision } from "@/types/experiment";

const DECISION_OPTIONS: { value: ExperimentDecision; label: string }[] = [
  { value: "scale", label: "Масштабировать" },
  { value: "iterate", label: "Доработать" },
  { value: "rerun", label: "Повторить тест" },
  { value: "stop", label: "Остановить" },
  { value: "archive", label: "В архив" },
];

export function PlanStep({ funnel }: { funnel: Funnel }) {
  const { projectId } = useParams<{ projectId: string }>();
  const nav = useNavigate();
  const {
    funnelHypotheses,
    funnelExperiments,
    experimentByHypothesis,
    startExperimentAction,
    finishExperimentAction,
  } = useAppData();
  const hypotheses = sortByPriority(funnelHypotheses(funnel.id));
  const experiments = funnelExperiments(funnel.id);

  const [openId, setOpenId] = useState<string | null>(null);
  const [finishForm, setFinishForm] = useState<Record<string, { after: string; result: string; decision: ExperimentDecision }>>(
    {},
  );

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
    const form = finishForm[experimentId] ?? { after: "", result: "", decision: "scale" as ExperimentDecision };
    finishExperimentAction(experimentId, form.after, form.result, form.decision);
    toast.success("Результат зафиксирован");
  };

  return (
    <WizardLayout
      funnel={funnel}
      activeStep="plan"
      onBack={() => nav(`/projects/${projectId}/funnels/${funnel.id}/wizard/prioritization`)}
      onNext={() => nav(`/projects/${projectId}/funnels/${funnel.id}`)}
      nextLabel="Открыть карту воронки"
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          План экспериментов на основе приоритетов. Начинайте с верхних быстрых тестов — каждое
          решение после теста меняет статус гипотезы.
        </p>

        {hypotheses.length === 0 ? (
          <p className="text-sm text-muted-foreground">Гипотез ещё нет.</p>
        ) : (
          <ul className="space-y-2">
            {hypotheses.map((h) => {
              const exp = experimentByHypothesis(h.id);
              const open = openId === h.id;
              const form = finishForm[exp?.id ?? ""] ?? { after: "", result: "", decision: "scale" as ExperimentDecision };
              return (
                <li key={h.id} className="rounded-xl border border-border/60 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpenId((prev) => (prev === h.id ? null : h.id))}
                    className="w-full text-left px-3 py-2 flex items-start justify-between gap-3 hover:bg-secondary/30"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{h.title}</p>
                      <p className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px]">
                          ICE {h.priorityScore}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {BUCKET_LABELS[h.bucket].label}
                        </Badge>
                        {h.status === "testing" ? (
                          <Badge variant="secondary" className="text-[10px]">в тесте</Badge>
                        ) : h.status === "success" ? (
                          <Badge className="text-[10px] bg-money text-primary-foreground">сработало</Badge>
                        ) : h.status === "failed" ? (
                          <Badge variant="destructive" className="text-[10px]">не сработало</Badge>
                        ) : null}
                      </p>
                    </div>
                    {open ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                  </button>
                  {open ? (
                    <div className="px-3 pb-3 space-y-3 border-t border-border/40 bg-card/30 text-sm">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Info label="Что меняем" value={h.ifChange} />
                        <Info label="Метрика → цель" value={`${h.metricName} → ${h.targetValue || "—"}`} />
                        <Info label="Почему сработает" value={h.becauseReason} />
                        <Info label="Метод теста" value={h.testMethod} />
                        <Info label="Критерий успеха" value={h.successCriteria} />
                        <Info label="Срок" value={`${h.testDurationDays} дн`} />
                      </div>

                      {exp ? (
                        <Card className="border-money/30 bg-money/5">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Эксперимент в работе</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <p className="text-xs text-muted-foreground">
                              До: <strong>{exp.beforeValue || "—"}</strong>
                            </p>
                            <div className="grid gap-2 sm:grid-cols-3">
                              <div className="space-y-1.5">
                                <Label className="text-xs">После (факт)</Label>
                                <Input
                                  value={form.after}
                                  onChange={(e) =>
                                    setFinishForm((s) => ({
                                      ...s,
                                      [exp.id]: { ...form, after: e.target.value },
                                    }))
                                  }
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs">Результат</Label>
                                <Textarea
                                  rows={1}
                                  value={form.result}
                                  onChange={(e) =>
                                    setFinishForm((s) => ({
                                      ...s,
                                      [exp.id]: { ...form, result: e.target.value },
                                    }))
                                  }
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs">Решение</Label>
                                <Select
                                  value={form.decision}
                                  onValueChange={(v) =>
                                    setFinishForm((s) => ({
                                      ...s,
                                      [exp.id]: { ...form, decision: v as ExperimentDecision },
                                    }))
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
                            <Button size="sm" onClick={() => handleFinish(exp.id)}>
                              <StopCircle className="mr-1 h-4 w-4" />
                              Зафиксировать результат
                            </Button>
                          </CardContent>
                        </Card>
                      ) : (
                        <Button size="sm" onClick={() => handleStart(h.id)}>
                          <Play className="mr-1 h-4 w-4" />
                          Запустить эксперимент
                        </Button>
                      )}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}

        {experiments.length > 0 ? (
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Эксперименты воронки</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              {experiments.map((e) => {
                const h = hypotheses.find((x) => x.id === e.hypothesisId);
                return (
                  <div key={e.id} className="flex items-center justify-between gap-2">
                    <span className="truncate">{h?.title ?? e.hypothesisId}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {e.decision === "pending" ? "идёт" : DECISION_OPTIONS.find((d) => d.value === e.decision)?.label}
                    </Badge>
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-sm">{value || "—"}</p>
    </div>
  );
}
