export type FunnelAuditHypothesisDraft = {
  title: string;
  why: string;
  expectedImpact: string;
  metricName: string;
  testWindow: string;
  guardrail?: string;
  priority: "high" | "medium" | "low";
  channel: "website" | "funnel" | "sales" | "offer" | "creative" | "research";
  problemIndex?: number;
  /** v2 super-prompt fields */
  ifChange?: string;
  thenMetric?: string;
  becauseReason?: string;
  materialsToChange?: string[];
  testMethod?: string;
  successCriteria?: string;
  testDurationDays?: number;
  impact?: number;
  confidence?: number;
  ease?: number;
  risk?: string;
};

export type FunnelStageAuditBlock = {
  stageId: string;
  stageLabel: string;
  status: "critical" | "bad" | "weak" | "ok" | "good";
  problem: string;
  whyImportant: string;
  howToFix: string;
  rewriteExample?: string;
};

export type CrossMaterialMismatch = {
  severity: "critical" | "important" | "minor";
  title: string;
  detail: string;
  fix: string;
};

export type FunnelAuditReport = {
  diagnosis: {
    metrics: {
      name: "Понятность" | "Ценность" | "Доверие" | "Действие";
      score: number;
      comment: string;
    }[];
    mainProblem: string;
    mainMoneyLeak: string;
    estimatedLossPercent: string;
    mainLever?: string;
  };
  problems: {
    severity: "critical" | "important" | "minor";
    title: string;
    whyItHurts: string;
    moneyImpact: string;
    howToFix: string[];
    effort: "1 день" | "1 неделя" | "1 месяц";
    impactScore: number;
    customerThought?: string;
  }[];
  blocks: {
    name: string;
    status: "critical" | "bad" | "weak" | "ok" | "good";
    priorityRank?: number;
    problem: string;
    whyImportant: string;
    howToFix: string;
    rewriteExample?: string;
    ctaVariants?: string[];
    testimonialScript?: string;
  }[];
  stageBlocks?: FunnelStageAuditBlock[];
  crossMaterialMismatches?: CrossMaterialMismatch[];
  quickestWin?: {
    action: string;
    why: string;
    expectedEffect: string;
    effort: string;
  };
  moneyLeaks: {
    items: { reason: string; lossPercent: string; verification?: string }[];
    totalLoss: string;
  };
  growthPotential: {
    requestsGrowth: string;
    conversionGrowth: string;
    revenueLogic: string;
    verification?: string;
    confidence?: "высокий" | "средний" | "точечный";
  };
  beforeAfter: { label: string; before: string; after: string }[];
  roadmap: {
    quickWins: { problemIndex: number; action: string; expectedEffect: string }[];
    thisWeek: { problemIndex: number; action: string; expectedEffect: string }[];
    thisMonth: { problemIndex: number; action: string; expectedEffect: string }[];
  };
  funnel?: {
    stages: {
      name: string;
      percent: number;
      dropReason: string;
      isMainLeak: boolean;
    }[];
    mainLeak: string;
    insight: string;
  };
  waterfall?: {
    steps: { label: string; percent: number }[];
    finalConversion: number;
    insight: string;
  };
  offerScore?: {
    dream: number;
    dreamComment: string;
    likelihood: number;
    likelihoodComment: string;
    timeDelay: number;
    timeComment: string;
    effort: number;
    effortComment: string;
    totalScore: number;
    verdict: string;
    biggestLever: string;
  };
  marketContext?: {
    sophisticationLevel: number;
    sophisticationComment: string;
    awarenessLevel: "unaware" | "problem-aware" | "solution-aware" | "product-aware" | "most-aware";
    awarenessComment: string;
    mismatch: string;
    uniqueMechanism: string;
  };
  unitEconomics?: {
    niche: string;
    assumedAvgCheck: string;
    assumedCpc: string;
    assumedCurrentCr: string;
    estimatedCpl: string;
    estimatedCac: string;
    paybackVerdict: string;
    healthStatus: "healthy" | "tight" | "broken";
    uplift: string;
    disclaimer: string;
  };
  meclabsScore?: {
    motivation: number;
    motivationComment: string;
    valueProposition: number;
    valueComment: string;
    incentive: number;
    incentiveComment: string;
    friction: number;
    frictionComment: string;
    anxiety: number;
    anxietyComment: string;
    score: number;
    interpretation: string;
  };
  systemMessage: string;
  softOffer: { steps: string[]; goal: string };
  finalCta: string;
  firstScreenRewrite?: {
    h1: string;
    subtitle: string;
    bullets: string[];
    cta: string;
    microtext: string;
    proofNearby: string;
    removeList: string[];
    visualHint: string;
  };
  ctaPath?: {
    leadsTo: string;
    userSees: string;
    friction: string;
    afterForm: string;
  };
  proofMap?: { promise: string; proofThatCloses: string; missing: string }[];
  resistanceMap?: {
    moment: string;
    whatSiteSays: string;
    whatClientThinks: string;
    howToRespond: string;
  }[];
  moneyHierarchy?: { surface: string[]; trust: string[]; product: string[] };
  hypotheses?: FunnelAuditHypothesisDraft[];
};

export type AuditSyncSnapshot = {
  metricsFingerprint: string;
  metricsCount: number;
  materialsFingerprint: string;
  materialsCount: number;
  stagesFingerprint: string;
  landingUrl?: string;
};

export type FunnelAuditSnapshot = {
  report: FunnelAuditReport;
  generatedAt: string;
  landingUrl?: string;
  materialsCount: number;
  funnelTypeName?: string;
  /** Снимок метрик и материалов на момент аудита — для проверки актуальности. */
  syncContext?: AuditSyncSnapshot;
};

export type FunnelAuditApiPayload = {
  landingUrl?: string;
  funnel: {
    typeId: string;
    typeName: string;
    exampleFlow?: string;
    productName: string;
    productDescription: string;
    averagePrice: string;
    trafficSource: string;
    targetAudience: string;
    funnelGoal: string;
    currentProblem: string;
    stages: { id: string; label: string; description?: string }[];
    productDetails?: Record<string, string>;
    audienceDetails?: Record<string, string>;
    funnelDetails?: Record<string, string>;
    constraints?: Record<string, string>;
    commonBottlenecks?: string[];
    auditQuestions?: Record<string, string[]>;
  };
  materials: {
    id: string;
    type: string;
    title: string;
    stage: string;
    url: string;
    content: string;
    extractedText?: string;
    source: string;
  }[];
  metrics?: {
    stage: string;
    name: string;
    unit: string;
    period: string;
    plannedValue: number | null;
    actualValue: number | null;
    direction: string;
    confidence: string;
    status: string;
    achievementPercent: number | null;
    revenueImpact: number;
    dataSource?: string;
    comment?: string;
  }[];
  /** Для Telegram-уведомления после аудита (Edge Function). */
  appProjectId?: string;
  projectName?: string;
  funnelName?: string;
  reportUrl?: string;
  notifyTelegram?: boolean;
};
