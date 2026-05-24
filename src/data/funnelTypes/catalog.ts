import type {
  FunnelStageDefinition,
  FunnelTypeId,
  FunnelTypeMetricTemplate,
  FunnelTypeTemplate,
  HypothesisDirectionsMap,
} from "@/types/funnelType";
import { WEBINAR_MATERIAL_LABELS } from "./webinarMaterialFlow";

function m(
  stageId: string,
  name: string,
  unit: string,
  direction: FunnelTypeMetricTemplate["direction"],
  required: boolean,
  revenueImpact: number,
): FunnelTypeMetricTemplate {
  return { stageId, name, unit, direction, required, revenueImpact };
}

function dirs(...entries: [string, HypothesisDirectionsMap[string]][]): HypothesisDirectionsMap {
  return Object.fromEntries(entries);
}

const TRAFFIC_METRICS = (stageId = "traffic"): FunnelTypeMetricTemplate[] => [
  m(stageId, "Рекламный бюджет", "₽", "lower_better", true, 4),
  m(stageId, "Показы", "шт", "higher_better", true, 2),
];

const CLICK_METRICS = (stageId = "click"): FunnelTypeMetricTemplate[] => [
  m(stageId, "Клики", "шт", "higher_better", true, 3),
  m(stageId, "CTR", "%", "higher_better", true, 4),
  m(stageId, "CPC", "₽", "lower_better", true, 4),
];

const SALE_METRICS = (stageId = "sale"): FunnelTypeMetricTemplate[] => [
  m(stageId, "Продажи", "шт", "higher_better", true, 5),
  m(stageId, "Средний чек", "₽", "higher_better", true, 5),
  m(stageId, "Выручка", "₽", "higher_better", true, 5),
  m(stageId, "Прибыль", "₽", "higher_better", true, 5),
  m(stageId, "ROAS", "x", "higher_better", false, 5),
  m(stageId, "ROMI", "%", "higher_better", false, 5),
];

