import type { FunnelTypeId } from "@/types/funnelType";
import type { Material, MaterialType } from "@/types/material";
import { MATERIAL_TYPES } from "@/types/material";
import { webinarMaterialStep } from "@/data/funnelTypes/webinarMaterialFlow";
import type { CreateFindingInput } from "@/services/auditService";

const TYPE_LABEL = Object.fromEntries(MATERIAL_TYPES.map((t) => [t.id, t.label])) as Record<
  MaterialType,
  string
>;

/** Ключевые слова обязательного материала → этап воронки. */
const REQUIRED_STAGE: Partial<Record<FunnelTypeId, [RegExp, string][]>> = {
  webinar: [
    [/креатив|реклам|крео/i, "traffic"],
    [/регистрац/i, "registration"],
    [/спасибо|thank/i, "confirmation"],
    [/цепочк.*доходим|доходим/i, "attendance"],
    [/^вебинар$/i, "retention"],
    [/ленд.*продукт|продукт.*ленд/i, "selling_block"],
    [/заявк|покупк/i, "webinar_lead"],
    [/дожим.*цепочк|цепочк.*после/i, "followup"],
    [/созвон/i, "webinar_lead"],
    [/^продажа$/i, "sale"],
    [/дожим.*менеджер/i, "followup"],
  ],
  service_lead: [
    [/креатив|реклам|баннер/i, "traffic"],
    [/сайт|лендинг/i, "landing"],
    [/оффер/i, "landing"],
    [/форм/i, "lead"],
    [/скрипт менедж|звон/i, "contact"],
    [/возражен/i, "consultation"],
    [/коммерческ|кп/i, "offer"],
  ],
  product_delivery: [
    [/креатив|реклам/i, "traffic"],
    [/лендинг|карточк|товар/i, "landing"],
    [/подтвержден/i, "confirmation"],
    [/доставк/i, "delivery"],
  ],
  quiz: [
    [/креатив|реклам/i, "traffic"],
    [/первый экран|квиз/i, "quiz_start"],
    [/вопрос/i, "quiz_progress"],
    [/результат/i, "result"],
    [/форм|заявк/i, "lead"],
    [/скрипт|звон/i, "call"],
  ],
};

const TYPE_HINT: Partial<Record<FunnelTypeId, [RegExp, MaterialType][]>> = {
  webinar: [
    [/креатив|реклам/i, "ad_creative"],
    [/страница|регистрац|лендинг/i, "site"],
    [/сценар|письм|сообщен|прогрев|контент/i, "content"],
    [/презента/i, "presentation"],
    [/продающ|оффер/i, "offer"],
  ],
};

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function materialBlob(m: Material): string {
  return normalize(`${m.title} ${m.url} ${m.content} ${m.attachment?.fileName ?? ""}`);
}

export function stageForRequiredMaterial(label: string, funnelTypeId: FunnelTypeId): string {
  const webinar = webinarMaterialStep(label);
  if (funnelTypeId === "webinar" && webinar) return webinar.stageId;

  const rules = REQUIRED_STAGE[funnelTypeId];
  if (rules) {
    for (const [re, stageId] of rules) {
      if (re.test(label)) return stageId;
    }
  }
  return "traffic";
}

export function suggestedMaterialTypeForLabel(
  label: string,
  funnelTypeId: FunnelTypeId,
): MaterialType | null {
  const webinar = webinarMaterialStep(label);
  if (funnelTypeId === "webinar" && webinar) return webinar.materialType;

  const hints = TYPE_HINT[funnelTypeId] ?? [];
  for (const [re, type] of hints) {
    if (re.test(label)) return type;
  }
  if (/креатив|реклам|баннер|объяв/i.test(label)) return "ad_creative";
  if (/сайт|лендинг|страниц|регистрац/i.test(label)) return "site";
  if (/презента|кп/i.test(label)) return "presentation";
  if (/оффер|продающ/i.test(label)) return "offer";
  if (/скрипт|возражен/i.test(label)) return "sales";
  if (/аналит|crm|кабинет/i.test(label)) return "analytics";
  if (/письм|сообщ|сценар|прогрев|программ|контент/i.test(label)) return "content";
  return null;
}

