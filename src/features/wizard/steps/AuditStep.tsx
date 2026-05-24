import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import type { FunnelAuditHypothesisDraft } from "@/types/funnelAudit";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAppData } from "@/context/AppDataContext";
import { WizardLayout } from "@/features/wizard/WizardLayout";
import { FunnelAuditReport } from "@/features/audit/FunnelAuditReport";
import { getFunnelTypeTemplate } from "@/data/funnelTypes/catalog";
import type { Funnel } from "@/types/funnel";
import { computeCoverage } from "@/utils/materialAudit";
import { getAuditSyncStatus } from "@/utils/auditSync";
import { getStagesForFunnel } from "@/utils/funnelStages";

export function AuditStep({ funnel }: { funnel: Funnel }) {
  const { projectId } = useParams<{ projectId: string }>();
  const nav = useNavigate();
  const {
    runFunnelAiAudit,
    funnelAuditSnapshot,
    funnelMaterials,
    funnelMetricsList,
    setFunnelStep,
    importAuditHypotheses,
    importAuditHypothesesDrafts,
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

  const handleImportSelected = (drafts: FunnelAuditHypothesisDraft[]) => {
    const created = importAuditHypothesesDrafts(funnel.id, drafts);
    if (created.length) {
      toast.success(`Импортировано ${created.length} гипотез`);
    } else {
      toast.message("Эти гипотезы уже в списке или не удалось импортировать");
    }
  };

  const handleNext = () => {
    setFunnelStep(funnel.id, 6);
    nav(`/projects/${projectId}/funnels/${funnel.id}/wizard/diagnostics`);
  };

  return (
    <WizardLayout
      funnel={funnel}
      activeStep="audit"
      onBack={() => nav(`/projects/${projectId}/funnels/${funnel.id}/wizard/metrics`)}
      onNext={handleNext}
      nextLabel="К диагностике"
      nextDisabled={!snapshot?.report}
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <h2 className="font-display text-xl font-semibold tracking-tight">AI-аудит воронки</h2>
            <p className="text-sm text-muted-foreground">
              {typeTemplate.name} · материалов {coverage.materialsCount} · метрик {metrics.length} ·
              шагов {coverage.requiredCovered}/{coverage.requiredTotal}
            </p>
          </div>
          <Button variant="outline" disabled={loading || !canRun} onClick={() => void handleRun()}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            {snapshot ? "Перезапустить" : "Запустить аудит"}
          </Button>
        </div>

        {!hasMaterials ? (
          <Card className="border-dashed">
            <CardContent className="p-4 text-sm text-muted-foreground">
              Загрузите материалы на шаге «Материалы» или укажите URL лендинга на шаге «Фокус».
            </CardContent>
          </Card>
        ) : null}

        {hasMaterials && !hasMetrics ? (
          <Card className="border-dashed border-warning/40">
            <CardContent className="p-4 text-sm text-muted-foreground">
              Сначала добавьте метрики на предыдущем шаге — аудит связывает цифры с материалами по
              этапам воронки.
            </CardContent>
          </Card>
        ) : null}

        {loading ? (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-8 flex flex-col items-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="font-medium text-foreground">AI разбирает воронку…</p>
              <p className="text-xs text-center max-w-sm">
                Сопоставление материалов, метрик и этапов. Обычно 30–90 секунд.
              </p>
            </CardContent>
          </Card>
        ) : null}

        {error && !loading ? (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="p-4 flex gap-3 text-sm">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
              <div>
                <p className="font-medium">Аудит не выполнен</p>
                <p className="text-muted-foreground text-xs mt-1">{error}</p>
                {/Invalid JWT|401|не настроен|API_KEY|functions\/v1/i.test(error) ? (
                  <p className="text-xs mt-2 text-muted-foreground">
                    Проверьте: edge function <code className="text-[11px]">analyze-funnel-audit</code>{" "}
                    задеплоена, ключ AI-сервиса задан в secrets, в <code className="text-[11px]">.env</code>{" "}
                    — publishable key, dev-сервер перезапущен после правок.
                  </p>
                ) : /HTTP 502|HTTP 503|перегружен|timeout|Failed to fetch/i.test(error) ? (
                  <p className="text-xs mt-2 text-muted-foreground">
                    Аудит может идти 1–2 минуты. Подождите и нажмите «Перезапустить». Если повторяется
                    — попробуйте без тяжёлых файлов или укоротите материалы.
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {snapshot?.report && !syncStatus.inSync && !loading ? (
          <Card className="border-warning/40 bg-warning/5">
            <CardContent className="p-4 flex flex-wrap items-start justify-between gap-3 text-sm">
              <div className="flex gap-3 min-w-0">
                <AlertCircle className="h-5 w-5 text-warning shrink-0" />
                <div>
                  <p className="font-medium">Данные изменились после аудита</p>
                  <p className="text-muted-foreground text-xs mt-1">
                    {syncStatus.messages.length
                      ? `Обновились: ${syncStatus.messages.join(", ")}.`
                      : "Текущие метрики и материалы не совпадают с моментом генерации отчёта."}{" "}
                    Цифры в карточках этапов уже актуальны, но текст AI может быть устаревшим.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0"
                disabled={loading || !canRun}
                onClick={() => void handleRun()}
              >
                <RefreshCw className="mr-1.5 h-4 w-4" />
                Перезапустить аудит
              </Button>
            </CardContent>
          </Card>
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
            onImportHypotheses={handleImportSelected}
          />
        ) : null}

        {!snapshot && !loading && !error && canRun ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              Нажмите «Запустить аудит» — AI свяжет ваши материалы и метрики по этапам воронки.
            </CardContent>
          </Card>
        ) : null}
      </div>
    </WizardLayout>
  );
}
