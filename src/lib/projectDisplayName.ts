import type { Funnel } from "@/types/funnel";
import type { Project } from "@/types/project";

const GENERIC_PROJECT_NAMES = new Set([
  "",
  "новый проект",
  "new project",
  "без названия",
  "проект",
]);

export function isGenericProjectName(name: string | null | undefined): boolean {
  const n = (name ?? "").trim().toLowerCase();
  return GENERIC_PROJECT_NAMES.has(n);
}

/** Имя продукта из самой свежей воронки с заполненным productName. */
export function primaryFunnelProductName(funnels: Pick<Funnel, "productName" | "updatedAt">[]): string | null {
  const sorted = [...funnels]
    .filter((f) => f.productName?.trim())
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  return sorted[0]?.productName?.trim() ?? null;
}

/** Человекочитаемое имя проекта: не «Новый проект», если есть название воронки. */
export function resolveProjectDisplayName(
  project: Pick<Project, "projectName">,
  funnels: Pick<Funnel, "productName" | "updatedAt">[],
): string {
  const stored = project.projectName?.trim();
  if (stored && !isGenericProjectName(stored)) return stored;

  const fromFunnel = primaryFunnelProductName(funnels);
  if (fromFunnel) return fromFunnel;

  return stored || "Проект без названия";
}

export function funnelCountLabel(count: number): string {
  const n = Math.abs(count);
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return `${n} воронок`;
  if (mod10 === 1) return `${n} воронка`;
  if (mod10 >= 2 && mod10 <= 4) return `${n} воронки`;
  return `${n} воронок`;
}
