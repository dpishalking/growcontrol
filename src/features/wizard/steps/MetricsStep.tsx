import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronsDownUp, ChevronsUpDown, ChevronDown, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppData } from "@/context/AppDataContext";
import { WizardLayout } from "@/features/wizard/WizardLayout";
import {
  buildInitialOpenStages,
  MetricStageCollapsible,
} from "@/features/wizard/MetricStageCollapsible";
import { getFunnelTypeTemplate } from "@/data/funnelTypes/catalog";
import type { Funnel } from "@/types/funnel";
import { getStagesForFunnel } from "@/utils/funnelStages";
import { groupMetricsByFunnelStages } from "@/utils/metricStageGrouping";
import { cn } from "@/lib/utils";
import type {
  MetricConfidence,
  MetricDirection,
} from "@/types/funnelMetric";

type Draft = {
  stage: string;
  name: string;
  unit: string;
  period: string;
  plannedValue: string;
  actualValue: string;
  direction: MetricDirection;
  confidence: MetricConfidence;
  dataSource: string;
  comment: string;
  revenueImpact: number;
};

const EMPTY_DRAFT: Draft = {
  stage: "traffic",
  name: "",
  unit: "",
  period: "Месяц",
  plannedValue: "",
  actualValue: "",
  direction: "higher_better",
  confidence: "medium",
  dataSource: "",
  comment: "",
  revenueImpact: 3,
};

