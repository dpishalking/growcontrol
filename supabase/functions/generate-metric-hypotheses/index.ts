import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { funnelTypeAuditRules } from "../_shared/funnelTypeAuditRules.ts";
import { METRIC_HYPOTHESES_GEMINI_SCHEMA } from "../_shared/metricHypothesesGeminiSchema.ts";
import { geminiFlashModel, geminiJsonResponse, type GeminiPart } from "../_shared/gemini.ts";

const PROMPT_VERSION = "metric-hypotheses-v1";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function buildGeminiErrorResponse(msg: string): Response {
  const m = msg;
  if (/HTTP 429|RESOURCE_EXHAUSTED|Too Many Requests/i.test(m)) {
    return new Response(JSON.stringify({ error: "Слишком много запросов. Попробуйте чуть позже." }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (/503|"UNAVAILABLE"|high demand|overloaded/i.test(m)) {
    return new Response(
      JSON.stringify({ error: "AI временно перегружен. Подождите минуту и попробуйте снова." }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  if (/GEMINI_API_KEY|API key not valid/i.test(m)) {
    return new Response(JSON.stringify({ error: "AI-сервис не настроен. Обратитесь к администратору." }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  return new Response(
    JSON.stringify({ error: "Не удалось сгенерировать гипотезы. Попробуйте ещё раз." }),
    { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

function buildFunnelBrief(funnel: Record<string, unknown>): string {
  const typeId = String(funnel.typeId ?? "");
  return [
    `Тип: ${funnel.typeName ?? typeId ?? "—"}`,
    funnel.exampleFlow ? `Цепочка: ${funnel.exampleFlow}` : "",
    `Продукт: ${funnel.productName ?? "—"}`,
    `Трафик: ${funnel.trafficSource ?? "—"}`,
    `ЦА: ${funnel.targetAudience ?? "—"}`,
    `Цель: ${funnel.funnelGoal ?? "—"}`,
    `Проблема: ${funnel.currentProblem ?? "—"}`,
    typeId ? `\nПравила типа:\n${funnelTypeAuditRules(typeId)}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { funnel, metric, materials, existingHypotheses, auditSummary } = body as Record<
      string,
      unknown
    >;

    if (!funnel || typeof funnel !== "object") {
      return new Response(JSON.stringify({ error: "Данные воронки обязательны" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!metric || typeof metric !== "object") {
      return new Response(JSON.stringify({ error: "Метрика обязательна" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const m = metric as Record<string, unknown>;
    const metricName = String(m.name ?? "").trim();
    if (!metricName) {
      return new Response(JSON.stringify({ error: "Укажите имя метрики" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mats = Array.isArray(materials) ? materials : [];
    const existing = Array.isArray(existingHypotheses)
      ? existingHypotheses.map((x) => String(x)).filter(Boolean)
      : [];

    const plan = m.plannedValue ?? "—";
    const fact = m.actualValue ?? "—";
    const unit = m.unit ?? "";
    const ach =
      m.achievementPercent != null ? `${Math.round(Number(m.achievementPercent))}%` : "—";

    const materialsBlock =
      mats.length === 0
        ? "Материалы не переданы — опирайся на контекст воронки."
        : mats
            .map((raw, i) => {
              const mat = raw as Record<string, unknown>;
              const text = String(mat.extractedText || mat.content || "").trim().slice(0, 2500);
              return `--- ${i + 1}. ${mat.title} (${mat.type}, этап ${mat.stage}) ---\n${text || "(без текста)"}`;
            })
            .join("\n\n");

    const existingBlock =
      existing.length > 0
        ? existing.map((t, i) => `${i + 1}. ${t}`).join("\n")
        : "Пока нет — можно любые новые идеи.";

    const userText = [
      "Сгенерируй 3–5 НОВЫХ гипотез для роста ОДНОЙ метрики воронки.",
      "",
      "ЖЁСТКИЕ ПРАВИЛА:",
      `1) Каждая гипотеза должна улучшать ТОЛЬКО метрику «${metricName}» — не CR продаж, не другие KPI.`,
      "2) Не повторяй и не перефразируй уже существующие гипотезы из списка ниже.",
      "3) Формулировки на русском, конкретные, проверяемые за 7–14 дней.",
      "4) Разные каналы: креатив, страница, оффер, скрипт, цепочка писем и т.д.",
      "",
      buildFunnelBrief(funnel as Record<string, unknown>),
      "",
      "ЦЕЛЕВАЯ МЕТРИКА:",
      `- Название: ${metricName}`,
      `- Этап: ${m.stage ?? "—"}`,
      `- План: ${plan}${unit} · Факт: ${fact}${unit}`,
      `- Статус: ${m.status ?? "—"} · Достижение: ${ach}`,
      `- Направление: ${m.direction ?? "higher_better"}`,
      m.comment ? `- Комментарий: ${m.comment}` : "",
      "",
      auditSummary ? `КОНТЕКСТ АУДИТА:\n${auditSummary}` : "",
      "",
      "УЖЕ ЕСТЬ ГИПОТЕЗЫ (не дублировать):",
      existingBlock,
      "",
      "РЕЛЕВАНТНЫЕ МАТЕРИАЛЫ:",
      materialsBlock,
    ]
      .filter(Boolean)
      .join("\n");

    const systemInstruction = [
      "Ты CRO-стратег GrowControl. Генерируешь только проверяемые гипотезы роста.",
      "Ответ — строго JSON по схеме. Поле hypotheses — массив из 3–5 объектов.",
      "title — коротко и по делу; expectedImpact — с цифрой именно для целевой метрики.",
    ].join("\n");

    const userParts: GeminiPart[] = [{ text: userText }];
    const result = await geminiJsonResponse({
      model: geminiFlashModel(),
      systemInstruction,
      userParts,
      responseSchema: METRIC_HYPOTHESES_GEMINI_SCHEMA as unknown as Record<string, unknown>,
      temperature: 0.75,
      maxOutputTokens: 8192,
    });

    const hypotheses = (result as { hypotheses?: unknown })?.hypotheses;
    if (!Array.isArray(hypotheses) || hypotheses.length === 0) {
      return new Response(JSON.stringify({ error: "AI не вернул гипотезы" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ hypotheses, promptVersion: PROMPT_VERSION }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("generate-metric-hypotheses error:", e);
    const msg = e instanceof Error ? e.message : String(e);
    return buildGeminiErrorResponse(msg);
  }
});
