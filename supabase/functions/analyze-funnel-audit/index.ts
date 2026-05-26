import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { FUNNEL_AUDIT_GEMINI_SCHEMA_LITE } from "../_shared/funnelAuditGeminiSchemaLite.ts";
import { FUNNEL_AUDIT_SYSTEM_LITE } from "../_shared/funnelAuditSystemPrompt.ts";
import { funnelTypeAuditRules } from "../_shared/funnelTypeAuditRules.ts";
import { type GeminiPart, geminiFlashModel, geminiJsonResponse } from "../_shared/gemini.ts";
import {
  createUserClient,
  requireBotToken,
  sendTelegramMessage,
} from "../_shared/telegram.ts";
import { formatAuditDigestTelegram } from "../_shared/telegramMessageFormat.ts";

const PROMPT_VERSION = "funnel-audit-lite-v1";
const GEMINI_MAX_OUTPUT_TOKENS = 8192;
const MATERIAL_TEXT_MAX = 500;
const MAX_MATERIALS = 8;

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
  if (/compute resources|WORKER_LIMIT|out of memory|OOM|memory limit/i.test(m)) {
    return new Response(
      JSON.stringify({ error: "Сервер не справился с объёмом данных. Попробуйте снова." }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  if (/503|"UNAVAILABLE"|high demand|overloaded|DEADLINE_EXCEEDED/i.test(m)) {
    return new Response(
      JSON.stringify({ error: "Сервис AI временно перегружен. Подождите минуту и запустите снова." }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  if (/HTTP 400|INVALID_ARGUMENT|too large|Payload too large/i.test(m)) {
    return new Response(
      JSON.stringify({ error: "Слишком много данных. Сократите материалы или метрики." }),
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
    JSON.stringify({ error: "Не удалось завершить аудит. Попробуйте ещё раз." }),
    { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

const STATUS_RANK: Record<string, number> = {
  red: 0,
  yellow: 1,
  unreliable: 2,
  no_data: 3,
  green: 4,
};

function buildMaterialsBlock(
  materials: {
    type: string;
    title: string;
    stage: string;
    url: string;
    extractedText?: string;
    content: string;
  }[],
): string {
  if (!materials.length) return "Материалы не загружены — опирайся на метрики и URL.";
  const slice = materials.slice(0, MAX_MATERIALS);
  const omitted = materials.length - slice.length;
  const body = slice
    .map((m, i) => {
      const text = (m.extractedText || m.content || "").trim().slice(0, MATERIAL_TEXT_MAX);
      const urlLine = m.url ? ` (${m.url})` : "";
      return `${i + 1}. [${m.stage}] ${m.type}: ${m.title}${urlLine}${text ? ` — ${text}` : ""}`;
    })
    .join("\n");
  return omitted > 0 ? `${body}\n(ещё ${omitted} мат. не показано)` : body;
}

function buildMetricsBlock(
  metrics: {
    stage: string;
    name: string;
    unit: string;
    period: string;
    plannedValue: number | null;
    actualValue: number | null;
    status: string;
    achievementPercent: number | null;
    revenueImpact: number;
    comment?: string;
  }[],
): string {
  if (!metrics.length) return "Метрики не переданы.";
  const sorted = [...metrics].sort(
    (a, b) => (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9) ||
      b.revenueImpact - a.revenueImpact,
  );
  return sorted
    .map((m) => {
      const plan = m.plannedValue ?? "—";
      const fact = m.actualValue ?? "—";
      const ach = m.achievementPercent != null ? `${Math.round(m.achievementPercent)}%` : "—";
      const note = m.comment ? ` · ${String(m.comment).slice(0, 80)}` : "";
      return `- [${m.stage}] ${m.name}: ${fact}/${plan} ${m.unit} · ${m.status} · ${ach} · impact ${m.revenueImpact}/5${note}`;
    })
    .join("\n");
}

function buildFunnelContext(funnel: Record<string, unknown>): string {
  const stages = Array.isArray(funnel.stages) ? funnel.stages : [];
  const stageLines = stages
    .map((s) => {
      const row = (s && typeof s === "object" ? s : {}) as Record<string, unknown>;
      return `- ${row.id}: ${row.label}`;
    })
    .join("\n");

  const typeId = String(funnel.typeId ?? funnel.typeName ?? "");
  const typeRules = funnelTypeAuditRules(typeId);

  return [
    `ТИП: ${funnel.typeName ?? typeId}`,
    funnel.exampleFlow ? `Цепочка: ${funnel.exampleFlow}` : "",
    `Продукт: ${funnel.productName ?? "—"}`,
    `Цель воронки: ${funnel.funnelGoal ?? "—"}`,
    `Проблема: ${String(funnel.currentProblem ?? "—").slice(0, 200)}`,
    `\nЭТАПЫ (stageBlocks по каждому):\n${stageLines || "—"}`,
    `\nПРАВИЛА ТИПА:\n${typeRules}`,
  ]
    .filter(Boolean)
    .join("\n");
}

async function notifyAuditTelegram(
  req: Request,
  body: Record<string, unknown>,
  audit: unknown,
  metrics: {
    name: string;
    status: string;
    achievementPercent: number | null;
    revenueImpact: number;
  }[],
): Promise<number> {
  if (body.notifyTelegram !== true) return 0;

  const appProjectId = typeof body.appProjectId === "string" ? body.appProjectId.trim() : "";
  const projectName = typeof body.projectName === "string" ? body.projectName.trim() : "Проект";
  const funnelName = typeof body.funnelName === "string" ? body.funnelName.trim() : "Воронка";
  const reportUrl = typeof body.reportUrl === "string" ? body.reportUrl.trim() : "";

  if (!appProjectId || !reportUrl) {
    console.warn("telegram audit: missing appProjectId or reportUrl");
    return 0;
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    console.warn("telegram audit: no Authorization header");
    return 0;
  }

  let botToken: string;
  try {
    botToken = requireBotToken();
  } catch {
    console.warn("telegram audit: TELEGRAM_BOT_TOKEN not configured");
    return 0;
  }

  const userClient = createUserClient(authHeader);
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) {
    console.warn("telegram audit: unauthorized");
    return 0;
  }

  const { data: chatsRaw, error: chatsError } = await userClient.rpc(
    "get_project_telegram_chats",
    { p_app_id: appProjectId },
  );

  if (chatsError) {
    console.error("telegram audit: get_project_telegram_chats", chatsError);
    return 0;
  }

  const chats = (Array.isArray(chatsRaw) ? chatsRaw : []) as { chat_id?: string }[];
  const targets: string[] = chats.map((c) => c.chat_id).filter((id): id is string => Boolean(id));

  const fallbackChatId = Deno.env.get("TELEGRAM_CHAT_ID")?.trim();
  if (targets.length === 0 && fallbackChatId) targets.push(fallbackChatId);
  if (targets.length === 0) {
    console.warn("telegram audit: no linked chats for", appProjectId);
    return 0;
  }

  const text = formatAuditDigestTelegram({
    projectName,
    funnelName,
    reportUrl,
    audit: audit as Record<string, unknown>,
    metrics,
  });

  let sent = 0;
  for (const chatId of targets) {
    const result = await sendTelegramMessage(chatId, text, botToken);
    if (result.ok) sent++;
  }
  console.log(`telegram audit: sent ${sent}/${targets.length} for ${appProjectId}`);
  return sent;
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
      return new Response(JSON.stringify({ error: "Добавьте метрики воронки перед аудитом" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (mats.length === 0 && (!landingUrl || typeof landingUrl !== "string")) {
      return new Response(
        JSON.stringify({ error: "Загрузите материалы или укажите URL посадочной страницы" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const funnelCtx = buildFunnelContext(funnel as Record<string, unknown>);
    const materialsBlock = buildMaterialsBlock(
      mats as {
        type: string;
        title: string;
        stage: string;
        url: string;
        content: string;
        extractedText?: string;
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
        status: string;
        achievementPercent: number | null;
        revenueImpact: number;
        comment?: string;
      }[],
    );

    const landingLine =
      landingUrl && typeof landingUrl === "string" && landingUrl.trim()
        ? `URL посадочной (не скрапим): ${landingUrl.startsWith("http") ? landingUrl : `https://${landingUrl}`}`
        : "";

    const userText = [
      "Быстрый скрининг воронки по метрикам. Не делай site-audit.",
      funnelCtx,
      "\nМЕТРИКИ (сначала red/yellow):\n",
      metricsBlock,
      "\nМАТЕРИАЛЫ (кратко):\n",
      materialsBlock,
      landingLine,
      "\nВерни: diagnosis, 3 problems, stageBlocks по каждому этапу, funnel.stages, 5 hypotheses, systemMessage.",
    ]
      .filter(Boolean)
      .join("\n");

    const userParts: GeminiPart[] = [{ text: userText }];
    const flashModel = geminiFlashModel();

    let audit: unknown;
    try {
      audit = await geminiJsonResponse({
        model: flashModel,
        systemInstruction: FUNNEL_AUDIT_SYSTEM_LITE,
        userParts,
        responseSchema: FUNNEL_AUDIT_GEMINI_SCHEMA_LITE as unknown as Record<string, unknown>,
        temperature: 0.35,
        maxOutputTokens: GEMINI_MAX_OUTPUT_TOKENS,
      });
    } catch (e) {
      console.error("Gemini funnel audit error:", e);
      const msg = e instanceof Error ? e.message : String(e);
      return buildAuditGeminiErrorResponse(msg);
    }

    const mainProblem = (audit as { diagnosis?: { mainProblem?: string } })?.diagnosis?.mainProblem;
    if (!mainProblem || String(mainProblem).trim().length < 8) {
      return new Response(
        JSON.stringify({ error: "AI вернул пустой отчёт. Попробуйте запустить аудит ещё раз." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const telegramSent = await notifyAuditTelegram(
      req,
      body as Record<string, unknown>,
      audit,
      mets as {
        name: string;
        status: string;
        achievementPercent: number | null;
        revenueImpact: number;
      }[],
    );

    return new Response(
      JSON.stringify({ audit, promptVersion: PROMPT_VERSION, telegramSent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("analyze-funnel-audit error:", e);
    const msg = e instanceof Error ? e.message : String(e);
    if (/compute resources|WORKER_LIMIT|out of memory/i.test(msg)) {
      return new Response(
        JSON.stringify({ error: "Сервер не справился с объёмом данных. Попробуйте снова." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    return new Response(JSON.stringify({ error: "Внутренняя ошибка сервера" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