const SERVICE_LEAD: FunnelTypeTemplate = {
  id: "service_lead",
  name: "Воронка заявки на услугу",
  description:
    "Человек приходит с рекламы на сайт, оставляет заявку, дальше с ним связывается менеджер и продаёт услугу.",
  exampleFlow: "трафик → сайт → заявка → звонок → консультация → продажа",
  requiredStages: [
    { id: "traffic", label: "Трафик" },
    { id: "click", label: "Клик" },
    { id: "landing", label: "Посадочная страница" },
    { id: "lead", label: "Заявка" },
    { id: "qualification", label: "Квалификация заявки" },
    { id: "contact", label: "Дозвон / первый контакт" },
    { id: "consultation", label: "Консультация / диалог" },
    { id: "offer", label: "Коммерческое предложение" },
    { id: "sale", label: "Продажа / оплата" },
  ],
  optionalStages: [{ id: "repeat", label: "Повторная продажа" }],
  requiredMetrics: [
    ...TRAFFIC_METRICS(),
    ...CLICK_METRICS(),
    m("landing", "Посетители", "шт", "higher_better", true, 3),
    m("landing", "Конверсия сайта в заявку", "%", "higher_better", true, 5),
    m("landing", "Количество заявок", "шт", "higher_better", true, 4),
    m("landing", "Стоимость заявки", "₽", "lower_better", true, 5),
    m("landing", "Показатель отказов", "%", "lower_better", false, 3),
    m("qualification", "Количество целевых заявок", "шт", "higher_better", true, 4),
    m("qualification", "Доля целевых заявок", "%", "higher_better", true, 4),
    m("qualification", "Стоимость целевой заявки", "₽", "lower_better", true, 5),
    m("contact", "Процент дозвона", "%", "higher_better", true, 4),
    m("consultation", "Количество консультаций", "шт", "higher_better", true, 4),
    m("consultation", "Конверсия из заявки в консультацию", "%", "higher_better", true, 4),
    m("sale", "Конверсия из заявки в продажу", "%", "higher_better", true, 5),
    m("sale", "Стоимость продажи", "₽", "lower_better", true, 5),
    ...SALE_METRICS(),
  ],
  optionalMetrics: [
    m("qualification", "Количество нецелевых заявок", "шт", "lower_better", false, 3),
  ],
  requiredMaterials: [
    "Сайт / лендинг",
    "Рекламные объявления",
    "Баннеры / креативы",
    "Оффер",
    "Форма заявки",
    "Скрипт менеджера",
    "Список возражений",
    "Коммерческое предложение",
  ],
  auditQuestions: {
    traffic: ["Понятно ли, кого привлекает креатив?", "Есть ли точное попадание в сегмент?"],
    landing: ["Понятно ли за 3–5 сек, что предлагают?", "Сильный CTA?", "Есть ли доверие?"],
    lead: ["Легко ли оставить заявку?", "Нет ли лишних полей?"],
    contact: ["Как быстро обрабатывается заявка?", "Есть ли скрипт первого звонка?"],
    consultation: ["Отрабатываются ли возражения?", "Есть ли логика доведения до оплаты?"],
  },
  commonBottlenecks: [
    "Реклама приводит нецелевую аудиторию",
    "Оффер слишком широкий",
    "Первый экран не объясняет ценность",
    "Форма заявки пугает или перегружена",
    "Менеджеры долго обрабатывают заявки",
    "Низкая конверсия в продажу",
  ],
  hypothesisDirections: dirs(
    [
      "конверсия сайта в заявку",
      [
        {
          change: "Переписать первый экран под боль сегмента",
          rationale: "За 3–5 секунд пользователь должен узнать себя и результат",
          materialsToChange: ["Лендинг: hero", "Заголовки"],
          testMethod: "A/B-тест первого экрана",
          complexity: 3,
          impact: 5,
          confidence: 4,
          ease: 3,
        },
        {
          change: "Упростить форму заявки",
          rationale: "Меньше трения → выше CR",
          materialsToChange: ["Форма заявки"],
          testMethod: "A/B короткой и длинной формы",
          complexity: 1,
          impact: 4,
          confidence: 5,
          ease: 5,
        },
      ],
    ],
    [
      "стоимость заявки",
      [
        {
          change: "Сузить аудиторию и почистить связки",
          rationale: "CPL = CPC / CR — чистим слабые связки",
          materialsToChange: ["Настройки кампании", "Креативы"],
          testMethod: "Срез по связкам за 7 дней",
          complexity: 2,
          impact: 5,
          confidence: 4,
          ease: 4,
        },
      ],
    ],
    [
      "процент дозвона",
      [
        {
          change: "SMS/WhatsApp сразу после заявки",
          rationale: "Клиент готов к звонку",
          materialsToChange: ["Авто-сообщение"],
          testMethod: "Сравнить % дозвона до/после",
          complexity: 2,
          impact: 4,
          confidence: 4,
          ease: 4,
        },
      ],
    ],
    [
      "конверсия из заявки в продажу",
      [
        {
          change: "Внедрить скрипт с отработкой ТОП-3 возражений",
          rationale: "Системная отработка повышает CR",
          materialsToChange: ["Скрипт менеджера"],
          testMethod: "A/B по менеджерам 14 дней",
          complexity: 3,
          impact: 5,
          confidence: 3,
          ease: 3,
        },
      ],
    ],
  ),
  bottleneckMetricNames: [
    "Стоимость заявки",
    "Стоимость целевой заявки",
    "Доля целевых заявок",
    "Процент дозвона",
    "Конверсия из заявки в продажу",
    "Средний чек",
    "Прибыль",
  ],
  planFactMetrics: [
    "Рекламный бюджет",
    "Клики",
    "Посетители",
    "Количество заявок",
    "Стоимость заявки",
    "Количество целевых заявок",
    "Процент дозвона",
    "Количество консультаций",
    "Продажи",
    "Стоимость продажи",
    "Средний чек",
    "Выручка",
    "Прибыль",
    "ROMI",
  ],
};

