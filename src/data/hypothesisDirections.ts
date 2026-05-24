/**
 * Библиотека направлений гипотез по проблемной метрике.
 * Ключ — нормализованное имя метрики; значение — список направлений-формулировок.
 * Используется для генерации `Hypothesis` под конкретный `FunnelMetric`.
 */

export type HypothesisDirection = {
  /** Что меняем — кратко. */
  change: string;
  /** Почему это должно сработать. */
  rationale: string;
  /** Какие материалы предположительно нужно править. */
  materialsToChange: string[];
  /** Метод проверки. */
  testMethod: string;
  /** Сложность 1..5. */
  complexity: number;
  /** Базовый impact (1..5) — переопределяется метрикой. */
  impact: number;
  /** Уверенность 1..5. */
  confidence: number;
  /** Простота 1..5. */
  ease: number;
};

/** Нормализуем имя метрики для матчинга. */
export function normalizeMetricKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const DIRECTIONS: Record<string, HypothesisDirection[]> = {
  ctr: [
    {
      change: "переписать заголовок и первую строку креатива под главную боль сегмента (не «мы лучшие», а «результат за N дней»)",
      rationale:
        "В холодном трафике CTR растёт, когда обещание совпадает с задачей аудитории и отличается от конкурентов. Сейчас креатив часто слишком общий.",
      materialsToChange: ["Рекламные креативы", "Тексты объявлений", "Заголовки"],
      testMethod: "A/B: 2 заголовка × 2 визуала, минимум 500–1000 кликов на вариант или 5–7 дней",
      complexity: 2,
      impact: 4,
      confidence: 4,
      ease: 4,
    },
    {
      change: "Добавить конкретику в первое обещание (цифра, срок, результат)",
      rationale: "Конкретика повышает релевантность и CTR в холодных аудиториях",
      materialsToChange: ["Тексты объявлений"],
      testMethod: "A/B-тест двух вариантов объявления",
      complexity: 1,
      impact: 3,
      confidence: 4,
      ease: 5,
    },
    {
      change: "Сменить визуал/формат (статика → видео-сценарий)",
      rationale: "Видео-сценарий лучше доносит механику и повышает CTR",
      materialsToChange: ["Креативы", "Сценарии Reels/Shorts"],
      testMethod: "Параллельная кампания со старым и новым форматом",
      complexity: 3,
      impact: 4,
      confidence: 3,
      ease: 3,
    },
  ],
  cpc: [
    {
      change: "Сузить аудиторию до самого качественного сегмента",
      rationale: "Релевантность объявления растёт → стоимость клика падает",
      materialsToChange: ["Настройки кампании"],
      testMethod: "Дублировать кампанию с узким сегментом, сравнить CPC за 7 дней",
      complexity: 2,
      impact: 4,
      confidence: 3,
      ease: 4,
    },
    {
      change: "Добавить минус-слова и почистить запросы",
      rationale: "Меньше нерелевантных показов — выше качество и ниже CPC",
      materialsToChange: ["Настройки кампании"],
      testMethod: "Сравнить CPC до/после за неделю",
      complexity: 1,
      impact: 3,
      confidence: 4,
      ease: 5,
    },
  ],
  "конверсия из клика в заявку": [
    {
      change: "Переписать первый экран под конкретную боль сегмента",
      rationale: "За первые 3–5 секунд пользователь должен узнать себя и результат",
      materialsToChange: ["Лендинг: hero", "Заголовки", "CTA"],
      testMethod: "A/B-тест первого экрана, минимум 1000 визитов на вариант",
      complexity: 3,
      impact: 5,
      confidence: 4,
      ease: 3,
    },
    {
      change: "Снять риск: добавить блок «что будет после заявки»",
      rationale: "Снижает страх перед формой и поднимает CR в заявку",
      materialsToChange: ["Лендинг: блок «что после заявки»"],
      testMethod: "A/B-тест с новым блоком над формой",
      complexity: 2,
      impact: 4,
      confidence: 4,
      ease: 4,
    },
    {
      change: "Упростить форму: убрать необязательные поля",
      rationale: "Меньше трения → выше конверсия формы",
      materialsToChange: ["Форма лендинга"],
      testMethod: "A/B-тест короткой и длинной формы",
      complexity: 1,
      impact: 4,
      confidence: 5,
      ease: 5,
    },
    {
      change: "Усилить доказательства: кейсы, отзывы, цифры результата",
      rationale: "Снимает основные сомнения перед заявкой",
      materialsToChange: ["Блок «кейсы»", "Блок «отзывы»"],
      testMethod: "Добавить блок и сравнить CR на новом потоке",
      complexity: 2,
      impact: 4,
      confidence: 3,
      ease: 4,
    },
  ],
  "стоимость заявки": [
    {
      change: "Снизить CPL через сужение аудитории и улучшение креатива",
      rationale: "CPL = CPC / CR. Чистим самые слабые связки",
      materialsToChange: ["Креативы", "Настройки кампании"],
      testMethod: "Параллельные кампании, сравнение CPL за 7 дней",
      complexity: 3,
      impact: 5,
      confidence: 3,
      ease: 3,
    },
    {
      change: "Перераспределить бюджет на лучшие связки объявление-лендинг",
      rationale: "Сильные связки масштабируются дешевле",
      materialsToChange: ["Структура кампаний"],
      testMethod: "Срез по связкам за 14 дней, отключить слабые",
      complexity: 2,
      impact: 4,
      confidence: 4,
      ease: 4,
    },
  ],
  "доля целевых заявок": [
    {
      change: "Добавить квалифицирующий квиз перед формой",
      rationale: "Отсекает нецелевых на этапе формы",
      materialsToChange: ["Лендинг", "Квиз-форма"],
      testMethod: "A/B-тест: форма vs квиз → форма",
      complexity: 3,
      impact: 4,
      confidence: 3,
      ease: 3,
    },
    {
      change: "Вынести цену/якорь на первый экран",
      rationale: "Снижает поток заявок «уточнить, сколько стоит»",
      materialsToChange: ["Первый экран"],
      testMethod: "A/B-тест с ценой и без",
      complexity: 2,
      impact: 3,
      confidence: 4,
      ease: 4,
    },
    {
      change: "Уточнить оффер под целевой сегмент",
      rationale: "Точное обещание = меньше нецелевых",
      materialsToChange: ["Оффер", "Объявления"],
      testMethod: "Запуск кампании только на целевой сегмент",
      complexity: 2,
      impact: 4,
      confidence: 3,
      ease: 3,
    },
  ],
  "процент дозвона": [
    {
      change: "SMS/WhatsApp подтверждение сразу после заявки",
      rationale: "Клиент готов к звонку → процент дозвона выше",
      materialsToChange: ["Авто-сообщение после формы"],
      testMethod: "Сравнить % дозвона до/после за 14 дней",
      complexity: 2,
      impact: 4,
      confidence: 4,
      ease: 4,
    },
    {
      change: "Сократить время первого касания до 5 минут",
      rationale: "Скорость = сильный фактор дозвона",
      materialsToChange: ["Регламент менеджеров"],
      testMethod: "Замер времени и % дозвона до/после",
      complexity: 2,
      impact: 4,
      confidence: 4,
      ease: 3,
    },
    {
      change: "Добавить серию из 3 попыток в разное время",
      rationale: "Клиенты ловятся в разные часы",
      materialsToChange: ["Регламент менеджеров"],
      testMethod: "Включить регламент, замерить % дозвона",
      complexity: 2,
      impact: 3,
      confidence: 4,
      ease: 4,
    },
  ],
  "конверсия в продажу": [
    {
      change: "Внедрить структурированный скрипт с отработкой ТОП-3 возражений",
      rationale: "Системная отработка возражений = выше CR в продажу",
      materialsToChange: ["Скрипт менеджера", "Ответы на возражения"],
      testMethod: "A/B по менеджерам или периодам, замер 14 дней",
      complexity: 3,
      impact: 5,
      confidence: 3,
      ease: 3,
    },
    {
      change: "Добавить пакеты + рассрочку",
      rationale: "Якорь и снижение порога входа повышают продажи",
      materialsToChange: ["Оффер на консультации", "Презентация"],
      testMethod: "Внедрить и сравнить за 14 дней",
      complexity: 3,
      impact: 4,
      confidence: 3,
      ease: 3,
    },
    {
      change: "Усилить ценность на консультации (кейсы, гарантия)",
      rationale: "Снимает риск и поднимает доверие",
      materialsToChange: ["Презентация", "Скрипт"],
      testMethod: "Сравнить CR до/после внедрения",
      complexity: 2,
      impact: 4,
      confidence: 3,
      ease: 3,
    },
  ],
  "средний чек": [
    {
      change: "Ввести 3 тарифа: эконом / стандарт / премиум",
      rationale: "Якорь премиум поднимает выбор стандарт",
      materialsToChange: ["Тарифы", "Презентация"],
      testMethod: "Внедрить и сравнить чек 14 дней",
      complexity: 3,
      impact: 5,
      confidence: 3,
      ease: 3,
    },
    {
      change: "Добавить апсейл/допродажу на консультации",
      rationale: "Прямое поднятие чека без новых клиентов",
      materialsToChange: ["Скрипт"],
      testMethod: "A/B по менеджерам, замер AOV",
      complexity: 2,
      impact: 4,
      confidence: 3,
      ease: 4,
    },
  ],
  "процент выкупа": [
    {
      change: "Внедрить предоплату или подтверждение заказа в WhatsApp",
      rationale: "Подтверждение фильтрует слабые заказы и поднимает выкуп",
      materialsToChange: ["Авто-сообщения после заказа"],
      testMethod: "Сравнить выкуп до/после 14 дней",
      complexity: 3,
      impact: 5,
      confidence: 3,
      ease: 3,
    },
    {
      change: "Серия касаний до доставки: ожидание, ценность, инструкция",
      rationale: "Снижение тревоги до доставки повышает выкуп",
      materialsToChange: ["Серия сообщений"],
      testMethod: "Сравнить когорты с серией и без",
      complexity: 2,
      impact: 4,
      confidence: 3,
      ease: 3,
    },
  ],
  roas: [
    {
      change: "отключить нижние 30% связок «объявление + страница» по ROAS и перенести бюджет на лидеров",
      rationale:
        "ROAS быстрее всего растёт не от «ещё трафика», а от чистки слабых связок. Обычно 20–30% объявлений съедают бюджет без окупаемости.",
      materialsToChange: ["Структура кампаний", "Отчёт по связкам", "Минус-площадки"],
      testMethod: "Срез за 14 дней: отключить связки с ROAS ниже порога, сравнить общий ROAS через 7 дней",
      complexity: 2,
      impact: 5,
      confidence: 4,
      ease: 4,
    },
    {
      change: "Поднять конверсию в продажу через скрипт и пакеты",
      rationale: "Каждый процент CR в продажу масштабирует ROAS",
      materialsToChange: ["Скрипт", "Тарифы"],
      testMethod: "Внедрить и замерить ROAS 14 дней",
      complexity: 3,
      impact: 5,
      confidence: 3,
      ease: 2,
    },
  ],
  romi: [
    {
      change: "перераспределить 50–70% бюджета с кампаний ниже целевого ROAS на 2–3 лидирующие связки",
      rationale:
        "ROMI растёт без увеличения расходов: те же деньги работают в связках, которые уже доказали окупаемость на вашей аудитории.",
      materialsToChange: ["Бюджет кампаний", "Структура аккаунта"],
      testMethod: "Зафиксировать ROMI 7 дней до → перераспределить → сравнить ROMI и выручку 7 дней после",
      complexity: 2,
      impact: 4,
      confidence: 4,
      ease: 4,
    },
  ],
  "стоимость регистрации": [
    {
      change: "переписать тему вебинара и первый экран reg page: конкретный результат + для кого + дата/формат",
      rationale:
        "CPL регистрации падает, когда обещание на странице совпадает с рекламой и за 5 секунд понятно «зачем идти на эфир». Не требуй продажи основного курса на reg page.",
      materialsToChange: ["Страница регистрации", "Тема вебинара", "Первый экран"],
      testMethod: "A/B двух тем/первых экранов, минимум 100–200 регистраций на вариант",
      complexity: 2,
      impact: 5,
      confidence: 4,
      ease: 4,
    },
    {
      change: "сузить аудиторию до сегмента с лучшим CR в регистрацию (по данным прошлых запусков)",
      rationale: "Меньше «случайных» кликов → ниже стоимость регистрации при том же бюджете.",
      materialsToChange: ["Настройки кампании", "Сегменты"],
      testMethod: "Параллельная кампания на узкий сегмент 7–14 дней",
      complexity: 2,
      impact: 4,
      confidence: 3,
      ease: 4,
    },
  ],
};

