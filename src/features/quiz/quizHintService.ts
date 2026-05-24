import type { QuizQuestion } from "./types";

/** Контекстные подсказки без API — мгновенно и бесплатно. */
export function getContextualHint(question: QuizQuestion, values: Record<string, string>): string {
  const base = question.hint ?? "";
  const id = question.id;

  if (id === "landingUrl" && values.trafficSource?.toLowerCase().includes("директ")) {
    return `${base ? base + " " : ""}Проверьте, что URL в рекламном кабинете совпадает с этой страницей — иначе аудит увидит «разрыв» между объявлением и лендингом.`.trim();
  }

  if (id === "funnelGoal" && values.trafficSource?.toLowerCase().includes("вебинар")) {
    return `${base ? base + " " : ""}На странице регистрации цель = «записаться на вебинар», не «купить курс».`.trim();
  }

  if (id === "productDescription" && values.productName) {
    return `${base ? base + " " : ""}Для «${values.productName.slice(0, 40)}»: укажите формат (онлайн/офлайн), длительность и что клиент унесёт с собой.`.trim();
  }

  if (id === "currentProblem" && values.funnelGoal) {
    return `Цель воронки — «${values.funnelGoal.slice(0, 50)}». Опишите, что мешает её достигать: цифра, тренд или качество.`;
  }

  if (id === "afterLead" && !values.whoHandles) {
    return "Опишите цепочку: кто звонит, через сколько минут, что говорит, куда ведёт дальше.";
  }

  if (question.examples?.length) {
    const ex = question.examples.slice(0, 2).join(" · ");
    return base ? `${base} Примеры: ${ex}.` : `Примеры: ${ex}.`;
  }

  return base || "Ответьте своими словами — даже черновик поможет AI-аудиту. Потом можно уточнить.";
}

/** «AI»-подсказка: сначала умный шаблон, при наличии API — можно расширить. */
export async function fetchQuizHint(
  question: QuizQuestion,
  values: Record<string, string>,
): Promise<string> {
  // Небольшая задержка — ощущение «думает», но не блокирует UX.
  await new Promise((r) => setTimeout(r, 400 + Math.random() * 300));
  return getContextualHint(question, values);
}