const WEBINAR: FunnelTypeTemplate = {
  id: "webinar",
  name: "Вебинарная воронка",
  description:
    "Регистрация на вебинар → доходимость → продающий блок → заявка/покупка → дожим.",
  exampleFlow: "трафик → регистрация → доходимость → просмотр → заявка → продажа",
  requiredStages: [
    { id: "traffic", label: "Трафик" },
    { id: "click", label: "Клик" },
    { id: "registration", label: "Регистрация" },
    { id: "confirmation", label: "Подтверждение регистрации" },
    { id: "attendance", label: "Доходимость на вебинар" },
    { id: "retention", label: "Удержание на вебинаре" },
    { id: "selling_block", label: "Просмотр продающего блока" },
    { id: "webinar_lead", label: "Заявка / покупка с вебинара" },
    { id: "followup", label: "Дожим после вебинара" },
    { id: "sale", label: "Продажа / оплата" },
  ],
  optionalStages: [],
  requiredMetrics: [
    ...TRAFFIC_METRICS(),
    ...CLICK_METRICS(),
    m("registration", "Регистрации", "шт", "higher_better", true, 5),
    m("registration", "Конверсия страницы в регистрацию", "%", "higher_better", true, 5),
    m("registration", "Стоимость регистрации", "₽", "lower_better", true, 5),
    m("attendance", "Количество пришедших", "шт", "higher_better", true, 5),
    m("attendance", "Процент доходимости", "%", "higher_better", true, 5),
    m("attendance", "Стоимость участника вебинара", "₽", "lower_better", true, 4),
    m("retention", "Среднее время просмотра", "мин", "higher_better", false, 3),
    m("selling_block", "Процент досмотра до продающего блока", "%", "higher_better", true, 4),
    m("webinar_lead", "Заявки с вебинара", "шт", "higher_better", true, 5),
    m("webinar_lead", "Конверсия участника в заявку", "%", "higher_better", true, 5),
    m("followup", "Продажи после дожима", "шт", "higher_better", true, 4),
    m("sale", "Общая конверсия регистрации в продажу", "%", "higher_better", true, 5),
    ...SALE_METRICS(),
  ],
  optionalMetrics: [
    m("retention", "Активность в чате", "шт", "higher_better", false, 2),
  ],
  requiredMaterials: WEBINAR_MATERIAL_LABELS,
  auditQuestions: {
    registration: ["Цепляет ли тема?", "Понятно ли обещание результата?"],
    attendance: ["Есть ли серия напоминаний?", "Есть ли бонус за присутствие?"],
    retention: ["Сильны ли первые 5 минут?", "Нет ли длинного вступления?"],
    selling_block: ["Связан ли оффер с содержанием?", "Есть ли дедлайн?"],
    followup: ["Есть ли сегментация по поведению?", "Дожим для досмотревших?"],
  },
  commonBottlenecks: [
    "Тема вебинара не цепляет",
    "Высокая стоимость регистрации",
    "Низкая доходимость",
    "Люди уходят до продающего блока",
    "Слабый дожим после эфира",
  ],
  hypothesisDirections: dirs(
    [
      "стоимость регистрации",
      [
        {
          change: "Переписать тему и первый экран регистрации",
          rationale: "Сильное обещание снижает CPL регистрации",
          materialsToChange: ["Страница регистрации", "Тема вебинара"],
          testMethod: "A/B двух тем",
          complexity: 2,
          impact: 5,
          confidence: 4,
          ease: 4,
        },
      ],
    ],
    [
      "процент доходимости",
      [
        {
          change: "Серия напоминаний + бонус за присутствие",
          rationale: "Повышает мотивацию прийти",
          materialsToChange: ["Письма до вебинара", "Сообщения"],
          testMethod: "Сравнить доходимость когорт",
          complexity: 2,
          impact: 4,
          confidence: 4,
          ease: 4,
        },
      ],
    ],
    [
      "конверсия участника в заявку",
      [
        {
          change: "Пересобрать продающий блок с мостом от контента",
          rationale: "Оффер должен логично следовать из ценности эфира",
          materialsToChange: ["Сценарий", "Продающий блок"],
          testMethod: "Сравнить CR на следующем эфире",
          complexity: 3,
          impact: 5,
          confidence: 3,
          ease: 3,
        },
      ],
    ],
  ),
  bottleneckMetricNames: [
    "Стоимость регистрации",
    "Процент доходимости",
    "Процент досмотра до продающего блока",
    "Конверсия участника в заявку",
    "Общая конверсия регистрации в продажу",
  ],
  planFactMetrics: [
    "Рекламный бюджет",
    "Клики",
    "Регистрации",
    "Стоимость регистрации",
    "Процент доходимости",
    "Количество пришедших",
    "Процент досмотра до продающего блока",
    "Заявки с вебинара",
    "Продажи",
    "Средний чек",
    "Выручка",
    "Прибыль",
    "ROAS",
  ],
};

