import { useNavigate, useParams } from "react-router-dom";
import { Activity, AlertCircle, AlertTriangle, CheckCircle2, ShieldQuestion } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAppData } from "@/context/AppDataContext";
import { WizardLayout } from "@/features/wizard/WizardLayout";
import { getFunnelTypeTemplate } from "@/data/funnelTypes/catalog";
import { buildDiagnostics } from "@/utils/funnelDiagnostics";
import type { Funnel } from "@/types/funnel";
import { getStageLabelForFunnel } from "@/utils/funnelStages";
import type { FunnelMetric, MetricStatus } from "@/types/funnelMetric";

const STATUS_STYLE: Record<MetricStatus, { className: string; label: string }> = {
  green: { className: "border-money/40 bg-money/10 text-money", label: "В норме" },
  yellow: { className: "border-primary/40 bg-primary/10 text-primary", label: "Жёлтая зона" },
  red: { className: "border-destructive/40 bg-destructive/10 text-destructive", label: "Красная зона" },
  no_data: { className: "border-border/60 text-muted-foreground", label: "Нет данных" },
  unreliable: { className: "border-border/60 text-muted-foreground", label: "Низкая достоверность" },
};

export function SignalsStep({ funnel }: { funnel: Funnel }) {
  const { projectId } = useParams<{ projectId: string }>();
  const nav = useNavigate();
  const { funnelMetricsList, setFunnelStep } = useAppData();
  const metrics = funnelMetricsList(funnel.id);
  const typeTemplate = getFunnelTypeTemplate(funnel.funnelTypeId ?? undefined);
  const diag = buildDiagnostics(metrics, typeTemplate.bottleneckMetricNames);

  const handleNext = () => {
    setFunnelStep(funnel.id, 7);
    nav(`/projects/${projectId}/funnels/${funnel.id}/wizard/hypotheses`);
  };

  return (
    <WizardLayout
      funnel={funnel}
      activeStep="signals"
      onBack={() => nav(`/projects/${projectId}/funnels/${funnel.id}/wizard/audit`)}
      onNext={handleNext}
      nextLabel="К гипотезам"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-border/50 bg-muted/15 px-4 py-3">
          <Activity className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1 min-w-0">
            <p className="text-sm font-medium">Сигналы по цифрам</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Здесь только план/факт и светофор — без AI. Разбор материалов и текстов — на шаге «Аудит».
              Отсюда выбираем метрику для гипотез.
            </p>
          </div>
        </div>

        {diag.bottleneck ? (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="p-4 flex gap-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Главный ограничитель
                </p>
                <p className="text-base font-medium mt-1">
                  {diag.bottleneck.name}{" "}
                  <span className="text-sm text-muted-foreground">
                    · {getStageLabelForFunnel(funnel, diag.bottleneck!.stage)}
                  </span>
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Факт {diag.bottleneck.actualValue ?? "—"} vs план {diag.bottleneck.plannedValue ?? "—"}.
                  Влияние на деньги: {diag.bottleneck.revenueImpact} / 5.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-money/40 bg-money/5">
            <CardContent className="p-4 flex gap-3">
              <CheckCircle2 className="h-5 w-5 text-money shrink-0 mt-0.5" />
              <p className="text-sm">
                Красных и жёлтых метрик нет — гипотезы будут носить характер усиления, а не починки.
              </p>
            </CardContent>
          </Card>
        )}

        <Group funnel={funnel} title="Красная зона" items={diag.red} status="red" />
        <Group funnel={funnel} title="Жёлтая зона" items={diag.yellow} status="yellow" />
        <Group funnel={funnel} title="Зелёная зона" items={diag.green} status="green" defaultCollapsed />
        <Group
          funnel={funnel}
          title="Нет данных"
          items={diag.noData}
          status="no_data"
          hint="Заполните план/факт, чтобы анализировать"
        />
        <Group
          funnel={funnel}
          title="Низкая достоверность"
          items={diag.unreliable}
          status="unreliable"
          hint="Уверенность low → не используем для гипотез"
        />

        {diag.moneyMovers.length > 0 ? (
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Сильнее всего влияют на деньги</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              {diag.moneyMovers.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-2">
                  <span>{m.name}</span>
                  <Badge variant="outline" className="text-[10px]">
                    impact {m.revenueImpact}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </WizardLayout>
  );
}

function Group({
  funnel,
  title,
  items,
  status,
  hint,
  defaultCollapsed,
}: {
  funnel: Funnel;
  title: string;
  items: FunnelMetric[];
  status: MetricStatus;
  hint?: string;
  defaultCollapsed?: boolean;
}) {
  if (items.length === 0) return null;
  const s = STATUS_STYLE[status];
  return (
    <details open={!defaultCollapsed} className={`rounded-xl border ${s.className.split(" ").filter((c) => c.startsWith("border-")).join(" ")}`}>
      <summary className="cursor-pointer px-4 py-3 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-medium">
          {status === "red" ? <AlertTriangle className="h-4 w-4" /> :
           status === "yellow" ? <AlertCircle className="h-4 w-4" /> :
           status === "green" ? <CheckCircle2 className="h-4 w-4" /> :
           <ShieldQuestion className="h-4 w-4" />}
          {title}
        </span>
        <Badge variant="secondary" className="text-[10px]">
          {items.length}
        </Badge>
      </summary>
      <div className="px-4 pb-3 space-y-1.5 text-sm">
        {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
        {items.map((m) => (
          <div key={m.id} className="flex items-center justify-between gap-2">
            <span>
              {m.name}{" "}
              <span className="text-muted-foreground text-xs">
                · {getStageLabelForFunnel(funnel, m.stage)}
              </span>
            </span>
            <span className="text-xs tabular-nums text-muted-foreground">
              {m.actualValue ?? "—"}
              {m.unit ?? ""} / {m.plannedValue ?? "—"}
              {m.unit ?? ""}
            </span>
          </div>
        ))}
      </div>
    </details>
  );
}
