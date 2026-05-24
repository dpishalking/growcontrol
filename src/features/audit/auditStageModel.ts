import type {
  FunnelAuditHypothesisDraft,
  FunnelAuditReport,
  FunnelStageAuditBlock,
} from "@/types/funnelAudit";
import type { FunnelMetric, MetricStatus } from "@/types/funnelMetric";

export type StageAuditStatus = FunnelStageAuditBlock["status"];

export type StageAuditView = {
  stageId: string;
  stageLabel: string;
  index: number;
  status: StageAuditStatus;
  audit?: FunnelStageAuditBlock;
  metrics: FunnelMetric[];
  hypotheses: { index: number; draft: FunnelAuditHypothesisDraft }[];
  leakHint?: string;
};

const STATUS_RANK: Record<StageAuditStatus, number> = {
  critical: 5,
  bad: 4,
  weak: 3,
  ok: 2,
  good: 1,
};

const METRIC_TO_STAGE: Record<MetricStatus, StageAuditStatus> = {
  red: "critical",
  yellow: "weak",
  green: "good",
  no_data: "ok",
  unreliable: "ok",
};

function metricMatchesDraft(metric: FunnelMetric, draft: FunnelAuditHypothesisDraft): boolean {
  const mn = (draft.metricName ?? "").trim().toLowerCase();
  const name = (metric.name ?? "").trim().toLowerCase();
  if (!mn || !name) return false;
  return mn === name || mn.includes(name) || name.includes(mn);
}

export function hypothesesForStage(
  all: FunnelAuditHypothesisDraft[] | undefined,
  stageId: string,
  stageMetrics: FunnelMetric[],
  assigned: Set<number>,
): { index: number; draft: FunnelAuditHypothesisDraft }[] {
  if (!all?.length) return [];

  const byMetric = all
    .map((draft, index) => ({ draft, index }))
    .filter(({ draft, index }) => {
      if (assigned.has(index)) return false;
      if (stageMetrics.some((m) => metricMatchesDraft(m, draft))) {
        assigned.add(index);
        return true;
      }
      return false;
    });

  if (byMetric.length) return byMetric;

  const channelStages: Record<string, string[]> = {
    creative: ["traffic", "click", "ads"],
    website: ["landing", "reg_page", "webinar_reg", "thank_you"],
    funnel: ["webinar", "attendance", "offer", "checkout"],
    sales: ["consultation", "contact", "sale", "followup"],
  };

  return all
    .map((draft, index) => ({ draft, index }))
    .filter(({ draft, index }) => {
      if (assigned.has(index)) return false;
      const ids = channelStages[draft.channel] ?? [];
      if (ids.includes(stageId)) {
        assigned.add(index);
        return true;
      }
      return false;
    });
}

export function unassignedHypotheses(
  all: FunnelAuditHypothesisDraft[] | undefined,
  views: StageAuditView[],
): { index: number; draft: FunnelAuditHypothesisDraft }[] {
  if (!all?.length) return [];
  const used = new Set(views.flatMap((v) => v.hypotheses.map((h) => h.index)));
  return all.map((draft, index) => ({ draft, index })).filter(({ index }) => !used.has(index));
}

function statusFromMetrics(metrics: FunnelMetric[]): StageAuditStatus {
  if (!metrics.length) return "ok";
  let worst: StageAuditStatus = "good";
  for (const m of metrics) {
    const s = METRIC_TO_STAGE[m.status];
    if (STATUS_RANK[s] > STATUS_RANK[worst]) worst = s;
  }
  return worst;
}

function mergeStatus(a: StageAuditStatus, b: StageAuditStatus): StageAuditStatus {
  return STATUS_RANK[a] >= STATUS_RANK[b] ? a : b;
}

function resolveAuditBlocks(
  report: FunnelAuditReport,
  stages: { id: string; label: string }[],
): Map<string, FunnelStageAuditBlock> {
  const map = new Map<string, FunnelStageAuditBlock>();

  for (const block of report.stageBlocks ?? []) {
    map.set(block.stageId, block);
  }

  for (const stage of stages) {
    if (map.has(stage.id)) continue;
    const fromBlocks = report.blocks?.find((b) => {
      const blockName = (b.name ?? "").toLowerCase();
      const stageLabel = stage.label.toLowerCase();
      return blockName.includes(stageLabel) || stageLabel.includes(blockName);
    });
    const leak = report.funnel?.stages?.find((s) => {
      const leakName = (s.name ?? "").toLowerCase();
      const stageLabel = stage.label.toLowerCase();
      return leakName === stageLabel || leakName.includes(stageLabel);
    });
    if (!fromBlocks && !leak) continue;
    map.set(stage.id, {
      stageId: stage.id,
      stageLabel: stage.label,
      status: fromBlocks?.status ?? (leak?.isMainLeak ? "bad" : "ok"),
      problem: fromBlocks?.problem ?? leak?.dropReason ?? "",
      whyImportant: fromBlocks?.whyImportant ?? "",
      howToFix: fromBlocks?.howToFix ?? "",
      rewriteExample: fromBlocks?.rewriteExample,
    });
  }

  return map;
}

export function buildStageAuditViews(
  report: FunnelAuditReport,
  stages: { id: string; label: string }[],
  metrics: FunnelMetric[],
): StageAuditView[] {
  const auditByStage = resolveAuditBlocks(report, stages);
  const hypotheses = report.hypotheses ?? [];
  const assignedHyp = new Set<number>();

  return stages.map((stage, index) => {
    const stageMetrics = metrics.filter((m) => m.stage === stage.id);
    const audit = auditByStage.get(stage.id);
    const fromMetrics = statusFromMetrics(stageMetrics);
    const fromAudit = audit?.status ?? "ok";
    const status = mergeStatus(fromMetrics, fromAudit);

    const leak = report.funnel?.stages?.find((s) => {
      const leakName = (s.name ?? "").toLowerCase();
      const stageLabel = stage.label.toLowerCase();
      return (
        leakName === stageLabel ||
        leakName.includes(stageLabel) ||
        stageLabel.includes(leakName)
      );
    });

    return {
      stageId: stage.id,
      stageLabel: stage.label,
      index: index + 1,
      status,
      audit,
      metrics: stageMetrics,
      hypotheses: hypothesesForStage(hypotheses, stage.id, stageMetrics, assignedHyp),
      leakHint: leak?.dropReason,
    };
  });
}

export const STAGE_STATUS_LABEL: Record<StageAuditStatus, string> = {
  critical: "Критично",
  bad: "Проседает",
  weak: "Слабо",
  ok: "Норма",
  good: "Хорошо",
};

export const METRIC_STATUS_LABEL: Record<MetricStatus, string> = {
  red: "Красная зона",
  yellow: "Жёлтая зона",
  green: "В норме",
  no_data: "Нет данных",
  unreliable: "Низкая достоверность",
};