function buildType(
  id: FunnelTypeId,
  name: string,
  description: string,
  exampleFlow: string,
  stages: FunnelStageDefinition[],
  metrics: FunnelTypeMetricTemplate[],
  materials: string[],
  bottlenecks: string[],
  bottleneckNames: string[],
  planFact: string[],
  hypothesisDirections: HypothesisDirectionsMap = {},
): FunnelTypeTemplate {
  return {
    id,
    name,
    description,
    exampleFlow,
    requiredStages: stages,
    optionalStages: [],
    requiredMetrics: metrics,
    optionalMetrics: [],
    requiredMaterials: materials,
    auditQuestions: Object.fromEntries(stages.slice(0, 4).map((s) => [s.id, [`Проверить этап «${s.label}»`]])),
    commonBottlenecks: bottlenecks,
    hypothesisDirections,
    bottleneckMetricNames: bottleneckNames,
    planFactMetrics: planFact,
  };
}

const CONSULTATION = buildType(
  "consultation",
  "Воронка консультации / диагностики / разбора",
  "Запись на бесплатную или платную консультацию, диагностику, разбор.",
  "трафик → страница разбора → заявка → квалификация → созвон → продажа",
  [
    { id: "traffic", label: "Трафик" },
    { id: "landing", label: "Посадочная" },
    { id: "consultation_lead", label: "Заявка на консультацию" },
    { id: "qualification", label: "Квалификация" },
    { id: "confirmation", label: "Подтверждение времени" },
    { id: "attendance", label: "Доходимость на консультацию" },
    { id: "consultation", label: "Проведение консультации" },
    { id: "offer", label: "Коммерческое предложение" },
    { id: "sale", label: "Продажа" },
  ],
  [
    m("consultation_lead", "Стоимость заявки на консультацию", "₽", "lower_better", true, 5),
    m("landing", "Конверсия страницы в заявку", "%", "higher_better", true, 5),
    m("qualification", "Доля квалифицированных заявок", "%", "higher_better", true, 4),
    m("confirmation", "Процент подтверждения", "%", "higher_better", true, 4),
    m("attendance", "Доходимость на консультацию", "%", "higher_better", true, 5),
    m("consultation", "Конверсия консультации в продажу", "%", "higher_better", true, 5),
    m("sale", "Стоимость продажи", "₽", "lower_better", true, 5),
    ...SALE_METRICS(),
  ],
  ["Страница записи", "Оффер консультации", "Анкета", "Скрипт квалификации", "Скрипт консультации", "КП", "Кейсы", "Отзывы"],
  ["Непонятно, зачем идти на консультацию", "Много нецелевых заявок", "Люди не доходят до созвона", "Эксперт мало продаёт"],
  ["Стоимость заявки на консультацию", "Доходимость на консультацию", "Конверсия консультации в продажу", "Средний чек"],
  ["Стоимость заявки на консультацию", "Доходимость", "Конверсия консультации в продажу", "Выручка", "Прибыль"],
  dirs(["конверсия страницы в заявку", [{ change: "Переупаковать консультацию как конкретный результат", rationale: "Снимает страх «просто продажа»", materialsToChange: ["Страница записи"], testMethod: "A/B оффера", complexity: 2, impact: 4, confidence: 4, ease: 4 }]]),
);

