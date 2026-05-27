import { getFunnelTypeTemplate } from "@/data/funnelTypes/catalog";
import type { FunnelTypeId } from "@/types/funnelType";
import { splitLandingUrls } from "@/utils/landingUrls";
import type { QuizQuestion, QuizStepConfig } from "../types";
import { FOCUS_QUIZ } from "./focusQuiz";

type QuestionPatch = Partial<
  Pick<QuizQuestion, "title" | "subtitle" | "placeholder" | "hint" | "examples" | "required">
>;

const PATCHES: Partial<Record<FunnelTypeId, Partial<Record<string, QuestionPatch>>>> = {
  webinar: {
    landingUrl: {
      title: "Ссылка на страницу регистрации",
      subtitle: "Куда ведёт реклама — reg page, не страница продажи.",
      placeholder: "https://site.ru/webinar-reg",
      examples: ["https://site.ru/reg", "https://getcourse.ru/pl/webinar"],
      urlFields: 1,
    },
    funnelGoal: {
      title: "Главная цель на этом этапе?",
      subtitle: "Для вебинарной воронки здесь обычно регистрация, не покупка.",
      placeholder: "Регистрация на вебинар",
      examples: ["Запись на эфир", "Регистрация + напоминание в мессенджер"],
    },
    averagePrice: {
      subtitle: "Цена основного продукта после вебинара — не стоимость регистрации.",
    },
  },
  online_course: {
    landingUrl: {
      title: "Ссылка на страницу записи / триала",
      subtitle: "Страница, куда попадает человек из рекламы или контента.",
      placeholder: "https://school.ru/start",
      urlFields: 1,
    },
    funnelGoal: {
      placeholder: "Запись на бесплатный урок или триал",
      examples: ["Регистрация на вебинар", "Старт бесплатного модуля"],
    },
  },
  telegram_bot: {
    trafficSource: {
      subtitle: "Откуда люди попадают в бота — реклама, контент, партнёры.",
      examples: ["Таргет VK → бот", "YouTube → ссылка в описании", "Рассылка по базе"],
    },
    landingUrl: {
      title: "Ссылка на бота или посадочную",
      subtitle: "t.me/… или страница с кнопкой «Открыть в Telegram».",
      placeholder: "https://t.me/your_bot?start=utm",
      urlFields: 1,
    },
    funnelGoal: {
      placeholder: "Подписка и прохождение первого шага в боте",
      examples: ["Старт сценария в боте", "Подписка + первое целевое действие"],
    },
  },
  quiz: {
    landingUrl: {
      title: "Ссылка на квиз / опрос",
      subtitle: "Страница с первым вопросом или лид-формой перед результатом.",
      placeholder: "https://site.ru/quiz",
      urlFields: 1,
    },
    funnelGoal: {
      placeholder: "Прохождение квиза до результата",
      examples: ["Завершить квиз", "Получить результат + оставить контакт"],
    },
  },
  offline_visit: {
    landingUrl: {
      title: "Ссылка на запись или сайт точки",
      subtitle: "Онлайн-запись, карта, форма бронирования.",
      placeholder: "https://clinic.ru/book",
      urlFields: 1,
    },
    funnelGoal: {
      placeholder: "Запись на визит или консультацию",
      examples: ["Запись на приём", "Бронь слота в календаре"],
    },
  },
  product_delivery: {
    funnelGoal: {
      subtitle: "Что считаем успехом до оплаты: заказ, корзина, выкуп.",
      placeholder: "Оформленный заказ",
    },
    landingUrl: {
      title: "Ссылки на страницы клип-ленда или каталог",
      subtitle: "До 4 страниц — карточка, категория, главная магазина. По одной ссылке на поле.",
      urlFields: 4,
      urlFieldLabels: ["Страница 1", "Страница 2", "Страница 3", "Страница 4"],
    },
  },
  subscription: {
    funnelGoal: {
      placeholder: "Оформление подписки или триала",
      examples: ["Старт trial", "Первый платёж по подписке"],
    },
  },
  content_marketing: {
    trafficSource: {
      subtitle: "Органика, SEO, блог, YouTube — главный источник прогрева.",
      examples: ["SEO-статьи", "YouTube", "Email-цепочка"],
    },
    funnelGoal: {
      placeholder: "Подписка на контент или переход к офферу",
    },
  },
};

export function getFocusQuizForType(typeId: FunnelTypeId | null | undefined): QuizStepConfig {
  if (!typeId) return FOCUS_QUIZ;

  const template = getFunnelTypeTemplate(typeId);
  const patches = PATCHES[typeId];

  const questions = FOCUS_QUIZ.questions.map((q) => ({
    ...q,
    ...(patches?.[q.id] ?? {}),
  }));

  return {
    ...FOCUS_QUIZ,
    intro: `Вопросы под «${template.name}» — только то, что важно для этого формата. Прогресс сохранится автоматически.`,
    questions,
  };
}

export function focusRequiredIdsForType(typeId: FunnelTypeId | null | undefined): string[] {
  const config = getFocusQuizForType(typeId);
  return config.questions.filter((q) => q.required).map((q) => q.id);
}

export function isFocusComplete(
  funnel: Pick<
    import("@/types/funnel").Funnel,
    | "funnelTypeId"
    | "productName"
    | "productDescription"
    | "trafficSource"
    | "landingUrl"
    | "funnelGoal"
  >,
): boolean {
  if (!funnel.funnelTypeId) return false;
  const ids = focusRequiredIdsForType(funnel.funnelTypeId);
  const values: Record<string, string> = {
    productName: funnel.productName,
    productDescription: funnel.productDescription,
    trafficSource: funnel.trafficSource,
    landingUrl: splitLandingUrls(funnel.landingUrl)[0] ?? "",
    funnelGoal: funnel.funnelGoal,
  };
  return ids.every((id) => {
    if (id === "landingUrl") return splitLandingUrls(funnel.landingUrl).length > 0;
    return (values[id] ?? "").trim().length > 0;
  });
}
