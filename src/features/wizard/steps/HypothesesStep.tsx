import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Check, ChevronDown, Plus, Sparkles, Trash2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { HypothesisStructure } from "@/features/hypotheses/HypothesisStructure";
import { hypothesisDisplayParts } from "@/lib/hypothesisPresentation";
import { WizardLayout } from "@/features/wizard/WizardLayout";
import { getFunnelTypeTemplate } from "@/data/funnelTypes/catalog";
import { auditDraftsForMetric } from "@/lib/hypothesisMetricContext";
import { buildDiagnostics } from "@/utils/funnelDiagnostics";
import { BUCKET_LABELS, sortByPriority } from "@/utils/icePriority";
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
  unreliable: "низкая достоверность",
};

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
      ...diag.unreliable,
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
    setFunnelStep(funnel.id, 8);
    nav(`/projects/${projectId}/funnels/${funnel.id}/wizard/plan`);
  };

  if (metrics.length === 0) {
    return (
      <WizardLayout
        funnel={funnel}
        activeStep="hypotheses"
        onBack={() => nav(`/projects/${projectId}/funnels/${funnel.id}/wizard/signals`)}
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
      onBack={() => nav(`/projects/${projectId}/funnels/${funnel.id}/wizard/signals`)}
      onNext={handleNext}
      nextLabel={totalInPlan > 0 ? `В план (${totalInPlan})` : "В план"}
      nextDisabled={totalInPlan === 0}
    >
      <div className="space-y-5 max-w-2xl mx-auto">
        <div className="text-center space-y-1">
          <h2 className="font-display text-xl font-semibold tracking-tight">
            Какую метрику чиним?
          </h2>
          <p className="text-sm text-muted-foreground">
            Выберите метрику — увидите идеи под неё. Отметьте 1–3 — пойдут в план.
          </p>
        </div>

        <div className="space-y-2">
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
                    <span className={cn("inline-block h-2 w-2 rounded-full", STATUS_DOT[m.status])} />
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

        {currentMetric ? (
          <>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                Выбрано{" "}
                <span className="font-medium text-foreground">{selectedHereCount}</span> /{" "}
                {MAX_SELECTED_PER_METRIC} по этой метрике
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setManualOpen(true)}
                  title="Добавить вручную"
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Button size="sm" onClick={() => void handleGenerate()} disabled={generating}>
                  <Sparkles className="mr-1.5 h-4 w-4" />
                  {generating
                    ? "Генерирую…"
                    : metricHypotheses.length === 0
                      ? "Сгенерировать"
                      : "Ещё идеи"}
                </Button>
              </div>
            </div>

            {metricHypotheses.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-10 text-center space-y-2">
                  <Sparkles className="h-6 w-6 mx-auto text-muted-foreground opacity-70" />
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    Нажмите «Сгенерировать» — AI предложит идеи под эту метрику
                    {auditDraftCount > 0 ? " (плюс идеи из аудита)" : ""}.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <ul className="space-y-2">
                {metricHypotheses.map((h) => (
                  <HypoCard
                    key={h.id}
                    hypothesis={h}
                    onToggle={() => handleToggle(h)}
                    onDelete={() => deleteHypothesis(h.id)}
                  />
                ))}
              </ul>
            )}
          </>
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

function HypoCard({
  hypothesis: h,
  onToggle,
  onDelete,
}: {
  hypothesis: Hypothesis;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const isSelected = h.status === "backlog" || h.status === "testing";
  const parts = hypothesisDisplayParts(h);
  const hasExtraDetails = Boolean(parts.testMethod || parts.successCriteria);

  return (
    <li
      className={cn(
        "rounded-xl border overflow-hidden transition-all",
        isSelected
          ? "border-primary/60 bg-primary/5 shadow-glow"
          : "border-border/60 bg-card/30 hover:border-primary/30",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left px-4 py-3 flex items-start gap-3"
      >
        <span
          className={cn(
            "mt-0.5 h-5 w-5 rounded-md border flex items-center justify-center shrink-0 transition-colors",
            isSelected ? "bg-primary border-primary" : "border-border/70",
          )}
        >
          {isSelected ? <Check className="h-3.5 w-3.5 text-primary-foreground" /> : null}
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm font-medium leading-relaxed break-words">{h.title}</p>
          <HypothesisStructure
            ifText={
              parts.ifChange && parts.ifChange !== h.title.trim() ? parts.ifChange : null
            }
            thenText={parts.thenMetric}
            becauseText={parts.becauseReason}
            compact
          />
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="secondary" className="text-[10px]">
              ICE {h.priorityScore}
            </Badge>
            <span className="text-[11px] text-muted-foreground">
              {BUCKET_LABELS[h.bucket].label}
            </span>
            {h.status === "testing" ? (
              <Badge className="text-[10px] bg-primary/20 text-primary border-primary/40">
                В тесте
              </Badge>
            ) : null}
          </div>
        </div>
      </button>

      {hasExtraDetails ? (
        <Collapsible open={open} onOpenChange={setOpen}>
          <div className="px-4 pb-3">
            <div className="flex items-center justify-between gap-2">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <ChevronDown
                    className={cn("h-3 w-3 transition-transform", open && "rotate-180")}
                  />
                  {open ? "Свернуть" : "Как проверить"}
                </button>
              </CollapsibleTrigger>
              {!isSelected ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="text-[11px] text-muted-foreground hover:text-destructive flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" />
                  Удалить
                </button>
              ) : null}
            </div>
            <CollapsibleContent>
              <div className="pt-3 border-t border-border/40 mt-3">
                <HypothesisStructure
                  ifText={null}
                  testMethod={parts.testMethod}
                  successCriteria={parts.successCriteria}
                  compact
                />
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      ) : (
        !isSelected ? (
          <div className="px-4 pb-3 flex justify-end">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="text-[11px] text-muted-foreground hover:text-destructive flex items-center gap-1"
            >
              <Trash2 className="h-3 w-3" />
              Удалить
            </button>
          </div>
        ) : null
      )}
    </li>
  );
}