const PRODUCT_DELIVERY = buildType(
  "product_delivery",
  "Воронка товарного продукта с доставкой",
  "Физический товар: заявка → подтверждение → отправка → выкуп.",
  "трафик → лендинг → заявка → подтверждение → отправка → выкуп",
  [
    { id: "traffic", label: "Трафик" },
    { id: "click", label: "Клик" },
    { id: "landing", label: "Лендинг / карточка" },
    { id: "order", label: "Заявка / заказ" },
    { id: "confirmation", label: "Подтверждение заказа" },
    { id: "shipping", label: "Отправка" },
    { id: "delivery", label: "Доставка" },
    { id: "buyout", label: "Выкуп" },
    { id: "repeat", label: "Повторная продажа" },
  ],
  [
    ...TRAFFIC_METRICS(),
    ...CLICK_METRICS(),
    m("order", "Конверсия в заказ", "%", "higher_better", true, 5),
    m("order", "Стоимость заказа", "₽", "lower_better", true, 5),
    m("confirmation", "Процент подтверждения заказа", "%", "higher_better", true, 4),
    m("buyout", "Процент выкупа", "%", "higher_better", true, 5),
    m("buyout", "Процент возвратов", "%", "lower_better", true, 3),
    m("sale", "Средний чек", "₽", "higher_better", true, 5),
    m("sale", "Маржа", "%", "higher_better", true, 5),
    ...SALE_METRICS(),
  ],
  ["Лендинг товара", "Креативы", "Фото/видео", "Отзывы", "Скрипт подтверждения", "Условия доставки"],
  ["Креатив обещает больше, чем товар", "Высокий невыкуп", "Слабое подтверждение заказа"],
  ["Стоимость заказа", "Процент подтверждения заказа", "Процент выкупа", "Средний чек", "ROAS"],
  ["Рекламный бюджет", "Заявки", "Стоимость заказа", "Подтверждения", "Выкупы", "Процент выкупа", "Выручка", "Прибыль", "ROAS"],
  dirs(["процент выкупа", [{ change: "WhatsApp/SMS до доставки + предоплата", rationale: "Снижает тревогу и фильтрует слабые заказы", materialsToChange: ["Сообщения до доставки"], testMethod: "Когорты с/без серии", complexity: 3, impact: 5, confidence: 3, ease: 3 }]]),
);

const ONLINE_COURSE = buildType(
  "online_course",
  "Воронка онлайн-курса / наставничества",
  "Образовательный продукт: прогрев → продажное событие → оплата.",
  "трафик → прогрев → событие → заявка → оплата",
  [
    { id: "traffic", label: "Трафик" },
    { id: "subscribe", label: "Подписка / регистрация" },
    { id: "warmup", label: "Прогрев" },
    { id: "sales_event", label: "Продажное событие" },
    { id: "lead", label: "Заявка" },
    { id: "sale", label: "Продажа" },
    { id: "payment", label: "Оплата" },
    { id: "start", label: "Старт обучения" },
    { id: "completion", label: "Дошедшие до результата" },
  ],
  [
    m("subscribe", "Стоимость регистрации / заявки", "₽", "lower_better", true, 4),
    m("warmup", "Вовлечённость в прогрев", "%", "higher_better", false, 3),
    m("lead", "Заявки на программу", "шт", "higher_better", true, 4),
    m("sale", "Конверсия заявки в оплату", "%", "higher_better", true, 5),
    m("payment", "Доля рассрочек", "%", "range", false, 3),
    m("completion", "Завершение программы", "%", "higher_better", false, 4),
    m("sale", "LTV", "₽", "higher_better", false, 5),
    ...SALE_METRICS(),
  ],
  ["Страница программы", "Прогрев", "Вебинар", "Оффер", "Тарифы", "Кейсы", "Скрипт продаж"],
  ["Аудитория не понимает ценность", "Мало оплат после заявок", "Слабое закрытие на созвоне"],
  ["Конверсия заявки в оплату", "Средний чек", "LTV"],
  ["Стоимость заявки", "Заявки", "Конверсия в оплату", "Средний чек", "Выручка", "LTV"],
);

