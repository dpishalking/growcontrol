import type {
  CrossMaterialMismatch,
  FunnelAuditHypothesisDraft,
  FunnelAuditReport,
  FunnelStageAuditBlock,
} from "@/types/funnelAudit";

const ALLOWED_CHANNELS: FunnelAuditHypothesisDraft["channel"][] = [
  "website",
  "funnel",
  "sales",
  "offer",
  "creative",
  "research",
];

function normPriority(v: unknown): FunnelAuditHypothesisDraft["priority"] {
  const s = String(v ?? "").toLowerCase();
  if (s.includes("high") || s.includes("высок")) return "high";
  if (s.includes("low") || s.includes("низ")) return "low";
  return "medium";
}

function normChannel(v: unknown): FunnelAuditHypothesisDraft["channel"] {
  const s = String(v ?? "").toLowerCase();
  return (ALLOWED_CHANNELS.find((c) => c === s) ?? "website") as FunnelAuditHypothesisDraft["channel"];
}

/** Сборка 10 гипотез из roadmap (для старых аудитов без поля hypotheses). */
function fallbackHypothesesFromRoadmap(audit: FunnelAuditReport): FunnelAuditHypothesisDraft[] {
  const flat: FunnelAuditHypothesisDraft[] = [];
  const push = (
    items: { problemIndex: number; action: string; expectedEffect: string }[] | undefined,
    priority: FunnelAuditHypothesisDraft["priority"],
    window: string,
  ) => {
    (items ?? []).forEach((it) => {
      flat.push({
        title: it.action,
        why: audit.problems[it.problemIndex]?.whyItHurts ?? "",
        expectedImpact: it.expectedEffect,
        metricName: "CR в заявку",
        testWindow: window,
        priority,
        channel: "website",
        problemIndex: it.problemIndex,
      });
    });
  };
  push(audit.roadmap?.quickWins, "high", "1–3 дня");
  push(audit.roadmap?.thisWeek, "medium", "1 неделя");
  push(audit.roadmap?.thisMonth, "low", "1 месяц");
  return flat.slice(0, 10);
}

const METRIC_NAMES = ["Понятность", "Ценность", "Доверие", "Действие"] as const;

function asString(v: unknown, fallback = ""): string {
  if (v == null) return fallback;
  return String(v).trim() || fallback;
}

function asNumber(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => asString(x)).filter(Boolean);
  if (typeof v === "string" && v.trim()) return [v.trim()];
  return [];
}

function normSeverity(v: unknown): FunnelAuditReport["problems"][number]["severity"] {
  const s = asString(v).toLowerCase();
  if (s.includes("crit") || s.includes("крит")) return "critical";
  if (s.includes("minor") || s.includes("минор") || s.includes("можно улучш")) return "minor";
  if (s === "important" || s.includes("важн")) return "important";
  return "important";
}

function normAwareness(v: unknown): NonNullable<FunnelAuditReport["marketContext"]>["awarenessLevel"] {
  const s = asString(v).toLowerCase();
  if (s.includes("unaware") || s.includes("не осозна")) return "unaware";
  if (s.includes("problem")) return "problem-aware";
  if (s.includes("solution")) return "solution-aware";
  if (s.includes("product")) return "product-aware";
  if (s.includes("most")) return "most-aware";
  return "problem-aware";
}

function normHealth(v: unknown): NonNullable<FunnelAuditReport["unitEconomics"]>["healthStatus"] {
  const s = asString(v).toLowerCase();
  if (s.includes("healthy") || s.includes("сход")) return "healthy";
  if (s.includes("broken") || s.includes("не сход")) return "broken";
  return "tight";
}

function normBlockStatus(v: unknown): FunnelAuditReport["blocks"][number]["status"] {
  const s = asString(v).toLowerCase();
  if (["critical", "bad", "weak", "ok", "good"].includes(s)) return s as FunnelAuditReport["blocks"][number]["status"];
  if (s.includes("крит")) return "critical";
  if (s.includes("плох") || s.includes("bad")) return "bad";
  if (s.includes("слаб") || s.includes("weak")) return "weak";
  if (s.includes("хорош") || s.includes("good")) return "good";
  return "weak";
}

