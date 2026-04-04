export type DashboardWidgetKind = "usage" | "collection";

export type ValueFormat = "number" | "bytes";

export type DashboardWidgetDefinition = {
  id: string;
  kind: DashboardWidgetKind;
  title: string;
  subtitle: string;
  icon: string;
  accentClass: string;
  valueFormat?: ValueFormat;
  metricKey?: string;
  limitKey?: string;
  collectionName?: string;
  href?: string;
};

export type DashboardKpiCard = {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  accentClass: string;
  value: string;
  progressPct: number | null;
  progressLabel: string;
  href?: string;
};

export type DashboardActivityItem = {
  id: string;
  title: string;
  meta: string;
  status: string;
  href?: string;
};

export type DashboardSnapshot = {
  period: string;
  cards: DashboardKpiCard[];
  activityReports: DashboardActivityItem[];
  activityTrips: DashboardActivityItem[];
  hasUsageForPeriod?: boolean;
};

