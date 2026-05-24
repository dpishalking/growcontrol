export type MetricCategory = "traffic" | "conversion" | "sales" | "finance" | "retention";

export type MetricStatusColor = "green" | "yellow" | "red";

export type Metric = {
  id: string;
  projectId: string;
  name: string;
  category: MetricCategory;
  planValue: number;
  factValue: number;
  period: string;
  statusColor: MetricStatusColor;
};

export type MetricPeriodLevel = "year" | "month" | "week" | "day";

export type MetricPeriodNode = {
  id: string;
  label: string;
  level: MetricPeriodLevel;
  planValue: number;
  factValue: number;
  children?: MetricPeriodNode[];
};