/** Приводит сырой JSON от AI к формату, который не роняет UI. */
export function normalizeFunnelAudit(raw: unknown): FunnelAuditReport {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

  const diagRaw = (o.diagnosis && typeof o.diagnosis === "object" ? o.diagnosis : {}) as Record<
    string,
    unknown
  >;
  let metrics = Array.isArray(diagRaw.metrics)
    ? diagRaw.metrics.map((m, i) => {
        const row = (m && typeof m === "object" ? m : {}) as Record<string, unknown>;
        const nameRaw = asString(row.name, METRIC_NAMES[i] ?? "Метрика");
        const name = METRIC_NAMES.find((n) => n === nameRaw) ?? METRIC_NAMES[i] ?? "Понятность";
        return {
          name,
          score: Math.max(0, Math.min(10, asNumber(row.score, 5))),
          comment: asString(row.comment, "—"),
        };
      })
    : [];
  if (metrics.length < 4) {
    metrics = METRIC_NAMES.map((name, i) => metrics[i] ?? { name, score: 5, comment: "—" });
  }

  const diagnosis: FunnelAuditReport["diagnosis"] = {
    metrics: metrics.slice(0, 4) as FunnelAuditReport["diagnosis"]["metrics"],
    mainProblem: asString(diagRaw.mainProblem, "Требуется доработка первого экрана и оффера."),
    mainMoneyLeak: asString(diagRaw.mainMoneyLeak, "Часть трафика уходит без заявки."),
    estimatedLossPercent: asString(diagRaw.estimatedLossPercent, "20–40%"),
    ...(diagRaw.mainLever ? { mainLever: asString(diagRaw.mainLever) } : {}),
  };

  const problems: FunnelAuditReport["problems"] = (Array.isArray(o.problems) ? o.problems : []).map((p, i) => {
    const row = (p && typeof p === "object" ? p : {}) as Record<string, unknown>;
    return {
      severity: normSeverity(row.severity),
      title: asString(row.title, `Проблема ${i + 1}`),
      whyItHurts: asString(row.whyItHurts, "—"),
      moneyImpact: asString(row.moneyImpact, "—"),
      howToFix: asStringArray(row.howToFix).length ? asStringArray(row.howToFix) : ["Уточнить и исправить на странице"],
      effort: (["1 день", "1 неделя", "1 месяц"].includes(asString(row.effort))
        ? asString(row.effort)
        : "1 неделя") as FunnelAuditReport["problems"][number]["effort"],
      impactScore: Math.max(1, Math.min(10, asNumber(row.impactScore, 7))),
      ...(row.customerThought ? { customerThought: asString(row.customerThought) } : {}),
    };
  });

  const blocks: FunnelAuditReport["blocks"] = (Array.isArray(o.blocks) ? o.blocks : []).map((b, i) => {
    const row = (b && typeof b === "object" ? b : {}) as Record<string, unknown>;
    return {
      name: asString(row.name, `Блок ${i + 1}`),
      status: normBlockStatus(row.status),
      problem: asString(row.problem, "—"),
      whyImportant: asString(row.whyImportant, "—"),
      howToFix: asString(row.howToFix, "—"),
      ...(row.rewriteExample ? { rewriteExample: asString(row.rewriteExample) } : {}),
      ...(Array.isArray(row.ctaVariants)
        ? { ctaVariants: asStringArray(row.ctaVariants) }
        : {}),
    };
  });

  const leaksRaw = (o.moneyLeaks && typeof o.moneyLeaks === "object" ? o.moneyLeaks : {}) as Record<
    string,
    unknown
  >;
  const moneyLeaks: FunnelAuditReport["moneyLeaks"] = {
    items: (Array.isArray(leaksRaw.items) ? leaksRaw.items : []).map((it) => {
      const row = (it && typeof it === "object" ? it : {}) as Record<string, unknown>;
      return {
        reason: asString(row.reason, "—"),
        lossPercent: asString(row.lossPercent, "—"),
        ...(row.verification ? { verification: asString(row.verification) } : {}),
      };
    }),
    totalLoss: asString(leaksRaw.totalLoss, "—"),
  };

  const growthRaw = (o.growthPotential && typeof o.growthPotential === "object"
    ? o.growthPotential
    : {}) as Record<string, unknown>;
  const growthPotential: FunnelAuditReport["growthPotential"] = {
    requestsGrowth: asString(growthRaw.requestsGrowth, "—"),
    conversionGrowth: asString(growthRaw.conversionGrowth, "—"),
    revenueLogic: asString(growthRaw.revenueLogic, "—"),
    ...(growthRaw.verification ? { verification: asString(growthRaw.verification) } : {}),
    ...(growthRaw.confidence
      ? {
          confidence: (["высокий", "средний", "точечный"].includes(asString(growthRaw.confidence))
            ? asString(growthRaw.confidence)
            : "средний") as FunnelAuditReport["growthPotential"]["confidence"],
        }
      : {}),
  };

  const softRaw = (o.softOffer && typeof o.softOffer === "object" ? o.softOffer : {}) as Record<
    string,
    unknown
  >;
  const softOffer: FunnelAuditReport["softOffer"] = {
    steps: asStringArray(softRaw.steps).length
      ? asStringArray(softRaw.steps)
      : ["Проверить правки по отчёту", "Замерить конверсию через 2 недели"],
    goal: asString(softRaw.goal, "Поднять конверсию и снизить стоимость заявки"),
  };

  const audit: FunnelAuditReport = {
    diagnosis,
    problems: problems.length ? problems : [{
      severity: "important",
      title: "Недостаточно данных по странице",
      whyItHurts: "Ответ модели пришёл неполным — повторите анализ.",
      moneyImpact: "—",
      howToFix: ["Запустить анализ ещё раз"],
      effort: "1 день",
      impactScore: 5,
    }],
    blocks,
    moneyLeaks,
    growthPotential,
    beforeAfter: (Array.isArray(o.beforeAfter) ? o.beforeAfter : []).map((b) => {
      const row = (b && typeof b === "object" ? b : {}) as Record<string, unknown>;
      return {
        label: asString(row.label, "—"),
        before: asString(row.before, "—"),
        after: asString(row.after, "—"),
      };
    }),
    roadmap: normalizeRoadmap(o.roadmap) as FunnelAuditReport["roadmap"],
    systemMessage: asString(o.systemMessage, ""),
    softOffer,
    finalCta: asString(o.finalCta, ""),
  };

  if (o.quickestWin && typeof o.quickestWin === "object") {
    const q = o.quickestWin as Record<string, unknown>;
    audit.quickestWin = {
      action: asString(q.action, "—"),
      why: asString(q.why, "—"),
      expectedEffect: asString(q.expectedEffect, "—"),
      effort: asString(q.effort, "—"),
    };
  }

  if (o.offerScore && typeof o.offerScore === "object") audit.offerScore = o.offerScore as FunnelAuditReport["offerScore"];
  if (o.marketContext && typeof o.marketContext === "object") {
    const m = o.marketContext as Record<string, unknown>;
    audit.marketContext = {
      sophisticationLevel: Math.max(1, Math.min(5, asNumber(m.sophisticationLevel, 3))),
      sophisticationComment: asString(m.sophisticationComment, "—"),
      awarenessLevel: normAwareness(m.awarenessLevel),
      awarenessComment: asString(m.awarenessComment, "—"),
      mismatch: asString(m.mismatch, "—"),
      uniqueMechanism: asString(m.uniqueMechanism, "—"),
    };
  }
  if (o.unitEconomics && typeof o.unitEconomics === "object") {
    const u = o.unitEconomics as Record<string, unknown>;
    audit.unitEconomics = {
      niche: asString(u.niche, "—"),
      assumedAvgCheck: asString(u.assumedAvgCheck, "—"),
      assumedCpc: asString(u.assumedCpc, "—"),
      assumedCurrentCr: asString(u.assumedCurrentCr, "—"),
      estimatedCpl: asString(u.estimatedCpl, "—"),
      estimatedCac: asString(u.estimatedCac, "—"),
      paybackVerdict: asString(u.paybackVerdict, "—"),
      healthStatus: normHealth(u.healthStatus),
      uplift: asString(u.uplift, "—"),
      disclaimer: asString(u.disclaimer, "Оценка ориентировочная."),
    };
  }
  if (o.meclabsScore && typeof o.meclabsScore === "object") {
    const m = o.meclabsScore as Record<string, unknown>;
    audit.meclabsScore = {
      motivation: asNumber(m.motivation, 5),
      motivationComment: asString(m.motivationComment, "—"),
      valueProposition: asNumber(m.valueProposition, 5),
      valueComment: asString(m.valueComment, "—"),
      incentive: asNumber(m.incentive, 5),
      incentiveComment: asString(m.incentiveComment, "—"),
      friction: asNumber(m.friction, 5),
      frictionComment: asString(m.frictionComment, "—"),
      anxiety: asNumber(m.anxiety, 5),
      anxietyComment: asString(m.anxietyComment, "—"),
      score: asNumber(m.score, 40),
      interpretation: asString(m.interpretation, "—"),
    };
  }

  copyOptionalArrays(audit, o);

  const rawHypotheses = Array.isArray(o.hypotheses) ? o.hypotheses : [];
  if (rawHypotheses.length > 0) {
    audit.hypotheses = rawHypotheses
      .map((h): FunnelAuditHypothesisDraft | null => {
        const row = (h && typeof h === "object" ? h : {}) as Record<string, unknown>;
        const title = asString(row.title);
        if (!title) return null;
        return {
          title,
          why: asString(row.why),
          expectedImpact: asString(row.expectedImpact),
          metricName: asString(row.metricName, "CR в заявку"),
          testWindow: asString(row.testWindow, "1 неделя"),
          ...(row.guardrail ? { guardrail: asString(row.guardrail) } : {}),
          priority: normPriority(row.priority),
          channel: normChannel(row.channel),
          ...(typeof row.problemIndex === "number"
            ? { problemIndex: row.problemIndex }
            : {}),
        };
      })
      .filter((h): h is FunnelAuditHypothesisDraft => h !== null);
  }

  if (!audit.hypotheses || audit.hypotheses.length === 0) {
    audit.hypotheses = fallbackHypothesesFromRoadmap(audit);
  }

  return audit;
}

