/** JSON-схема v2: гипотезы в формате If/Then/Because + ICE. */
export const METRIC_HYPOTHESES_GEMINI_SCHEMA = {
  type: "object",
  properties: {
    hypotheses: {
      type: "array",
      description:
        "3–5 новых SMART-гипотез. Каждая напрямую улучшает указанную метрику. Разные channel в batch.",
      items: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Короткий заголовок гипотезы (5–12 слов)",
          },
          ifChange: {
            type: "string",
            description: "Если … — одно конкретное изменение в материале",
          },
          thenMetric: {
            type: "string",
            description: "Тогда метрика … — эффект с цифрой или диапазоном",
          },
          becauseReason: {
            type: "string",
            description: "Потому что … — механика + evidence (1–2 предложения)",
          },
          materialsToChange: {
            type: "array",
            items: { type: "string" },
            description: "Материалы из списка входа, которые нужно изменить",
          },
          testMethod: {
            type: "string",
            description: "A/B, до/после, срок 7–14 дней, min sample",
          },
          successCriteria: {
            type: "string",
            description: "Критерий успеха с числом",
          },
          expectedImpact: {
            type: "string",
            description: "Дублирует thenMetric для совместимости",
          },
          testWindow: {
            type: "string",
            description: "Дублирует testMethod для совместимости",
          },
          why: {
            type: "string",
            description: "Дублирует becauseReason для совместимости",
          },
          testDurationDays: {
            type: "integer",
            description: "7–14 дней",
          },
          priority: { type: "string", enum: ["high", "medium", "low"] },
          channel: {
            type: "string",
            enum: ["website", "funnel", "sales", "offer", "creative", "research"],
          },
          impact: { type: "integer", description: "ICE impact 1–5" },
          confidence: { type: "integer", description: "ICE confidence 1–5" },
          ease: { type: "integer", description: "ICE ease 1–5" },
          risk: { type: "string", description: "Кратко: что может пойти не так" },
        },
        required: [
          "title",
          "ifChange",
          "thenMetric",
          "becauseReason",
          "materialsToChange",
          "testMethod",
          "successCriteria",
          "priority",
          "channel",
        ],
      },
    },
  },
  required: ["hypotheses"],
} as const;
