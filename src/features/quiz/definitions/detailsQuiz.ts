import type { QuizStepConfig } from "../types";

/** Ключевые поля details — не все 20+, а то, что реально влияет на диагностику. */
export const DETAILS_QUIZ: QuizStepConfig = {
  wizardStepId: "details",
  label: "Данные о воронке",
  intro:
    "Ещё несколько вопросов — помогут точнее считать метрики и генерировать гипотезы. Не знаете ответ — нажмите «Пропустить».",
  questions: [
    {
      id: "whatWeSell",
      section: "Продукт",
      title: "Что продаём — развёрнуто",
      placeholder: "Пакет «Старт»: 8 занятий + чат с куратором",
      multiline: true,
      hint: "Если уже описали на шаге «Фокус» — можно дополнить деталями.",
    },
    {
      id: "price",
      section: "Продукт",
      title: "Актуальная цена",
      placeholder: "49 900 ₽ / рассрочка 4 990 × 12",
    },
    {
      id: "mainResult",
      section: "Продукт",
      title: "Главный результат для клиента",
      placeholder: "Снимает боль в спине за 3 недели без операции",
      multiline: true,
      hint: "Обещание, за которое платят — не процесс, а исход.",
    },
    {
      id: "whoBuys",
      section: "Аудитория",
      title: "Кто реально покупает?",
      placeholder: "Не «все 25–45», а кто уже платил",
      multiline: true,
    },
    {
      id: "painOrTask",
      section: "Аудитория",
      title: "Главная боль или задача",
      placeholder: "Не могу найти нормального специалиста / хочу сменить профессию",
      multiline: true,
    },
    {
      id: "whyChooseUs",
      section: "Аудитория",
      title: "Почему выбирают вас, а не альтернативу?",
      placeholder: "15 лет опыта, гарантия возврата, лицензия…",
      multiline: true,
    },
    {
      id: "afterLead",
      section: "Процесс",
      title: "Что происходит после заявки?",
      placeholder: "Менеджер звонит за 5 мин → квалификация → запись",
      multiline: true,
      hint: "Цепочка касаний до следующего шага воронки.",
    },
    {
      id: "whoHandles",
      section: "Процесс",
      title: "Кто обрабатывает заявки?",
      placeholder: "2 менеджера в CRM, скрипт на Google Docs",
    },
    {
      id: "touchpointsToSale",
      section: "Процесс",
      title: "Сколько касаний до оплаты?",
      placeholder: "3–5: звонок → консультация → КП → оплата",
    },
    {
      id: "testBudget",
      section: "Ограничения",
      title: "Бюджет на тесты гипотез",
      placeholder: "50 000 ₽ / месяц или «только органика»",
      hint: "Помогает приоритизировать: быстрые тесты vs дорогие.",
    },
    {
      id: "forbiddenClaims",
      section: "Ограничения",
      title: "Что нельзя обещать в рекламе?",
      placeholder: "100% результат, «лучшие в городе» без доказательств",
      multiline: true,
    },
  ],
};

/** Маппинг id вопроса → поле в funnel. */
export const DETAILS_FIELD_MAP: Record<
  string,
  { group: "product" | "audience" | "funnel" | "constraints"; key: string }
> = {
  whatWeSell: { group: "product", key: "whatWeSell" },
  price: { group: "product", key: "price" },
  mainResult: { group: "product", key: "mainResult" },
  whoBuys: { group: "audience", key: "whoBuys" },
  painOrTask: { group: "audience", key: "painOrTask" },
  whyChooseUs: { group: "audience", key: "whyChooseUs" },
  afterLead: { group: "funnel", key: "afterLead" },
  whoHandles: { group: "funnel", key: "whoHandles" },
  touchpointsToSale: { group: "funnel", key: "touchpointsToSale" },
  testBudget: { group: "constraints", key: "testBudget" },
  forbiddenClaims: { group: "constraints", key: "forbiddenClaims" },
};
