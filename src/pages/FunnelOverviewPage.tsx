import { Link, Navigate, useParams } from "react-router-dom";
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
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppData } from "@/context/AppDataContext";
import { getFunnelTypeTemplate } from "@/data/funnelTypes/catalog";
import { buildDiagnostics } from "@/utils/funnelDiagnostics";
import { sortByPriority, BUCKET_LABELS } from "@/utils/icePriority";
import { WIZARD_STEPS, wizardStepByIndex } from "@/features/wizard/wizardSteps";
import { getStageLabelForFunnel } from "@/utils/funnelStages";
import { projectDashboardPath } from "@/lib/projectNavigation";
import { cn } from "@/lib/utils";
import type { Hypothesis } from "@/types/hypothesis";
import { useAuth } from "@/hooks/useAuth";
import { TelegramConnectCard } from "@/features/dashboard/TelegramConnectCard";

const BUCKET_COLORS: Record<string, { ring: string; bg: string; text: string }> = {
  quick_test:  { ring: "border-emerald-500/40", bg: "bg-emerald-500/10", text: "text-emerald-400" },
  strategic:   { ring: "border-primary/40",     bg: "bg-primary/10",     text: "text-primary"    },
  uncertain:   { ring: "border-yellow-500/40",  bg: "bg-yellow-500/10",  text: "text-yellow-400" },
  do_not_touch:{ ring: "border-border/40",      bg: "bg-muted/30",       text: "text-muted-foreground" },
};

