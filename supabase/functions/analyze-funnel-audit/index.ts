import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { FUNNEL_AUDIT_GEMINI_SCHEMA } from "../_shared/funnelAuditGeminiSchema.ts";
import { FUNNEL_AUDIT_SYSTEM_KNOWLEDGE } from "../_shared/funnelAuditSystemPrompt.ts";
import { funnelTypeAuditRules } from "../_shared/funnelTypeAuditRules.ts";
import {
  type GeminiPart,
  fetchImageAsInlinePart,
  geminiFlashModel,
  geminiForcedFunctionCall,
  geminiJsonResponse,
} from "../_shared/gemini.ts";

const PROMPT_VERSION = "funnel-audit-v4";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function buildAuditGeminiErrorResponse(msg: string): Response {
  const m = msg;
  if (/HTTP 429|RESOURCE_EXHAUSTED|Too Many Requests/i.test(m)) {
    return new Response(JSON.stringify({ error: "Слишком много запросов. Попробуйте чуть позже." }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (/503|"UNAVAILABLE"|high demand|overloaded|DEADLINE_EXCEEDED/i.test(m)) {
    return new Response(
      JSON.stringify({ error: "Сервис AI временно перегружен. Подождите 1–2 минуты и запустите снова." }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  if (/HTTP 400|INVALID_ARGUMENT|too large|Payload too large/i.test(m)) {
    return new Response(
      JSON.stringify({ error: "Слишком много данных для одного запроса. Уберите тяжёлые файлы или сократите материалы." }),
      { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  if (/GEMINI_API_KEY|API key not valid|API_KEY_INVALID/i.test(m)) {
    return new Response(
      JSON.stringify({ error: "AI-сервис не настроен. Обратитесь к администратору." }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  return new Response(
    JSON.stringify({ error: "Не удалось завершить аудит воронки. Попробуйте ещё раз через минуту." }),
    { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

function extractStructuredContent(html: string): string {
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
  const pick = (re: RegExp, max = 20) => {
    const out: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(cleaned)) && out.length < max) {
      const t = (m[1] || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      if (t) out.push(t);
    }
    return out;
  };
  const h1 = pick(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, 5);
  const h2 = pick(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, 20);
  const text = cleaned.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 12000);
  return `H1: ${h1.join(" | ") || "—"}\nH2: ${h2.join(" | ") || "—"}\n\nТЕКСТ:\n${text}`;
}

async function scrapeLanding(url: string): Promise<{ content: string; screenshotUrl: string | null }> {
  let siteContent = "";
  let screenshotUrl: string | null = null;
  const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");

  if (FIRECRAWL_API_KEY) {
    try {
      const fc = await fetch("https://api.firecrawl.dev/v2/scrape", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
          formats: ["markdown", { type: "screenshot", fullPage: true }],
          onlyMainContent: false,
          waitFor: 1500,
        }),
      });
      const fcData = await fc.json();
      const doc = fcData?.data ?? fcData;
      if (doc?.markdown) {
        siteContent = `MARKDOWN ЛЕНДИНГА:\n${String(doc.markdown).slice(0, 24000)}`;
      }
      if (typeof doc?.screenshot === "string" && doc.screenshot.startsWith("http")) {
        screenshotUrl = doc.screenshot;
      }
    } catch (e) {
      console.error("Firecrawl error:", e);
    }
  }

  if (!siteContent) {
    try {
      const siteResp = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; GrowControlAuditor/1.0)" },
      });
      siteContent = extractStructuredContent(await siteResp.text());
    } catch (e) {
      console.error("Fetch landing error:", e);
      siteContent = `(не удалось загрузить ${url})`;
    }
  }

  return { content: siteContent, screenshotUrl };
}

function buildMaterialsBlock(
  materials: {
    id: string;
    type: string;
    title: string;
    stage: string;
    url: string;
    content: string;
    extractedText?: string;
    source: string;
  }[],
): string {
  if (!materials.length) return "Материалы не загружены.";
  return materials
    .map((m, i) => {
      const body = (m.extractedText || m.content || "").trim().slice(0, 6000);
      const urlLine = m.url ? `URL: ${m.url}\n` : "";
      return `--- МАТЕРИАЛ ${i + 1} (${m.type}, этап: ${m.stage}) ---\nНазвание: ${m.title}\n${urlLine}Источник: ${m.source || "—"}\n${body || "(текст не извлечён — опирайся на URL/тип)"}`;
    })
    .join("\n\n");
}

function buildMetricsBlock(
  metrics: {
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
  }[],
): string {
  if (!metrics.length) return "Метрики не переданы.";
  return metrics
    .map((m) => {
      const plan = m.plannedValue ?? "—";
      const fact = m.actualValue ?? "—";
      const ach =
        m.achievementPercent != null ? `${Math.round(m.achievementPercent)}%` : "—";
      return [
        `- [${m.stage}] ${m.name}: факт ${fact} / план ${plan} ${m.unit} (${m.period})`,
        `  статус: ${m.status}, достижение: ${ach}, impact: ${m.revenueImpact}/5, уверенность: ${m.confidence}`,
        m.dataSource ? `  источник: ${m.dataSource}` : "",
        m.comment ? `  комментарий: ${m.comment}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");
}

function buildFunnelContext(funnel: Record<string, unknown>): string {
  const stages = Array.isArray(funnel.stages) ? funnel.stages : [];
  const stageLines = stages
    .map((s) => {
      const row = (s && typeof s === "object" ? s : {}) as Record<string, unknown>;
      return `- ${row.id}: ${row.label}${row.description ? ` — ${row.description}` : ""}`;
    })
    .join("\n");

  const bottlenecks = Array.isArray(funnel.commonBottlenecks)
    ? funnel.commonBottlenecks.join(", ")
    : "";

  const typeId = String(funnel.typeId ?? funnel.typeName ?? "");
  const typeRules = funnelTypeAuditRules(typeId);
  const exampleFlow = funnel.exampleFlow ? String(funnel.exampleFlow) : "";

  return [
    `ТИП ВОРОНКИ: ${funnel.typeName ?? funnel.typeId ?? "—"} (id: ${typeId || "—"})`,
    exampleFlow ? `Цепочка: ${exampleFlow}` : "",
    `Продукт: ${funnel.productName ?? "—"}`,
    `Описание: ${funnel.productDescription ?? "—"}`,
    `Средний чек (финальный продукт): ${funnel.averagePrice ?? "—"}`,
    `Трафик: ${funnel.trafficSource ?? "—"}`,
    `ЦА: ${funnel.targetAudience ?? "—"}`,
    `Цель воронки (ФИНАЛЬНАЯ, не микро-цель reg page): ${funnel.funnelGoal ?? "—"}`,
    `Текущая проблема: ${funnel.currentProblem ?? "—"}`,
    bottlenecks ? `Типовые узкие места: ${bottlenecks}` : "",
    `\nЭТАПЫ ВОРОНКИ (stageBlocks — по каждому):\n${stageLines || "—"}`,
    `\nПРАВИЛА АУДИТА ПО ТИПУ ВОРОНКИ:\n${typeRules}`,
  ]
    .filter(Boolean)
    .join("\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { landingUrl, funnel, materials, metrics } = body as Record<string, unknown>;

    if (!funnel || typeof funnel !== "object") {
      return new Response(JSON.stringify({ error: "Данные воронки обязательны" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mats = Array.isArray(materials) ? materials : [];
    const mets = Array.isArray(metrics) ? metrics : [];
    if (mets.length === 0) {
      return new Response(
        JSON.stringify({ error: "Добавьте метрики воронки перед аудитом" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (mats.length === 0 && (!landingUrl || typeof landingUrl !== "string")) {
      return new Response(
        JSON.stringify({ error: "Загрузите материалы или укажите URL посадочной страницы" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let landingContent = "";
    let screenshotUrl: string | null = null;
    if (landingUrl && typeof landingUrl === "string" && landingUrl.trim()) {
      const url = landingUrl.startsWith("http") ? landingUrl : `https://${landingUrl}`;
      const scraped = await scrapeLanding(url);
      landingContent = scraped.content;
      screenshotUrl = scraped.screenshotUrl;
    }

    const funnelCtx = buildFunnelContext(funnel as Record<string, unknown>);
    const materialsBlock = buildMaterialsBlock(
      mats as {
        id: string;
        type: string;
        title: string;
        stage: string;
        url: string;
        content: string;
        extractedText?: string;
        source: string;
      }[],
    );
    const metricsBlock = buildMetricsBlock(
      mets as {
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
      }[],
    );

    const userText = [
      "Сделай глубокий AI-аудит ВОРОНКИ (не только лендинг).",
      "Свяжи МЕТРИКИ с МАТЕРИАЛАМИ по этапам: где цифры проседают — объясни причиной в материалах и что покрутить.",
      funnelCtx,
      "\nМЕТРИКИ ВОРОНКИ (план/факт, статус):\n",
      metricsBlock,
      "\nЗАГРУЖЕННЫЕ МАТЕРИАЛЫ ПРОЕКТА:\n",
      materialsBlock,
      landingContent ? `\nКОНТЕНТ ПОСАДОЧНОЙ:\n${landingContent}` : "",
      "\nЗаполни все секции отчёта. stageBlocks — по каждому этапу из списка. hypotheses — ровно 10.",
      screenshotUrl
        ? "Приложен full-page скриншот лендинга — используй для визуального разбора."
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    const auditParamsForApi = FUNNEL_AUDIT_GEMINI_SCHEMA as unknown as Record<string, unknown>;
    const systemWithJson = `${FUNNEL_AUDIT_SYSTEM_KNOWLEDGE}\n\nФОРМАТ: один JSON. Ключи: diagnosis, problems (3-5), blocks (7), stageBlocks, crossMaterialMismatches, moneyLeaks, growthPotential, beforeAfter, roadmap, funnel, waterfall, offerScore, marketContext, unitEconomics, meclabsScore, systemMessage, finalCta, firstScreenRewrite, ctaPath, hypotheses (10).`;

    const userParts: GeminiPart[] = [{ text: userText }];
    if (screenshotUrl) {
      const inline = await fetchImageAsInlinePart(screenshotUrl);
      if (inline) userParts.push(inline);
    }

    const flashModel = geminiFlashModel();

    function auditLooksEmpty(a: unknown): boolean {
      const d = (a as { diagnosis?: { mainProblem?: string } })?.diagnosis;
      return !d?.mainProblem || String(d.mainProblem).trim().length < 8;
    }

    let audit: unknown;
    try {
      audit = await geminiJsonResponse({
        model: flashModel,
        systemInstruction: systemWithJson,
        userParts,
        responseSchema: auditParamsForApi,
        temperature: 0.45,
        maxOutputTokens: 65536,
      });
      if (auditLooksEmpty(audit)) {
        const { args } = await geminiForcedFunctionCall({
          model: flashModel,
          systemInstruction: systemWithJson,
          userParts,
          functionName: "return_audit",
          functionDescription: "Структурированный AI-аудит воронки",
          parameters: auditParamsForApi,
          temperature: 0.45,
          maxOutputTokens: 65536,
        });
        audit = args;
      }
    } catch (e) {
      console.error("Gemini funnel audit error:", e);
      const msg = e instanceof Error ? e.message : String(e);
      return buildAuditGeminiErrorResponse(msg);
    }

    return new Response(
      JSON.stringify({ audit, promptVersion: PROMPT_VERSION }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("analyze-funnel-audit error:", e);
    return new Response(JSON.stringify({ error: "Внутренняя ошибка сервера" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
