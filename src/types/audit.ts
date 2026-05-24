export type AuditFindingSeverity = "info" | "warning" | "critical";

export type AuditFindingType = "strength" | "weakness" | "risk" | "missing_data";

export type AuditFinding = {
  id: string;
  funnelId: string;
  stage: string;
  findingType: AuditFindingType;
  description: string;
  severity: AuditFindingSeverity;
  relatedMaterialIds: string[];
  relatedMetricIds: string[];
  createdAt: string;
};

/** Чек-лист аудита по этапам воронки — пункты, по которым система задаёт вопросы. */
export const AUDIT_CHECKLIST: Record<string, { id: string; question: string }[]> = {
  traffic: [
    { id: "creative_segment", question: "Понятно ли, кого привлекает креатив?" },
    { id: "promise_match", question: "Не обещает ли реклама одно, а лендинг другое?" },
    { id: "hook", question: "Есть ли сильный крючок и мотив для клика?" },
    { id: "quality", question: "Не создаёт ли креатив нецелевые заявки?" },
  ],
  click: [],
  landing: [
    { id: "5s_clarity", question: "Понятно ли за 3–5 секунд, что предлагают и кому?" },
    { id: "result_promise", question: "Какой результат обещают и почему сейчас?" },
    { id: "trust", question: "Есть ли доказательства и доверие?" },
    { id: "cta", question: "Сильный CTA — есть ли причина действовать?" },
    { id: "structure", question: "Закрыты ли основные сомнения, есть ли логика убеждения?" },
  ],
  lead: [
    { id: "form_friction", question: "Насколько легко оставить заявку?" },
    { id: "fields", question: "Нет ли лишних полей?" },
    { id: "after_action", question: "Понятно ли, что произойдёт после заявки?" },
    { id: "fears", question: "Есть ли страхи / возражения перед заявкой?" },
  ],
  qualification: [
    { id: "filter_questions", question: "Есть ли фильтрующие вопросы?" },
    { id: "segmentation", question: "Отсекаются ли нецелевые клиенты?" },
  ],
  contact: [
    { id: "speed", question: "Как быстро обрабатывается заявка?" },
    { id: "touchpoints", question: "Есть ли SMS/WhatsApp перед звонком, подтверждение?" },
  ],
  consultation: [
    { id: "script", question: "Есть ли структурированный скрипт?" },
    { id: "objections", question: "Какие возражения возникают и как отрабатываются?" },
  ],
  sale: [
    { id: "offer_on_call", question: "Есть ли оффер на консультации, пакеты, рассрочка?" },
    { id: "upsell", question: "Есть ли апсейл / допродажа?" },
    { id: "logic", question: "Понятная ли логика доведения до оплаты?" },
  ],
  delivery: [
    { id: "confirmation", question: "Есть ли подтверждение заказа, предоплата?" },
    { id: "anxiety", question: "Снимается ли тревога до доставки?" },
  ],
  repeat: [
    { id: "comms", question: "Есть ли повторная коммуникация, апсейл-логика?" },
    { id: "ltv", question: "Есть ли понимание LTV сегмента?" },
  ],
};