function parseNum(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number(value.replace(",", ".").replace(/\s+/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function MetricsStep({ funnel }: { funnel: Funnel }) {
  const { projectId } = useParams<{ projectId: string }>();
  const nav = useNavigate();
  const {
    funnelMetricsList,
    addFunnelMetric,
    patchFunnelMetric,
    deleteFunnelMetric,
    setFunnelStep,
    seedFunnelMetrics,
  } = useAppData();
  const metrics = funnelMetricsList(funnel.id);
  const stages = getStagesForFunnel(funnel);
  const typeTemplate = getFunnelTypeTemplate(funnel.funnelTypeId ?? undefined);
  const metricCatalog = [...typeTemplate.requiredMetrics, ...typeTemplate.optionalMetrics];

  const keyMetricNames = useMemo(
    () =>
      new Set(
        metricCatalog
          .filter((c) => c.required && c.revenueImpact >= 4)
          .map((c) => c.name),
      ),
    [metricCatalog],
  );

  const [showAllMetrics, setShowAllMetrics] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const stageGroups = useMemo(
    () =>
      groupMetricsByFunnelStages(
        stages,
        metrics,
        metricCatalog,
        typeTemplate.planFactMetrics,
        typeTemplate.auditQuestions,
      ),
    [stages, metrics, metricCatalog, typeTemplate.planFactMetrics, typeTemplate.auditQuestions],
  );

  const stagesWithData = stageGroups.filter((g) =>
    g.items.some((m) => m.actualValue != null || m.plannedValue != null),
  ).length;

  const visibleStageGroups = useMemo(
    () => stageGroups.filter((group) => group.items.length > 0),
    [stageGroups],
  );

  const displayStageGroups = useMemo(() => {
    if (showAllMetrics) return visibleStageGroups;
    return visibleStageGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((m) => keyMetricNames.has(m.name)),
      }))
      .filter((group) => group.items.length > 0);
  }, [visibleStageGroups, showAllMetrics, keyMetricNames]);

  const hiddenMetricsCount = useMemo(
    () => metrics.filter((m) => !keyMetricNames.has(m.name)).length,
    [metrics, keyMetricNames],
  );

  const stageInitRef = useRef<string | null>(null);
  const [openStages, setOpenStages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (stageInitRef.current === funnel.id) return;
    if (!visibleStageGroups.length) return;
    stageInitRef.current = funnel.id;
    setOpenStages(buildInitialOpenStages(stageGroups));
  }, [funnel.id, stageGroups, visibleStageGroups.length]);

  const setStageOpen = (stageId: string, open: boolean) => {
    setOpenStages((prev) => ({ ...prev, [stageId]: open }));
  };

  const expandAllStages = () => {
    setOpenStages(Object.fromEntries(visibleStageGroups.map((g) => [g.stage.id, true])));
  };

  const collapseAllStages = () => {
    setOpenStages(Object.fromEntries(visibleStageGroups.map((g) => [g.stage.id, false])));
  };

  const openStageCount = visibleStageGroups.filter((g) => openStages[g.stage.id]).length;

  const [draft, setDraft] = useState<Draft>({
    ...EMPTY_DRAFT,
    stage: stages[0]?.id ?? "traffic",
  });

  const catalogForStage = useMemo(
    () => metricCatalog.filter((c) => c.stageId === draft.stage),
    [metricCatalog, draft.stage],
  );

  useEffect(() => {
    if (funnel.funnelTypeId && funnel.funnelTypeId !== "custom") {
      seedFunnelMetrics(funnel.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [funnel.id, funnel.funnelTypeId]);

  const handleApplyTemplate = (templateName: string) => {
    const tpl = metricCatalog.find((c) => c.stageId === draft.stage && c.name === templateName);
    if (!tpl) return;
    setDraft((d) => ({
      ...d,
      name: tpl.name,
      unit: tpl.unit,
      direction: tpl.direction,
      revenueImpact: tpl.revenueImpact,
    }));
  };

  const handleAdd = () => {
    if (!draft.name.trim()) {
      toast.error("Имя метрики обязательно");
      return;
    }
    addFunnelMetric({
      funnelId: funnel.id,
      stage: draft.stage,
      name: draft.name,
      unit: draft.unit,
      period: draft.period,
      plannedValue: parseNum(draft.plannedValue),
      actualValue: parseNum(draft.actualValue),
      direction: draft.direction,
      confidence: draft.confidence,
      dataSource: draft.dataSource,
      comment: draft.comment,
      revenueImpact: draft.revenueImpact,
    });
    setDraft((d) => ({
      ...EMPTY_DRAFT,
      stage: d.stage,
    }));
    toast.success("Метрика добавлена");
  };

  const handleNext = () => {
    setFunnelStep(funnel.id, 5);
    nav(`/projects/${projectId}/funnels/${funnel.id}/wizard/audit`);
  };

  return (
    <WizardLayout
      funnel={funnel}
      activeStep="metrics"
      onBack={() => nav(`/projects/${projectId}/funnels/${funnel.id}/wizard/materials`)}
      onNext={handleNext}
      nextLabel="К аудиту"
      nextDisabled={metrics.length === 0}
    >
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="font-display text-xl font-semibold tracking-tight">Метрики воронки</h2>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
            Сначала заполните план и факт для ключевых метрик — этого достаточно для анализа.
            Остальные можно добавить позже.
          </p>
          {metrics.length > 0 ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <p className="text-xs text-muted-foreground">
                Заполнено этапов: {stagesWithData} / {stageGroups.length}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground"
                  onClick={expandAllStages}
                >
                  <ChevronsDownUp className="mr-1 h-3.5 w-3.5" />
                  Развернуть все
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground"
                  onClick={collapseAllStages}
                  disabled={openStageCount === 0}
                >
                  <ChevronsUpDown className="mr-1 h-3.5 w-3.5" />
                  Свернуть все
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-3">
          {displayStageGroups.map((group) => (
            <MetricStageCollapsible
              key={group.stage.id}
              group={group}
              open={openStages[group.stage.id] ?? false}
              onOpenChange={(open) => setStageOpen(group.stage.id, open)}
              onPatch={patchFunnelMetric}
              onDelete={deleteFunnelMetric}
            />
          ))}
          {!showAllMetrics && hiddenMetricsCount > 0 ? (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setShowAllMetrics(true)}
            >
              Показать все метрики (+{hiddenMetricsCount})
            </Button>
          ) : null}
        </div>

        <Card id="metric-add-form" className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Добавить метрику</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Этап воронки</Label>
                  <Select
                    value={draft.stage}
                    onValueChange={(v) => setDraft((d) => ({ ...d, stage: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {stages.map((s, i) => (
                        <SelectItem key={s.id} value={s.id}>
                          {i + 1}. {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {catalogForStage.length > 0 ? (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Шаблон</Label>
                    <Select onValueChange={handleApplyTemplate}>
                      <SelectTrigger>
                        <SelectValue placeholder="Выбрать шаблон" />
                      </SelectTrigger>
                      <SelectContent>
                        {catalogForStage.map((c) => (
                          <SelectItem key={c.name} value={c.name}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
                <div className="space-y-1.5">
                  <Label className="text-xs">Период</Label>
                  <Input
                    value={draft.period}
                    onChange={(e) => setDraft((d) => ({ ...d, period: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Название</Label>
                  <Input
                    value={draft.name}
                    onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                    placeholder="Например: CTR"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Единица</Label>
                  <Input
                    value={draft.unit}
                    onChange={(e) => setDraft((d) => ({ ...d, unit: e.target.value }))}
                    placeholder="%, ₽, шт"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Направление</Label>
                  <Select
                    value={draft.direction}
                    onValueChange={(v) =>
                      setDraft((d) => ({ ...d, direction: v as MetricDirection }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="higher_better">Больше — лучше</SelectItem>
                      <SelectItem value="lower_better">Меньше — лучше</SelectItem>
                      <SelectItem value="range">Диапазон</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">План</Label>
                  <Input
                    value={draft.plannedValue}
                    onChange={(e) => setDraft((d) => ({ ...d, plannedValue: e.target.value }))}
                    placeholder="2,5"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Факт</Label>
                  <Input
                    value={draft.actualValue}
                    onChange={(e) => setDraft((d) => ({ ...d, actualValue: e.target.value }))}
                    placeholder="1,9"
                  />
                </div>
              </div>

              <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <ChevronDown
                      className={cn("h-3.5 w-3.5 transition-transform", advancedOpen && "rotate-180")}
                    />
                    Расширенные настройки
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 pt-2">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Уверенность в данных</Label>
                      <Select
                        value={draft.confidence}
                        onValueChange={(v) =>
                          setDraft((d) => ({ ...d, confidence: v as MetricConfidence }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="high">Высокая</SelectItem>
                          <SelectItem value="medium">Средняя</SelectItem>
                          <SelectItem value="low">Низкая</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-xs">Источник данных</Label>
                      <Input
                        value={draft.dataSource}
                        onChange={(e) => setDraft((d) => ({ ...d, dataSource: e.target.value }))}
                        placeholder="Я.Метрика, рекламный кабинет, CRM"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Влияние на деньги (1–5)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={5}
                      value={draft.revenueImpact}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, revenueImpact: Number(e.target.value) || 3 }))
                      }
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Комментарий</Label>
                    <Textarea
                      rows={2}
                      value={draft.comment}
                      onChange={(e) => setDraft((d) => ({ ...d, comment: e.target.value }))}
                      placeholder="Откуда цифры, контекст, замечания"
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <Button onClick={handleAdd} size="sm">
                <Plus className="mr-1 h-4 w-4" />
                Добавить
              </Button>
          </CardContent>
        </Card>
      </div>
    </WizardLayout>
  );
}
