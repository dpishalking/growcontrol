import { getFunnelTypeTemplate } from "@/data/funnelTypes/catalog";
import { resolveProjectDisplayName } from "@/lib/projectDisplayName";
import type { Funnel } from "@/types/funnel";
import type { Project } from "@/types/project";

export type EntityPathSegment = {
  kind: "root" | "folder";
  label: string;
  href?: string;
};

/** Корень = продукт/проект, папка = тип воронки (как в файловой системе). */
export function buildFunnelEntityPath(
  project: Project,
  funnel: Funnel | null,
  projectId: string,
  funnels: Funnel[],
): EntityPathSegment[] {
  const projectHref = `/projects/${encodeURIComponent(projectId)}`;
  const overviewHref = funnel
    ? `/projects/${encodeURIComponent(projectId)}/funnels/${encodeURIComponent(funnel.id)}`
    : undefined;

  const projectLabel = resolveProjectDisplayName(project, funnels);
  const productName = funnel?.productName?.trim();
  const typeLabel = funnel?.funnelTypeId
    ? getFunnelTypeTemplate(funnel.funnelTypeId).name
    : null;

  const rootLabel = productName || projectLabel;
  const folderLabel = typeLabel ?? (funnel ? "Черновик" : "Новая воронка");

  return [
    {
      kind: "root",
      label: rootLabel,
      href: overviewHref ?? projectHref,
    },
    {
      kind: "folder",
      label: folderLabel,
      href: funnel ? overviewHref : undefined,
    },
  ];
}
