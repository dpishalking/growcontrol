import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertCircle, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAppData } from "@/context/AppDataContext";
import { WizardLayout } from "@/features/wizard/WizardLayout";
import { FunnelAuditReport } from "@/features/audit/FunnelAuditReport";
import { getFunnelTypeTemplate } from "@/data/funnelTypes/catalog";
import type { Funnel } from "@/types/funnel";
import { computeCoverage } from "@/utils/materialAudit";
import { getAuditSyncStatus } from "@/utils/auditSync";
import { getStagesForFunnel } from "@/utils/funnelStages";
import { cn } from "@/lib/utils";

export function AuditStep({ funnel }: { funnel: Funnel }) {
  const { projectId } = useParams<{ projectId: string }>();
  const nav = useNavigate();
  const {
    runFunnelAiAudit,
    funnelAuditSnapshot,
    funnelMaterials,
    funnelMetricsList,
    setFunnelStep,
  } = useAppData();

  const materials = funnelMaterials(funnel.id);
  const metrics = funnelMetricsList(funnel.id);
  const snapshot = funnelAuditSnapshot(funnel.id);
  const typeTemplate = getFunnelTypeTemplate(funnel.funnelTypeId ?? undefined);
  const stages = getStagesForFunnel(funnel);
  const typeId = funnel.funnelTypeId ?? "service_lead";
  const coverage = computeCoverage(
    materials,
    typeTemplate.requiredMaterials,
    typeId,
    stages.map((s) => s.id),
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasMaterials = materials.length > 0 || Boolean(funnel.landingUrl?.trim());
  const hasMetrics = metrics.length > 0;
  const canRun = hasMaterials && hasMetrics;

  const syncStatus = useMemo(
    () => getAuditSyncStatus(snapshot, funnel, metrics, materials),
    [snapshot, funnel, metrics, materials],
  );

  useEffect(() => {
    if (snapshot || !canRun) return;
    void handleRun(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [funnel.id]);

  const handleRun = async (silent = false) => {
    if (!hasMaterials) {
      toast.error("Загрузите материалы или укажите URL посадочной на шаге «Фокус»");
      return;
    }
    if (!hasMetrics) {
      toast.error("Добавьте метрики на предыдущем шаге — без цифр аудит не сможет связать проблемы с этапами");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await runFunnelAiAudit(funnel.id);
      if (!silent) toast.success("AI-аудит готов");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Не удалось выполнить аудит";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    setFunnelStep(funnel.id, 6);
    nav(`/projects/${projectId}/funnels/${funnel.id}/wizard/signals`);
  };

  return (
    <WizardLayout
      funnel={funnel}
      activeStep="audit"
      onBack={() => nav(`/projects/${projectId}/funnels/${funnel.id}/wizard/metrics`)}
      onNext={handleNext}
      nextLabel="К сигналам"
      nextDisabled={!snapshot?.report}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-2 min-w-0">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary shrink-0" />
              <h2 className="font-display text-lg font-semibold tracking-tight">AI-аудит</h2>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <StatChip label={typeTemplate.name} />
              <StatChip label={`${coverage.materialsCount} мат.`} />
              <StatChip label={`${metrics.length} метрик`} />
              <StatChip
                label={`${coverage.requiredCovered}/${coverage.requiredTotal} шагов`}
                muted={coverage.requiredCovered < coverage.requiredTotal}
              />
            </div>
          </div>
          <Button
            size="sm"
            variant={snapshot && !syncStatus.inSync ? "default" : "outline"}
            disabled={loading || !canRun}
            onClick={() => void handleRun()}
            className={cn(snapshot && !syncStatus.inSync && "bg-gradient-money text-primary-foreground")}
          >
            {loading ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-1.5 h-4 w-4" />
            )}
            {snapshot ? "Обновить" : "Запустить"}
          </Button>
        </div>

        {!hasMaterials ? (
          <InlineAlert>
            Загрузите материалы на шаге «Материалы» или укажите URL лендинга на шаге «Фокус».
          </InlineAlert>
        ) : null}

        {hasMaterials && !hasMetrics ? (
          <InlineAlert tone="warning">
            Сначала добавьте метрики — аудит связывает цифры с материалами по этапам.
          </InlineAlert>
        ) : null}

        {snapshot?.report && !syncStatus.inSync && !loading ? (
          <InlineAlert tone="warning" action={() => void handleRun()}>
            {syncStatus.messages.length
              ? `Изменились: ${syncStatus.messages.join(", ")}.`
              : "Данные изменились."}{" "}
            Цифры смотрите на шаге «Сигналы» — здесь нужен перезапуск AI.
          </InlineAlert>
        ) : null}

        {loading ? (
          <div className="rounded-2xl border border-border/50 bg-muted/15 px-6 py-10 flex flex-col items-center gap-3">
            <div className="relative">
              <div className="h-12 w-12 rounded-full border-2 border-primary/20" />
              <Loader2 className="absolute inset-0 m-auto h-6 w-6 animate-spin text-primary" />
            </div>
            <p className="text-sm font-medium">AI разбирает воронку</p>
            <p className="text-xs text-muted-foreground text-center max-w-xs">
              Сопоставление материалов, метрик и этапов · обычно 30–90 сек
            </p>
          </div>
        ) : null}

        {error && !loading ? (
          <InlineAlert tone="error">
            <span className="font-medium">Не выполнен: </span>
            {error}
          </InlineAlert>
        ) : null}

        {snapshot?.report && !loading ? (
          <FunnelAuditReport
            report={snapshot.report}
            stages={stages}
            metrics={metrics}
            funnelName={funnel.productName}
            typeName={snapshot.funnelTypeName ?? typeTemplate.name}
            generatedAt={snapshot.generatedAt}
            metricsInSync={syncStatus.inSync}
          />
        ) : null}

        {!snapshot && !loading && !error && canRun ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Аудит запустится автоматически или нажмите «Запустить»
          </p>
        ) : null}
      </div>
    </WizardLayout>
  );
}

function StatChip({ label, muted }: { label: string; muted?: boolean }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] border border-border/50 bg-muted/20",
        muted ? "text-warning" : "text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
}

function InlineAlert({
  children,
  tone = "muted",
  action,
}: {
  children: ReactNode;
  tone?: "muted" | "warning" | "error";
  action?: () => void;
}) {
  const styles = {
    muted: "border-border/50 bg-muted/15 text-muted-foreground",
    warning: "border-warning/30 bg-warning-soft/25 text-foreground",
    error: "border-danger/30 bg-danger-soft/25 text-foreground",
  };

  return (
    <div className={cn("rounded-xl border px-3 py-2.5 text-xs sm:text-sm flex gap-2 items-start", styles[tone])}>
      {tone !== "muted" ? <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 opacity-80" /> : null}
      <div className="min-w-0 flex-1">{children}</div>
      {action ? (
        <Button size="sm" variant="ghost" className="h-7 shrink-0 text-xs" onClick={action}>
          Обновить
        </Button>
      ) : null}
    </div>
  );
}