const SUBSCRIPTION = buildType(
  "subscription",
  "Воронка подписки / клуба",
  "Регулярная подписка, клуб, комьюнити.",
  "трафик → оффер подписки → первый платёж → удержание → продление",
  [
    { id: "traffic", label: "Трафик" },
    { id: "sub_page", label: "Страница подписки" },
    { id: "registration", label: "Регистрация / первый платёж" },
    { id: "activation", label: "Активация" },
    { id: "first_use", label: "Первое использование" },
    { id: "retention", label: "Удержание" },
    { id: "renewal", label: "Продление" },
    { id: "churn", label: "Отток" },
    { id: "reactivation", label: "Реактивация" },
  ],
  [
    m("registration", "Стоимость платного подписчика", "₽", "lower_better", true, 5),
    m("registration", "Конверсия в первый платёж", "%", "higher_better", true, 5),
    m("activation", "Activation rate", "%", "higher_better", true, 5),
    m("retention", "Retention", "%", "higher_better", true, 5),
    m("churn", "Churn rate", "%", "lower_better", true, 5),
    m("renewal", "MRR", "₽", "higher_better", true, 5),
    m("renewal", "ARPU", "₽", "higher_better", true, 4),
    m("renewal", "LTV", "₽", "higher_better", true, 5),
  ],
  ["Страница клуба", "Онбординг", "Контент внутри", "Сообщения о продлении"],
  ["Слабый первый опыт", "Нет привычки пользоваться", "Слабое удержание"],
  ["Стоимость платного подписчика", "Activation rate", "Retention", "Churn rate", "LTV"],
  ["Стоимость подписчика", "Activation", "Retention", "Churn", "MRR", "LTV"],
);

const QUIZ = buildType(
  "quiz",
  "Воронка через квиз",
  "Опрос → результат → заявка → продажа.",
  "трафик → квиз → результат → заявка → звонок → продажа",
  [
    { id: "traffic", label: "Трафик" },
    { id: "click", label: "Клик" },
    { id: "quiz_start", label: "Первый экран квиза" },
    { id: "quiz_session", label: "Старт квиза" },
    { id: "quiz_progress", label: "Прохождение вопросов" },
    { id: "quiz_complete", label: "Завершение квиза" },
    { id: "result", label: "Получение результата" },
    { id: "lead", label: "Заявка" },
    { id: "call", label: "Звонок" },
    { id: "sale", label: "Продажа" },
  ],
  [
    ...TRAFFIC_METRICS(),
    ...CLICK_METRICS(),
    m("quiz_session", "Конверсия в старт квиза", "%", "higher_better", true, 4),
    m("quiz_complete", "Процент завершения", "%", "higher_better", true, 5),
    m("result", "Конверсия результата в заявку", "%", "higher_better", true, 5),
    m("lead", "Стоимость заявки", "₽", "lower_better", true, 5),
    m("qualification", "Качество заявки", "%", "higher_better", true, 4),
    m("sale", "Конверсия заявки в продажу", "%", "higher_better", true, 5),
    m("sale", "Стоимость продажи", "₽", "lower_better", true, 5),
  ],
  ["Первый экран квиза", "Вопросы", "Экран результата", "Оффер после квиза", "Форма заявки", "Скрипт звонка"],
  ["Слабая мотивация начать", "Слишком много вопросов", "Результат не ведёт к заявке"],
  ["Конверсия в старт квиза", "Процент завершения", "Конверсия результата в заявку", "Качество заявки"],
  ["CTR", "Старт квиза", "Завершение", "Заявки", "Стоимость заявки", "Продажи", "ROAS"],
  dirs(["конверсия результата в заявку", [{ change: "Сделать результат персональным + логичный CTA", rationale: "Заявка как продолжение диагностики", materialsToChange: ["Экран результата"], testMethod: "A/B экранов", complexity: 2, impact: 5, confidence: 4, ease: 4 }]]),
);

