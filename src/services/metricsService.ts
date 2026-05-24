import type { MetricPeriodNode } from "@/types/metric";
import { getMetricStatusColor } from "@/utils/metricStatus";
import type { MockStore } from "./storage";

function node(
  id: string,
  label: string,
  level: MetricPeriodNode["level"],
  plan: number,
  fact: number,
  children?: MetricPeriodNode[],
): MetricPeriodNode {
  return {
    id,
    label,
    level,
    planValue: plan,
    factValue: fact,
    children,
  };
}

/** Демо-дерево план/факт: год → месяцы → недели → дни (сокращённо). */
export function buildDefaultMetricTree(projectId: string): MetricPeriodNode[] {
  const yearPlan = 12_000_000;
  const yearFact = 9_800_000;

  const months = [
    { label: "Янв", plan: 800_000, fact: 720_000 },
    { label: "Фев", plan: 900_000, fact: 810_000 },
    { label: "Мар", plan: 1_000_000, fact: 1_050_000 },
    { label: "Апр", plan: 1_000_000, fact: 890_000 },
  ];

  return [
    node(`year_${projectId}`, "2026", "year", yearPlan, yearFact, [
      ...months.map((m, mi) => {
        const weekPlan = Math.round(m.plan / 4);
        const weekFact = Math.round(m.fact / 4);
        return node(
          `month_${projectId}_${mi}`,
          m.label,
          "month",
          m.plan,
          m.fact,
          [0, 1, 2, 3].map((wi) =>
            node(
              `week_${projectId}_${mi}_${wi}`,
              `Нед ${wi + 1}`,
              "week",
              weekPlan,
              wi === 0 ? weekFact + 20_000 : weekFact - wi * 5_000,
              [1, 2, 3].map((di) =>
                node(
                  `day_${projectId}_${mi}_${wi}_${di}`,
                  `День ${di}`,
                  "day",
                  Math.round(weekPlan / 5),
                  Math.round(weekFact / 5) + di * 1000,
                ),
              ),
            ),
          ),
        );
      }),
    ]),
  ];
}

export function getMetricTree(store: MockStore, projectId: string): MetricPeriodNode[] {
  if (!store.metricTrees[projectId]) {
    store.metricTrees[projectId] = buildDefaultMetricTree(projectId);
  }
  return store.metricTrees[projectId];
}

export function enrichNodeStatus(node: MetricPeriodNode): MetricPeriodNode & { statusColor: ReturnType<typeof getMetricStatusColor> } {
  return {
    ...node,
    statusColor: getMetricStatusColor(node.planValue, node.factValue),
    children: node.children?.map(enrichNodeStatus),
  };
}
