import { webFetch } from "~/lib/backend-client";
import type {
  DashboardCardDefinitionRecord,
  DashboardCardDefinitionUpsertInput,
  MetricDefinitionRecord,
  MetricDefinitionUpsertInput,
  MetricDefinitionType,
  MetricEnforcement,
  MetricMeasureType,
  MetricValueFormat,
} from "./dashboard-config.types";

function toStringSafe(value: unknown): string {
  return String(value ?? "").trim();
}

function toBoolean(value: unknown, defaultValue = true): boolean {
  if (typeof value === "boolean") return value;
  return defaultValue;
}

function toNumber(value: unknown, defaultValue = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : defaultValue;
}

function normalizeType(value: unknown): MetricDefinitionType {
  const v = toStringSafe(value);
  if (v === "entityCount" || v === "sum" || v === "custom") return v;
  return "custom";
}

function normalizeMeasureType(value: unknown, fallbackType: MetricDefinitionType): MetricMeasureType {
  const v = toStringSafe(value);
  if (v === "counterMonthly" || v === "gaugeCurrent") return v;
  if (fallbackType === "entityCount") return "gaugeCurrent";
  return "counterMonthly";
}

function normalizeEnforcement(value: unknown): MetricEnforcement {
  const v = toStringSafe(value);
  if (v === "hard" || v === "soft" || v === "none") return v;
  return "none";
}

function normalizeValueFormat(value: unknown): MetricValueFormat {
  return toStringSafe(value) === "bytes" ? "bytes" : "number";
}

function toMetricDefinitionRecord(id: string, doc: Record<string, unknown>): MetricDefinitionRecord {
  const type = normalizeType(doc.type);
  return {
    id,
    metricKey: toStringSafe(doc.metricKey) || id,
    label: toStringSafe(doc.label) || id,
    description: toStringSafe(doc.description) || undefined,
    type,
    measureType: normalizeMeasureType(doc.measureType, type),
    planLimitKey: toStringSafe(doc.planLimitKey) || undefined,
    enforcement: normalizeEnforcement(doc.enforcement),
    valueFormat: normalizeValueFormat(doc.valueFormat),
    active: toBoolean(doc.active, true),
    source:
      doc.source && typeof doc.source === "object"
        ? {
            collectionName: toStringSafe((doc.source as Record<string, unknown>).collectionName) || undefined,
            valueField: toStringSafe((doc.source as Record<string, unknown>).valueField) || undefined,
            filters: Array.isArray((doc.source as Record<string, unknown>).filters)
              ? ((doc.source as Record<string, unknown>).filters as MetricDefinitionRecord["source"]["filters"])
              : [],
          }
        : {},
  };
}

export async function listMetricDefinitions(): Promise<MetricDefinitionRecord[]> {
  const rows = await webFetch<Record<string, unknown>[]>("/dashboard-config/metrics");
  return rows
    .map((r) => {
      const data = (r.data ?? r) as Record<string, unknown>;
      const id = String(r.id ?? r._id ?? data.id ?? "");
      return toMetricDefinitionRecord(id, data);
    })
    .sort((a, b) => a.metricKey.localeCompare(b.metricKey));
}

export async function listDashboardCardDefinitions(): Promise<DashboardCardDefinitionRecord[]> {
  const rows = await webFetch<Record<string, unknown>[]>("/dashboard-config/definitions");
  const cards = rows as unknown as Record<string, unknown>[];
  return (Array.isArray(cards) ? cards : []).map((r) => ({
    id: String(r.id ?? ""),
    cardKey: toStringSafe(r.cardKey) || String(r.id ?? ""),
    metricKey: toStringSafe(r.metricKey),
    title: toStringSafe(r.title) || String(r.id ?? ""),
    subtitle: toStringSafe(r.subtitle) || undefined,
    icon: toStringSafe(r.icon) || "chart-line",
    accentClass: toStringSafe(r.accentClass) || "text-slate-600",
    href: toStringSafe(r.href) || undefined,
    order: toNumber(r.order, 0),
    visible: toBoolean(r.visible, true),
    active: toBoolean(r.active, true),
    valueFormat: normalizeValueFormat(r.valueFormat),
  }));
}
