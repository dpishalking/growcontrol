import { useMemo, useState } from "react";
import { ArrowRight, Check, FileWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Hypothesis } from "@/types/hypothesis";
import type { FunnelMetric } from "@/types/funnelMetric";
import type { Material } from "@/types/material";
import { materialsMatchHint } from "@/lib/hypothesisMetricContext";
import { cn } from "@/lib/utils";

type Props = {
  metric: FunnelMetric;
  candidates: Hypothesis[];
  materials: Material[];
  onComplete: (
    selectedIds: string[],
    patches: Record<string, Partial<Hypothesis>>,
  ) => void;
  onCancel: () => void;
};

type QuizStep = "pick" | "materials" | "success";

export function HypothesisPickQuiz({ metric, candidates, materials, onComplete, onCancel }: Props) {
  const top3 = useMemo(
    () => [...candidates].sort((a, b) => b.priorityScore - a.priorityScore).slice(0, 3),
    [candidates],
  );

  const [step, setStep] = useState<QuizStep>("pick");
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    top3[0] ? [top3[0].id] : [],
  );
  const [checkedMaterials, setCheckedMaterials] = useState<Record<string, boolean>>({});
  const [successCriteria, setSuccessCriteria] = useState(() => buildDefaultSuccess(metric));

  const selectedHypotheses = top3.filter((h) => selectedIds.includes(h.id));
  const allMaterialLabels = useMemo(() => {
    const set = new Set<string>();
    for (const h of selectedHypotheses) {
      for (const m of h.materialsToChange) set.add(m);
    }
    return [...set];
  }, [selectedHypotheses]);

  const togglePick = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const handleNextFromPick = () => {
    if (selectedIds.length === 0) return;
    const init: Record<string, boolean> = {};
    for (const label of allMaterialLabels) init[label] = true;
    setCheckedMaterials(init);
    setStep(allMaterialLabels.length > 0 ? "materials" : "success");
  };

  const handleFinish = () => {
    const patches: Record<string, Partial<Hypothesis>> = {};
    for (const id of selectedIds) {
      const confirmedMaterials = allMaterialLabels.filter((l) => checkedMaterials[l]);
      patches[id] = {
        successCriteria,
        materialsToChange: confirmedMaterials.length ? confirmedMaterials : allMaterialLabels,
      };
    }
    onComplete(selectedIds, patches);
  };

  return (
    <Card className="surface border-primary/25">
      <CardContent className="p-5 sm:p-6 space-y-4">
        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Шаг {step === "pick" ? "1" : step === "materials" ? "2" : "3"} из 3
          </p>
          <h3 className="font-display text-lg font-semibold">
            {step === "pick" && "Какие гипотезы берём в первый тест?"}
            {step === "materials" && "Что будем менять?"}
            {step === "success" && "Критерий успеха"}
          </h3>
          <p className="text-xs text-muted-foreground">
            Метрика: <strong className="text-foreground">{metric.name}</strong> · выберите 1–2
            гипотезы
          </p>
        </div>

        {step === "pick" ? (
          <ul className="space-y-2">
            {top3.map((h, i) => {
              const active = selectedIds.includes(h.id);
              return (
                <li key={h.id}>
                  <button
                    type="button"
                    onClick={() => togglePick(h.id)}
                    className={cn(
                      "w-full text-left rounded-lg border px-3 py-3 transition-colors",
                      active ? "border-primary/50 bg-primary/10" : "border-border/60 hover:border-primary/30",
                    )}
                  >
                    <div className="flex gap-3">
                      <span
                        className={cn(
                          "h-5 w-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5",
                          active ? "bg-primary border-primary" : "border-border",
                        )}
                      >
                        {active ? <Check className="h-3 w-3 text-primary-foreground" /> : null}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground mb-0.5">Топ #{i + 1} · ICE {h.priorityScore}</p>
                        <p className="text-sm font-medium leading-snug">{h.title}</p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{h.ifChange}</p>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}

        {step === "materials" ? (
          <div className="space-y-2">
            {allMaterialLabels.map((label) => {
              const hasMaterial = materials.some((m) => materialsMatchHint(m.title, label));
              return (
                <label
                  key={label}
                  className="flex items-start gap-3 rounded-lg border border-border/60 px-3 py-2.5 cursor-pointer hover:bg-secondary/30"
                >
                  <Checkbox
                    checked={checkedMaterials[label] ?? false}
                    onCheckedChange={(v) =>
                      setCheckedMaterials((prev) => ({ ...prev, [label]: Boolean(v) }))
                    }
                    className="mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{label}</p>
                    {hasMaterial ? (
                      <p className="text-[11px] text-success mt-0.5">Материал загружен</p>
                    ) : (
                      <p className="text-[11px] text-warning mt-0.5 flex items-center gap-1">
                        <FileWarning className="h-3 w-3" />
                        Нет в материалах — добавьте на шаге «Материалы»
                      </p>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        ) : null}

        {step === "success" ? (
          <div className="space-y-2">
            <Label className="text-xs">Успех, если…</Label>
            <Textarea
              rows={3}
              value={successCriteria}
              onChange={(e) => setSuccessCriteria(e.target.value)}
              className="text-sm"
            />
            {selectedHypotheses[0]?.risk ? (
              <p className="text-[11px] text-muted-foreground rounded-lg bg-muted/40 px-3 py-2">
                <strong className="text-foreground">Guardrail:</strong> {selectedHypotheses[0].risk}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Отмена
          </Button>
          {step === "pick" ? (
            <Button
              disabled={selectedIds.length === 0}
              onClick={handleNextFromPick}
              className="bg-gradient-money text-primary-foreground"
            >
              Дальше
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          ) : step === "materials" ? (
            <Button onClick={() => setStep("success")} className="bg-gradient-money text-primary-foreground">
              Дальше
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleFinish} className="bg-gradient-money text-primary-foreground">
              В очередь тестов
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function buildDefaultSuccess(metric: FunnelMetric): string {
  const plan = metric.plannedValue != null ? `${metric.plannedValue}${metric.unit}` : "план";
  const fact = metric.actualValue != null ? `${metric.actualValue}${metric.unit}` : "факт";
  const dir = metric.direction === "lower_better" ? "снизится до" : "достигнет";
  return `«${metric.name}» ${dir} ${plan} (сейчас ${fact}). Соседние метрики не ухудшаются >10%.`;
}
