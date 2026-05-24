import type { AIReport, AIReportContent, AIReportType } from "@/types/ai-report";
import type { Project } from "@/types/project";
import { REPORT_TYPE_LABELS } from "@/data/mock/seed";
import { createId, nowIso } from "@/utils/id";
import type { MockStore } from "./storage";

function buildMockContent(type: AIReportType, project: Project): AIReportContent {
  const name = project.projectName;
  const pain = project.intake?.mainPain ?? "неочевидная ценность на первом экране";
  const promise = project.intake?.mainPromise ?? "быстрый измеримый результат";

  const baseSections = [
    {
      id: "problems",
      title: "Проблемы",
      kind: "problems" as const,
      summary: "Что мешает конверсии прямо сейчас",
      bullets: [
        `На первом экране не раскрыта боль: «${pain}»`,
        "Нет явного доказательства результата",
        "Слабый призыв к действию",
      ],
    },
    {
      id: "quick_fixes",
      title: "Быстрые правки",
      kind: "quick_fixes" as const,
      summary: "Что можно улучшить за 1–2 дня",
      bullets: [
        "Переписать заголовок под обещание результата",
        "Добавить блок «кому подходит / кому нет»",
        "Вынести цену или якорь стоимости выше",
      ],
    },
    {
      id: "offer",
      title: "Оффер",
      kind: "offer" as const,
      summary: "Черновик формулировки ценности",
      bullets: [
        `Обещание: ${promise}`,
        `Для: ${project.targetAudience || project.intake?.targetClient || "ваша ЦА"}`,
        "Механизм: пошаговый сценарий без перегруза",
      ],
    },
    {
      id: "structure",
      title: "Структура",
      kind: "structure" as const,
      summary: "Рекомендуемые блоки страницы",
      bullets: ["Hero + обещание", "Боль → решение", "Как работает", "Доказательства", "FAQ", "CTA"],
    },
    {
      id: "hypotheses",
      title: "Гипотезы",
      kind: "hypotheses" as const,
      summary: "3 идеи для первых тестов",
      bullets: [
        "Новый заголовок на Hero (+15% к заявкам)",
        "Социальное доказательство рядом с CTA",
        "Упрощённая форма заявки",
      ],
    },
    {
      id: "metrics",
      title: "Метрики",
      kind: "metrics" as const,
      summary: "На что смотреть в первую неделю",
      bullets: ["CR в заявку", "Стоимость заявки", "Доля квалифицированных лидов"],
    },
    {
      id: "next_step",
      title: "Следующий шаг",
      kind: "next_step" as const,
      summary: "Один понятный шаг после отчёта",
      bullets: ["Откройте блок «Быстрые правки» и выберите 1 правку на эту неделю"],
    },
  ];

  const headlines: Record<AIReportType, string> = {
    site_audit: `Аудит «${name}»: 3 зоны роста`,
    offer: `Черновик оффера для «${name}»`,
    jtbd: `JTBD-карта клиента «${name}»`,
    landing_structure: `Структура лендинга «${name}»`,
    hypotheses: `Гипотезы роста для «${name}»`,
    metrics: `KPI-набор для «${name}»`,
    predictive_model: `Прогноз по «${name}»`,
  };

  const nextToolMap: Partial<Record<AIReportType, AIReportType>> = {
    site_audit: "offer",
    offer: "landing_structure",
    jtbd: "hypotheses",
    landing_structure: "hypotheses",
    hypotheses: "metrics",
    metrics: "predictive_model",
  };

  return {
    headline: headlines[type],
    mainInsight: `Главный вывод: сфокусируйтесь на «${pain}» — это даст быстрый эффект без полной переделки.`,
    sections: baseSections,
    nextStep: {
      title: "Следующий шаг",
      description: "Выберите один блок ниже или запустите связанный инструмент.",
      suggestedTool: nextToolMap[type],
    },
  };
}

export function getReportsByProject(store: MockStore, projectId: string): AIReport[] {
  return store.reports
    .filter((r) => r.projectId === projectId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getReportById(store: MockStore, reportId: string): AIReport | null {
  return store.reports.find((r) => r.id === reportId) ?? null;
}

export function getRecentReports(store: MockStore, limit = 5): AIReport[] {
  return [...store.reports]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

export type GenerateReportResult =
  | { ok: true; report: AIReport }
  | { ok: false; error: "no_credits" | "project_not_found" };

export function generateMockReport(
  store: MockStore,
  projectId: string,
  type: AIReportType,
  creditCost: number,
): GenerateReportResult {
  const project = store.projects.find((p) => p.id === projectId);
  if (!project) return { ok: false, error: "project_not_found" };
  if (store.user.credits < creditCost) return { ok: false, error: "no_credits" };

  store.user.credits -= creditCost;

  const contentJson = buildMockContent(type, project);
  const report: AIReport = {
    id: createId("report"),
    projectId,
    type,
    title: REPORT_TYPE_LABELS[type],
    summary: contentJson.mainInsight,
    contentJson,
    status: "generated",
    createdAt: nowIso(),
  };

  store.reports.unshift(report);
  return { ok: true, report };
}

export function saveReport(store: MockStore, reportId: string): AIReport | null {
  const report = store.reports.find((r) => r.id === reportId);
  if (!report) return null;
  report.status = "saved";
  return report;
}