export default function FunnelOverviewPage() {
  const { projectId, funnelId } = useParams<{ projectId: string; funnelId: string }>();
  const { user: authUser, guest } = useAuth();
  const {
    getProject,
    getFunnel,
    funnelMaterials,
    funnelMetricsList,
    funnelHypotheses,
    funnelExperiments,
  } = useAppData();

  if (!projectId || !funnelId) return <Navigate to="/dashboard" replace />;
  const project = getProject(projectId);
  const funnel = getFunnel(funnelId);
  if (!project || !funnel) return <Navigate to="/dashboard" replace />;

  const materials   = funnelMaterials(funnel.id);
  const metrics     = funnelMetricsList(funnel.id);
  const hypotheses  = funnelHypotheses(funnel.id);
  const experiments = funnelExperiments(funnel.id);

  const template    = getFunnelTypeTemplate(funnel.funnelTypeId ?? undefined);
  const diag        = buildDiagnostics(metrics, template.bottleneckMetricNames);
  const typeName    = funnel.funnelTypeId ? template.name : null;

  const currentStepIndex = Math.max(1, Math.min(WIZARD_STEPS.length, funnel.currentWizardStep ?? 1));
  const nextStep    = wizardStepByIndex(currentStepIndex);
  const progressPct = Math.round(((currentStepIndex - 1) / WIZARD_STEPS.length) * 100);

  const top3 = sortByPriority(hypotheses).slice(0, 3);
  const wizardPath = `/projects/${projectId}/funnels/${funnel.id}/wizard/${nextStep.id}`;

  return (
    <div className="overview-page min-h-screen pb-20">
      {/* ── HERO ──────────────────────────────────────────────── */}
      <div className="overview-hero relative overflow-hidden mb-8">
        <div className="overview-hero-glow pointer-events-none" aria-hidden />
        <div className="relative px-4 pt-6 pb-7 sm:px-6 lg:px-8">

          {/* Back */}
          <Link
            to={projectDashboardPath(projectId)}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            К проектам
          </Link>

          {/* Title row */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2 overview-rise" style={{ animationDelay: "0.05s" }}>
              <div className="flex flex-wrap items-center gap-2">
                {typeName && (
                  <span className="overview-type-badge text-[11px] font-medium px-2.5 py-0.5 rounded-full">
                    {typeName}
                  </span>
                )}
              </div>
              <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                {funnel.productName || "Воронка"}
              </h1>
              <p className="text-sm text-muted-foreground max-w-2xl">
                {[funnel.trafficSource, funnel.landingUrl].filter(Boolean).join(" → ")}
                {funnel.funnelGoal ? ` · Цель: ${funnel.funnelGoal}` : ""}
              </p>
            </div>

            <Button
              asChild
              size="lg"
              className="overview-cta shrink-0 bg-gradient-money text-primary-foreground shadow-glow"
              style={{ animationDelay: "0.1s" }}
            >
              <Link to={wizardPath} className="flex items-center gap-2">
                Продолжить мастер
                <span className="font-normal opacity-90">· {nextStep.title}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          {/* Wizard progress */}
          <div className="mt-5 overview-rise" style={{ animationDelay: "0.15s" }}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-muted-foreground uppercase tracking-wider">
                Прогресс мастера
              </span>
              <span className="text-[11px] font-medium text-primary">
                {currentStepIndex - 1} / {WIZARD_STEPS.length} шагов
              </span>
            </div>
            <div className="overview-progress-track">
              <div
                className="overview-progress-fill"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="mt-2 hidden sm:flex gap-1">
              {WIZARD_STEPS.map((step) => (
                <Link
                  key={step.id}
                  to={`/projects/${projectId}/funnels/${funnel.id}/wizard/${step.id}`}
                  title={step.title}
                  className={cn(
                    "flex-1 h-1 rounded-full transition-all duration-300",
                    step.index < currentStepIndex
                      ? "bg-primary"
                      : step.index === currentStepIndex
                        ? "bg-primary/50"
                        : "bg-border/40",
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 space-y-7">

        {/* ── STAT CARDS ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            icon={Layers}
            label="Материалы"
            value={materials.length}
            hint={materials.length === 0 ? "Добавьте первый" : undefined}
            delay="0.08s"
            accent="neutral"
          />
          <StatCard
            icon={Target}
            label="Метрики"
            value={metrics.length}
            hint={diag.red.length > 0 ? `${diag.red.length} ниже плана` : "всё в норме"}
            accent={diag.red.length > 0 ? "red" : "green"}
            delay="0.14s"
          />
          <StatCard
            icon={FlaskConical}
            label="Гипотезы"
            value={hypotheses.length}
            hint={hypotheses.length > 0 ? `топ ICE: ${top3[0]?.priorityScore ?? "—"}` : "нет гипотез"}
            accent="orange"
            delay="0.20s"
          />
          <StatCard
            icon={FileText}
            label="Эксперименты"
            value={experiments.length}
            hint={experiments.length > 0 ? "активных" : "не запущено"}
            accent="blue"
            delay="0.26s"
          />
        </div>

        {!guest && authUser ? (
          <TelegramConnectCard projectId={projectId} projectName={project.projectName} />
        ) : null}

        {/* ── BOTTLENECK ─────────────────────────────────────── */}
        {diag.bottleneck && (
          <div className="overview-rise overview-bottleneck rounded-2xl p-4 sm:p-5" style={{ animationDelay: "0.22s" }}>
            <div className="flex items-start gap-3">
              <div className="overview-bottleneck-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-widest text-destructive/70 mb-0.5">
                  Главный ограничитель
                </p>
                <p className="font-display text-base font-semibold">{diag.bottleneck.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {getStageLabelForFunnel(funnel, diag.bottleneck.stage)} · влияние {diag.bottleneck.revenueImpact}/5
                </p>
              </div>
              <Button asChild size="sm" variant="outline" className="shrink-0 text-xs">
                <Link to={`/projects/${projectId}/funnels/${funnel.id}/wizard/hypotheses`}>
                  Гипотезы
                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Link>
              </Button>
            </div>
          </div>
        )}

        {/* ── TOP HYPOTHESES ─────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4.5 w-4.5 text-primary" />
              <h2 className="font-display text-lg font-semibold">ТОП-3 гипотезы</h2>
              {hypotheses.length > 3 && (
                <span className="text-xs text-muted-foreground">из {hypotheses.length}</span>
              )}
            </div>
            {hypotheses.length > 0 && (
              <Link
                to={`/projects/${projectId}/funnels/${funnel.id}/wizard/hypotheses`}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                Все гипотезы <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>

          {top3.length === 0 ? (
            <div className="overview-empty-state rounded-2xl p-8 text-center">
              <Zap className="h-8 w-8 text-primary/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-3">Гипотез ещё нет</p>
              <Button asChild size="sm" className="bg-gradient-money text-primary-foreground">
                <Link to={`/projects/${projectId}/funnels/${funnel.id}/wizard/hypotheses`}>
                  Сгенерировать с AI
                </Link>
              </Button>
            </div>
          ) : (
            <ul className="space-y-3">
              {top3.map((h, i) => (
                <HypothesisCard
                  key={h.id}
                  hypo={h}
                  rank={i + 1}
                  projectId={projectId}
                  funnelId={funnel.id}
                  delay={`${0.28 + i * 0.08}s`}
                />
              ))}
            </ul>
          )}
        </section>

        {/* ── QUICK ACTIONS ──────────────────────────────────── */}
        <section className="overview-rise pt-2" style={{ animationDelay: "0.52s" }}>
          <h2 className="font-display text-base font-semibold mb-3 text-muted-foreground">
            Быстрые действия
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {WIZARD_STEPS.filter((s) => ["materials", "metrics", "hypotheses", "plan"].includes(s.id)).map((step) => (
              <Link
                key={step.id}
                to={`/projects/${projectId}/funnels/${funnel.id}/wizard/${step.id}`}
                className="overview-quick-action group rounded-xl px-3 py-3 flex flex-col gap-1"
              >
                <span className="text-xs font-medium group-hover:text-primary transition-colors">
                  {step.title}
                </span>
                <span className="text-[10px] text-muted-foreground leading-snug line-clamp-2">
                  {step.subtitle}
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────── */

const STAT_ACCENT = {
  neutral: { icon: "bg-muted/50",           num: "text-foreground",   hint: "text-muted-foreground" },
  red:     { icon: "bg-destructive/15",     num: "text-destructive",  hint: "text-destructive/70"   },
  green:   { icon: "bg-emerald-500/15",     num: "text-emerald-400",  hint: "text-emerald-400/80"   },
  orange:  { icon: "bg-primary/15",         num: "text-primary",      hint: "text-primary/70"       },
  blue:    { icon: "bg-blue-500/15",        num: "text-blue-400",     hint: "text-blue-400/80"      },
} as const;

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  accent = "neutral",
  delay,
}: {
  icon: typeof Layers;
  label: string;
  value: number;
  hint?: string;
  accent?: keyof typeof STAT_ACCENT;
  delay?: string;
}) {
  const a = STAT_ACCENT[accent];
  return (
    <div
      className="overview-stat-card overview-rise rounded-2xl p-4 flex flex-col gap-2"
      style={delay ? { animationDelay: delay } : undefined}
    >
      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", a.icon)}>
        <Icon className="h-4.5 w-4.5 text-foreground/80" strokeWidth={1.75} />
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">{label}</p>
        <p className={cn("font-display text-3xl font-bold tabular-nums leading-none", a.num)}>
          {value}
        </p>
      </div>
      {hint && <p className={cn("text-[11px] leading-tight", a.hint)}>{hint}</p>}
    </div>
  );
}

function HypothesisCard({
  hypo,
  rank,
  projectId,
  funnelId,
  delay,
}: {
  hypo: Hypothesis;
  rank: number;
  projectId: string;
  funnelId: string;
  delay?: string;
}) {
  const bucket = hypo.bucket ?? "quick_test";
  const colors = BUCKET_COLORS[bucket] ?? BUCKET_COLORS.quick_test!;
  const bucketLabel = BUCKET_LABELS[bucket as keyof typeof BUCKET_LABELS]?.label ?? bucket;
  const iceScore = hypo.priorityScore ?? 0;

  return (
    <li
      className={cn(
        "overview-hypo-card overview-rise rounded-2xl border p-4 flex gap-4",
        colors.ring,
      )}
      style={delay ? { animationDelay: delay } : undefined}
    >
      {/* ICE badge */}
      <div className={cn(
        "shrink-0 flex flex-col items-center justify-center w-12 h-12 rounded-xl border font-display font-bold",
        colors.ring, colors.bg,
      )}>
        <span className={cn("text-lg leading-none", colors.text)}>{iceScore}</span>
        <span className="text-[8px] uppercase tracking-widest text-muted-foreground">ICE</span>
      </div>

      <div className="min-w-0 flex-1 space-y-1.5">
        {/* Rank + title */}
        <div className="flex items-start gap-2">
          <span className="shrink-0 mt-0.5 text-[10px] font-bold text-muted-foreground/50 w-4">
            #{rank}
          </span>
          <p className="text-sm font-medium leading-snug">{hypo.title}</p>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border", colors.ring, colors.bg, colors.text)}>
            {bucketLabel}
          </span>
          {hypo.metricName && (
            <span className="text-[10px] text-muted-foreground border border-border/40 px-2 py-0.5 rounded-full">
              {hypo.metricName}
            </span>
          )}
        </div>
      </div>

      <Link
        to={`/projects/${projectId}/funnels/${funnelId}/wizard/hypotheses`}
        className="shrink-0 self-center text-muted-foreground/40 hover:text-primary transition-colors"
      >
        <ChevronRight className="h-4 w-4" />
      </Link>
    </li>
  );
}
