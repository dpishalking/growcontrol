export type MaterialType =
  | "site"
  | "presentation"
  | "offer"
  | "ad_creative"
  | "content"
  | "sales"
  | "analytics";

export const MATERIAL_TYPES: { id: MaterialType; label: string; hint: string }[] = [
  { id: "site", label: "Сайт / лендинг", hint: "URL, скриншоты, текст, структура" },
  { id: "presentation", label: "Презентация", hint: "PDF, PPTX, КП" },
  { id: "offer", label: "Оффер", hint: "Заголовки, обещание, CTA" },
  { id: "ad_creative", label: "Рекламные материалы", hint: "Креативы, объявления, сценарии" },
  { id: "content", label: "Контент", hint: "Посты, письма, прогревы, скрипты эфиров" },
  { id: "sales", label: "Продажные материалы", hint: "Скрипты, FAQ, ответы на возражения" },
  { id: "analytics", label: "Аналитика", hint: "Скриншоты кабинета, CRM, выгрузки" },
];

/** Метрики, на которые может влиять материал данного типа. */
export const MATERIAL_TYPE_AFFECTED_METRICS: Record<MaterialType, string[]> = {
  ad_creative: ["CTR", "CPC", "Качество клика", "Стоимость заявки"],
  site: [
    "Конверсия из клика в заявку",
    "Глубина просмотра",
    "Показатель отказов",
    "Качество заявки",
  ],
  offer: ["Конверсия лендинга", "Качество заявки", "Конверсия в продажу"],
  presentation: ["Конверсия в продажу", "Средний чек", "Доверие"],
  content: ["Прогрев", "Возвратность", "LTV"],
  sales: ["Дозвон", "Конверсия из заявки в продажу", "Средний чек", "Отработка возражений"],
  analytics: ["Качество данных", "Достоверность диагностики"],
};

export type MaterialFocusFlag = "in_focus" | "out_of_focus";

export type MaterialAttachment = {
  fileName: string;
  fileType: string;
  fileSize: number;
  /** data: URL для маленьких файлов (картинки до 1 МБ). null если файл слишком большой. */
  dataUrl: string | null;
  /** Извлечённый текст для txt / md (до 200 КБ). */
  extractedText?: string;
};

export type Material = {
  id: string;
  funnelId: string;
  type: MaterialType;
  title: string;
  source: string;
  url: string;
  content: string;
  funnelStage: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  affectedMetrics: string[];
  focusFlag: MaterialFocusFlag;
  attachment: MaterialAttachment | null;
  createdAt: string;
};

export type CreateMaterialInput = {
  funnelId: string;
  type: MaterialType;
  title: string;
  source?: string;
  url?: string;
  content?: string;
  funnelStage: string;
  summary?: string;
  strengths?: string[];
  weaknesses?: string[];
  affectedMetrics?: string[];
  focusFlag?: MaterialFocusFlag;
  attachment?: MaterialAttachment | null;
};

export const MAX_INLINE_FILE_BYTES = 1_000_000; // 1 MB
export const MAX_TEXT_EXTRACT_BYTES = 200_000;
