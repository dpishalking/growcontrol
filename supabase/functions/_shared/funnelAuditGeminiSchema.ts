/**
 * Компактная JSON Schema для Gemini (аудит сайта).
 * Полная схема в analyze-site/index.ts слишком велика для API.
 */
export const FUNNEL_AUDIT_GEMINI_SCHEMA = {
  type: "object",
  required: [
    "diagnosis",
    "problems",
    "blocks",
    "moneyLeaks",
    "growthPotential",
    "beforeAfter",
    "roadmap",
    "systemMessage",
    "softOffer",
    "finalCta",
    "quickestWin",
  ],
  properties: {
    diagnosis: {
      type: "object",
      properties: {
        metrics: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              score: { type: "number" },
              comment: { type: "string" },
            },
            required: ["name", "score", "comment"],
          },
        },
        mainProblem: { type: "string" },
        mainMoneyLeak: { type: "string" },
        estimatedLossPercent: { type: "string" },
        mainLever: { type: "string" },
      },
      required: ["metrics", "mainProblem", "mainMoneyLeak", "estimatedLossPercent"],
    },
    problems: {
      type: "array",
      description: "3-5 корневых проблем; customerThought обязателен у каждой",
      items: {
        type: "object",
        properties: {
          severity: { type: "string" },
          title: { type: "string" },
          whyItHurts: { type: "string" },
          moneyImpact: { type: "string" },
          howToFix: { type: "array", items: { type: "string" } },
          effort: { type: "string" },
          impactScore: { type: "number" },
          customerThought: { type: "string" },
        },
        required: ["severity", "title", "whyItHurts", "moneyImpact", "howToFix", "effort", "impactScore"],
      },
    },
    blocks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          status: { type: "string" },
          problem: { type: "string" },
          whyImportant: { type: "string" },
          howToFix: { type: "string" },
          rewriteExample: { type: "string" },
        },
        required: ["name", "status", "problem", "whyImportant", "howToFix"],
      },
    },
    moneyLeaks: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              reason: { type: "string" },
              lossPercent: { type: "string" },
              verification: { type: "string" },
            },
            required: ["reason", "lossPercent"],
          },
        },
        totalLoss: { type: "string" },
      },
      required: ["items", "totalLoss"],
    },
    growthPotential: {
      type: "object",
      properties: {
        requestsGrowth: { type: "string" },
        conversionGrowth: { type: "string" },
        revenueLogic: { type: "string" },
        verification: { type: "string" },
        confidence: { type: "string" },
      },
      required: ["requestsGrowth", "conversionGrowth", "revenueLogic"],
    },
    beforeAfter: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          before: { type: "string" },
          after: { type: "string" },
        },
        required: ["label", "before", "after"],
      },
    },
    roadmap: {
      type: "object",
      properties: {
        quickWins: {
          type: "array",
          items: {
            type: "object",
            properties: {
              problemIndex: { type: "number" },
              action: { type: "string" },
              expectedEffect: { type: "string" },
            },
            required: ["problemIndex", "action", "expectedEffect"],
          },
        },
        thisWeek: {
          type: "array",
          items: {
            type: "object",
            properties: {
              problemIndex: { type: "number" },
              action: { type: "string" },
              expectedEffect: { type: "string" },
            },
            required: ["problemIndex", "action", "expectedEffect"],
          },
        },
        thisMonth: {
          type: "array",
          items: {
            type: "object",
            properties: {
              problemIndex: { type: "number" },
              action: { type: "string" },
              expectedEffect: { type: "string" },
            },
            required: ["problemIndex", "action", "expectedEffect"],
          },
        },
      },
      required: ["quickWins", "thisWeek", "thisMonth"],
    },
    funnel: {
      type: "object",
      properties: {
        stages: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              percent: { type: "number" },
              dropReason: { type: "string" },
              isMainLeak: { type: "boolean" },
            },
            required: ["name", "percent", "dropReason", "isMainLeak"],
          },
        },
        insight: { type: "string" },
      },
    },
    waterfall: {
      type: "object",
      properties: {
        currentConversion: { type: "number" },
        steps: {
          type: "array",
          items: {
            type: "object",
            properties: {
              problemIndex: { type: "number" },
              label: { type: "string" },
              uplift: { type: "number" },
              rationale: { type: "string" },
            },
            required: ["problemIndex", "label", "uplift", "rationale"],
          },
        },
        finalConversion: { type: "number" },
        insight: { type: "string" },
      },
    },
    offerScore: {
      type: "object",
      properties: {
        dream: { type: "number" },
        dreamComment: { type: "string" },
        likelihood: { type: "number" },
        likelihoodComment: { type: "string" },
        timeDelay: { type: "number" },
        timeComment: { type: "string" },
        effort: { type: "number" },
        effortComment: { type: "string" },
        totalScore: { type: "number" },
        verdict: { type: "string" },
        biggestLever: { type: "string" },
      },
    },
    marketContext: {
      type: "object",
      properties: {
        sophisticationLevel: { type: "number" },
        sophisticationComment: { type: "string" },
        awarenessLevel: { type: "string" },
        awarenessComment: { type: "string" },
        mismatch: { type: "string" },
        uniqueMechanism: { type: "string" },
      },
    },
    meclabsScore: {
      type: "object",
      properties: {
        motivation: { type: "number" },
        motivationComment: { type: "string" },
        valueProposition: { type: "number" },
        valueComment: { type: "string" },
        incentive: { type: "number" },
        incentiveComment: { type: "string" },
        friction: { type: "number" },
        frictionComment: { type: "string" },
        anxiety: { type: "number" },
        anxietyComment: { type: "string" },
        score: { type: "number" },
        interpretation: { type: "string" },
      },
    },
    systemMessage: { type: "string" },
    softOffer: {
      type: "object",
      properties: {
        steps: { type: "array", items: { type: "string" } },
        goal: { type: "string" },
      },
      required: ["steps", "goal"],
    },
    finalCta: { type: "string" },
    quickestWin: {
      type: "object",
      properties: {
        action: { type: "string" },
        why: { type: "string" },
        expectedEffect: { type: "string" },
        effort: { type: "string" },
      },
      required: ["action", "why", "expectedEffect", "effort"],
    },
    firstScreenRewrite: {
      type: "object",
      properties: {
        h1: { type: "string" },
        subtitle: { type: "string" },
        bullets: { type: "array", items: { type: "string" } },
        cta: { type: "string" },
        microtext: { type: "string" },
        proofNearby: { type: "string" },
        removeList: { type: "array", items: { type: "string" } },
        visualHint: { type: "string" },
      },
    },
    ctaPath: {
      type: "object",
      properties: {
        leadsTo: { type: "string" },
        userSees: { type: "string" },
        friction: { type: "string" },
        afterForm: { type: "string" },
      },
    },
    proofMap: {
      type: "array",
      items: {
        type: "object",
        properties: {
          promise: { type: "string" },
          proofThatCloses: { type: "string" },
          missing: { type: "string" },
        },
        required: ["promise", "proofThatCloses", "missing"],
      },
    },
    resistanceMap: {
      type: "array",
      items: {
        type: "object",
        properties: {
          moment: { type: "string" },
          whatSiteSays: { type: "string" },
          whatClientThinks: { type: "string" },
          howToRespond: { type: "string" },
        },
        required: ["moment", "whatSiteSays", "whatClientThinks", "howToRespond"],
      },
    },
    moneyHierarchy: {
      type: "object",
      properties: {
        surface: { type: "array", items: { type: "string" } },
        trust: { type: "array", items: { type: "string" } },
        product: { type: "array", items: { type: "string" } },
      },
    },
    stageBlocks: {
      type: "array",
      description: "Разбор по каждому этапу воронки из запроса",
      items: {
        type: "object",
        properties: {
          stageId: { type: "string" },
          stageLabel: { type: "string" },
          status: { type: "string", enum: ["critical", "bad", "weak", "ok", "good"] },
          problem: { type: "string" },
          whyImportant: { type: "string" },
          howToFix: { type: "string" },
          rewriteExample: { type: "string" },
        },
        required: ["stageId", "stageLabel", "status", "problem", "whyImportant", "howToFix"],
      },
    },
    crossMaterialMismatches: {
      type: "array",
      description: "Расхождения между материалами воронки (реклама vs лендинг vs скрипт и т.д.)",
      items: {
        type: "object",
        properties: {
          severity: { type: "string", enum: ["critical", "important", "minor"] },
          title: { type: "string" },
          detail: { type: "string" },
          fix: { type: "string" },
        },
        required: ["severity", "title", "detail", "fix"],
      },
    },
    hypotheses: {
      type: "array",
      description: "10 готовых SMART-гипотез к внедрению — разные по типу (оффер, упаковка, CTA, доверие, форма, цена, навигация, соцдок). Каждая привязана к одной из problems по problemIndex.",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          why: { type: "string" },
          expectedImpact: { type: "string" },
          metricName: { type: "string" },
          testWindow: { type: "string" },
          guardrail: { type: "string" },
          priority: { type: "string", enum: ["high", "medium", "low"] },
          channel: {
            type: "string",
            enum: ["website", "funnel", "sales", "offer", "creative", "research"],
          },
          problemIndex: { type: "number" },
        },
        required: [
          "title",
          "why",
          "expectedImpact",
          "metricName",
          "testWindow",
          "priority",
          "channel",
        ],
      },
    },
  },
} as const;