const TELEGRAM_BOT = buildType(
  "telegram_bot",
  "Воронка через Telegram-бота / автоворонку",
  "Подписка в бот → прогрев → CTA → заявка/оплата.",
  "трафик → бот → прогрев → CTA → заявка",
  [
    { id: "traffic", label: "Трафик" },
    { id: "bot_entry", label: "Переход в бот" },
    { id: "subscribe", label: "Подписка" },
    { id: "first_message", label: "Первое сообщение" },
    { id: "warmup_series", label: "Прогревочная серия" },
    { id: "content_view", label: "Просмотр контента" },
    { id: "cta_click", label: "Kлик по CTA" },
    { id: "lead", label: "Заявка / оплата" },
    { id: "followup", label: "Дожим" },
    { id: "sale", label: "Продажа" },
  ],
  [
    m("bot_entry", "Стоимость перехода в бот", "₽", "lower_better", true, 4),
    m("subscribe", "Конверсия перехода в подписку", "%", "higher_better", true, 4),
    m("warmup_series", "Open rate сообщений", "%", "higher_better", true, 4),
    m("cta_click", "Click rate", "%", "higher_better", true, 4),
    m("lead", "Конверсия подписчика в заявку", "%", "higher_better", true, 5),
    m("sale", "Конверсия подписчика в продажу", "%", "higher_better", true, 5),
    m("subscribe", "Отписки", "%", "lower_better", false, 3),
    ...SALE_METRICS(),
  ],
  ["Объявления", "Приветствие бота", "Цепочка сообщений", "CTA", "Оффер", "Дожим"],
  ["Слабое первое сообщение", "Низкие открытия", "Оффер теряется в контенте"],
  ["Конверсия подписчика в заявку", "Open rate", "Click rate", "ROAS"],
  ["Переходы в бот", "Подписки", "Open rate", "Заявки", "Продажи", "ROAS"],
);

const OFFLINE_VISIT = buildType(
  "offline_visit",
  "Воронка офлайн-записи / визита",
  "Запись на визит в клинику, салон, офис.",
  "трафик → сайт → запись → подтверждение → визит → продажа",
  [
    { id: "traffic", label: "Трафик" },
    { id: "click", label: "Клик" },
    { id: "entry", label: "Сайт / карточка" },
    { id: "booking", label: "Запись" },
    { id: "confirmation", label: "Подтверждение" },
    { id: "attendance", label: "Доходимость" },
    { id: "visit", label: "Офлайн-визит" },
    { id: "sale", label: "Продажа / услуга" },
    { id: "repeat_visit", label: "Повторный визит" },
  ],
  [
    m("booking", "Стоимость записи", "₽", "lower_better", true, 5),
    ...TRAFFIC_METRICS(),
    ...CLICK_METRICS(),
    m("entry", "Конверсия в запись", "%", "higher_better", true, 5),
    m("confirmation", "Процент подтверждения", "%", "higher_better", true, 4),
    m("attendance", "Доходимость", "%", "higher_better", true, 5),
    m("visit", "Конверсия визита в оплату", "%", "higher_better", true, 5),
    m("sale", "Средний чек", "₽", "higher_better", true, 5),
    m("repeat_visit", "Повторные визиты", "%", "higher_better", false, 4),
    m("repeat_visit", "LTV", "₽", "higher_better", false, 5),
  ],
  ["Сайт / карточка", "Фото места", "Отзывы", "Форма записи", "Напоминания", "Скрипт администратора"],
  ["Мало доверия к месту", "Человек забывает прийти", "Слабая продажа на месте"],
  ["Стоимость записи", "Доходимость", "Конверсия визита в оплату", "LTV"],
  ["Стоимость записи", "Записи", "Доходимость", "Визиты", "Средний чек", "LTV"],
);

