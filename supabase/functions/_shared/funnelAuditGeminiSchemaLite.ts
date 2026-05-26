/**
 * Лёгкая схема аудита ВОРОНКИ — не site-audit.
 * Фокус: метрики план/факт, узкие места по этапам, 3 проблемы, 5 гипотез.
 */
export const FUNNEL_AUDIT_GEMINI_SCHEMA_LITE = {
  type: "object",
  required: ["diagnosis", "problems", "stageBlocks", "funnel", "hypotheses", "systemMessage"],
  properties: {
    diagnosis: {
      type: "object",
      required: ["mainProblem", "mainMoneyLeak", "estimatedLossPercent"],
      properties: {
        mainProblem: { type: "string", description: "1–2 предложения: главная ошибка конверсии" },
        mainMoneyLeak: { type: "string", description: "Где теряем людей/деньги" },
        estimatedLossPercent: { type: "string", description: "Оценка потерь, напр. 15–25%" },
        mainLever: { type: "string", description: "Один рычаг роста" },
      },
    },
    problems: {
      type: "array",
      description: "Ровно 3 ключевые ошибки конверсии (не мелочи)",
      items: {
        type: "object",
        properties: {
          severity: { type: "string", enum: ["critical", "important", "minor"] },
          title: { type: "string" },
          whyItHurts: { type: "string" },
          moneyImpact: { type: "string" },
          impactScore: { type: "number" },
        },
        required: ["severity", "title", "whyItHurts", "moneyImpact", "impactScore"],
      },
    },
    stageBlocks: {
      type: "array",
      description: "По одному блоку на каждый этап из запроса",
      items: {
        type: "object",
        properties: {
          stageId: { type: "string" },
          stageLabel: { type: "string" },
          status: { type: "string", enum: ["critical", "bad", "weak", "ok", "good"] },
          problem: { type: "string" },
          whyImportant: { type: "string" },
          howToFix: { type: "string" },
        },
        required: ["stageId", "stageLabel", "status", "problem", "howToFix"],
      },
    },
    funnel: {
      type: "object",
      required: ["stages", "mainLeak", "insight"],
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
        mainLeak: { type: "string" },
        insight: { type: "string" },
      },
    },
    crossMaterialMismatches: {
      type: "array",
      description: "До 2 расхождений между материалами (если есть)",
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
    quickestWin: {
      type: "object",
      properties: {
        action: { type: "string" },
        expectedEffect: { type: "string" },
      },
      required: ["action", "expectedEffect"],
    },
    hypotheses: {
      type: "array",
      description: "Ровно 5 SMART-гипотез для A/B-тестов",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          why: { type: "string" },
          expectedImpact: { type: "string" },
          metricName: { type: "string" },
          testWindow: { type: "string" },
          priority: { type: "string", enum: ["high", "medium", "low"] },
          channel: {
            type: "string",
            enum: ["website", "funnel", "sales", "offer", "creative", "research"],
          },
          problemIndex: { type: "number" },
        },
        required: ["title", "why", "expectedImpact", "metricName", "testWindow", "priority", "channel"],
      },
    },
    systemMessage: { type: "string", description: "Итог в 1 предложении" },
  },
} as const;
