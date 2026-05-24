import { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Download,
  FileJson,
  Sparkles,
  TrendingDown,
  Wrench,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type {
  FunnelAuditHypothesisDraft,
  FunnelAuditReport,
} from "@/types/funnelAudit";
import type { FunnelMetric } from "@/types/funnelMetric";
import { downloadFunnelAuditJson, downloadFunnelAuditMarkdown } from "@/lib/funnelAuditExport";
import { cn } from "@/lib/utils";
import {
  METRIC_STATUS_LABEL,
  STAGE_STATUS_LABEL,
  buildStageAuditViews,
  unassignedHypotheses,
  type StageAuditStatus,
} from "./auditStageModel";

const STATUS_STYLE: Record<StageAuditStatus, string> = {
  critical: "border-destructive/50 bg-destructive/10 text-destructive",
  bad: "border-warning/50 bg-warning/10 text-warning",
  weak: "border-primary/40 bg-primary/10 text-primary",
  ok: "border-border/60 bg-muted/20 text-muted-foreground",
  good: "border-success/40 bg-success/10 text-success",
};

const STATUS_DOTS: Record<StageAuditStatus, number> = {
  critical: 3,
  bad: 2,
  weak: 2,
  ok: 1,
  good: 1,
};

function statusDots(status: string): number {
  return STATUS_DOTS[status as StageAuditStatus] ?? 1;
}

const SEV_LABEL: Record<string, string> = {
  critical: "Критично",
  important: "Важно",
  minor: "Можно улучшить",
};

type Props = {
  report: FunnelAuditReport;
  stages: { id: string; label: string; description?: string }[];
  metrics: FunnelMetric[];
  funnelName?: string;
  typeName?: string;
  generatedAt?: string;
  metricsInSync?: boolean;
  onImportHypotheses?: (drafts: FunnelAuditHypothesisDraft[]) => void;
};

export function FunnelAuditReport({
  report,
  stages,
  metrics,
  funnelName,
  typeName,
  generatedAt,
  metricsInSync = true,
  onImportHypotheses,
}: Props) {
  const stageViews = useMemo(
    () => buildStageAuditViews(report, stages, metrics),
    [report, stages, metrics],
  );
  const looseHypotheses = useMemo(
    () => unassignedHypotheses(report.hypotheses, stageViews),
    [report.hypotheses, stageViews],
  );

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const stageRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const exportBase = useMemo(
    () => (funnelName ? funnelName.replace(/\s+/g, "-").slice(0, 40) : "funnel-audit"),
    [funnelName],
  );

  const toggleHypothesis = (index: number, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(index);
      else next.delete(index);
      return next;
    });
  };

  const handleImportSelected = () => {
    if (!onImportHypotheses || !report.hypotheses?.length) return;
    const drafts = report.hypotheses.filter((_, i) => selected.has(i));
    if (!drafts.length) return;
    onImportHypotheses(drafts);
    setSelected(new Set());
  };

  const scrollToStage = (stageId: string) => {
    stageRefs.current[stageId]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleMd = () =>
    downloadFunnelAuditMarkdown(report, `${exportBase}-audit`, {
      funnelName,
      typeName,
      generatedAt,
    });
  const handleJson = () => downloadFunnelAuditJson(report, `${exportBase}-audit`);

  const mainStage =
    stageViews.length > 0
      ? stageViews.reduce(
          (best, s) => (statusDots(s.status) > statusDots(best.status) ? s : best),
          stageViews[0],
        )
      : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4 text-primary shrink-0" />
          <span>
            AI-аудит
            {generatedAt ? ` · ${new Date(generatedAt).toLocaleString("ru-RU")}` : ""}
          </span>
          {metricsInSync ? (
            <Badge variant="outline" className="border-success/40 bg-success/10 text-success text-[11px]">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Метрики синхронизированы
            </Badge>
          ) : (
            <Badge variant="outline" className="border-warning/40 bg-warning/10 text-warning text-[11px]">
              <AlertTriangle className="mr-1 h-3 w-3" />
              Нужен перезапуск
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleMd}>
            <Download className="mr-1.5 h-4 w-4" />
            Полный отчёт (.md)
          </Button>
          <Button size="sm" variant="outline" onClick={handleJson}>
            <FileJson className="mr-1.5 h-4 w-4" />
            JSON
          </Button>
        </div>
      </div>

      {/* Лид-карточка */}
      <Card className="border-primary/35 bg-primary/5 shadow-glow">
        <CardContent className="p-5 sm:p-6 space-y-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-primary/90 font-medium mb-2">
              Главный диагноз
            </p>
            <p className="text-lg sm:text-xl font-semibold leading-snug">
              {report.diagnosis.mainProblem}
            </p>
          </div>

          {mainStage && mainStage.status !== "ok" && mainStage.status !== "good" ? (
            <p className="text-sm leading-relaxed">
              Главная утечка — этап{" "}
              <button
                type="button"
                className="font-medium text-primary underline-offset-2 hover:underline"
                onClick={() => scrollToStage(mainStage.stageId)}
              >
                «{mainStage.stageLabel}»
              </button>
              {mainStage.leakHint ? `: ${mainStage.leakHint}` : ""}
            </p>
          ) : null}

          <p className="text-sm text-muted-foreground leading-relaxed flex items-start gap-2">
            <TrendingDown className="h-5 w-5 shrink-0 text-warning mt-0.5" />
            <span>
              {report.diagnosis.mainMoneyLeak}
              {report.diagnosis.estimatedLossPercent ? (
                <> · ~{report.diagnosis.estimatedLossPercent}</>
              ) : null}
            </span>
          </p>

          {report.diagnosis.mainLever ? (
            <div className="rounded-lg border border-border/50 bg-background/40 p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1.5">
                Если делать одно
              </p>
              <p className="text-base leading-relaxed">{report.diagnosis.mainLever}</p>
            </div>
          ) : report.quickestWin ? (
            <div className="rounded-lg border border-success/30 bg-success/5 p-4 flex gap-3">
              <Zap className="h-5 w-5 text-success shrink-0 mt-0.5" />
              <div>
                <p className="text-xs uppercase tracking-wider text-success font-medium mb-1">
                  Быстрая победа
                </p>
                <p className="text-base font-medium leading-snug">{report.quickestWin.action}</p>
                <p className="text-sm text-muted-foreground mt-1">{report.quickestWin.expectedEffect}</p>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Карта этапов */}
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
          Карта воронки
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
          {stageViews.map((s) => (
            <button
              key={s.stageId}
              type="button"
              onClick={() => scrollToStage(s.stageId)}
              className={cn(
                "shrink-0 rounded-lg border px-3 py-2 text-left transition-colors hover:border-primary/40 hover:bg-primary/5",
                STATUS_STYLE[s.status] ?? STATUS_STYLE.ok,
              )}
            >
              <p className="text-[10px] tabular-nums opacity-70">{s.index}</p>
              <p className="text-xs font-medium leading-tight max-w-[7rem] line-clamp-2">
                {s.stageLabel}
              </p>
              <div className="flex gap-0.5 mt-1.5">
                {Array.from({ length: statusDots(s.status) }).map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      s.status === "critical" || s.status === "bad"
                        ? "bg-current"
                        : s.status === "weak"
                          ? "bg-current opacity-80"
                          : "bg-current opacity-60",
                    )}
                  />
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Блоки по этапам */}
      <div className="space-y-5">
        {stageViews.map((view) => {
          const hasContent =
            view.metrics.length > 0 ||
            view.audit?.problem ||
            view.audit?.howToFix ||
            view.hypotheses.length > 0;
          if (!hasContent && (view.status === "ok" || view.status === "good")) return null;

          return (
            <div
              key={view.stageId}
              ref={(el) => {
                stageRefs.current[view.stageId] = el;
              }}
              id={`audit-stage-${view.stageId}`}
              className="scroll-mt-4"
            >
              <StageCard
                view={view}
                selected={selected}
                onToggleHypothesis={toggleHypothesis}
              />
            </div>
          );
        })}
      </div>

      {looseHypotheses.length > 0 ? (
        <Card className="border-border/60">
          <CardContent className="p-5 space-y-3">
            <p className="text-base font-semibold">Общие гипотезы</p>
            {looseHypotheses.map(({ draft, index }) => (
              <HypothesisRow
                key={index}
                draft={draft}
                checked={selected.has(index)}
                onCheckedChange={(c) => toggleHypothesis(index, c)}
              />
            ))}
          </CardContent>
        </Card>
      ) : null}

      {report.crossMaterialMismatches?.length ? (
        <Card>
          <CardContent className="p-5 space-y-3">
            <p className="text-base font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Расхождения между этапами
            </p>
            {report.crossMaterialMismatches.map((m, i) => (
              <div key={i} className="rounded-xl border border-border/60 p-4 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{SEV_LABEL[m.severity] ?? m.severity}</Badge>
                  <span className="text-sm font-medium">{m.title}</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{m.detail}</p>
                <p className="text-sm leading-relaxed">
                  <span className="text-primary font-medium">→ </span>
                  {m.fix}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {report.problems?.length ? (
        <ProblemsAccordion problems={report.problems} />
      ) : null}

      {report.hypotheses?.length && onImportHypotheses ? (
        <div className="sticky bottom-2 z-10 rounded-xl border border-primary/30 bg-background/95 backdrop-blur p-4 flex flex-wrap items-center justify-between gap-3 shadow-lg">
          <p className="text-sm">
            {selected.size > 0 ? (
              <>
                Выбрано <strong>{selected.size}</strong> из {report.hypotheses.length} гипотез
              </>
            ) : (
              <>Отметьте гипотезы в блоках этапов — импортируйте только те, в которые верите</>
            )}
          </p>
          <div className="flex gap-2">
            {selected.size > 0 ? (
              <Button variant="outline" size="sm" onClick={() => setSelected(new Set())}>
                Сбросить
              </Button>
            ) : null}
            <Button
              size="sm"
              disabled={selected.size === 0}
              onClick={handleImportSelected}
              className="bg-gradient-money text-primary-foreground"
            >
              <Sparkles className="mr-1.5 h-4 w-4" />
              {selected.size > 0 ? `Импорт ${selected.size}` : "Импорт выбранных"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StageCard({
  view,
  selected,
  onToggleHypothesis,
}: {
  view: ReturnType<typeof buildStageAuditViews>[number];
  selected: Set<number>;
  onToggleHypothesis: (index: number, checked: boolean) => void;
}) {
  const { audit } = view;

  return (
    <Card
      className={cn(
        "border-border/60 overflow-hidden",
        view.status === "critical" && "border-destructive/40",
        view.status === "bad" && "border-warning/35",
      )}
    >
      <div className="px-5 py-4 border-b border-border/40 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold tabular-nums">
            {view.index}
          </span>
          <div className="min-w-0">
            <p className="text-base font-semibold leading-tight">{view.stageLabel}</p>
            {view.leakHint ? (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{view.leakHint}</p>
            ) : null}
          </div>
        </div>
        <Badge variant="outline" className={cn("shrink-0", STATUS_STYLE[view.status] ?? STATUS_STYLE.ok)}>
          {STAGE_STATUS_LABEL[view.status] ?? view.status}
        </Badge>
      </div>

      <CardContent className="p-5 space-y-5">
        {view.metrics.length > 0 ? (
          <section className="space-y-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              Цифры этапа
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {view.metrics.map((m) => (
                <div
                  key={m.id}
                  className="rounded-lg border border-border/50 px-3 py-2.5 space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{m.name}</p>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {METRIC_STATUS_LABEL[m.status]}
                    </Badge>
                  </div>
                  <p className="text-sm tabular-nums">
                    <span className="font-semibold">{m.actualValue ?? "—"}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      / {m.plannedValue ?? "—"} {m.unit}
                    </span>
                  </p>
                  {m.comment ? (
                    <p className="text-xs text-muted-foreground leading-relaxed">{m.comment}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {audit?.problem ? (
          <section className="space-y-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              Что не так
            </p>
            <p className="text-base leading-relaxed">{audit.problem}</p>
            {audit.whyImportant ? (
              <p className="text-sm text-muted-foreground leading-relaxed">{audit.whyImportant}</p>
            ) : null}
          </section>
        ) : null}

        {audit?.howToFix ? (
          <section className="space-y-2">
            <p className="text-xs uppercase tracking-wider text-primary font-medium flex items-center gap-1.5">
              <Wrench className="h-3.5 w-3.5" />
              Что покрутить
            </p>
            <p className="text-base leading-relaxed">{audit.howToFix}</p>
            {audit.rewriteExample ? (
              <div className="rounded-lg bg-muted/40 p-3 text-sm leading-relaxed border border-border/40">
                <p className="text-[10px] uppercase text-muted-foreground mb-1">Пример переписывания</p>
                {audit.rewriteExample}
              </div>
            ) : null}
          </section>
        ) : null}

        {view.hypotheses.length > 0 ? (
          <section className="space-y-2 pt-1 border-t border-border/40">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium pt-3">
              Кандидаты в гипотезы
            </p>
            <div className="space-y-2">
              {view.hypotheses.map(({ draft, index }) => (
                <HypothesisRow
                  key={index}
                  draft={draft}
                  checked={selected.has(index)}
                  onCheckedChange={(c) => onToggleHypothesis(index, c)}
                />
              ))}
            </div>
          </section>
        ) : null}

        {!view.metrics.length && !audit?.problem && !audit?.howToFix ? (
          <p className="text-sm text-muted-foreground">По этому этапу замечаний нет.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function HypothesisRow({
  draft,
  checked,
  onCheckedChange,
}: {
  draft: FunnelAuditHypothesisDraft;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={cn(
        "flex gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
        checked ? "border-primary/50 bg-primary/5" : "border-border/50 hover:border-border",
      )}
    >
      <Checkbox checked={checked} onCheckedChange={(v) => onCheckedChange(v === true)} className="mt-0.5" />
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-[10px]">
            {draft.priority}
          </Badge>
          <span className="text-sm font-medium leading-snug">{draft.title}</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{draft.why}</p>
        <p className="text-xs flex items-center gap-1 text-foreground/80">
          <ChevronRight className="h-3 w-3 shrink-0" />
          {draft.expectedImpact} · {draft.metricName}
        </p>
      </div>
    </label>
  );
}

function ProblemsAccordion({ problems }: { problems: FunnelAuditReport["problems"] }) {
  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="all-problems" className="border rounded-xl px-4">
        <AccordionTrigger className="text-base py-4 hover:no-underline">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            Все проблемы ({problems.length}) — подробности
          </span>
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pb-4">
          {problems.map((p, i) => (
            <div key={i} className="rounded-lg border border-border/50 p-4 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{SEV_LABEL[p.severity]}</Badge>
                <span className="font-medium">{p.title}</span>
              </div>
              <p className="text-sm leading-relaxed">{p.whyItHurts}</p>
              {p.moneyImpact ? (
                <p className="text-sm text-muted-foreground">Деньги: {p.moneyImpact}</p>
              ) : null}
              {p.howToFix.length > 0 ? (
                <ul className="list-disc pl-5 text-sm space-y-1">
                  {p.howToFix.map((fix, j) => (
                    <li key={j}>{fix}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
