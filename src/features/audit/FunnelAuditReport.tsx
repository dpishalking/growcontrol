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
  critical: "border-danger/45 bg-danger-soft/35",
  bad: "border-warning/45 bg-warning-soft/30",
  weak: "border-primary/35 bg-primary/10",
  ok: "border-border/60 bg-card",
  good: "border-success/40 bg-success-soft/25",
};

const SEV_LABEL: Record<string, string> = {
  critical: "Критично",
  important: "Важно",
  minor: "Можно улучшить",
};

const SEV_BADGE: Record<string, string> = {
  critical: "border-danger/40 bg-danger-soft/40 text-danger",
  important: "border-warning/40 bg-warning-soft/40 text-warning",
  minor: "border-border bg-muted/40 text-muted-foreground",
};

const SEV_ACCENT: Record<string, string> = {
  critical: "border-l-danger bg-danger-soft/15",
  important: "border-l-warning bg-warning-soft/10",
  minor: "border-l-border bg-card",
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
        <TabsList className="grid w-full grid-cols-2 h-9">
          <TabsTrigger value="overview" className="text-xs sm:text-sm">
            Обзор
          </TabsTrigger>
          <TabsTrigger value="stages" className="text-xs sm:text-sm">
            Этапы
            {issueCount > 0 ? (
              <span className="ml-1.5 rounded-full bg-warning/20 px-1.5 py-0 text-[10px] tabular-nums text-warning font-medium">
                {issueCount}
              </span>
            ) : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-0 space-y-5 focus-visible:outline-none">
          <OverviewHero
            report={report}
            health={health}
            mainStage={mainStage}
            onStageClick={scrollToStage}
          />

          <div className="space-y-2.5">
            <SectionHeading title="Карта воронки" hint="Нажмите этап — откроется разбор" />
            <FunnelStageMap stages={stageViews} onStageClick={scrollToStage} />
          </div>

          {report.problems.length > 0 ? (
            <div className="space-y-3">
              <SectionHeading
                title="Ключевые проблемы"
                hint={`${report.problems.length} ошиб${report.problems.length === 1 ? "ка" : report.problems.length < 5 ? "ки" : "ок"}, режущих конверсию`}
                prominent
              />
              <div className="space-y-2">
                {report.problems.map((p, i) => (
                  <ProblemCard key={i} problem={p} />
                ))}
              </div>
            </div>
          ) : null}

          {report.crossMaterialMismatches?.length ? (
            <div className="space-y-3">
              <SectionHeading title="Расхождения между материалами" prominent />
              <div className="space-y-2">
                {report.crossMaterialMismatches.map((m, i) => (
                  <MismatchCard key={i} mismatch={m} />
                ))}
              </div>
            </div>
          ) : null}

          {hypothesisCount > 0 ? (
            <AuditNextStepHint count={hypothesisCount} />
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

function SectionHeading({
  title,
  hint,
  prominent,
}: {
  title: string;
  hint?: string;
  prominent?: boolean;
}) {
  if (prominent) {
    return (
      <header className="space-y-1 border-b border-border/60 pb-3">
        <h2 className="font-display text-lg font-bold tracking-tight text-foreground sm:text-xl">{title}</h2>
        {hint ? <p className="text-sm text-muted-foreground leading-snug">{hint}</p> : null}
      </header>
    );
  }

  return (
    <div className="space-y-0.5">
      <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
      {hint ? <p className="text-xs text-muted-foreground leading-snug">{hint}</p> : null}
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        SEV_BADGE[severity] ?? SEV_BADGE.minor,
      )}
    >
      {SEV_LABEL[severity] ?? severity}
    </span>
  );
}

function ProblemCard({ problem: p }: { problem: FunnelAuditReport["problems"][number] }) {
  return (
    <article
      className={cn(
        "rounded-xl border border-border/60 border-l-[3px] px-4 py-3.5 space-y-2",
        SEV_ACCENT[p.severity] ?? SEV_ACCENT.minor,
      )}
    >
      <div className="flex flex-wrap items-start gap-x-3 gap-y-1.5">
        <SeverityBadge severity={p.severity} />
        <h4 className="font-display text-base font-bold leading-snug tracking-tight text-foreground flex-1 min-w-0 sm:text-[1.05rem]">
          {p.title}
        </h4>
      </div>
      <p className="text-sm leading-relaxed text-foreground/85">{p.whyItHurts}</p>
      {p.moneyImpact ? (
        <p className="text-xs font-medium text-warning">{p.moneyImpact}</p>
      ) : null}
    </article>
  );
}

function MismatchCard({ mismatch: m }: { mismatch: NonNullable<FunnelAuditReport["crossMaterialMismatches"]>[number] }) {
  return (
    <article
      className={cn(
        "rounded-xl border border-border/60 border-l-[3px] px-4 py-3.5 space-y-2",
        SEV_ACCENT[m.severity] ?? SEV_ACCENT.minor,
      )}
    >
      <div className="flex flex-wrap items-start gap-x-3 gap-y-1.5">
        <SeverityBadge severity={m.severity} />
        <h4 className="font-display text-base font-bold leading-snug tracking-tight text-foreground flex-1 min-w-0 sm:text-[1.05rem]">
          {m.title}
        </h4>
      </div>
      <p className="text-sm leading-relaxed text-foreground/85">{m.detail}</p>
      <p className="text-sm leading-relaxed text-foreground">
        <span className="font-medium text-primary">→ </span>
        {m.fix}
      </p>
    </article>
  );
}

/** Связка «Аудит → Гипотезы»: черновики из отчёта, не готовые гипотезы в плане. */
function AuditNextStepHint({ count }: { count: number }) {
  const n = count;
  const draftWord = n === 1 ? "черновик" : n < 5 ? "черновика" : "черновиков";

  return (
    <div className="rounded-xl border border-primary/25 bg-primary/5 px-4 py-3.5 space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wider text-primary">Что дальше</p>
      <p className="text-sm leading-relaxed text-foreground">
        Это шаг <span className="font-medium">диагноза</span> — проблемы и расхождения. AI сохранил{" "}
        <span className="font-semibold">{n} {draftWord}</span> идей; на шаге{" "}
        <span className="font-medium">«Гипотезы»</span> импортируете их под красные метрики и выберете до 3 на
        тест.
      </p>
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
    <div className="rounded-xl border border-border bg-card shadow-sm px-4 py-4 space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Главный вывод
      </p>
      <div className="flex gap-4 items-start">
        <div className="shrink-0 text-center">
          <p className={cn("text-3xl font-display font-bold tabular-nums leading-none", healthTone)}>
            {health}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">из 100</p>
          <div className="mt-2 h-1.5 w-12 rounded-full bg-muted overflow-hidden mx-auto">
            <div className={cn("h-full rounded-full", healthBar)} style={{ width: `${health}%` }} />
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-base font-semibold leading-snug text-foreground">
            {report.diagnosis.mainProblem}
          </p>
          {mainStage && mainStage.status !== "ok" && mainStage.status !== "good" ? (
            <button
              type="button"
              onClick={() => onStageClick(mainStage.stageId)}
              className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/15 transition-colors"
            >
              <Target className="h-3 w-3" />
              Утечка: {mainStage.stageLabel}
              <ChevronRight className="h-3 w-3" />
            </button>
          ) : null}
        </div>
      </div>

      {hasDetails ? (
        <div className="space-y-2.5 border-t border-border/60 pt-3">
          {report.diagnosis.mainMoneyLeak ? (
            <div className="rounded-lg bg-warning-soft/20 border border-warning/25 px-3 py-2.5">
              <p className="text-xs font-semibold text-warning mb-1 flex items-center gap-1">
                <TrendingDown className="h-3.5 w-3.5" />
                Утечка денег
              </p>
              <p className="text-sm leading-relaxed text-foreground">
                {report.diagnosis.mainMoneyLeak}
                {report.diagnosis.estimatedLossPercent ? (
                  <span className="font-semibold text-warning"> · ~{report.diagnosis.estimatedLossPercent}</span>
                ) : null}
              </p>
            </div>
          ) : null}

          {report.diagnosis.mainLever ? (
            <div className="rounded-lg bg-primary/8 border border-primary/20 px-3 py-2.5">
              <p className="text-xs font-semibold text-primary mb-1">Главный рычаг</p>
              <p className="text-sm leading-relaxed text-foreground">{report.diagnosis.mainLever}</p>
            </div>
          ) : report.quickestWin ? (
            <div className="rounded-lg bg-success-soft/25 border border-success/25 px-3 py-2.5 flex gap-2">
              <Zap className="h-4 w-4 text-success shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-success mb-0.5">Быстрая победа</p>
                <p className="text-sm leading-snug text-foreground">{report.quickestWin.action}</p>
                {report.quickestWin.expectedEffect ? (
                  <p className="text-xs text-muted-foreground mt-1">{report.quickestWin.expectedEffect}</p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
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
          "rounded-xl border border-border/70 overflow-hidden transition-colors shadow-sm",
          STATUS_SURFACE[view.status] ?? STATUS_SURFACE.ok,
        )}
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-background/40 transition-colors"
          >
            <span
              className={cn("h-2 w-2 shrink-0 rounded-full", STATUS_DOT[view.status] ?? STATUS_DOT.ok)}
            />
            <span className="text-xs tabular-nums text-muted-foreground w-4">{view.index}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-tight text-foreground">{view.stageLabel}</p>
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

        <CollapsibleContent>
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
              <div className="rounded-lg bg-card border border-primary/25 px-3 py-2.5 space-y-1">
                <p className="text-xs font-semibold text-primary flex items-center gap-1">
                  <Wrench className="h-3 w-3" />
                  Что покрутить
                </p>
                <p className="text-sm leading-relaxed text-foreground">{audit.howToFix}</p>
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
