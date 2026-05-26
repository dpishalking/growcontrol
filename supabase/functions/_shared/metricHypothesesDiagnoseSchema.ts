/** Schema для шага диагноза: 2–4 причины + 3–5 рычагов. */
export const METRIC_HYPOTHESES_DIAGNOSE_SCHEMA = {
  type: "object",
  properties: {
    causes: {
      type: "array",
      description: "2–4 конкретные причины просадки целевой метрики.",
      items: {
        type: "object",
        properties: {
          cause: { type: "string", description: "Одной строкой: что именно не работает" },
          evidence: { type: "string", description: "Откуда взяли (аудит/материал/метрика)" },
        },
        required: ["cause", "evidence"],
      },
    },
    levers: {
      type: "array",
      description: "3–5 разных рычагов воздействия.",
      items: {
        type: "object",
        properties: {
          channel: {
            type: "string",
            enum: ["website", "funnel", "sales", "offer", "creative", "research"],
          },
          element: { type: "string", description: "Конкретный элемент материала, который меняем" },
          rationale: { type: "string", description: "Почему этот рычаг для этой метрики" },
        },
        required: ["channel", "element", "rationale"],
      },
    },
    lowEvidence: {
      type: "boolean",
      description: "true если аудит/материалов мало и причины — best practices",
    },
  },
  required: ["causes", "levers"],
} as const;
