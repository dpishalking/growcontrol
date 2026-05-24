import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAppData } from "@/context/AppDataContext";
import { WizardLayout } from "@/features/wizard/WizardLayout";
import { BUCKET_LABELS, sortByPriority } from "@/utils/icePriority";
import type { Funnel } from "@/types/funnel";
import type { Hypothesis, HypothesisBucket } from "@/types/hypothesis";

const BUCKET_ORDER: HypothesisBucket[] = [
  "quick_test",
  "strategic",
  "uncertain",
  "do_not_touch",
];

const BUCKET_STYLE: Record<HypothesisBucket, string> = {
  quick_test: "border-money/40 bg-money/5",
  strategic: "border-primary/40 bg-primary/5",
  uncertain: "border-border/60",
  do_not_touch: "border-border/60 opacity-80",
};

export function PrioritizationStep({ funnel }: { funnel: Funnel }) {
  const { projectId } = useParams<{ projectId: string }>();
  const nav = useNavigate();
  const { funnelHypotheses, setFunnelStep } = useAppData();
  const hypotheses = funnelHypotheses(funnel.id);

  const buckets = useMemo(() => {
    const map: Record<HypothesisBucket, Hypothesis[]> = {
      quick_test: [],
      strategic: [],
      uncertain: [],
      do_not_touch: [],
    };
    for (const h of sortByPriority(hypotheses)) map[h.bucket].push(h);
    return map;
  }, [hypotheses]);

  const handleNext = () => {
    setFunnelStep(funnel.id, 9);
    nav(`/projects/${projectId}/funnels/${funnel.id}/wizard/plan`);
  };

  return (
    <WizardLayout
      funnel={funnel}
      activeStep="prioritization"
      onBack={() => nav(`/projects/${projectId}/funnels/${funnel.id}/wizard/hypotheses`)}
      onNext={handleNext}
      nextLabel="К плану тестов"
      nextDisabled={hypotheses.length === 0}
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Сортировка по ICE = Impact × Confidence × Ease. Группы: что брать в первую очередь, что
          стратегически, что отложить.
        </p>

        {BUCKET_ORDER.map((b) => {
          const items = buckets[b];
          if (items.length === 0) return null;
          return (
            <Card key={b} className={BUCKET_STYLE[b]}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{BUCKET_LABELS[b].label}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {items.length}
                  </Badge>
                </CardTitle>
                <p className="text-xs text-muted-foreground">{BUCKET_LABELS[b].hint}</p>
              </CardHeader>
              <CardContent className="space-y-2">
                {items.map((h) => (
                  <div
                    key={h.id}
                    className="rounded-lg border border-border/60 bg-background/40 px-3 py-2"
                  >
                    <p className="text-sm font-medium">{h.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Метрика: {h.metricName} · ICE {h.priorityScore} ·{" "}
                      <span>I{h.impact} / C{h.confidence} / E{h.ease}</span>
                    </p>
                    {h.testMethod ? (
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Тест: {h.testMethod}
                      </p>
                    ) : null}
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </WizardLayout>
  );
}