export function materialCoversRequired(label: string, materials: Material[], funnelTypeId: FunnelTypeId): boolean {
  const n = normalize(label);
  const hints = TYPE_HINT[funnelTypeId] ?? [];

  for (const m of materials) {
    const blob = materialBlob(m);
    for (const [re, type] of hints) {
      if (re.test(n) && m.type === type) return true;
    }
    const tokens = n.split(/[/,·]/).flatMap((part) => part.split(/\s+/)).filter((w) => w.length > 4);
    if (tokens.some((t) => blob.includes(t))) return true;
    if (m.type === "ad_creative" && /креатив|реклам|объяв/.test(n)) return true;
    if (m.type === "site" && /сайт|лендинг|страниц|регистрац/.test(n)) return true;
    if (m.type === "content" && /писем|сообщ|сценар|прогрев|программ/.test(n)) return true;
    if (m.type === "presentation" && /презента/.test(n)) return true;
    if (m.type === "offer" && /оффер|продающ/.test(n)) return true;
    if (m.type === "sales" && /скрипт|возражен/.test(n)) return true;
    if (m.funnelStage === stageForRequiredMaterial(label, funnelTypeId) && blob.includes(tokens[0] ?? "___")) {
      return true;
    }
  }
  return false;
}

export function analyzeMaterial(m: Material, funnelId: string): CreateFindingInput[] {
  const out: CreateFindingInput[] = [];
  const typeLabel = TYPE_LABEL[m.type] ?? m.type;

  out.push({
    funnelId,
    stage: m.funnelStage,
    findingType: "strength",
    description: `Загружено: «${m.title}» (${typeLabel})`,
    severity: "info",
    relatedMaterialIds: [m.id],
  });

  const hasFile = !!m.attachment;
  const hasUrl = !!m.url.trim();
  const text = normalize(`${m.content} ${m.attachment?.extractedText ?? ""}`);

  if (!hasFile && !hasUrl && text.length < 20) {
    out.push({
      funnelId,
      stage: m.funnelStage,
      findingType: "missing_data",
      description: `«${m.title}»: нет файла, ссылки или текста — глубокий разбор невозможен`,
      severity: "warning",
      relatedMaterialIds: [m.id],
    });
    return out;
  }

  if ((m.type === "site" || m.type === "offer") && hasUrl && !hasFile && text.length < 40) {
    out.push({
      funnelId,
      stage: m.funnelStage,
      findingType: "missing_data",
      description: `«${m.title}»: только URL — добавьте скриншот или текст страницы для полноценного аудита`,
      severity: "warning",
      relatedMaterialIds: [m.id],
    });
  }

  if (text.length >= 40) {
    const hasCta = /запис|регистр|заявк|купи|получ|скач|перейд|жми|нажми|cta|оформ/.test(text);
    if ((m.type === "site" || m.type === "offer" || m.type === "content") && !hasCta) {
      out.push({
        funnelId,
        stage: m.funnelStage,
        findingType: "weakness",
        description: `«${m.title}»: не видно явного призыва к действию — проверьте CTA на этапе`,
        severity: "warning",
        relatedMaterialIds: [m.id],
      });
    }

    const hasTrust = /отзыв|кейс|гарант|клиент|результат|опыт|\d+\s*(лет|года|клиент)/.test(text);
    if (m.type === "site" && !hasTrust) {
      out.push({
        funnelId,
        stage: m.funnelStage,
        findingType: "weakness",
        description: `«${m.title}»: мало блоков доверия (отзывы, кейсы, цифры)`,
        severity: "warning",
        relatedMaterialIds: [m.id],
      });
    }

    if (m.type === "content" && text.length < 120) {
      out.push({
        funnelId,
        stage: m.funnelStage,
        findingType: "risk",
        description: `«${m.title}»: мало контекста в тексте — для прогрева/сценария этого может быть недостаточно`,
        severity: "info",
        relatedMaterialIds: [m.id],
      });
    }
  }

  if (m.type === "ad_creative" && !hasFile && !text.length) {
    out.push({
      funnelId,
      stage: m.funnelStage,
      findingType: "missing_data",
      description: `«${m.title}»: креатив без файла/текста — нельзя оценить обещание и CTR`,
      severity: "warning",
      relatedMaterialIds: [m.id],
    });
  }

  return out;
}

export type AuditCoverage = {
  requiredTotal: number;
  requiredCovered: number;
  materialsCount: number;
  stagesWithMaterials: number;
  gaps: string[];
};

export function computeCoverage(
  materials: Material[],
  requiredMaterials: string[],
  funnelTypeId: FunnelTypeId,
  stageIds: string[],
): AuditCoverage {
  const gaps = requiredMaterials.filter((r) => !materialCoversRequired(r, materials, funnelTypeId));
  const stagesWithMaterials = new Set(materials.map((m) => m.funnelStage).filter((s) => stageIds.includes(s))).size;
  return {
    requiredTotal: requiredMaterials.length,
    requiredCovered: requiredMaterials.length - gaps.length,
    materialsCount: materials.length,
    stagesWithMaterials,
    gaps,
  };
}
