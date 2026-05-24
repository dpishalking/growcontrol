/**
 * Прямые вызовы Gemini Generative Language API (без Lovable/OpenAI).
 * Ключ в секретах: GEMINI_API_KEY
 * Опционально: GEMINI_FLASH_MODEL, GEMINI_PRO_MODEL
 * При 429/503: повторы с backoff и цепочка GEMINI_FLASH_FALLBACK_MODELS (или gemini-2.0-flash, gemini-1.5-flash).
 */

export function requireGeminiKey(): string {
  const k = Deno.env.get("GEMINI_API_KEY");
  if (!k?.trim()) throw new Error("GEMINI_API_KEY is not configured");
  return k.trim();
}

export function geminiFlashModel(): string {
  return (Deno.env.get("GEMINI_FLASH_MODEL") ?? "gemini-2.5-flash").trim();
}

export function geminiProModel(): string {
  return (Deno.env.get("GEMINI_PRO_MODEL") ?? "gemini-2.5-pro").trim();
}

/** Резервные модели при 503/429 (перегрузка). Секрет: GEMINI_FLASH_FALLBACK_MODELS = a,b,c */
function geminiFlashFallbackModels(): string[] {
  const raw = Deno.env.get("GEMINI_FLASH_FALLBACK_MODELS")?.trim();
  const fromEnv = raw
    ? raw.split(",").map((s) => s.trim()).filter(Boolean)
    : ["gemini-2.0-flash", "gemini-1.5-flash"];
  return fromEnv;
}

function modelChain(primary: string, fallbacks: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const m of [primary, ...fallbacks]) {
    const t = m.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function isRetryableGeminiHttpStatus(status: number): boolean {
  return status === 429 || status === 502 || status === 503;
}

const GEMINI_MAX_ATTEMPTS_PER_MODEL = 5;
const GEMINI_BASE_DELAY_MS = 900;

function backoffMs(attempt: number): number {
  const cap = 12_000;
  const exp = Math.min(cap, GEMINI_BASE_DELAY_MS * 2 ** attempt);
  const jitter = Math.floor(Math.random() * 400);
  return exp + jitter;
}

/** Убирает поля, которые ломают/раздувают Gemini, сохраняя структуру до maxDepth. */
export function sanitizeSchemaForGemini(
  schema: unknown,
  opts: { maxDepth?: number } = {},
): unknown {
  const maxDepth = opts.maxDepth ?? 5;

  function walk(node: unknown, depth: number): unknown {
    if (!node || typeof node !== "object") return node;
    if (Array.isArray(node)) return node.map((x) => walk(x, depth));

    const o = node as Record<string, unknown>;
    const out: Record<string, unknown> = {};

    for (const [k, v] of Object.entries(o)) {
      if (k === "additionalProperties" || k === "minItems" || k === "maxItems") continue;

      if (depth >= maxDepth && (k === "properties" || k === "items")) {
        out[k] = o.type === "array" ? { type: "object" } : { type: "object" };
        continue;
      }

      if (k === "properties" && v && typeof v === "object" && !Array.isArray(v)) {
        const props: Record<string, unknown> = {};
        for (const [pk, pv] of Object.entries(v as Record<string, unknown>)) {
          props[pk] = walk(pv, depth + 1);
        }
        out[k] = props;
        continue;
      }

      if (k === "items") {
        out[k] = walk(v, depth + 1);
        continue;
      }

      out[k] = walk(v, depth);
    }
    return out;
  }

  return walk(schema, 0);
}

/**
 * Сжимает JSON Schema для Gemini: только верхний уровень, вложенные object/array без деталей.
 * Полная схема (десятки KB) часто даёт 400 от API.
 */
export function compactFunctionSchema(parameters: Record<string, unknown>): Record<string, unknown> {
  const required = parameters.required;
  const properties = parameters.properties as Record<string, Record<string, unknown>> | undefined;
  if (!properties || typeof properties !== "object") return parameters;

  const compact: Record<string, unknown> = {};
  for (const [key, prop] of Object.entries(properties)) {
    const t = prop.type;
    const desc = prop.description;
    if (t === "array") {
      compact[key] = {
        type: "array",
        items: { type: "object" },
        ...(typeof desc === "string" ? { description: desc } : {}),
      };
    } else if (t === "object") {
      compact[key] = {
        type: "object",
        ...(typeof desc === "string" ? { description: desc } : {}),
      };
    } else {
      compact[key] = prop;
    }
  }
  return {
    type: "object",
    ...(Array.isArray(required) ? { required } : {}),
    properties: compact,
  };
}

/** Gemini не принимает `additionalProperties` во многих схемах — убираем рекурсивно. */
export function stripGeminiUnsafeSchema(schema: unknown): unknown {
  if (!schema || typeof schema !== "object") return schema;
  if (Array.isArray(schema)) return schema.map(stripGeminiUnsafeSchema);
  const o = schema as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (k === "additionalProperties") continue;
    out[k] = stripGeminiUnsafeSchema(v);
  }
  return out;
}

