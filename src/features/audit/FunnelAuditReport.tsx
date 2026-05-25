import { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  FileJson,
  MoreHorizontal,
  Target,
  TrendingDown,
  Wrench,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FunnelAuditReport } from "@/types/funnelAudit";
import type { FunnelMetric } from "@/types/funnelMetric";
import { downloadFunnelAuditJson, downloadFunnelAuditMarkdown } from "@/lib/funnelAuditExport";
import { cn } from "@/lib/utils";
import {
  STAGE_STATUS_LABEL,
  buildStageAuditViews,
  type StageAuditStatus,
  type StageAuditView,
} from "./auditStageModel";
import { FunnelStageMap } from "./FunnelStageMap";

const STATUS_RANK: Record<StageAuditStatus, number> = {
  critical: 5,
  bad: 4,
  weak: 3,
  ok: 2,
  good: 1,
};

const STATUS_DOT: Record<StageAuditStatus, string> = {
  critical: "bg-danger",
  bad: "bg-warning",
  weak: "bg-primary/70",
  ok: "bg-muted-foreground/40",
  good: "bg-success",
};

const STATUS_SURFACE: Record<StageAuditStatus, string> = {
  critical: "border-danger/30 bg-danger-soft/30",
  bad: "border-warning/30 bg-warning-soft/25",
  weak: "border-primary/25 bg-primary/5",
  ok: "border-border/50 bg-muted/15",
  good: "border-success/25 bg-success-soft/20",
};

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
};

function stageHasDetail(view: StageAuditView): boolean {
  return Boolean(view.audit?.problem) || Boolean(view.audit?.howToFix);
}

function funnelHealthScore(views: StageAuditView[]): number {
  if (!views.length) return 0;
  const avg = views.reduce((acc, v) => acc + STATUS_RANK[v.status], 0) / views.length;
  const span = STATUS_RANK.critical - STATUS_RANK.good;
  return Math.round(100 - ((avg - STATUS_RANK.good) / span) * 100);
}