const CUSTOM: FunnelTypeTemplate = {
  id: "custom",
  name: "Кастомная воронка",
  description: "Нестандартная логика продаж — соберите этапы вручную.",
  exampleFlow: "настраивается пользователем",
  requiredStages: [
    { id: "traffic", label: "Источник трафика" },
    { id: "entry", label: "Точка входа" },
    { id: "target_action", label: "Целевое действие" },
    { id: "sale_point", label: "Точка продажи" },
    { id: "money", label: "Финансовый результат" },
  ],
  optionalStages: [],
  requiredMetrics: [
    m("traffic", "Рекламный бюджет", "₽", "range", true, 4),
    m("entry", "Посетители / входы", "шт", "higher_better", true, 3),
    m("target_action", "Целевые действия", "шт", "higher_better", true, 5),
    m("sale_point", "Продажи", "шт", "higher_better", true, 5),
    m("money", "Выручка", "₽", "higher_better", true, 5),
    m("money", "Прибыль", "₽", "higher_better", true, 5),
  ],
  optionalMetrics: [],
  requiredMaterials: ["Точка входа", "Оффер", "Скрипт / процесс продажи"],
  auditQuestions: {},
  commonBottlenecks: ["Не определена точка продажи", "Нет финансовой метрики"],
  hypothesisDirections: {},
  bottleneckMetricNames: ["Целевые действия", "Продажи", "Выручка", "Прибыль"],
  planFactMetrics: ["Рекламный бюджет", "Целевые действия", "Продажи", "Выручка", "Прибыль"],
};

export const FUNNEL_TYPE_CATALOG: FunnelTypeTemplate[] = [
  SERVICE_LEAD,
  WEBINAR,
  CONSULTATION,
  PRODUCT_DELIVERY,
  ONLINE_COURSE,
  SUBSCRIPTION,
  QUIZ,
  TELEGRAM_BOT,
  OFFLINE_VISIT,
  CUSTOM,
];

export function getFunnelTypeTemplate(id: FunnelTypeId | null | undefined): FunnelTypeTemplate {
  return FUNNEL_TYPE_CATALOG.find((t) => t.id === id) ?? SERVICE_LEAD;
}

export function getAllStagesForType(type: FunnelTypeTemplate): FunnelStageDefinition[] {
  return [...type.requiredStages, ...type.optionalStages];
}

export function getStageLabel(type: FunnelTypeTemplate, stageId: string): string {
  return getAllStagesForType(type).find((s) => s.id === stageId)?.label ?? stageId;
}

export function suggestFunnelTypeFromQuiz(answers: {
  firstAction: string;
  salePoint: string;
  moneyEvent: string;
}): FunnelTypeId {
  const { firstAction, salePoint, moneyEvent } = answers;

  if (firstAction === "quiz") return "quiz";
  if (firstAction === "bot") return "telegram_bot";
  if (firstAction === "visit") return "offline_visit";
  if (firstAction === "register" && salePoint === "webinar") return "webinar";
  if (firstAction === "register") return "subscription";
  if (firstAction === "buy" && moneyEvent === "buyout") return "product_delivery";
  if (salePoint === "webinar") return "webinar";
  if (salePoint === "offline") return "offline_visit";
  if (salePoint === "delivery") return "product_delivery";
  if (salePoint === "messenger") return "telegram_bot";
  if (moneyEvent === "subscription" || moneyEvent === "renewal") return "subscription";
  if (firstAction === "register" && moneyEvent === "payment") return "online_course";
  if (firstAction === "lead" && (salePoint === "call" || salePoint === "site")) {
    if (moneyEvent === "visit") return "consultation";
    return "service_lead";
  }
  return "service_lead";
}
