import type { Project, ProjectIntake } from "@/types/project";

const INTAKE_FIELDS: (keyof ProjectIntake)[] = [
  "niche",
  "productType",
  "priceRange",
  "targetClient",
  "mainPain",
  "mainPromise",
  "competitors",
  "currentWebsite",
  "currentProblem",
  "desiredResult",
];

const PROJECT_FIELDS: (keyof Omit<Project, "id" | "userId" | "intake" | "createdAt" | "updatedAt" | "projectCompletenessScore">)[] = [
  "projectName",
  "businessDescription",
  "targetAudience",
  "productDescription",
  "websiteUrl",
  "currentTrafficSources",
  "currentRevenue",
  "currentConversion",
  "mainGoal",
  "northStarMetric",
];

function isFilled(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

export function calculateCompleteness(project: Project): number {
  const intake = project.intake;
  const intakeFilled = intake
    ? INTAKE_FIELDS.filter((f) => isFilled(intake[f])).length
    : 0;
  const projectFilled = PROJECT_FIELDS.filter((f) => isFilled(String(project[f] ?? ""))).length;

  const total = INTAKE_FIELDS.length + PROJECT_FIELDS.length;
  const filled = intakeFilled + projectFilled;
  return Math.round((filled / total) * 100);
}

export type ProjectFieldGap = {
  key: string;
  label: string;
  hint: string;
};

const FIELD_LABELS: Record<string, { label: string; hint: string }> = {
  businessDescription: { label: "Описание бизнеса", hint: "Коротко: чем занимаетесь и для кого" },
  targetAudience: { label: "Целевая аудитория", hint: "Кто платит и за что" },
  productDescription: { label: "Продукт", hint: "Что именно продаёте" },
  websiteUrl: { label: "Сайт", hint: "URL или «пока нет»" },
  currentTrafficSources: { label: "Источники трафика", hint: "Откуда приходят клиенты сейчас" },
  currentRevenue: { label: "Выручка", hint: "Примерный уровень или диапазон" },
  currentConversion: { label: "Конверсия", hint: "Заявки, продажи, CR" },
  mainGoal: { label: "Главная цель", hint: "Что хотите улучшить в первую очередь" },
  northStarMetric: { label: "North Star", hint: "Одна метрика успеха" },
  mainPain: { label: "Главная боль клиента", hint: "Из квиза или интервью" },
  mainPromise: { label: "Обещание", hint: "Ключевое обещание оффера" },
  competitors: { label: "Конкуренты", hint: "2–3 альтернативы для сравнения" },
};

export function getProjectGaps(project: Project): ProjectFieldGap[] {
  const gaps: ProjectFieldGap[] = [];

  for (const key of PROJECT_FIELDS) {
    if (key === "projectName") continue;
    if (!isFilled(String(project[key] ?? ""))) {
      const meta = FIELD_LABELS[key];
      if (meta) gaps.push({ key, ...meta });
    }
  }

  if (project.intake) {
    for (const key of ["mainPain", "mainPromise", "competitors"] as const) {
      if (!isFilled(project.intake[key])) {
        const meta = FIELD_LABELS[key];
        if (meta && !gaps.some((g) => g.key === key)) gaps.push({ key, ...meta });
      }
    }
  }

  return gaps.slice(0, 5);
}

export function getKnownFacts(project: Project): string[] {
  const facts: string[] = [];

  if (project.intake?.niche) facts.push(`Ниша: ${project.intake.niche}`);
  if (project.intake?.targetClient) facts.push(`Клиент: ${project.intake.targetClient}`);
  if (project.intake?.mainPain) facts.push(`Боль: ${project.intake.mainPain}`);
  if (project.intake?.desiredResult) facts.push(`Желаемый результат: ${project.intake.desiredResult}`);
  if (project.mainGoal) facts.push(`Цель: ${project.mainGoal}`);
  if (project.websiteUrl) facts.push(`Сайт: ${project.websiteUrl}`);

  return facts.slice(0, 6);
}

export function intakeToProjectFields(intake: ProjectIntake, projectName: string): Partial<Project> {
  return {
    projectName,
    businessDescription: `${intake.niche}. ${intake.currentProblem}`.trim(),
    targetAudience: intake.targetClient,
    productDescription: `${intake.productType}, ${intake.priceRange}`.trim(),
    websiteUrl: intake.currentWebsite,
    mainGoal: intake.desiredResult,
    northStarMetric: "",
    currentTrafficSources: "",
    currentRevenue: "",
    currentConversion: "",
    intake,
  };
}
