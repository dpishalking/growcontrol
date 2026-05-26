import type { MetricHypothesesAuditContext } from "@/lib/metricHypothesesAuditContext";

export type MetricHypothesesApiPayload = {
  funnel: {
    typeId: string;
    typeName: string;
    exampleFlow?: string;
    productName: string;
    productDescription: string;
    trafficSource: string;
    targetAudience: string;
    funnelGoal: string;
    currentProblem: string;
  };
  metric: {
    id: string;
    name: string;
    stage: string;
    unit: string;
    plannedValue: number | null;
    actualValue: number | null;
    direction: string;
    status: string;
    achievementPercent: number | null;
    comment: string;
  };
  materials: {
    type: string;
    title: string;
    stage: string;
    content: string;
    extractedText?: string;
  }[];
  existingHypotheses: string[];
  /** @deprecated use auditContext */
  auditSummary?: string;
  auditContext?: MetricHypothesesAuditContext;
};