function encodeBase64(bytes: Uint8Array): string {
  const chunk = 0x8000;
  let bin = "";
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, [...bytes.subarray(i, i + chunk)] as number[]);
  }
  return btoa(bin);
}

/** Скачивает изображение и отдаёт part для Gemini. */
export async function fetchImageAsInlinePart(
  url: string,
): Promise<{ inlineData: { mimeType: string; data: string } } | null> {
  try {
    const r = await fetch(url, { redirect: "follow" });
    if (!r.ok) return null;
    const mimeRaw = r.headers.get("content-type")?.split(";")[0]?.trim() || "";
    let mime = mimeRaw.startsWith("image/") ? mimeRaw : "";
    const buf = new Uint8Array(await r.arrayBuffer());
    if (!mime) {
      const u = url.toLowerCase();
      if (u.includes(".jpg") || u.includes(".jpeg")) mime = "image/jpeg";
      else if (u.includes(".webp")) mime = "image/webp";
      else if (u.includes(".gif")) mime = "image/gif";
      else mime = "image/png";
    }
    return { inlineData: { mimeType: mime, data: encodeBase64(buf) } };
  } catch {
    return null;
  }
}

/** Достать args из принудительного functionCall. */
export function extractFunctionCallArgs(data: unknown, functionName: string): Record<string, unknown> | null {
  const parts = (data as { candidates?: { content?: { parts?: unknown[] } }[] })?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return null;
  for (const p of parts as { functionCall?: { name?: string; args?: unknown } }[]) {
    const fc = p.functionCall;
    if (fc?.name !== functionName) continue;
    if (fc.args && typeof fc.args === "object" && !Array.isArray(fc.args)) {
      return fc.args as Record<string, unknown>;
    }
  }
  return null;
}

export type GeminiTextPart = { text: string };
export type GeminiInlinePart = { inlineData: { mimeType: string; data: string } };
export type GeminiPart = GeminiTextPart | GeminiInlinePart;

function modelsForGeminiRequest(primaryModel: string): string[] {
  const p = primaryModel.trim();
  if (p.toLowerCase().includes("flash")) {
    return modelChain(p, geminiFlashFallbackModels());
  }
  return [p];
}

/** Краткое описание тела ошибки Google (для логов и UI с обрезкой справа — HTTP-код в начале текста). */
function geminiApiErrorDetail(rawJson: unknown, maxLen: number): string {
  if (
    typeof rawJson === "object" && rawJson !== null &&
    "error" in rawJson &&
    typeof (rawJson as { error?: { message?: string } }).error?.message === "string"
  ) {
    return (rawJson as { error: { message: string } }).error.message.slice(0, maxLen);
  }
  if (rawJson === null || rawJson === undefined) return "(пустой или не-JSON ответ)";
  return JSON.stringify(rawJson).slice(0, maxLen);
}

