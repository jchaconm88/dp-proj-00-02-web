export type MetricDefinitionType = "entityCount" | "sum" | "custom";
export type MetricMeasureType = "counterMonthly" | "gaugeCurrent";
export type MetricEnforcement = "hard" | "soft" | "none";
export type MetricValueFormat = "number" | "bytes";

export type MetricSourceFilter = {
  field: string;
  op: "==" | "!=" | ">" | ">=" | "<" | "<=";
  value: string | number | boolean;
};

export type MetricDefinitionRecord = {
  id: string;
  metricKey: string;
  label: string;
  description?: string;
  type: MetricDefinitionType;
  measureType: MetricMeasureType;
  planLimitKey?: string;
  enforcement: MetricEnforcement;
  valueFormat: MetricValueFormat;
  active: boolean;
  source: {
    collectionName?: string;
    valueField?: string;
    filters?: MetricSourceFilter[];
  };
};

export type DashboardCardDefinitionRecord = {
  id: string;
  cardKey: string;
  metricKey: string;
  title: string;
  subtitle?: string;
  icon: string;
  accentClass: string;
  href?: string;
  order: number;
  visible: boolean;
  active: boolean;
  valueFormat?: MetricValueFormat;
};

export type MetricDefinitionUpsertInput = Omit<MetricDefinitionRecord, "id">;
export type DashboardCardDefinitionUpsertInput = Omit<DashboardCardDefinitionRecord, "id">;
