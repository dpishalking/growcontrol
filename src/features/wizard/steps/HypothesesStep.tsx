import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  Check,
  Target,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAppData } from "@/context/AppDataContext";
import { WizardLayout } from "@/features/wizard/WizardLayout";
import { HypothesisCard } from "@/features/hypotheses/HypothesisCard";
import { HypothesisSourcePanel } from "@/features/hypotheses/HypothesisSourcePanel";
import { HypothesisPickQuiz } from "@/features/hypotheses/HypothesisPickQuiz";
import { getFunnelTypeTemplate } from "@/data/funnelTypes/catalog";
import { hasDirectionsForMetric } from "@/data/hypothesisDirections";
import type { Funnel } from "@/types/funnel";
import type { Hypothesis } from "@/types/hypothesis";
import { getStageLabelForFunnel } from "@/utils/funnelStages";
import { buildDiagnostics, getTopProblemMetrics } from "@/utils/funnelDiagnostics";
import { auditDraftsForMetric } from "@/lib/hypothesisMetricContext";
import type { FunnelMetric } from "@/types/funnelMetric";
import { cn } from "@/lib/utils";

export function HypothesesStep({ funnel }: { funnel: Funnel }) {
  const { projectId } = useParams<{ projectId: string }>();
  const nav = useNavigate();
  const {
    funnelMetricsList,
    funnelHypotheses,
    funnelMaterials,
    funnelAuditSnapshot,
    generateHypothesesForMetricAction,
    importAuditHypothesesForMetric,
    finalizeHypothesisSelectionAction,
    addHypothesis,
    deleteHypothesis,
    setFunnelStep,
  } = useAppData();

  const metrics = funnelMetricsList(funnel.id);
  const materials = funnelMaterials(funnel.id);
  const hypotheses = funnelHypotheses(funnel.id);
  const auditReport = funnelAuditSnapshot(funnel.id)?.report;
  const typeTemplate = getFunnelTypeTemplate(funnel.funnelTypeId ?? undefined);
  const diag = useMemo(
    () => buildDiagnostics(metrics, typeTemplate.bottleneckMetricNames),
    [metrics, typeTemplate.bottleneckMetricNames],
  );
  const topMetrics = useMemo(() => getTopProblemMetrics(metrics, 3), [metrics]);
  const materialsHref = `/projects/${projectId}/funnels/${funnel.id}/wizard/materials`;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizCandidates, setQuizCandidates] = useState<Hypothesis[]>([]);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualDraft, setManualDraft] = useState({
    ifChange: "",
    thenMetric: "",
    becauseReason: "",
  });

  const selected = useMemo(() => {
    if (selectedId) {
      const found = topMetrics.find((m) => m.id === selectedId);
      if (found) return found;
    }
    return topMetrics[0] ?? null;
  }, [selectedId, topMetrics]);

  const auditDraftCount = selected
    ? auditDraftsForMetric(auditReport?.hypotheses ?? [], selected).length
    : 0;

  const activeHypotheses = useMemo(() => {
    if (!selected) return hypotheses.filter((h) => h.status !== "parked");
    return hypotheses.filter(
      (h) => h.metricId === selected.id && h.status !== "parked",
    );
  }, [hypotheses, selected]);

  const backlogCount = hypotheses.filter((h) => h.status === "backlog").length;

  const formatPlanFact = (m: FunnelMetric) => {
    const plan = m.plannedValue != null ? `${m.plannedValue}${m.unit}` : "—";
    const fact = m.actualValue != null ? `${m.actualValue}${m.unit}` : "—";
    return `План ${plan} · Факт ${fact}`;
  };

  const openQuizWithCandidates = (created: Hypothesis[]) => {
    if (!selected) return;
    const pool = [
      ...created,
      ...hypotheses.filter(
        (h) =>
          h.metricId === selected.id &&
          h.status === "draft" &&
          !created.some((c) => c.id === h.id),
      ),
    ];
    if (pool.length === 0) {
      toast.info("Новых гипотез нет — возможно, уже сгенерированы ранее");
      return;
    }
    setQuizCandidates(pool);
    setQuizOpen(true);
  };

  const handleGenerateLibrary = async () => {
    if (!selected) return;
    setGenerating(true);
    try {
      const created = generateHypothesesForMetricAction(selected);
      if (created.length === 0) {
        toast.info(
          hasDirectionsForMetric(selected.name)
            ? "Откройте квиз — возможно, гипотезы уже есть"
            : "Для этой метрики пока нет шаблонов",
        );
        const existing = hypotheses.filter(
          (h) => h.metricId === selected.id && h.status === "draft",
        );
        if (existing.length) openQuizWithCandidates([]);
        return;
      }
      toast.success(`+${created.length} из библиотеки`);
      openQuizWithCandidates(created);
    } finally {
      setGenerating(false);
    }
  };

  const handleImportAudit = () => {
    if (!selected) return;
    setGenerating(true);
    try {
      const created = importAuditHypothesesForMetric(funnel.id, selected);
      if (created.length === 0) {
        toast.info("Нет новых гипотез из аудита для этой метрики");
        return;
      }
      toast.success(`+${created.length} из AI-аудита`);
      openQuizWithCandidates(created);
    } finally {
      setGenerating(false);
    }
  };

  const handleQuizComplete = (
    selectedIds: string[],
    patches: Record<string, Partial<Hypothesis>>,
  ) => {
    if (!selected) return;
    finalizeHypothesisSelectionAction(funnel.id, selected.id, selectedIds, patches);
    setQuizOpen(false);
    setQuizCandidates([]);
    toast.success(
      selectedIds.length === 1
        ? "1 гипотеза в очереди на тест"
        : `${selectedIds.length} гипотезы в очереди`,
    );
  };

  const handleAddManual = () => {
    if (!selected || !manualDraft.ifChange.trim()) {
      toast.error("Заполните «если изменим»");
      return;
    }
    const h = addHypothesis({
      funnelId: funnel.id,
      metricId: selected.id,
      metricName: selected.name,
      funnelStage: selected.stage,
      title: manualDraft.ifChange.trim(),
      ifChange: manualDraft.ifChange,
      thenMetric: manualDraft.thenMetric || selected.name,
      becauseReason: manualDraft.becauseReason || "Добавлено вручную",
      testMethod: "A/B или до/после, 7–14 дней",
      successCriteria: `Улучшение «${selected.name}» относительно текущего факта`,
      impact: 3,
      confidence: 3,
      ease: 3,
    });
    setManualDraft({ ifChange: "", thenMetric: "", becauseReason: "" });
    setManualOpen(false);
    openQuizWithCandidates([h]);
  };

  const handleNext = () => {
    setFunnelStep(funnel.id, 8);
    nav(`/projects/${projectId}/funnels/${funnel.id}/wizard/plan`);
  };

  return (
    <WizardLayout
      funnel={funnel}
      activeStep="hypotheses"
      onBack={() => nav(`/projects/${projectId}/funnels/${funnel.id}/wizard/signals`)}
      onNext={handleNext}
      nextLabel="К плану тестов"
      nextDisabled={backlogCount === 0}
    >
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="text-center space-y-1">
          <h2 className="font-display text-xl font-semibold tracking-tight">С чего начнём?</h2>
          <p className="text-sm text-muted-foreground">
            ТОП-3 баттлнека, над которыми рекомендую сфокусироваться сразу
          </p>
        </div>

        {topMetrics.length === 0 ? (
          <Card className="border-dashed border-border/60">
            <CardContent className="py-10 text-center space-y-3">
              <Target className="h-8 w-8 mx-auto text-muted-foreground opacity-70" />
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Нет красных или жёлтых метрик. Заполните план и факт на шаге «Метрики».
              </p>
              <Button
                variant="outline"
                onClick={() => nav(`/projects/${projectId}/funnels/${funnel.id}/wizard/metrics`)}
              >
                К метрикам
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <ul className="space-y-2">
              {topMetrics.map((m, i) => {
                const active = selected?.id === m.id;
                const isBottleneck = diag.bottleneck?.id === m.id;
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(m.id);
                        setQuizOpen(false);
                      }}
                      className={cn(
                        "w-full text-left rounded-xl border px-4 py-3 transition-all",
                        active
                          ? "border-primary/50 bg-primary/10 shadow-glow"
                          : "border-border/60 bg-card/40 hover:border-primary/30",
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground tabular-nums">
                              #{i + 1}
                            </span>
                            <p className="text-sm font-semibold leading-snug">{m.name}</p>
                            {isBottleneck ? (
                              <span className="chip chip-danger text-[10px]">
                                <Zap className="h-3 w-3 mr-0.5 inline" />
                                Ограничитель
                              </span>
                            ) : (
                              <span
                                className={cn(
                                  "chip text-[10px]",
                                  m.status === "red" ? "chip-danger" : "chip-warning",
                                )}
                              >
                                {m.status === "red" ? "ниже плана" : "под угрозой"}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground tabular-nums">
                            {formatPlanFact(m)}
                          </p>
                        </div>
                        {active ? (
                          <span className="h-6 w-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                            <Check className="h-3.5 w-3.5 text-primary-foreground" />
                          </span>
                        ) : null}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>

            {selected ? (
              <HypothesisSourcePanel
                generating={generating}
                auditDraftCount={auditDraftCount}
                hasLibrary={hasDirectionsForMetric(selected.name)}
                onLibrary={() => void handleGenerateLibrary()}
                onAudit={handleImportAudit}
                onManual={() => setManualOpen(true)}
                onPickExisting={() => {
                  const drafts = hypotheses.filter(
                    (h) => h.metricId === selected.id && h.status === "draft",
                  );
                  if (drafts.length) openQuizWithCandidates([]);
                  else toast.info("Сначала сгенерируйте гипотезы");
                }}
              />
            ) : null}
          </>
        )}

        {quizOpen && selected ? (
          <HypothesisPickQuiz
            metric={selected}
            candidates={quizCandidates.length ? quizCandidates : activeHypotheses}
            materials={materials}
            onComplete={handleQuizComplete}
            onCancel={() => setQuizOpen(false)}
          />
        ) : null}

        {activeHypotheses.length > 0 ? (
          <section className="space-y-3 pt-2 border-t border-border/60">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-medium">Список идей</h3>
              <span className="text-xs text-muted-foreground tabular-nums">
                {activeHypotheses.length} · в тест{" "}
                {activeHypotheses.filter((h) => h.status === "backlog").length}
              </span>
            </div>
            <ul className="space-y-2">
              {activeHypotheses.map((h) => (
                <HypothesisCard
                  key={h.id}
                  hypothesis={h}
                  stageLabel={getStageLabelForFunnel(funnel, h.funnelStage)}
                  materials={materials}
                  materialsStepHref={materialsHref}
                  onDelete={() => deleteHypothesis(h.id)}
                />
              ))}
            </ul>
          </section>
        ) : null}

        {topMetrics.length > 0 && backlogCount === 0 ? (
          <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1">
            <ArrowRight className="h-3 w-3" />
            Сгенерируйте гипотезы и выберите 1–2 в квизе — тогда можно идти дальше
          </p>
        ) : null}
      </div>

      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Гипотеза вручную</DialogTitle>
          </DialogHeader>
          {selected ? (
            <p className="text-xs text-muted-foreground -mt-2">
              Метрика: <strong className="text-foreground">{selected.name}</strong>
            </p>
          ) : null}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Если изменим…</Label>
              <Textarea
                rows={2}
                value={manualDraft.ifChange}
                onChange={(e) => setManualDraft((d) => ({ ...d, ifChange: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">…то улучшим</Label>
              <Input
                value={manualDraft.thenMetric}
                onChange={(e) => setManualDraft((d) => ({ ...d, thenMetric: e.target.value }))}
                placeholder={selected?.name}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">…потому что</Label>
              <Input
                value={manualDraft.becauseReason}
                onChange={(e) => setManualDraft((d) => ({ ...d, becauseReason: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleAddManual} className="bg-gradient-money text-primary-foreground">
              Добавить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </WizardLayout>
  );
}
