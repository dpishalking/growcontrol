import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  Check,
  FileText,
  Loader2,
  Sparkles,
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
import { HypothesisPickQuiz } from "@/features/hypotheses/HypothesisPickQuiz";
import { getFunnelTypeTemplate } from "@/data/funnelTypes/catalog";
import { hasDirectionsForMetric } from "@/data/hypothesisDirections";
import type { Funnel } from "@/types/funnel";
import type { Hypothesis } from "@/types/hypothesis";
import { getStageLabelForFunnel } from "@/utils/funnelStages";
import { buildDiagnostics, getTopProblemMetrics } from "@/utils/funnelDiagnostics";
import {
  auditDraftsForMetric,
  auditHintForMetric,
  metricWhyTop,
} from "@/lib/hypothesisMetricContext";
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
      title: `${manualDraft.ifChange.slice(0, 72)}… → ${selected.name}`,
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
    nav(`/projects/${projectId}/funnels/${funnel.id}/wizard/prioritization`);
  };

  return (
    <WizardLayout
      funnel={funnel}
      activeStep="hypotheses"
      onBack={() => nav(`/projects/${projectId}/funnels/${funnel.id}/wizard/signals`)}
      onNext={handleNext}
      nextLabel="К приоритизации"
      nextDisabled={backlogCount === 0}
    >
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="text-center space-y-1">
          <h2 className="font-display text-xl font-semibold tracking-tight">С чего начнём?</h2>
          <p className="text-sm text-muted-foreground">
            Топ-3 проблемных метрики → выбор одной → гипотезы из библиотеки или аудита → 1–2 в
            тест
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
                const auditHint = auditHintForMetric(auditReport, m);
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
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                              #{i + 1}
                            </span>
                            <p className="text-sm font-semibold">{m.name}</p>
                            {isBottleneck ? (
                              <span className="chip chip-danger text-[10px]">
                                <Zap className="h-3 w-3 mr-0.5 inline" />
                                Ограничитель
                              </span>
                            ) : null}
                            <span
                              className={cn(
                                "chip text-[10px]",
                                m.status === "red" ? "chip-danger" : "chip-warning",
                              )}
                            >
                              {m.status === "red" ? "ниже плана" : "под угрозой"}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {getStageLabelForFunnel(funnel, m.stage)} · {formatPlanFact(m)}
                          </p>
                          <p className="text-[11px] text-muted-foreground/90">
                            {metricWhyTop(m, i + 1, diag.bottleneck?.id ?? null)}
                          </p>
                          {auditHint ? (
                            <p className="text-[11px] text-primary/90 leading-relaxed whitespace-normal break-words">
                              {auditHint}
                            </p>
                          ) : null}
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
              <div className="space-y-2">
                <p className="text-xs text-center text-muted-foreground">Источник гипотез</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button
                    variant="outline"
                    className="h-auto py-3 flex flex-col items-start gap-1"
                    disabled={generating}
                    onClick={() => void handleGenerateLibrary()}
                  >
                    <span className="flex items-center gap-1.5 text-sm font-medium">
                      {generating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4 text-primary" />
                      )}
                      Из библиотеки
                    </span>
                    <span className="text-[11px] text-muted-foreground font-normal text-left">
                      SMART-шаблоны под «{selected.name}»
                    </span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto py-3 flex flex-col items-start gap-1"
                    disabled={generating || auditDraftCount === 0}
                    onClick={handleImportAudit}
                  >
                    <span className="flex items-center gap-1.5 text-sm font-medium">
                      <FileText className="h-4 w-4 text-primary" />
                      Из аудита
                      {auditDraftCount > 0 ? (
                        <span className="chip chip-primary text-[10px] ml-1">{auditDraftCount}</span>
                      ) : null}
                    </span>
                    <span className="text-[11px] text-muted-foreground font-normal text-left">
                      {auditDraftCount > 0
                        ? "Черновики AI под эту метрику"
                        : "Сначала пройдите AI-аудит"}
                    </span>
                  </Button>
                </div>
                <p className="text-center text-[11px] text-muted-foreground">
                  <button
                    type="button"
                    className="underline hover:text-foreground"
                    onClick={() => setManualOpen(true)}
                  >
                    Добавить вручную
                  </button>
                  {" · "}
                  <button
                    type="button"
                    className="underline hover:text-foreground"
                    onClick={() => {
                      const drafts = hypotheses.filter(
                        (h) => h.metricId === selected.id && h.status === "draft",
                      );
                      if (drafts.length) openQuizWithCandidates([]);
                      else toast.info("Сначала сгенерируйте гипотезы");
                    }}
                  >
                    Выбрать из уже созданных
                  </button>
                </p>
              </div>
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
              <h3 className="font-display text-base font-semibold">
                {selected ? `Гипотезы: ${selected.name}` : "Гипотезы"}
              </h3>
              <span className="text-xs text-muted-foreground">
                в очереди: {activeHypotheses.filter((h) => h.status === "backlog").length}
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
