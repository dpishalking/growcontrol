import type { MaterialType } from "@/types/material";

export type WebinarMaterialStep = {
  label: string;
  stageId: string;
  materialType: MaterialType;
};

/** Путь клиента: от креатива до продажи — порядок для чек-листа и выбора шага. */
export const WEBINAR_MATERIAL_STEPS: WebinarMaterialStep[] = [
  { label: "Рекламные крео", stageId: "traffic", materialType: "ad_creative" },
  { label: "Регистрация на веб", stageId: "registration", materialType: "site" },
  { label: "Страница «спасибо»", stageId: "confirmation", materialType: "site" },
  { label: "Цепочка доходимости", stageId: "attendance", materialType: "content" },
  { label: "Вебинар", stageId: "retention", materialType: "content" },
  { label: "Ленд продукта", stageId: "selling_block", materialType: "site" },
  { label: "Заявка/Покупка", stageId: "webinar_lead", materialType: "offer" },
  { label: "Дожимная цепочка после", stageId: "followup", materialType: "content" },
  { label: "Созвон с менеджером", stageId: "webinar_lead", materialType: "sales" },
  { label: "Продажа", stageId: "sale", materialType: "sales" },
  { label: "Дожим менеджером", stageId: "followup", materialType: "sales" },
];

export const WEBINAR_MATERIAL_LABELS = WEBINAR_MATERIAL_STEPS.map((s) => s.label);

const BY_LABEL = Object.fromEntries(WEBINAR_MATERIAL_STEPS.map((s) => [s.label, s])) as Record<
  string,
  WebinarMaterialStep
>;

export function webinarMaterialStep(label: string): WebinarMaterialStep | undefined {
  return BY_LABEL[label];
}
