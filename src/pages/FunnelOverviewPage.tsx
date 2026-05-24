import { Link, Navigate, useParams } from "react-router-dom";
import { FlaskConical, FileText, Layers, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAppData } from "@/context/AppDataContext";
import { getFunnelTypeTemplate } from "@/data/funnelTypes/catalog";
import { buildDiagnostics } from "@/utils/funnelDiagnostics";
import { sortByPriority, BUCKET_LABELS } from "@/utils/icePriority";
import { wizardStepByIndex } from "@/features/wizard/wizardSteps";
import { getStageLabelForFunnel } from "@/utils/funnelStages";

export default function FunnelOverviewPage() {
  const { projectId, funnelId } = useParams<{ projectId: string; funnelId: string }>();
  const {
    getProject,
    getFunnel,
    funnelMaterials,
    funnelFindings,
    funnelMetricsList,
    funnelHypotheses,
    funnelExperiments,
  } = useAppData();

  if (!projectId || !funnelId) return <Navigate to="/dashboard" replace />;
  const project = getProject(projectId);
  const funnel = getFunnel(funnelId);
  if (!project || !funnel) return <Navigate to="/dashboard" replace />;

  const materials = funnelMaterials(funnel.id);
  const findings = funnelFindings(funnel.id);
  const metrics = funnelMetricsList(funnel.id);
  const hypotheses = funnelHypotheses(funnel.id);
  const experiments = funnelExperiments(funnel.id);
  const diag = buildDiagnostics(
    metrics,
    getFunnelTypeTemplate(funnel.funnelTypeId ?? undefined).bottleneckMetricNames,
  );
  const typeName = funnel.funnelTypeId
    ? getFunnelTypeTemplate(funnel.funnelTypeId).name
    : null;

  const nextStep = wizardStepByIndex(funnel.currentWizardStep);
  const top3 = sortByPriority(hypotheses).slice(0, 3);

  return (
    <>
      <PageHeader
        title={funnel.productName || "Воронка"}
        subtitle={`${funnel.trafficSource || "—"} → ${funnel.landingUrl || "—"} · Цель: ${funnel.funnelGoal || "—"}${typeName ? ` · ${typeName}` : ""}`}
        backTo={`/projects/${projectId}`}
        backLabel="К проекту"
        action={
          <Button asChild className="bg-gradient-money text-primary-foreground">
            <Link to={`/projects/${projectId}/funnels/${funnel.id}/wizard/${nextStep.id}`}>
              Продолжить мастер: {nextStep.title}
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-4 mb-6">
        <Stat icon={Layers} label="Материалы" value={materials.length} />
        <Stat icon={Target} label="Метрики" value={metrics.length} accent={diag.red.length > 0 ? "red" : undefined} />
        <Stat icon={FlaskConical} label="Гипотезы" value={hypotheses.length} />
        <Stat icon={FileText} label="Эксперименты" value={experiments.length} />
      </div>

      {diag.bottleneck ? (
        <Card className="mb-6 border-destructive/40 bg-destructive/5">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Главный ограничитель
            </p>
            <p className="text-base font-medium mt-1">{diag.bottleneck.name}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {getStageLabelForFunnel(funnel, diag.bottleneck!.stage)} · влияние {diag.bottleneck.revenueImpact}/5
            </p>
            <Button asChild size="sm" variant="outline" className="mt-3">
              <Link to={`/projects/${projectId}/funnels/${funnel.id}/wizard/hypotheses`}>
                Гипотезы под эту метрику
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <section className="mb-6">
        <h2 className="font-display text-lg font-semibold mb-3">ТОП-3 гипотезы</h2>
        {top3.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Гипотез ещё нет —{" "}
            <Link
              to={`/projects/${projectId}/funnels/${funnel.id}/wizard/hypotheses`}
              className="text-primary hover:underline"
            >
              сгенерировать
            </Link>
            .
          </p>
        ) : (
          <ul className="space-y-2">
            {top3.map((h) => (
              <li key={h.id} className="rounded-lg border border-border/60 px-3 py-2">
                <p className="text-sm font-medium">{h.title}</p>
                <p className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline" className="text-[10px]">
                    ICE {h.priorityScore}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {BUCKET_LABELS[h.bucket].label}
                  </Badge>
                  <span>Метрика: {h.metricName}</span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold mb-3">Аудит вкратце</h2>
        {findings.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Аудит ещё не запускался.{" "}
            <Link
              to={`/projects/${projectId}/funnels/${funnel.id}/wizard/audit`}
              className="text-primary hover:underline"
            >
              Запустить
            </Link>
          </p>
        ) : (
          <Card className="border-border/60">
            <CardContent className="p-4 grid gap-2 text-sm">
              <Row label="Сильные стороны" count={findings.filter((f) => f.findingType === "strength").length} />
              <Row label="Слабые места" count={findings.filter((f) => f.findingType === "weakness").length} />
              <Row label="Нет данных" count={findings.filter((f) => f.findingType === "missing_data").length} />
              <Row label="Риски" count={findings.filter((f) => f.findingType === "risk").length} />
            </CardContent>
          </Card>
        )}
      </section>
    </>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Layers;
  label: string;
  value: number;
  accent?: "red";
}) {
  return (
    <Card
      className={`border-border/60 ${accent === "red" ? "border-destructive/40 bg-destructive/5" : ""}`}
    >
      <CardContent className="p-3 flex items-center gap-3">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="font-display text-xl font-bold tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Row({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <Badge variant="outline" className="text-[10px] tabular-nums">
        {count}
      </Badge>
    </div>
  );
}
