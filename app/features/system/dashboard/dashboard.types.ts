// ---------------------------------------------------------------------------
// New configurable dashboard types (snapshot from backend)
// ---------------------------------------------------------------------------

export interface SnapshotCard {
  id: string;
  cardKey: string;
  metricKey: string;
  title: string;
  subtitle: string | null;
  icon: string;
  accentClass: string;
  value: string;
  rawValue: number;
  progressPct: number | null;
  progressLabel: string | null;
  href: string | null;
  permissionModule: string | null;
  target: "admin" | "web" | "both";
}

export interface SnapshotChart {
  id: string;
  chartKey: string;
  title: string;
  chartType: "bar" | "line" | "pie" | "doughnut";
  permissionModule: string | null;
  target: "admin" | "web" | "both";
  labels: string[];
  datasets: Array<{ metricKey: string; label: string; data: number[] }>;
}

export interface DashboardSnapshotResponse {
  period: string;
  cards: SnapshotCard[];
  charts: SnapshotChart[];
  activityItems: any[];
  metadata: any | null;
}

// ---------------------------------------------------------------------------
// Legacy types (kept for backward compatibility until DashboardHome migration)
// ---------------------------------------------------------------------------

/** @deprecated Used by dashboard-widgets.config.ts — will be removed */
export type DashboardWidgetKind = "usage" | "collection";

/** @deprecated Used by dashboard-widgets.config.ts — will be removed */
export type ValueFormat = "number" | "bytes";

/** @deprecated Used by dashboard-widgets.config.ts — will be removed */
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

/** @deprecated Use SnapshotCard instead */
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

/** @deprecated Will be replaced by activityItems in DashboardSnapshotResponse */
export type DashboardActivityItem = {
  id: string;
  title: string;
  meta: string;
  status: string;
  href?: string;
};

/** @deprecated Use DashboardSnapshotResponse instead */
export type DashboardSnapshot = {
  period: string;
  cards: DashboardKpiCard[];
  activityReports: DashboardActivityItem[];
  activityTrips: DashboardActivityItem[];
  hasUsageForPeriod?: boolean;
};