export function FunnelAuditReport({
  report,
  stages,
  metrics,
  funnelName,
  typeName,
  generatedAt,
  metricsInSync = true,
}: Props) {
  const stageViews = useMemo(
    () => buildStageAuditViews(report, stages, metrics),
    [report, stages, metrics],
  );

  const visibleStages = useMemo(
    () =>
      stageViews.filter(
        (v) => stageHasDetail(v) || v.status === "critical" || v.status === "bad" || v.status === "weak",
      ),
    [stageViews],
  );

  const [openStages, setOpenStages] = useState<Set<string>>(() => new Set());
  const [tab, setTab] = useState("overview");
  const stageRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const exportBase = useMemo(
    () => (funnelName ? funnelName.replace(/\s+/g, "-").slice(0, 40) : "funnel-audit"),
    [funnelName],
  );

  const health = funnelHealthScore(stageViews);
  const issueCount = stageViews.filter((s) => STATUS_RANK[s.status] >= STATUS_RANK.weak).length;

  const mainStage =
    stageViews.length > 0
      ? stageViews.reduce(
          (best, s) => (STATUS_RANK[s.status] > STATUS_RANK[best.status] ? s : best),
          stageViews[0],
        )
      : null;

  const scrollToStage = (stageId: string) => {
    setTab("stages");
    setOpenStages((prev) => new Set(prev).add(stageId));
    requestAnimationFrame(() => {
      stageRefs.current[stageId]?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const toggleStage = (stageId: string, open: boolean) => {
    setOpenStages((prev) => {
      const next = new Set(prev);
      if (open) next.add(stageId);
      else next.delete(stageId);
      return next;
    });
  };

  const handleMd = () =>
    downloadFunnelAuditMarkdown(report, `${exportBase}-audit`, {
      funnelName,
      typeName,
      generatedAt,
    });
  const handleJson = () => downloadFunnelAuditJson(report, `${exportBase}-audit`);

  const hypothesisCount = report.hypotheses?.length ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {generatedAt ? (
            <span>{new Date(generatedAt).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" })}</span>
          ) : null}
          {metricsInSync ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-success-soft/50 px-2 py-0.5 text-success">
              <CheckCircle2 className="h-3 w-3" />
              Актуально
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-warning-soft/50 px-2 py-0.5 text-warning">
              <AlertTriangle className="h-3 w-3" />
              Нужен перезапуск
            </span>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleMd}>
              <Download className="mr-2 h-4 w-4" />
              Скачать .md
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleJson}>
              <FileJson className="mr-2 h-4 w-4" />
              Скачать JSON
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <h3 className="mx-auto max-w-2xl px-1 text-center font-display text-lg sm:text-xl font-semibold leading-snug tracking-tight text-foreground">
          Выявили{" "}
          <span className="bg-gradient-money bg-clip-text text-transparent">ключевые слабые звенья</span>{" "}
          в воронке на основе анализа смыслов и метрик, которые вы предоставили
        </h3>
        <TabsList className="grid w-full grid-cols-2 h-9">
          <TabsTrigger value="overview" className="text-xs sm:text-sm">
            Обзор
          </TabsTrigger>
          <TabsTrigger value="stages" className="text-xs sm:text-sm">
            Этапы
            {issueCount > 0 ? (
              <span className="ml-1.5 rounded-full bg-warning/15 px-1.5 py-0 text-[10px] tabular-nums text-warning">
                {issueCount}
              </span>
            ) : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-0 space-y-3 focus-visible:outline-none">
          <SectionHeading
            title="Карта воронки"
            hint="Оценка материалов AI · нажмите этап для деталей"
          />
          <FunnelStageMap stages={stageViews} onStageClick={scrollToStage} />

          <SectionHeading title="Главный вывод" />
          <OverviewHero
            report={report}
            health={health}
            mainStage={mainStage}
            onStageClick={scrollToStage}
          />

          {hypothesisCount > 0 ? (
            <p className="text-[11px] text-center text-muted-foreground px-1">
              {hypothesisCount} идей для гипотез — на шаге «Гипотезы»
            </p>
          ) : null}

          {report.crossMaterialMismatches?.length || report.problems?.length ? (
            <Collapsible>
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl border border-border/50 px-4 py-3 text-sm text-muted-foreground hover:bg-muted/20 transition-colors">
                <span>Подробности и расхождения</span>
                <ChevronDown className="h-4 w-4 shrink-0" />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-3">
                {report.crossMaterialMismatches?.map((m, i) => (
                  <div key={i} className="rounded-xl border border-border/40 px-4 py-3 space-y-1.5 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {SEV_LABEL[m.severity] ?? m.severity}
                      </Badge>
                      <span className="font-medium">{m.title}</span>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">{m.detail}</p>
                    <p className="leading-relaxed">
                      <span className="text-primary">→ </span>
                      {m.fix}
                    </p>
                  </div>
                ))}
                {report.problems?.map((p, i) => (
                  <div key={i} className="rounded-xl border border-border/40 px-4 py-3 space-y-1.5 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {SEV_LABEL[p.severity]}
                      </Badge>
                      <span className="font-medium">{p.title}</span>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">{p.whyItHurts}</p>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          ) : null}
        </TabsContent>

        <TabsContent value="stages" className="mt-0 space-y-2 focus-visible:outline-none">
          <SectionHeading
            title="Разбор по этапам"
            hint="Раскройте этап — внутри разбор материалов и рекомендации, что улучшить"
          />
          {visibleStages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              По этапам замечаний нет — воронка выглядит ровно.
            </p>
          ) : (
            visibleStages.map((view) => (
              <div
                key={view.stageId}
                ref={(el) => {
                  stageRefs.current[view.stageId] = el;
                }}
                id={`audit-stage-${view.stageId}`}
                className="scroll-mt-4"
              >
                <StageCollapsible
                  view={view}
                  open={openStages.has(view.stageId)}
                  onOpenChange={(open) => toggleStage(view.stageId, open)}
                />
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SectionHeading({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="space-y-0.5 pt-0.5">
      <h3 className="text-sm font-medium tracking-tight">{title}</h3>
      {hint ? <p className="text-[11px] text-muted-foreground leading-snug">{hint}</p> : null}
    </div>
  );
}

function OverviewHero({
  report,
  health,
  mainStage,
  onStageClick,
}: {
  report: FunnelAuditReport;
  health: number;
  mainStage: StageAuditView | null;
  onStageClick: (id: string) => void;
}) {
  const healthTone =
    health >= 70 ? "text-success" : health >= 45 ? "text-warning" : "text-danger";
  const healthBar =
    health >= 70 ? "bg-success" : health >= 45 ? "bg-warning" : "bg-danger";

  const hasDetails =
    Boolean(report.diagnosis.mainMoneyLeak) ||
    Boolean(report.diagnosis.mainLever) ||
    Boolean(report.quickestWin?.action);

  return (
    <div className="rounded-xl border border-border/50 bg-card/40 px-4 py-3.5">
      <div className="flex gap-3 items-start">
        <div className="shrink-0 pt-0.5">
          <p className={cn("text-2xl font-display font-semibold tabular-nums leading-none", healthTone)}>
            {health}
            <span className="text-sm text-muted-foreground font-normal">%</span>
          </p>
          <div className="mt-1.5 h-1 w-10 rounded-full bg-muted overflow-hidden">
            <div
              className={cn("h-full rounded-full", healthBar)}
              style={{ width: `${health}%` }}
            />
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="text-sm font-medium leading-snug line-clamp-3">
            {report.diagnosis.mainProblem}
          </p>
          {mainStage && mainStage.status !== "ok" && mainStage.status !== "good" ? (
            <button
              type="button"
              onClick={() => onStageClick(mainStage.stageId)}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline underline-offset-2"
            >
              <Target className="h-3 w-3" />
              Утечка: {mainStage.stageLabel}
              <ChevronRight className="h-3 w-3" />
            </button>
          ) : null}
        </div>
      </div>

      {hasDetails ? (
        <Collapsible className="mt-3 border-t border-border/40 pt-2">
          <CollapsibleTrigger className="flex w-full items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors py-1">
            <span>Утечки и что делать</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 space-y-2.5 text-sm">
            {report.diagnosis.mainMoneyLeak ? (
              <p className="text-muted-foreground leading-relaxed">
                <TrendingDown className="inline h-3.5 w-3.5 text-warning mr-1 -mt-0.5" />
                {report.diagnosis.mainMoneyLeak}
                {report.diagnosis.estimatedLossPercent ? (
                  <span className="text-foreground"> · ~{report.diagnosis.estimatedLossPercent}</span>
                ) : null}
              </p>
            ) : null}

            {report.diagnosis.mainLever ? (
              <p className="leading-relaxed text-foreground/90">
                <span className="text-xs font-medium text-primary">Рычаг · </span>
                {report.diagnosis.mainLever}
              </p>
            ) : report.quickestWin ? (
              <div className="flex gap-2 text-sm">
                <Zap className="h-4 w-4 text-success shrink-0 mt-0.5" />
                <div>
                  <p className="leading-snug">{report.quickestWin.action}</p>
                  {report.quickestWin.expectedEffect ? (
                    <p className="text-xs text-muted-foreground mt-0.5">{report.quickestWin.expectedEffect}</p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </CollapsibleContent>
        </Collapsible>
      ) : null}
    </div>
  );
}

function StageCollapsible({
  view,
  open,
  onOpenChange,
}: {
  view: StageAuditView;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { audit } = view;

  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <div
        className={cn(
          "rounded-xl border overflow-hidden transition-colors",
          STATUS_SURFACE[view.status] ?? STATUS_SURFACE.ok,
        )}
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-background/30 transition-colors"
          >
            <span
              className={cn("h-2 w-2 shrink-0 rounded-full", STATUS_DOT[view.status] ?? STATUS_DOT.ok)}
            />
            <span className="text-xs tabular-nums text-muted-foreground w-4">{view.index}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-tight">{view.stageLabel}</p>
              {!open && view.leakHint ? (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{view.leakHint}</p>
              ) : null}
            </div>
            <Badge variant="outline" className="text-[10px] shrink-0 hidden sm:inline-flex">
              {STAGE_STATUS_LABEL[view.status] ?? view.status}
            </Badge>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                open && "rotate-180",
              )}
            />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
          <div className="px-4 pb-4 pt-3 space-y-4 border-t border-border/30">
            {audit?.problem ? (
              <div className="space-y-1">
                <p className="text-sm leading-relaxed">{audit.problem}</p>
                {audit.whyImportant ? (
                  <p className="text-xs text-muted-foreground leading-relaxed">{audit.whyImportant}</p>
                ) : null}
              </div>
            ) : null}

            {audit?.howToFix ? (
              <div className="rounded-lg bg-background/40 border border-border/30 px-3 py-2.5 space-y-1">
                <p className="text-xs font-medium text-primary flex items-center gap-1">
                  <Wrench className="h-3 w-3" />
                  Что покрутить
                </p>
                <p className="text-sm leading-relaxed">{audit.howToFix}</p>
                {audit.rewriteExample ? (
                  <p className="text-xs text-muted-foreground italic leading-relaxed border-t border-border/30 pt-2 mt-2">
                    {audit.rewriteExample}
                  </p>
                ) : null}
              </div>
            ) : null}

            {!audit?.problem && !audit?.howToFix ? (
              <p className="text-sm text-muted-foreground">Замечаний по материалам нет.</p>
            ) : null}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