const KEY_ALIASES: Record<string, string> = {
  "cpl": "стоимость заявки",
  "стоимость заявки cpl": "стоимость заявки",
  "стоимость лида": "стоимость заявки",
  "конверсия лендинга": "конверсия из клика в заявку",
  "cr в заявку": "конверсия из клика в заявку",
  "конверсия в заявку": "конверсия из клика в заявку",
  "выкуп": "процент выкупа",
  "конверсия в оплату": "конверсия в продажу",
  "конверсия страницы в регистрацию": "стоимость регистрации",
  "клики": "ctr",
  "клик": "ctr",
  "количество кликов": "ctr",
};

export function getDirectionsForMetric(metricName: string): HypothesisDirection[] {
  const key = normalizeMetricKey(metricName);
  const aliased = KEY_ALIASES[key] ?? key;
  return DIRECTIONS[aliased] ?? DIRECTIONS[key] ?? [];
}

/** Направления с учётом типа воронки — типовые имеют приоритет над универсальными. */
export function getDirectionsForMetricAndType(
  metricName: string,
  typeDirections: Record<string, HypothesisDirection[]> = {},
): HypothesisDirection[] {
  const key = normalizeMetricKey(metricName);
  const aliased = KEY_ALIASES[key] ?? key;
  const fromType = typeDirections[aliased] ?? typeDirections[key] ?? [];
  const generic = getDirectionsForMetric(metricName);
  const seen = new Set<string>();
  const merged: HypothesisDirection[] = [];
  for (const d of [...fromType, ...generic]) {
    if (seen.has(d.change)) continue;
    seen.add(d.change);
    merged.push(d);
  }
  return merged;
}

export function hasDirectionsForMetric(metricName: string): boolean {
  return getDirectionsForMetric(metricName).length > 0;
}
