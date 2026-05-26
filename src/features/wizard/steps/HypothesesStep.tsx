import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertCircle, Check, ChevronDown, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { HypothesisStructure } from "@/features/hypotheses/HypothesisStructure";
import { HYPOTHESIS_TAG_PRESETS } from "@/lib/hypothesisTagPresets";
import { hypothesisDisplayParts, hypothesisEffectPreview } from "@/lib/hypothesisPresentation";
import { WizardLayout } from "@/features/wizard/WizardLayout";
import { useAppData } from "@/context/AppDataContext";
import { getFunnelTypeTemplate } from "@/data/funnelTypes/catalog";
import { auditDraftsForMetric } from "@/lib/hypothesisMetricContext";
import { buildDiagnostics } from "@/utils/funnelDiagnostics";
import { BUCKET_LABELS, BUCKET_ORDER, BUCKET_SECTION_STYLES, groupHypothesesByBucket, sortByPriority } from "@/utils/icePriority";
import type { HypothesisBucket } from "@/types/hypothesis";
import { getStageLabelForFunnel } from "@/utils/funnelStages";
import { cn } from "@/lib/utils";
import type { Funnel } from "@/types/funnel";
import type { FunnelMetric, MetricStatus } from "@/types/funnelMetric";
import type { Hypothesis } from "@/types/hypothesis";

const MAX_SELECTED_PER_METRIC = 3;

const STATUS_DOT: Record<MetricStatus, string> = {
  red: "bg-destructive",
  yellow: "bg-warning",
  green: "bg-success",
  no_data: "bg-muted-foreground/40",
  unreliable: "bg-muted-foreground/40",
};

const STATUS_LABEL: Record<MetricStatus, string> = {
  red: "красная",
  yellow: "жёлтая",
  green: "в норме",
  no_data: "нет данных",
  unreliable: "нет данных",
};

function impactLabel(score: number): string {
  if (score >= 4) return "высокое";
  if (score >= 3) return "среднее";
  return "низкое";
}

