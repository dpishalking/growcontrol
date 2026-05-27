import { Link, useParams } from "react-router-dom";
import { useMemo } from "react";
import {
  ArrowLeft,
  ArrowRight,
  FlaskConical,
  FileText,
  Layers,
  Target,
  TrendingUp,
  Zap,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  GitBranch,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { DashboardFrame } from "@/features/dashboard/DashboardFrame";
import { DashboardZone } from "@/features/dashboard/DashboardZone";
import { EntityPathTitle } from "@/components/layout/EntityPathTitle";
import { useAppData } from "@/context/AppDataContext";
import { renderRouteGuard, useProjectFunnelGuard } from "@/hooks/useRouteEntityGuard";
import { buildFunnelEntityPath } from "@/lib/funnelEntityPath";
import { getFunnelTypeTemplate } from "@/data/funnelTypes/catalog";
import { FUNNEL_TYPE_VISUALS, getFunnelTypeVisual } from "@/data/funnelTypes/visuals";
import { getStageIcon } from "@/features/audit/stageVisuals";
import { buildDiagnostics } from "@/utils/funnelDiagnostics";
import { sortByPriority, BUCKET_LABELS } from "@/utils/icePriority";
import { WIZARD_STEPS, wizardStepByIndex } from "@/features/wizard/wizardSteps";
import { getStagesForFunnel, getStageLabelForFunnel } from "@/utils/funnelStages";
import { cn } from "@/lib/utils";
import type { Experiment, ExperimentDecision } from "@/types/experiment";
import type { Funnel } from "@/types/funnel";
import type { Hypothesis } from "@/types/hypothesis";
import type { Project } from "@/types/project";

const EXPERIMENT_DECISION_RU: Partial<Record<ExperimentDecision, string>> = {
  scale: "Масштаб",
  iterate: "Доработка",
  rerun: "Повтор",
  stop: "Стоп",
  archive: "Архив",
};

const BUCKET_COLORS: Record<string, { ring: string; bg: string; text: string }> = {
  quick_test: { ring: "border-emerald-500/40", bg: "bg-emerald-500/10", text: "text-emerald-400" },
  strategic: { ring: "border-primary/40", bg: "bg-primary/10", text: "text-primary" },
  uncertain: { ring: "border-yellow-500/40", bg: "bg-yellow-500/10", text: "text-yellow-400" },
  do_not_touch: {
    ring: "border-border/40",
    bg: "bg-muted/30",
    text: "text-muted-foreground",
  },
};

export default function FunnelOverviewPage() {
  const { projectId, funnelId } = useParams<{ projectId: string; funnelId: string }>();
  const guard = useProjectFunnelGuard(projectId, funnelId);
  const guardView = renderRouteGuard(guard);
  if (guardView) return guardView;

  return (
    <FunnelOverviewContent
      projectId={projectId!}
      project={guard.project}
      funnel={guard.funnel}
    />
  );
}

function FunnelOverviewContent({
  projectId,
  project,
  funnel,
}: {
  projectId: string;
  project: Project;
  funnel: Funnel;
}) {
  const {
    funnelMaterials,
    funnelMetricsList,
    funnelHypotheses,
    funnelExperiments,
    projectFunnels,
  } = useAppData();

  const materials   = funnelMaterials(funnel.id);
  const metrics     = funnelMetricsList(funnel.id);
  const hypotheses  = funnelHypotheses(funnel.id);
  const experiments = funnelExperiments(funnel.id);

  const hypById = useMemo(() => new Map(hypotheses.map((h) => [h.id, h])), [hypotheses]);

  const finishedExperiments = useMemo(() => {
    return [...experiments]
      .filter((e) => e.decision !== "pending")
      .sort(
        (a, b) =>
          new Date(b.endDate ?? b.updatedAt).getTime() -
          new Date(a.endDate ?? a.updatedAt).getTime(),
      );
  }, [experiments]);

  const winRatePct = useMemo(() => {
    const finished = experiments.filter((e) => e.decision !== "pending");
    if (!finished.length) return null;
    const wins = finished.filter((e) => e.decision === "scale").length;
    return Math.round((wins / finished.length) * 100);
  }, [experiments]);

  const template = getFunnelTypeTemplate(funnel.funnelTypeId ?? undefined);
  const diag = buildDiagnostics(metrics, template.bottleneckMetricNames);
  const typeVisual = funnel.funnelTypeId ? getFunnelTypeVisual(funnel.funnelTypeId) : FUNNEL_TYPE_VISUALS.custom;
  const stageChain = useMemo(() => getStagesForFunnel(funnel), [funnel]);

  const currentStepIndex = Math.max(1, Math.min(WIZARD_STEPS.length, funnel.currentWizardStep ?? 1));
  const nextStep    = wizardStepByIndex(currentStepIndex);
  const progressPct = Math.round(((currentStepIndex - 1) / WIZARD_STEPS.length) * 100);

  const top3 = sortByPriority(hypotheses).slice(0, 3);
  const wizardPath = `/projects/${projectId}/funnels/${funnel.id}/wizard/${nextStep.id}`;
  const TypeIcon = typeVisual.icon;
  const pathSegments = buildFunnelEntityPath(project, funnel, projectId, projectFunnels(project.id));

  return (
    <div className="dashboard-cockpit relative mx-auto max-w-4xl space-y-6 pb-8 sm:space-y-8">
      <DashboardFrame
        variant="accent"
        innerClassName="relative overflow-hidden px-5 py-5 sm:px-6 sm:py-6"
      >
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 h-[min(52%,260px)] bg-gradient-to-br opacity-[0.65] sm:h-44",
            typeVisual.gradient,
          )}
        />

        <Link
          to="/dashboard"
          className="relative z-10 mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          На главную
        </Link>

        <div className="relative z-[1] flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:gap-6">
            <div
              className={cn(
                "relative flex h-16 w-16 shrink-0 items-center justify-center self-start rounded-2xl border border-white/10 bg-background/60 shadow-sm backdrop-blur-md sm:h-[4.75rem] sm:w-[4.75rem]",
                "ring-1 ring-primary/25",
              )}
            >
              <TypeIcon
                className={cn("h-8 w-8 sm:h-9 sm:w-9", typeVisual.iconClass)}
                strokeWidth={1.75}
              />
            </div>

            <div className="min-w-0 flex-1 space-y-4">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
                  <Sparkles className="h-3 w-3 shrink-0" />
                  Обзор воронки
                </span>
                <span className="text-xs capitalize text-muted-foreground">{overviewDateLabel()}</span>
              </div>

              <div className="space-y-3">
                <EntityPathTitle segments={pathSegments} />
                <p className="max-w-2xl text-sm text-muted-foreground">
                  {[funnel.trafficSource, funnel.landingUrl].filter(Boolean).join(" → ")}
                  {funnel.funnelGoal ? ` · Цель: ${funnel.funnelGoal}` : ""}
                </p>
              </div>

              {stageChain.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Карта этапов
                  </p>
                  <div className="flex max-w-full gap-1 overflow-x-auto pb-0.5 [scrollbar-width:thin] sm:flex-wrap sm:overflow-visible">
                    {stageChain.map((stage, idx) => {
                      const StageIcon = getStageIcon(stage.id);
                      return (
                        <div key={stage.id} className="flex shrink-0 items-center gap-1">
                          {idx > 0 ? (
                            <ChevronRight
                              className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40"
                              aria-hidden
                            />
                          ) : null}
                          <span
                            className="inline-flex max-w-[11rem] items-center gap-2 rounded-xl border border-border/45 bg-background/55 px-2.5 py-2 backdrop-blur-sm sm:max-w-none"
                            title={stage.description}
                          >
                            <StageIcon
                              className="h-4 w-4 shrink-0 text-primary/85"
                              strokeWidth={2}
                              aria-hidden
                            />
                            <span className="truncate text-[11px] font-medium leading-snug text-foreground sm:text-xs">
                              {stage.label}
                            </span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex w-full shrink-0 flex-col items-stretch gap-4 sm:flex-row sm:items-center lg:w-auto lg:flex-col lg:items-end">
            <Button
              asChild
              size="lg"
              className="dashboard-cta-shimmer w-full bg-gradient-money text-primary-foreground shadow-glow sm:w-auto"
            >
              <Link to={wizardPath} className="flex items-center justify-center gap-2">
                Продолжить мастер
                <span className="font-normal opacity-90">· {nextStep.title}</span>
                <ArrowRight className="h-4 w-4 shrink-0" />
              </Link>
            </Button>

            <div className="flex items-center gap-4 self-stretch rounded-2xl border border-border/50 bg-muted/15 px-4 py-3 sm:self-center lg:self-stretch lg:self-end">
              <WizardProgressDial
                funnelId={funnel.id}
                progressPct={progressPct}
                displayDone={Math.max(0, currentStepIndex - 1)}
                totalSteps={WIZARD_STEPS.length}
              />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Прогресс мастера
                  </span>
                  <span className="text-[11px] font-medium tabular-nums text-primary">
                    {currentStepIndex - 1} / {WIZARD_STEPS.length} шагов
                  </span>
                </div>
                <div className="hidden gap-1 sm:flex">
                  {WIZARD_STEPS.map((step) => (
                    <Link
                      key={step.id}
                      title={step.title}
                      to={`/projects/${projectId}/funnels/${funnel.id}/wizard/${step.id}`}
                      className={cn(
                        "h-1 flex-1 rounded-full transition-all duration-300",
                        step.index < currentStepIndex
                          ? "bg-primary"
                          : step.index === currentStepIndex
                            ? "bg-primary/50 ring-1 ring-primary/35"
                            : "bg-border/40",
                      )}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Текущий шаг:{" "}
                  <span className="font-medium text-foreground">{nextStep.title}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </DashboardFrame>

      <DashboardZone title="Показатели" subtitle="Состояние воронки" icon={GitBranch} prominent>
        <DashboardFrame variant="default" innerClassName="p-3 sm:p-4">
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <StatCard
              icon={Layers}
              label="Материалы"
              value={materials.length}
              hint={materials.length === 0 ? "Добавьте первый" : undefined}
              accent="neutral"
            />
            <StatCard
              icon={Target}
              label="Метрики"
              value={metrics.length}
              hint={diag.red.length > 0 ? `${diag.red.length} ниже плана` : "всё в норме"}
              accent={diag.red.length > 0 ? "red" : "green"}
            />
            <StatCard
              icon={FlaskConical}
              label="Гипотезы"
              value={hypotheses.length}
              hint={
                hypotheses.length > 0
                  ? `топ: ${BUCKET_LABELS[top3[0]?.bucket ?? "quick_test"]?.label ?? "—"}`
                  : "нет гипотез"
              }
              accent="orange"
            />
            <StatCard
              icon={FileText}
              label="Эксперименты"
              value={experiments.length}
              hint={
                experiments.length === 0
                  ? "не запущено"
                  : winRatePct === null || finishedExperiments.length === 0
                    ? "нет завершённых"
                    : `win-rate ${winRatePct}% (${finishedExperiments.length} закрытых)`
              }
              accent="blue"
            />
          </div>
        </DashboardFrame>
      </DashboardZone>

      {diag.bottleneck ? (
        <DashboardZone
          title="Главный ограничитель"
          subtitle="Точка, которая сильнее всего тормозит рост"
          icon={AlertTriangle}
          prominent
        >
          <DashboardFrame variant="danger" innerClassName="p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-danger/15">
                <AlertTriangle className="h-5 w-5 text-danger" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display text-base font-semibold">{diag.bottleneck.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {getStageLabelForFunnel(funnel, diag.bottleneck.stage)} · влияние{" "}
                  {diag.bottleneck.revenueImpact}/5
                </p>
              </div>
              <Button asChild size="sm" variant="outline" className="shrink-0 text-xs">
                <Link to={`/projects/${projectId}/funnels/${funnel.id}/wizard/hypotheses`}>
                  Гипотезы
                  <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </DashboardFrame>
        </DashboardZone>
      ) : null}

      {finishedExperiments.length > 0 ? (
        <DashboardZone
          title="История тестов"
          subtitle={
            winRatePct != null
              ? `${finishedExperiments.length} завершённых · win-rate ${winRatePct}%`
              : `${finishedExperiments.length} завершённых`
          }
          icon={FlaskConical}
        >
          <Collapsible defaultOpen={finishedExperiments.length <= 3}>
            <DashboardFrame variant="default" innerClassName="overflow-hidden">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition-colors hover:bg-muted/10 sm:px-5"
                >
                  <span className="text-sm font-medium text-foreground">Что узнали из экспериментов</span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform aria-expanded:rotate-180" />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <ul className="divide-y divide-border/40 border-t border-border/40 px-4 sm:px-5">
                  {finishedExperiments.slice(0, 8).map((ex: Experiment) => {
                    const hyp = hypById.get(ex.hypothesisId);
                    const dl = ex.decision ? EXPERIMENT_DECISION_RU[ex.decision] : null;
                    return (
                      <li key={ex.id} className="space-y-1 py-3.5">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <Badge variant="secondary" className="shrink-0 text-[10px]">
                            {hyp?.metricName ?? "Метрика"}
                          </Badge>
                          {dl ? (
                            <Badge variant="outline" className="shrink-0 text-[10px]">
                              {dl}
                            </Badge>
                          ) : null}
                          <span className="text-[10px] tabular-nums text-muted-foreground">
                            {ex.endDate ? new Date(ex.endDate).toLocaleDateString("ru-RU") : "—"}
                          </span>
                        </div>
                        <p className="text-sm font-medium leading-snug">
                          {hyp?.title ?? "Гипотеза удалена или не найдена"}
                        </p>
                        {ex.afterValue?.trim() ? (
                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium text-foreground/90">Факт: </span>
                            {ex.afterValue.trim()}
                          </p>
                        ) : null}
                        {ex.result?.trim() ? (
                          <p className="text-xs leading-relaxed">
                            <span className="font-medium text-muted-foreground">Вывод: </span>
                            {ex.result.trim()}
                          </p>
                        ) : null}
                        {ex.notes?.includes("Рефлексия") ? (
                          <p className="border-l-2 border-primary/30 pl-2 text-xs text-muted-foreground/95">
                            {ex.notes.trim()}
                          </p>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
                <div className="px-4 pb-4 sm:px-5">
                  <Button asChild size="sm" variant="outline" className="w-full text-xs sm:w-auto">
                    <Link to={`/projects/${projectId}/funnels/${funnel.id}/wizard/plan`}>
                      План и завершённые
                      <ChevronRight className="ml-1 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </CollapsibleContent>
            </DashboardFrame>
          </Collapsible>
        </DashboardZone>
      ) : null}

      <DashboardZone
        title="ТОП-3 гипотезы"
        subtitle={hypotheses.length > 3 ? `из ${hypotheses.length} в бэклоге` : "Приоритетные идеи для тестов"}
        icon={TrendingUp}
        prominent
      >
        {top3.length === 0 ? (
          <DashboardFrame variant="primary" innerClassName="px-6 py-10 text-center sm:px-10">
            <Zap className="mx-auto mb-3 h-8 w-8 text-primary/40" />
            <p className="text-sm text-muted-foreground">Гипотез ещё нет</p>
            <Button asChild size="sm" className="mt-4 bg-gradient-money text-primary-foreground">
              <Link to={`/projects/${projectId}/funnels/${funnel.id}/wizard/hypotheses`}>
                Сгенерировать с AI
              </Link>
            </Button>
          </DashboardFrame>
        ) : (
          <DashboardFrame variant="default" innerClassName="space-y-2 p-3 sm:p-4">
            <ul className="space-y-2">
              {top3.map((h, i) => (
                <HypothesisCard
                  key={h.id}
                  hypo={h}
                  rank={i + 1}
                  projectId={projectId}
                  funnelId={funnel.id}
                />
              ))}
            </ul>
            {hypotheses.length > 0 ? (
              <Link
                to={`/projects/${projectId}/funnels/${funnel.id}/wizard/hypotheses`}
                className="flex items-center justify-center gap-1 pt-1 text-xs font-medium text-primary hover:underline"
              >
                Все гипотезы
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            ) : null}
          </DashboardFrame>
        )}
      </DashboardZone>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────── */

function overviewDateLabel(): string {
  return new Date().toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function WizardProgressDial({
  funnelId,
  progressPct,
  displayDone,
  totalSteps,
}: {
  funnelId: string;
  progressPct: number;
  displayDone: number;
  totalSteps: number;
}) {
  const safePct = Number.isFinite(progressPct) ? Math.min(100, Math.max(0, progressPct)) : 0;
  const dash = `${Math.max(safePct, displayDone === 0 ? 0 : 4)} 100`;
  const gradId = `f-overview-w-${funnelId}`;
  const labelId = `${gradId}-label`;

  return (
    <div className="relative flex h-[3.65rem] w-[3.65rem] shrink-0 items-center justify-center" aria-labelledby={labelId}>
      <svg className="h-[3.65rem] w-[3.65rem] -rotate-90" viewBox="0 0 40 40" aria-hidden>
        <circle
          cx="20"
          cy="20"
          r="15.5"
          fill="none"
          strokeWidth="3"
          className="text-muted/50"
          stroke="currentColor"
        />
        <circle
          cx="20"
          cy="20"
          r="15.5"
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          stroke={`url(#${gradId})`}
          strokeDasharray={dash}
          pathLength={100}
          className="transition-[stroke-dasharray] duration-700 ease-out"
        />
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--accent))" />
          </linearGradient>
        </defs>
      </svg>
      <span id={labelId} className="absolute flex flex-col items-center leading-none tabular-nums">
        <span className="text-[13px] font-bold text-foreground">{displayDone}</span>
        <span className="text-[8px] font-medium uppercase tracking-wider text-muted-foreground">
          из {totalSteps}
        </span>
      </span>
    </div>
  );
}

const STAT_ACCENT = {
  neutral: { cell: undefined, value: "text-foreground", hint: "text-muted-foreground" },
  red: { cell: "dashboard-stat-cell--alert", value: "text-danger", hint: "text-danger/80" },
  green: { cell: "dashboard-stat-cell--active", value: "text-success", hint: "text-success/80" },
  orange: { cell: "dashboard-stat-cell--focus", value: "text-primary", hint: "text-primary/70" },
  blue: { cell: undefined, value: "text-foreground", hint: "text-muted-foreground" },
} as const;

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  accent = "neutral",
}: {
  icon: typeof Layers;
  label: string;
  value: number;
  hint?: string;
  accent?: keyof typeof STAT_ACCENT;
}) {
  const a = STAT_ACCENT[accent];
  return (
    <div className={cn("dashboard-stat-cell rounded-xl px-3 py-3 sm:px-4 sm:py-3.5", a.cell)}>
      <div className="flex items-center justify-between gap-2">
        <Icon className="h-4 w-4 shrink-0 text-primary/80" strokeWidth={2} />
        <span className={cn("font-display text-2xl font-bold tabular-nums leading-none sm:text-3xl", a.value)}>
          {value}
        </span>
      </div>
      <p className="mt-2 text-xs font-semibold text-foreground">{label}</p>
      {hint ? <p className={cn("mt-0.5 text-[11px] leading-snug", a.hint)}>{hint}</p> : null}
    </div>
  );
}

function HypothesisCard({
  hypo,
  rank,
  projectId,
  funnelId,
}: {
  hypo: Hypothesis;
  rank: number;
  projectId: string;
  funnelId: string;
}) {
  const bucket = hypo.bucket ?? "quick_test";
  const colors = BUCKET_COLORS[bucket] ?? BUCKET_COLORS.quick_test!;
  const bucketLabel = BUCKET_LABELS[bucket as keyof typeof BUCKET_LABELS]?.label ?? bucket;
  const iceScore = hypo.priorityScore ?? 0;

  return (
    <li className="relative overflow-hidden rounded-xl border border-border/50 bg-muted/10 p-4">
      <div
        className={cn(
          "absolute inset-y-0 left-0 w-1 bg-gradient-to-b",
          bucket === "quick_test"
            ? "from-success to-primary/60"
            : bucket === "strategic"
              ? "from-primary to-accent/60"
              : "from-warning to-primary/40",
        )}
      />
      <div className="flex gap-4 pl-2">
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl border font-display font-bold",
            colors.ring,
            colors.bg,
          )}
        >
          <span className={cn("text-lg leading-none", colors.text)}>{iceScore}</span>
          <span className="text-[8px] uppercase tracking-widest text-muted-foreground">ICE</span>
        </div>

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 w-4 shrink-0 text-[10px] font-bold text-muted-foreground/50">
              #{rank}
            </span>
            <p className="text-sm font-medium leading-snug">{hypo.title}</p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-[10px] font-medium",
                colors.ring,
                colors.bg,
                colors.text,
              )}
            >
              {bucketLabel}
            </span>
            {hypo.metricName ? (
              <span className="rounded-full border border-border/40 px-2 py-0.5 text-[10px] text-muted-foreground">
                {hypo.metricName}
              </span>
            ) : null}
            {(hypo.tags ?? []).slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-border/35 px-1.5 py-px text-[9px] text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <Link
          to={`/projects/${projectId}/funnels/${funnelId}/wizard/hypotheses`}
          className="shrink-0 self-center text-muted-foreground/40 transition-colors hover:text-primary"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </li>
  );
}