function normalizeRoadmap(r: unknown): FunnelAuditReport["roadmap"] {
  const row = (r && typeof r === "object" ? r : {}) as Record<string, unknown>;
  const mapItems = (arr: unknown) =>
    (Array.isArray(arr) ? arr : []).map((it) => {
      const x = (it && typeof it === "object" ? it : {}) as Record<string, unknown>;
      return {
        problemIndex: asNumber(x.problemIndex, 0),
        action: asString(x.action, "—"),
        expectedEffect: asString(x.expectedEffect, "—"),
      };
    });
  return {
    quickWins: mapItems(row.quickWins),
    thisWeek: mapItems(row.thisWeek),
    thisMonth: mapItems(row.thisMonth),
  };
}

function copyOptionalArrays(audit: FunnelAuditReport, o: Record<string, unknown>) {
  if (Array.isArray(o.resistanceMap)) {
    audit.resistanceMap = o.resistanceMap.map((r) => {
      const row = (r && typeof r === "object" ? r : {}) as Record<string, unknown>;
      return {
        moment: asString(row.moment, "—"),
        whatSiteSays: asString(row.whatSiteSays, "—"),
        whatClientThinks: asString(row.whatClientThinks, "—"),
        howToRespond: asString(row.howToRespond, "—"),
      };
    });
  }
  if (Array.isArray(o.proofMap)) {
    audit.proofMap = o.proofMap.map((p) => {
      const row = (p && typeof p === "object" ? p : {}) as Record<string, unknown>;
      return {
        promise: asString(row.promise, "—"),
        proofThatCloses: asString(row.proofThatCloses, "—"),
        missing: asString(row.missing, "—"),
      };
    });
  }
  if (o.funnel && typeof o.funnel === "object") audit.funnel = o.funnel as FunnelAuditReport["funnel"];
  if (o.waterfall && typeof o.waterfall === "object") audit.waterfall = o.waterfall as FunnelAuditReport["waterfall"];
  if (o.firstScreenRewrite && typeof o.firstScreenRewrite === "object") {
    const f = o.firstScreenRewrite as Record<string, unknown>;
    audit.firstScreenRewrite = {
      h1: asString(f.h1, "—"),
      subtitle: asString(f.subtitle, "—"),
      bullets: asStringArray(f.bullets),
      cta: asString(f.cta, "—"),
      microtext: asString(f.microtext, "—"),
      proofNearby: asString(f.proofNearby, "—"),
      removeList: asStringArray(f.removeList),
      visualHint: asString(f.visualHint, "—"),
    };
  }
  if (o.ctaPath && typeof o.ctaPath === "object") audit.ctaPath = o.ctaPath as FunnelAuditReport["ctaPath"];
  if (o.moneyHierarchy && typeof o.moneyHierarchy === "object") {
    const h = o.moneyHierarchy as Record<string, unknown>;
    audit.moneyHierarchy = {
      surface: asStringArray(h.surface),
      trust: asStringArray(h.trust),
      product: asStringArray(h.product),
    };
  }
  if (Array.isArray(o.stageBlocks)) {
    audit.stageBlocks = o.stageBlocks.map((b, i): FunnelStageAuditBlock => {
      const row = (b && typeof b === "object" ? b : {}) as Record<string, unknown>;
      return {
        stageId: asString(row.stageId, `stage_${i}`),
        stageLabel: asString(row.stageLabel, `Этап ${i + 1}`),
        status: normBlockStatus(row.status),
        problem: asString(row.problem, "—"),
        whyImportant: asString(row.whyImportant, "—"),
        howToFix: asString(row.howToFix, "—"),
        ...(row.rewriteExample ? { rewriteExample: asString(row.rewriteExample) } : {}),
      };
    });
  }
  if (Array.isArray(o.crossMaterialMismatches)) {
    audit.crossMaterialMismatches = o.crossMaterialMismatches.map((m): CrossMaterialMismatch => {
      const row = (m && typeof m === "object" ? m : {}) as Record<string, unknown>;
      return {
        severity: normSeverity(row.severity),
        title: asString(row.title, "—"),
        detail: asString(row.detail, "—"),
        fix: asString(row.fix, "—"),
      };
    });
  }
}
