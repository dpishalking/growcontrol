import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { funnelTypeAuditRules } from "../_shared/funnelTypeAuditRules.ts";
import { formatAuditEvidenceBlock } from "../_shared/metricHypothesesEvidence.ts";
import { METRIC_HYPOTHESES_DIAGNOSE_SCHEMA } from "../_shared/metricHypothesesDiagnoseSchema.ts";
import { METRIC_HYPOTHESES_GEMINI_SCHEMA } from "../_shared/metricHypothesesGeminiSchema.ts";
import {
  METRIC_HYPOTHESES_DIAGNOSE_SYSTEM,
  METRIC_HYPOTHESES_PROMPT_VERSION,
  METRIC_HYPOTHESES_SYSTEM_V3,
} from "../_shared/metricHypothesesSystemPrompt.ts";
import { validateMetricHypotheses } from "../_shared/metricHypothesesValidate.ts";
import {
  geminiFlashModel,
  geminiJsonResponse,
  geminiProModel,
  type GeminiPart,
} from "../_shared/gemini.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function hypothesesModel(): string {
  const override = Deno.env.get("GEMINI_HYPOTHESES_MODEL")?.trim();
  if (override) return override;
  return geminiProModel();
}

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
    funnel.productDescription ? `Описание: ${funnel.productDescription}` : "",
    `Трафик: ${funnel.trafficSource ?? "—"}`,
    `ЦА: ${funnel.targetAudience ?? "—"}`,
    `Цель: ${funnel.funnelGoal ?? "—"}`,
    `Проблема: ${funnel.currentProblem ?? "—"}`,
    typeId ? `\nПравила типа:\n${funnelTypeAuditRules(typeId)}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

type DiagnoseResult = {
  causes: { cause: string; evidence: string }[];
  levers: { channel: string; element: string; rationale: string }[];
  lowEvidence?: boolean;
};

async function runDiagnose(
  systemBrief: string,
  evidenceBlock: string,
  metricName: string,
  metricFacts: string,
): Promise<DiagnoseResult | null> {
  try {
    const userText = [
      `Целевая метрика: «${metricName}».`,
      metricFacts,
      "",
      "## ВОРОНКА",
      systemBrief,
      "",
      "## EVIDENCE",
      evidenceBlock,
      "",
      "Извлеки 2–4 причины и 3–5 разных рычагов воздействия.",
    ].join("\n");

    const raw = await geminiJsonResponse({
      model: geminiFlashModel(),
      systemInstruction: METRIC_HYPOTHESES_DIAGNOSE_SYSTEM,
      userParts: [{ text: userText }],
      responseSchema: METRIC_HYPOTHESES_DIAGNOSE_SCHEMA as unknown as Record<string, unknown>,
      temperature: 0.3,
      maxOutputTokens: 2048,
    });
    const data = raw as DiagnoseResult;
    if (!Array.isArray(data?.causes) || !Array.isArray(data?.levers)) return null;
    return data;
  } catch (err) {
    console.warn("diagnose step failed, continue without:", err);
    return null;
  }
}

function formatDiagnose(d: DiagnoseResult | null): string {
  if (!d) return "Диагноз не получен — опирайся на evidence и playbook.";
  const causes = d.causes
    .slice(0, 4)
    .map((c, i) => `${i + 1}. ${c.cause} — evidence: ${c.evidence}`)
    .join("\n");
  const levers = d.levers
    .slice(0, 5)
    .map((l, i) => `${i + 1}. [${l.channel}] ${l.element} — ${l.rationale}`)
    .join("\n");
  return [
    "ПРИЧИНЫ ПРОСАДКИ МЕТРИКИ:",
    causes || "—",
    "",
    "РЕКОМЕНДОВАННЫЕ РЫЧАГИ:",
    levers || "—",
    d.lowEvidence ? "\n⚠ low_evidence: данных мало, понижай confidence." : "",
  ]
    .filter(Boolean)
    .join("\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { funnel, metric, materials, existingHypotheses, auditContext } = body as Record<
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

    const materialTitles = mats
      .map((raw) => String((raw as Record<string, unknown>).title ?? "").trim())
      .filter(Boolean);

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

    const evidenceBlock = formatAuditEvidenceBlock(
      auditContext as Parameters<typeof formatAuditEvidenceBlock>[0],
    );

    const metricFacts = [
      `- Этап: ${m.stage ?? "—"}`,
      `- План: ${plan}${unit} · Факт: ${fact}${unit}`,
      `- Статус: ${m.status ?? "—"} · Достижение: ${ach}`,
      `- Направление: ${m.direction ?? "higher_better"}`,
      m.comment ? `- Комментарий: ${m.comment}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const funnelBrief = buildFunnelBrief(funnel as Record<string, unknown>);

    // ── Step 1: diagnose (Flash, cheap) ──────────────────────────
    const diagnose = await runDiagnose(funnelBrief, evidenceBlock, metricName, metricFacts);
    const diagnoseBlock = formatDiagnose(diagnose);

    // ── Step 2: generate (Pro, expensive) ────────────────────────
    const userText = [
      `Сгенерируй 3–5 НОВЫХ гипотез для роста ОДНОЙ метрики: «${metricName}».`,
      "Опирайся на диагноз ниже. Подбирай рычаги из METRIC PLAYBOOK по типу метрики.",
      "",
      "## ВОРОНКА",
      funnelBrief,
      "",
      "## ЦЕЛЕВАЯ МЕТРИКА",
      `- Название: ${metricName}`,
      metricFacts,
      "",
      "## ДИАГНОЗ (от шага 1)",
      diagnoseBlock,
      "",
      "## EVIDENCE",
      evidenceBlock,
      "",
      "## УЖЕ ЕСТЬ ГИПОТЕЗЫ (не дублировать)",
      existingBlock,
      "",
      "## МАТЕРИАЛЫ (используй ТОЛЬКО эти названия в materialsToChange)",
      materialTitles.length > 0 ? `Доступные: ${materialTitles.join(" | ")}` : "Материалы не переданы — opisывай рычаг общими названиями.",
      "",
      materialsBlock,
    ].join("\n");

    const userParts: GeminiPart[] = [{ text: userText }];
    const model = hypothesesModel();

    let result: unknown;
    try {
      result = await geminiJsonResponse({
        model,
        systemInstruction: METRIC_HYPOTHESES_SYSTEM_V3,
        userParts,
        responseSchema: METRIC_HYPOTHESES_GEMINI_SCHEMA as unknown as Record<string, unknown>,
        temperature: 0.4,
        maxOutputTokens: 8192,
      });
    } catch (proErr) {
      console.warn("Pro hypotheses failed, fallback to flash:", proErr);
      result = await geminiJsonResponse({
        model: geminiFlashModel(),
        systemInstruction: METRIC_HYPOTHESES_SYSTEM_V3,
        userParts,
        responseSchema: METRIC_HYPOTHESES_GEMINI_SCHEMA as unknown as Record<string, unknown>,
        temperature: 0.4,
        maxOutputTokens: 8192,
      });
    }

    const hypotheses = validateMetricHypotheses(result, metricName, existing, {
      availableMaterials: materialTitles,
      allowEmptyMaterials: materialTitles.length === 0,
    });

    if (hypotheses.length === 0) {
      return new Response(
        JSON.stringify({ error: "AI не вернул пригодные гипотезы. Попробуйте ещё раз." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        hypotheses,
        promptVersion: METRIC_HYPOTHESES_PROMPT_VERSION,
        model,
        diagnose: diagnose ?? null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("generate-metric-hypotheses error:", e);
    const msg = e instanceof Error ? e.message : String(e);
    return buildGeminiErrorResponse(msg);
  }
});