function geminiForcedCallError(model: string, status: number, rawJson: unknown): Error {
  const detail = geminiApiErrorDetail(rawJson, 500);
  return new Error(`[Gemini HTTP ${status}] ${model} — ${detail}`);
}

function geminiJsonModeError(model: string, status: number, rawJson: unknown): Error {
  const detail = geminiApiErrorDetail(rawJson, 700);
  return new Error(`[Gemini HTTP ${status}] JSON-mode · ${model} — ${detail}`);
}

export async function geminiForcedFunctionCall(args: {
  apiKey?: string;
  model: string;
  systemInstruction?: string;
  userParts: GeminiPart[];
  /** Имя function declaration */
  functionName: string;
  functionDescription?: string;
  /** JSON Schema объект (как для OpenAI tools): type, properties, required */
  parameters: Record<string, unknown>;
  temperature?: number;
  maxOutputTokens?: number;
  /** Номер Gemini API (v1 или v1beta) */
  apiVersion?: "v1beta" | "v1";
}): Promise<{ rawResponse: unknown; args: Record<string, unknown> }> {
  const key = args.apiKey?.trim() || requireGeminiKey();
  const ver = args.apiVersion ?? "v1beta";
  const models = modelsForGeminiRequest(args.model);

  const contents = [
    {
      role: "user",
      parts: args.userParts,
    },
  ];

  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: args.temperature ?? 0.65,
      maxOutputTokens: args.maxOutputTokens ?? 65_536,
    },
    tools: [
      {
        functionDeclarations: [
          {
            name: args.functionName,
            description: args.functionDescription ?? "",
            parameters: stripGeminiUnsafeSchema(args.parameters) as Record<string, unknown>,
          },
        ],
      },
    ],
    toolConfig: {
      functionCallingConfig: {
        mode: "ANY",
        allowedFunctionNames: [args.functionName],
      },
    },
  };

  if (args.systemInstruction?.trim()) {
    body.systemInstruction = { parts: [{ text: args.systemInstruction }] };
  }

  let lastErr: Error | null = null;

  for (const model of models) {
    const url =
      `https://generativelanguage.googleapis.com/${ver}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;

    for (let attempt = 0; attempt < GEMINI_MAX_ATTEMPTS_PER_MODEL; attempt++) {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const rawJson: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        const err = geminiForcedCallError(model, res.status, rawJson);
        if (!isRetryableGeminiHttpStatus(res.status)) throw err;
        if (attempt < GEMINI_MAX_ATTEMPTS_PER_MODEL - 1) {
          console.warn(
            `Gemini ${model}: HTTP ${res.status} (retryable), attempt ${attempt + 1}/${GEMINI_MAX_ATTEMPTS_PER_MODEL}`,
          );
          await sleep(backoffMs(attempt));
          continue;
        }
        console.warn(`Gemini ${model}: retries exhausted (${res.status}), trying fallback model if any`);
        lastErr = err;
        break;
      }

      const fcArgs = extractFunctionCallArgs(rawJson, args.functionName);
      if (!fcArgs) {
        const textFallback = typeof rawJson === "object"
          ? JSON.stringify(rawJson).slice(0, 400)
          : String(rawJson);
        throw new Error(`Gemini: нет вызова ${args.functionName} в ответе. Отрывок: ${textFallback}`);
      }

      if (model !== args.model) {
        console.warn(`Gemini: used fallback model ${model} (primary ${args.model} was unavailable)`);
      }
      return { rawResponse: rawJson, args: fcArgs };
    }
  }

  throw lastErr ?? new Error("Gemini: не удалось выполнить запрос");
}

/**
 * Вызов Gemini с включённым `google_search` tool (grounding в реальный веб-поиск).
 *
 * Важно: `google_search` несовместим с `functionDeclarations` и `responseSchema`
 * в одном запросе. Возвращаем сырой текст; парсинг JSON — на стороне вызывающего
 * (через regex/strict-parse), либо вторым последующим вызовом `geminiJsonResponse`
 * без grounding.
 *
 * Возвращает `text` и сырые `groundingMetadata` (источники поиска), которые
 * можно показать пользователю как «вот откуда AI взял конкурентов».
 */
export async function geminiGroundedSearch(args: {
  apiKey?: string;
  model?: string;
  systemInstruction?: string;
  userParts: GeminiPart[];
  temperature?: number;
  maxOutputTokens?: number;
}): Promise<{
  text: string;
  groundingMetadata: unknown;
  rawResponse: unknown;
}> {
  const key = args.apiKey?.trim() || requireGeminiKey();
  const primary = (args.model ?? geminiFlashModel()).trim();
  const models = modelsForGeminiRequest(primary);

  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: args.userParts }],
    generationConfig: {
      temperature: args.temperature ?? 0.4,
      maxOutputTokens: args.maxOutputTokens ?? 8192,
    },
    // `google_search` — встроенный grounding tool Gemini 2.x.
    tools: [{ google_search: {} }],
  };

  if (args.systemInstruction?.trim()) {
    body.systemInstruction = { parts: [{ text: args.systemInstruction }] };
  }

  let lastErr: Error | null = null;

  for (const model of models) {
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;

    for (let attempt = 0; attempt < GEMINI_MAX_ATTEMPTS_PER_MODEL; attempt++) {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const rawJson: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        const err = new Error(
          `[Gemini HTTP ${res.status}] grounded-search · ${model} — ${geminiApiErrorDetail(rawJson, 500)}`,
        );
        if (!isRetryableGeminiHttpStatus(res.status)) throw err;
        if (attempt < GEMINI_MAX_ATTEMPTS_PER_MODEL - 1) {
          console.warn(
            `Gemini grounded ${model}: HTTP ${res.status} (retryable), attempt ${attempt + 1}/${GEMINI_MAX_ATTEMPTS_PER_MODEL}`,
          );
          await sleep(backoffMs(attempt));
          continue;
        }
        console.warn(`Gemini grounded ${model}: retries exhausted (${res.status}), trying fallback model if any`);
        lastErr = err;
        break;
      }

      const candidate = (rawJson as {
        candidates?: { content?: { parts?: { text?: string }[] }; groundingMetadata?: unknown }[];
      })?.candidates?.[0];

      const text = (candidate?.content?.parts ?? [])
        .map((p) => (typeof p?.text === "string" ? p.text : ""))
        .join("")
        .trim();

      if (!text) {
        throw new Error("Gemini grounded-search: пустой текст в ответе");
      }

      if (model !== primary) {
        console.warn(`Gemini grounded: used fallback model ${model} (primary ${primary} was unavailable)`);
      }

      return {
        text,
        groundingMetadata: candidate?.groundingMetadata ?? null,
        rawResponse: rawJson,
      };
    }
  }

  throw lastErr ?? new Error("Gemini grounded-search: не удалось выполнить запрос");
}

/**
 * Извлекает JSON из ответа Gemini grounded-search. Модель часто оборачивает
 * JSON в ```json ... ``` или добавляет вступительный текст; парсим устойчиво.
 * Возвращает null при провале (тогда вызывающий может сделать второй проход
 * без grounding для структурирования).
 */
export function extractJsonFromText(text: string): unknown | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  // 1. ```json ... ```
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidates = [fenceMatch?.[1]?.trim(), trimmed].filter(
    (s): s is string => Boolean(s),
  );

  for (const c of candidates) {
    try {
      return JSON.parse(c);
    } catch {
      // 2. ищем первую '{' или '[' и парсим от неё до конца сбалансированного блока.
      const firstObj = c.indexOf("{");
      const firstArr = c.indexOf("[");
      const start = firstObj === -1
        ? firstArr
        : firstArr === -1
          ? firstObj
          : Math.min(firstObj, firstArr);
      if (start === -1) continue;
      const opener = c[start];
      const closer = opener === "{" ? "}" : "]";
      let depth = 0;
      for (let i = start; i < c.length; i++) {
        if (c[i] === opener) depth++;
        else if (c[i] === closer) {
          depth--;
          if (depth === 0) {
            try {
              return JSON.parse(c.slice(start, i + 1));
            } catch {
              break;
            }
          }
        }
      }
    }
  }

  return null;
}

/** Простая JSON-схема ответа (responseMimeType) — когда схема небольшая. */
export async function geminiJsonResponse(args: {
  apiKey?: string;
  model: string;
  systemInstruction?: string;
  userParts: GeminiPart[];
  responseSchema: Record<string, unknown>;
  temperature?: number;
  maxOutputTokens?: number;
  /** Если JSON.parse не удался — попытка восстановить из обрезанного ответа */
  salvageParse?: (text: string) => unknown | null;
}): Promise<unknown> {
  const key = args.apiKey?.trim() || requireGeminiKey();
  const models = modelsForGeminiRequest(args.model);

  const baseBody: Record<string, unknown> = {
    contents: [{ role: "user", parts: args.userParts }],
    generationConfig: {
      temperature: args.temperature ?? 0.85,
      maxOutputTokens: args.maxOutputTokens ?? 8192,
      responseMimeType: "application/json",
      responseSchema: args.responseSchema,
    },
  };

  const body: Record<string, unknown> = { ...baseBody };
  if (args.systemInstruction?.trim()) {
    body.systemInstruction = { parts: [{ text: args.systemInstruction }] };
  }

  let lastErr: Error | null = null;

  for (const model of models) {
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;

    for (let attempt = 0; attempt < GEMINI_MAX_ATTEMPTS_PER_MODEL; attempt++) {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const rawJson: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        const err = geminiJsonModeError(model, res.status, rawJson);
        if (!isRetryableGeminiHttpStatus(res.status)) throw err;
        if (attempt < GEMINI_MAX_ATTEMPTS_PER_MODEL - 1) {
          console.warn(
            `Gemini JSON-mode ${model}: HTTP ${res.status} (retryable), attempt ${attempt + 1}/${GEMINI_MAX_ATTEMPTS_PER_MODEL}`,
          );
          await sleep(backoffMs(attempt));
          continue;
        }
        console.warn(`Gemini JSON-mode ${model}: retries exhausted (${res.status}), trying fallback model if any`);
        lastErr = err;
        break;
      }

      const textPart =
        ((rawJson as { candidates?: { content?: { parts?: { text?: string }[] } }[] }).candidates?.[0]?.content?.parts ??
          []).find((p) => typeof p?.text === "string")?.text;
      if (!textPart?.trim()) throw new Error("Gemini: пустой JSON в ответе");

      const finishReason = (rawJson as { candidates?: { finishReason?: string }[] })?.candidates?.[0]
        ?.finishReason;
      if (finishReason === "MAX_TOKENS") {
        console.warn(`Gemini JSON-mode ${model}: ответ обрезан (MAX_TOKENS)`);
      }

      try {
        if (model !== args.model) {
          console.warn(`Gemini JSON-mode: used fallback model ${model} (primary ${args.model} was unavailable)`);
        }
        return JSON.parse(textPart.trim());
      } catch {
        const salvaged = args.salvageParse?.(textPart);
        if (salvaged !== undefined && salvaged !== null) {
          console.warn(`Gemini JSON-mode ${model}: использован salvageParse после ошибки парсинга`);
          return salvaged;
        }
        throw new Error(`Gemini: не удалось распарсить JSON: ${textPart.slice(0, 200)}`);
      }
    }
  }

  throw lastErr ?? new Error("Gemini JSON-mode: не удалось выполнить запрос");
}
