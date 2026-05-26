import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertCircle, Loader2, MessageCircle, RefreshCw, Sparkles } from "lucide-react";
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
import { useAuth } from "@/hooks/useAuth";
import { buildAuditReportUrl, formatAuditDigestTelegram } from "@/lib/telegramAuditFormat";
import { notifyAuditReady, telegramNotifyErrorMessage } from "@/services/telegramService";
import { syncProjectToRemote } from "@/services/projectSyncService";

export function AuditStep({ funnel }: { funnel: Funnel }) {
  const { projectId } = useParams<{ projectId: string }>();
  const nav = useNavigate();
  const {
    runFunnelAiAudit,
    funnelAuditSnapshot,
    funnelMaterials,
    funnelMetricsList,
    setFunnelStep,
    getProject,
    store,
  } = useAppData();
  const { guest } = useAuth();

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
  const [telegramSending, setTelegramSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const AUDIT_TIMEOUT_MS = 90_000;

  const hasMaterials = materials.length > 0 || Boolean(funnel.landingUrl?.trim());
  const hasMetrics = metrics.length > 0;
  const canRun = hasMaterials && hasMetrics;

  const syncStatus = useMemo(
    () => getAuditSyncStatus(snapshot, funnel, metrics, materials),
    [snapshot, funnel, metrics, materials],
  );

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (snapshot || !canRun) return;
    void handleRun(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [funnel.id]);

  const handleCancel = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
    setError("Аудит отменён");
  };

  const handleRun = async (silent = false) => {
    if (!hasMaterials) {
      toast.error("Загрузите материалы или укажите URL посадочной на шаге «Фокус»");
      return;
    }
    if (!hasMetrics) {
      toast.error("Добавьте метрики на предыдущем шаге — без цифр аудит не сможет связать проблемы с этапами");
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const timeoutId = window.setTimeout(() => controller.abort(), AUDIT_TIMEOUT_MS);

    setLoading(true);
    setError(null);
    try {
      const result = await runFunnelAiAudit(funnel.id, controller.signal);
      if (!result) return;

      const { telegramSent } = result;
      if (telegramSent > 0) {
        toast.success(`AI-аудит готов · отправлено в Telegram (${telegramSent})`);
      } else if (!guest && !silent) {
        toast.success("AI-аудит готов");
        toast.info("Telegram: чат не привязан или не удалось отправить");
      } else if (!silent) {
        toast.success("AI-аудит готов");
      } else {
        toast.success("AI-аудит готов");
      }
    } catch (e) {
      if (controller.signal.aborted) {
        const msg =
          abortRef.current === null
            ? "Аудит отменён"
            : "Превышено время ожидания (1.5 мин). Попробуйте ещё раз.";
        setError(msg);
        if (!silent && abortRef.current !== null) toast.error(msg);
      } else {
        const msg = e instanceof Error ? e.message : "Не удалось выполнить аудит";
        setError(msg);
        toast.error(msg);
      }
    } finally {
      window.clearTimeout(timeoutId);
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
      setLoading(false);
    }
  };

  const handleSendTelegram = async () => {
    const appProjectId = funnel.projectId || projectId;
    if (!snapshot?.report || !appProjectId || guest) {
      toast.error("Войдите в аккаунт для отправки в Telegram");
      return;
    }
    const project = getProject(appProjectId);
    if (!project) {
      toast.error("Проект не найден");
      return;
    }
    setTelegramSending(true);
    try {
      const syncResult = await syncProjectToRemote(project, store);
      if (!syncResult.ok) {
        toast.error(`Синхронизация: ${syncResult.error ?? "ошибка"}`);
        return;
      }

      const digest = formatAuditDigestTelegram({
        projectName: project.projectName,
        funnelName: funnel.productName || "Воронка",
        typeName: snapshot.funnelTypeName ?? typeTemplate.name,
        generatedAt: snapshot.generatedAt,
        report: snapshot.report,
        metrics,
        reportUrl: buildAuditReportUrl(appProjectId, funnel.id),
      });
      const { ok, sent, reason } = await notifyAuditReady(appProjectId, digest);
      if (ok && sent > 0) {
        toast.success(`Отправлено в Telegram (${sent})`);
      } else if (ok) {
        toast.error(telegramNotifyErrorMessage("no_linked_chats"));
      } else {
        toast.error(telegramNotifyErrorMessage(reason));
      }
    } finally {
      setTelegramSending(false);
    }
  };

  const handleNext = () => {
    setFunnelStep(funnel.id, 6);
    nav(`/projects/${projectId}/funnels/${funnel.id}/wizard/hypotheses`);
  };

  return (
    <WizardLayout
      funnel={funnel}
      activeStep="audit"
      onBack={() => nav(`/projects/${projectId}/funnels/${funnel.id}/wizard/metrics`)}
      onNext={handleNext}
      nextLabel="К гипотезам"
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
          <div className="flex flex-wrap gap-2">
            {snapshot?.report && !guest ? (
              <Button
                size="sm"
                variant="outline"
                disabled={loading || telegramSending}
                onClick={() => void handleSendTelegram()}
              >
                {telegramSending ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <MessageCircle className="mr-1.5 h-4 w-4" />
                )}
                Повторить в Telegram
              </Button>
            ) : null}
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
            <p className="text-sm font-medium">Сканируем узкие места</p>
            <p className="text-xs text-muted-foreground text-center max-w-xs">
              Метрики и этапы воронки · обычно 15–45 сек
            </p>
            <Button size="sm" variant="outline" onClick={handleCancel} className="mt-2">
              Отменить
            </Button>
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