export function HypothesesStep({ funnel }: { funnel: Funnel }) {
  const { projectId } = useParams<{ projectId: string }>();
  const nav = useNavigate();
  const {
    funnelMetricsList,
    funnelHypotheses,
    funnelAuditSnapshot,
    generateHypothesesForMetricAction,
    generateAiHypothesesForMetricAction,
    importAuditHypothesesForMetric,
    moveHypothesis,
    addHypothesis,
    deleteHypothesis,
    patchHypothesis,
    setFunnelStep,
  } = useAppData();

  const metrics = funnelMetricsList(funnel.id);
  const hypotheses = funnelHypotheses(funnel.id);
  const auditReport = funnelAuditSnapshot(funnel.id)?.report;
  const typeTemplate = getFunnelTypeTemplate(funnel.funnelTypeId ?? undefined);

  const diag = useMemo(
    () => buildDiagnostics(metrics, typeTemplate.bottleneckMetricNames),
    [metrics, typeTemplate.bottleneckMetricNames],
  );

  const orderedMetrics = useMemo<FunnelMetric[]>(
    () => [
      ...diag.red,
      ...diag.yellow,
      ...diag.noData,
      ...diag.green,
    ],
    [diag],
  );

  const defaultMetricId = useMemo(() => {
    if (diag.bottleneck) return diag.bottleneck.id;
    return orderedMetrics[0]?.id ?? null;
  }, [diag.bottleneck, orderedMetrics]);

  const [selectedMetricId, setSelectedMetricId] = useState<string | null>(defaultMetricId);
  const [generating, setGenerating] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualDraft, setManualDraft] = useState({
    ifChange: "",
    thenMetric: "",
    becauseReason: "",
  });

  useEffect(() => {
    if (!selectedMetricId && defaultMetricId) setSelectedMetricId(defaultMetricId);
  }, [defaultMetricId, selectedMetricId]);

  const currentMetric = useMemo(
    () => orderedMetrics.find((m) => m.id === selectedMetricId) ?? null,
    [orderedMetrics, selectedMetricId],
  );

  const metricHypotheses = useMemo(() => {
    if (!currentMetric) return [];
    return sortByPriority(
      hypotheses.filter(
        (h) =>
          h.metricId === currentMetric.id &&
          h.status !== "parked" &&
          h.status !== "success" &&
          h.status !== "failed",
      ),
    );
  }, [hypotheses, currentMetric]);

  const hypothesesByBucket = useMemo(
    () => groupHypothesesByBucket(metricHypotheses),
    [metricHypotheses],
  );

  const selectedHereCount = metricHypotheses.filter(
    (h) => h.status === "backlog" || h.status === "testing",
  ).length;

  const totalInPlan = hypotheses.filter(
    (h) => h.status === "backlog" || h.status === "testing",
  ).length;

  const auditDraftCount = currentMetric
    ? auditDraftsForMetric(auditReport?.hypotheses ?? [], currentMetric).length
    : 0;

  const handleGenerate = async () => {
    if (!currentMetric) return;
    setGenerating(true);
    try {
      const hasExisting = metricHypotheses.length > 0;
      let added = 0;

      if (!hasExisting) {
        const fromLib = generateHypothesesForMetricAction(currentMetric);
        const fromAudit =
          auditDraftCount > 0 ? importAuditHypothesesForMetric(funnel.id, currentMetric) : [];
        added = fromLib.length + fromAudit.length;
      }

      if (hasExisting || added === 0) {
        const fromAi = await generateAiHypothesesForMetricAction(funnel.id, currentMetric);
        added += fromAi.length;
        if (fromAi.length === 0) {
          toast.info(
            hasExisting
              ? "AI не нашёл новых идей — попробуйте другую метрику или добавьте вручную"
              : "AI не вернул идеи — проверьте материалы и метрики, или добавьте вручную",
          );
          return;
        }
        toast.success(
          `+${fromAi.length} ${fromAi.length === 1 ? "идея от AI" : "идеи от AI"}`,
        );
        return;
      }

      toast.success(`Добавлено ${added} ${added === 1 ? "гипотеза" : "гипотез"}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Не удалось сгенерировать идеи";
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  };

  const handleToggle = (h: Hypothesis) => {
    const isSelected = h.status === "backlog" || h.status === "testing";
    if (isSelected) {
      moveHypothesis(h.id, "draft");
      return;
    }
    if (selectedHereCount >= MAX_SELECTED_PER_METRIC) {
      toast.warning(
        `Максимум ${MAX_SELECTED_PER_METRIC} гипотезы по метрике — снимите одну, чтобы добавить другую`,
      );
      return;
    }
    moveHypothesis(h.id, "backlog");
  };

  const handleAddManual = () => {
    if (!currentMetric || !manualDraft.ifChange.trim()) {
      toast.error("Заполните «если изменим»");
      return;
    }
    addHypothesis({
      funnelId: funnel.id,
      metricId: currentMetric.id,
      metricName: currentMetric.name,
      funnelStage: currentMetric.stage,
      title: manualDraft.ifChange.trim(),
      ifChange: manualDraft.ifChange,
      thenMetric: manualDraft.thenMetric || currentMetric.name,
      becauseReason: manualDraft.becauseReason || "Добавлено вручную",
      testMethod: "A/B или до/после, 7–14 дней",
      successCriteria: `Улучшение «${currentMetric.name}» относительно текущего факта`,
      impact: 3,
      confidence: 3,
      ease: 3,
    });
    setManualDraft({ ifChange: "", thenMetric: "", becauseReason: "" });
    setManualOpen(false);
    toast.success("Гипотеза добавлена");
  };

  const handleNext = () => {
    setFunnelStep(funnel.id, 7);
    nav(`/projects/${projectId}/funnels/${funnel.id}/wizard/plan`);
  };

  if (metrics.length === 0) {
    return (
      <WizardLayout
        funnel={funnel}
        activeStep="hypotheses"
        onBack={() => nav(`/projects/${projectId}/funnels/${funnel.id}/wizard/audit`)}
        nextDisabled
      >
        <Card className="border-dashed border-border/60 max-w-md mx-auto">
          <CardContent className="py-10 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Сначала заполните метрики — без них не из чего собирать гипотезы.
            </p>
            <Button
              variant="outline"
              onClick={() => nav(`/projects/${projectId}/funnels/${funnel.id}/wizard/metrics`)}
            >
              К метрикам
            </Button>
          </CardContent>
        </Card>
      </WizardLayout>
    );
  }

  return (
    <WizardLayout
      funnel={funnel}
      activeStep="hypotheses"
      onBack={() => nav(`/projects/${projectId}/funnels/${funnel.id}/wizard/audit`)}
      onNext={handleNext}
      nextLabel={totalInPlan > 0 ? `В план (${totalInPlan})` : "В план"}
      nextDisabled={totalInPlan === 0}
    >
      <div className="space-y-6 max-w-2xl mx-auto">
        {diag.bottleneck ? (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="p-4 flex gap-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                  Главное слабое место
                </p>
                <p className="font-display text-lg font-semibold tracking-tight mt-1">
                  {diag.bottleneck.name}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {getStageLabelForFunnel(funnel, diag.bottleneck.stage)} · влияние на прибыль:{" "}
                  {impactLabel(diag.bottleneck.revenueImpact)}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border/60 bg-muted/20">
            <CardContent className="p-4 text-sm text-muted-foreground">
              Красных метрик нет — можно усилить любую зону или выбрать метрику ниже.
            </CardContent>
          </Card>
        )}

        <section className="rounded-2xl border border-border/60 bg-card/15 overflow-hidden">
          <div className="border-b border-border/50 bg-muted/15 px-4 py-4 sm:px-5">
            <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl">
              Какую метрику чиним?
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {diag.bottleneck
                ? "Система выбрала самую проблемную метрику — можно поменять."
                : "Выберите метрику — увидите идеи под неё. Отметьте 1–3 — пойдут в план."}
            </p>
          </div>
          <div className="space-y-2 p-4 sm:p-5">
            <Label className="text-xs text-muted-foreground">Метрика</Label>
            <Select
              value={selectedMetricId ?? undefined}
              onValueChange={(v) => setSelectedMetricId(v)}
            >
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Выберите метрику" />
              </SelectTrigger>
              <SelectContent>
                {orderedMetrics.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    <span className="flex items-center gap-2">
                      <span
                        className={cn("inline-block h-2 w-2 rounded-full", STATUS_DOT[m.status])}
                      />
                      <span>{m.name}</span>
                      <span className="text-xs text-muted-foreground">
                        · {STATUS_LABEL[m.status]}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {currentMetric ? (
              <p className="text-xs text-muted-foreground tabular-nums">
                План{" "}
                {currentMetric.plannedValue != null
                  ? `${currentMetric.plannedValue}${currentMetric.unit}`
                  : "—"}{" "}
                · Факт{" "}
                {currentMetric.actualValue != null
                  ? `${currentMetric.actualValue}${currentMetric.unit}`
                  : "—"}
              </p>
            ) : null}
          </div>
        </section>

        {currentMetric ? (
          <section className="rounded-2xl border border-border/60 bg-card/15 overflow-hidden">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/50 bg-muted/15 px-4 py-4 sm:px-5">
              <div className="min-w-0">
                <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl">
                  Гипотезы
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Сгруппированы по ICE — начните с «Быстрых тестов». Выбрано{" "}
                  <span className="font-medium text-foreground">{selectedHereCount}</span> /{" "}
                  {MAX_SELECTED_PER_METRIC}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setManualOpen(true)}
                  title="Добавить вручную"
                >
                  <Plus className="h-4 w-4" />
                </Button>
                {metricHypotheses.length > 0 ? (
                  <Button size="sm" onClick={() => void handleGenerate()} disabled={generating}>
                    {generating ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="mr-1.5 h-4 w-4" />
                    )}
                    {generating ? "Генерирую…" : "Ещё идеи"}
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="p-4 sm:p-5 space-y-4">
              {metricHypotheses.length === 0 ? (
                <>
                  <Button
                    size="lg"
                    className="w-full bg-gradient-money text-primary-foreground"
                    onClick={() => void handleGenerate()}
                    disabled={generating}
                  >
                    {generating ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 h-4 w-4" />
                    )}
                    {generating ? "Генерирую…" : "Сгенерировать гипотезы"}
                  </Button>
                  {generating ? (
                    <div className="rounded-xl border border-border/50 bg-muted/15 px-6 py-10 flex flex-col items-center gap-3">
                      <div className="relative">
                        <div className="h-12 w-12 rounded-full border-2 border-primary/20" />
                        <Loader2 className="absolute inset-0 m-auto h-6 w-6 animate-spin text-primary" />
                      </div>
                      <p className="text-sm font-medium">Собираем идеи под «{currentMetric.name}»</p>
                      <p className="text-xs text-muted-foreground text-center max-w-xs">
                        AI смотрит метрики и материалы · обычно 15–45 сек
                      </p>
                    </div>
                  ) : (
                    <Card className="border-dashed border-border/60 bg-transparent shadow-none">
                      <CardContent className="py-8 text-center space-y-2">
                        <Sparkles className="h-6 w-6 mx-auto text-muted-foreground opacity-70" />
                        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                          AI предложит идеи под «{currentMetric.name}»
                          {auditDraftCount > 0 ? " (плюс идеи из аудита)" : ""}.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <div className="space-y-4">
                  {BUCKET_ORDER.filter((bucket) => hypothesesByBucket[bucket]?.length).map(
                    (bucket) => (
                      <HypoBucketGroup
                        key={bucket}
                        bucket={bucket}
                        hypotheses={hypothesesByBucket[bucket]!}
                        defaultOpen={bucket === "quick_test" || bucket === "strategic"}
                        onToggle={handleToggle}
                        onDelete={deleteHypothesis}
                        onPatchHypothesis={patchHypothesis}
                      />
                    ),
                  )}
                </div>
              )}
            </div>
          </section>
        ) : null}

        {totalInPlan === 0 ? (
          <p className="text-center text-xs text-muted-foreground">
            Отметьте 1–3 гипотезы галочкой — тогда сможем перейти к плану
          </p>
        ) : null}
      </div>

      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Гипотеза вручную</DialogTitle>
          </DialogHeader>
          {currentMetric ? (
            <p className="text-xs text-muted-foreground -mt-2">
              Метрика: <strong className="text-foreground">{currentMetric.name}</strong>
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
                placeholder={currentMetric?.name}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">…потому что</Label>
              <Input
                value={manualDraft.becauseReason}
                onChange={(e) =>
                  setManualDraft((d) => ({ ...d, becauseReason: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleAddManual}>Добавить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </WizardLayout>
  );
}

function HypoBucketGroup({
  bucket,
  hypotheses,
  defaultOpen = true,
  onToggle,
  onDelete,
  onPatchHypothesis,
}: {
  bucket: HypothesisBucket;
  hypotheses: Hypothesis[];
  defaultOpen?: boolean;
  onToggle: (h: Hypothesis) => void;
  onDelete: (id: string) => void;
  onPatchHypothesis: (id: string, patch: Partial<Hypothesis>) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const styles = BUCKET_SECTION_STYLES[bucket];
  const meta = BUCKET_LABELS[bucket];
  const count = hypotheses.length;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <section className={cn("rounded-xl border overflow-hidden", styles.border)}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className={cn(
              "w-full flex items-center justify-between gap-3 border-b px-4 py-3 text-left transition-colors",
              styles.headerBg,
              open ? "border-border/40" : "border-transparent",
            )}
          >
            <div className="min-w-0">
              <h3 className={cn("font-display text-base font-bold tracking-tight sm:text-lg", styles.accent)}>
                {meta.label}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">{meta.hint}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge variant="secondary" className="tabular-nums text-xs font-semibold">
                {count}
              </Badge>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform duration-200",
                  open && "rotate-180",
                )}
              />
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ul className="space-y-2 p-3 sm:p-4">
            {hypotheses.map((h) => (
              <HypoCard
                key={h.id}
                hypothesis={h}
                onToggle={() => onToggle(h)}
                onDelete={() => onDelete(h.id)}
                onPatch={(patch) => onPatchHypothesis(h.id, patch)}
              />
            ))}
          </ul>
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}

function IceSliderRow({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: number;
  onCommit: (v: number) => void;
}) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums text-foreground font-medium">{local}</span>
      </div>
      <Slider
        min={1}
        max={5}
        step={1}
        value={[local]}
        onValueChange={(v) => setLocal(v[0] ?? local)}
        onValueCommit={(v) => onCommit(v[0] ?? local)}
      />
    </div>
  );
}

function HypothesisExtras({
  h,
  onPatch,
  withTopBorder,
}: {
  h: Hypothesis;
  onPatch: (patch: Partial<Hypothesis>) => void;
  withTopBorder?: boolean;
}) {
  return (
    <div
      className={cn(
        "space-y-4",
        withTopBorder && "mt-3 pt-3 border-t border-border/40",
      )}
    >
      <div>
        <p className="text-[11px] font-semibold text-foreground mb-2">Приоритет ICE (1–5)</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <IceSliderRow
            label="Impact"
            value={h.impact}
            onCommit={(impact) => onPatch({ impact })}
          />
          <IceSliderRow
            label="Confidence"
            value={h.confidence}
            onCommit={(confidence) => onPatch({ confidence })}
          />
          <IceSliderRow label="Ease" value={h.ease} onCommit={(ease) => onPatch({ ease })} />
        </div>
      </div>
      <div>
        <p className="text-[11px] font-semibold text-foreground mb-1.5">Теги</p>
        <div className="flex flex-wrap gap-1.5">
          {HYPOTHESIS_TAG_PRESETS.map((tag) => {
            const on = h.tags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() =>
                  onPatch({
                    tags: on
                      ? h.tags.filter((t) => t !== tag)
                      : [...h.tags, tag],
                  })
                }
                className={cn(
                  "text-[10px] px-2 py-0.5 rounded-full border transition-colors",
                  on
                    ? "bg-primary/15 border-primary/45 text-primary"
                    : "border-border/50 text-muted-foreground hover:border-primary/30",
                )}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-[11px]">Мин. объём данных</Label>
        <Input
          className="h-8 text-xs"
          value={h.minDataVolume}
          onChange={(e) => onPatch({ minDataVolume: e.target.value })}
          placeholder="напр. 3000 показов, 500 сессий"
        />
      </div>
    </div>
  );
}

function HypoCard({
  hypothesis: h,
  onToggle,
  onDelete,
  onPatch,
}: {
  hypothesis: Hypothesis;
  onToggle: () => void;
  onDelete: () => void;
  onPatch: (patch: Partial<Hypothesis>) => void;
}) {
  const [open, setOpen] = useState(false);
  const isSelected = h.status === "backlog" || h.status === "testing";
  const parts = hypothesisDisplayParts(h);
  const effectPreview = hypothesisEffectPreview(parts.thenMetric);
  const ifDetail =
    parts.ifChange && parts.ifChange !== h.title.trim() ? parts.ifChange : null;
  const hasNarrativeDetails = Boolean(
    ifDetail || parts.becauseReason || parts.testMethod || parts.successCriteria,
  );
  const hasExpandable = hasNarrativeDetails || isSelected;

  const cardBody = (
    <div
      className={cn(
        "px-4 py-3.5",
        isSelected ? "bg-primary/10" : "bg-muted/20",
      )}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={isSelected}
          aria-label={isSelected ? "Убрать из плана" : "Добавить в план"}
          className={cn(
            "mt-0.5 h-5 w-5 rounded-md border flex items-center justify-center shrink-0 transition-colors",
            isSelected
              ? "bg-primary border-primary"
              : "border-border/70 bg-background/40 hover:border-primary/40",
          )}
        >
          {isSelected ? <Check className="h-3.5 w-3.5 text-primary-foreground" /> : null}
        </button>

        <div className="min-w-0 flex-1 space-y-2">
          <button type="button" onClick={onToggle} className="w-full text-left">
            <h3 className="font-display text-base font-semibold leading-snug tracking-tight break-words sm:text-[1.05rem]">
              {h.title}
            </h3>
            {effectPreview ? (
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed line-clamp-2">
                <span className="text-success/90 font-medium">→ </span>
                {effectPreview}
              </p>
            ) : null}
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] tabular-nums text-muted-foreground">
              ICE {h.priorityScore}
            </span>
            {h.tags.length > 0
              ? h.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[9px] px-1.5 py-px rounded border border-border/50 text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))
              : null}
            {h.status === "testing" ? (
              <Badge className="text-[10px] bg-primary/20 text-primary border-primary/40">
                В тесте
              </Badge>
            ) : null}
            {hasExpandable ? (
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                >
                  <ChevronDown
                    className={cn("h-3 w-3 transition-transform", open && "rotate-180")}
                  />
                  {open
                    ? "Свернуть"
                    : hasNarrativeDetails
                      ? "Подробнее"
                      : "ICE и теги"}
                </button>
              </CollapsibleTrigger>
            ) : null}
            {!isSelected ? (
              <button
                type="button"
                onClick={onDelete}
                className="ml-auto text-[11px] text-muted-foreground hover:text-destructive inline-flex items-center gap-1"
              >
                <Trash2 className="h-3 w-3" />
                Удалить
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {hasExpandable ? (
        <CollapsibleContent className="pt-3 pl-8">
          {hasNarrativeDetails ? (
            <div className="rounded-lg border border-border/40 bg-muted/10 px-3 py-2.5 mb-0">
              <HypothesisStructure
                ifText={ifDetail}
                thenText={!effectPreview ? parts.thenMetric : null}
                becauseText={parts.becauseReason}
                testMethod={parts.testMethod}
                successCriteria={parts.successCriteria}
                compact
              />
            </div>
          ) : null}
          {isSelected ? (
            <HypothesisExtras
              h={h}
              onPatch={onPatch}
              withTopBorder={hasNarrativeDetails}
            />
          ) : null}
        </CollapsibleContent>
      ) : null}
    </div>
  );

  return (
    <li
      className={cn(
        "rounded-xl border overflow-hidden transition-all",
        isSelected
          ? "border-primary/60 bg-primary/5 shadow-glow"
          : "border-border/60 bg-card/30 hover:border-primary/30",
      )}
    >
      {hasExpandable ? (
        <Collapsible open={open} onOpenChange={setOpen}>
          {cardBody}
        </Collapsible>
      ) : (
        cardBody
      )}
    </li>
  );
}
