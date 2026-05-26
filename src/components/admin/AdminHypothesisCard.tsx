import { Badge } from "@/components/ui/badge";
import { HypothesisStructure } from "@/features/hypotheses/HypothesisStructure";
import {
  HYPOTHESIS_PRIORITY_LABELS,
  HYPOTHESIS_STATUS_LABELS,
  HYPOTHESIS_STATUS_TONE,
} from "@/lib/admin/hypothesisLabels";
import { parseHypothesisDescription } from "@/lib/hypothesisPresentation";
import { formatDate } from "@/utils/format";
import { cn } from "@/lib/utils";

export type AdminHypothesisView = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  expected_impact: string | null;
  created_at: string;
};

export function AdminHypothesisCard({ hypothesis: h }: { hypothesis: AdminHypothesisView }) {
  const parts = parseHypothesisDescription(h.description);
  const ifText = parts.ifChange || h.title;
  const thenText = parts.thenMetric || h.expected_impact;

  return (
    <article className="rounded-xl border border-border/50 bg-card/30 p-3.5 sm:p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          <Badge
            variant="outline"
            className={cn("text-[10px]", HYPOTHESIS_STATUS_TONE[h.status] ?? "chip")}
          >
            {HYPOTHESIS_STATUS_LABELS[h.status] ?? h.status}
          </Badge>
          <Badge variant="outline" className="chip text-[10px]">
            {HYPOTHESIS_PRIORITY_LABELS[h.priority] ?? h.priority}
          </Badge>
        </div>
        <time className="text-[11px] text-muted-foreground tabular-nums whitespace-nowrap">
          {formatDate(h.created_at)}
        </time>
      </div>

      <HypothesisStructure
        ifText={ifText}
        thenText={thenText}
        becauseText={parts.becauseReason}
        testMethod={parts.testMethod}
        successCriteria={parts.successCriteria}
        metricLabel={h.expected_impact}
      />
    </article>
  );
}
