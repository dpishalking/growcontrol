/** JSON-схема ответа: 3–5 гипотез под одну метрику воронки. */
export const METRIC_HYPOTHESES_GEMINI_SCHEMA = {
  type: "object",
  properties: {
    hypotheses: {
      type: "array",
      description:
        "3–5 новых SMART-гипотез. Каждая должна напрямую улучшать указанную метрику, не соседние KPI.",
      items: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Краткий заголовок. Можно начинать с «Если …»",
          },
          why: { type: "string", description: "Почему это должно сработать (1–2 предложения)" },
          expectedImpact: {
            type: "string",
            description: "Ожидаемый эффект на целевую метрику, с цифрой или диапазоном",
          },
          testWindow: {
            type: "string",
            description: "Как проверить: A/B, до/после, срок 7–14 дней",
          },
          priority: { type: "string", enum: ["high", "medium", "low"] },
          channel: {
            type: "string",
            enum: ["website", "funnel", "sales", "offer", "creative", "research"],
          },
        },
        required: ["title", "why", "expectedImpact", "testWindow", "priority", "channel"],
      },
    },
  },
  required: ["hypotheses"],
} as const;
