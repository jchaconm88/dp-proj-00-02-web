import {
  addDocument,
  deleteDocument,
  getCollection,
  getDocument,
  updateDocument,
} from "~/lib/firestore.service";
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

export const METRIC_DEFINITIONS_COLLECTION = "metric-definitions";
export const DASHBOARD_CARD_DEFINITIONS_COLLECTION = "dashboard-card-definitions";

type LooseDoc = Record<string, unknown>;

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

function toMetricDefinitionRecord(id: string, doc: LooseDoc): MetricDefinitionRecord {
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
            collectionName: toStringSafe((doc.source as LooseDoc).collectionName) || undefined,
            valueField: toStringSafe((doc.source as LooseDoc).valueField) || undefined,
            filters: Array.isArray((doc.source as LooseDoc).filters)
              ? ((doc.source as LooseDoc).filters as MetricDefinitionRecord["source"]["filters"])
              : [],
          }
        : {},
  };
}

function toCardDefinitionRecord(id: string, doc: LooseDoc): DashboardCardDefinitionRecord {
  return {
    id,
    cardKey: toStringSafe(doc.cardKey) || id,
    metricKey: toStringSafe(doc.metricKey),
    title: toStringSafe(doc.title) || id,
    subtitle: toStringSafe(doc.subtitle) || undefined,
    icon: toStringSafe(doc.icon) || "chart-line",
    accentClass: toStringSafe(doc.accentClass) || "text-slate-600",
    href: toStringSafe(doc.href) || undefined,
    order: toNumber(doc.order, 0),
    visible: toBoolean(doc.visible, true),
    active: toBoolean(doc.active, true),
    valueFormat: normalizeValueFormat(doc.valueFormat),
  };
}

export async function listMetricDefinitions(): Promise<MetricDefinitionRecord[]> {
  const docs = await getCollection<LooseDoc>(METRIC_DEFINITIONS_COLLECTION);
  return docs
    .map((d) => toMetricDefinitionRecord(d.id, d))
    .sort((a, b) => a.metricKey.localeCompare(b.metricKey));
}

export async function getMetricDefinitionById(id: string): Promise<MetricDefinitionRecord | null> {
  const doc = await getDocument<LooseDoc>(METRIC_DEFINITIONS_COLLECTION, id);
  if (!doc) return null;
  return toMetricDefinitionRecord(doc.id, doc);
}

export async function addMetricDefinition(input: MetricDefinitionUpsertInput): Promise<string> {
  return addDocument(METRIC_DEFINITIONS_COLLECTION, input);
}

export async function updateMetricDefinition(id: string, input: Partial<MetricDefinitionUpsertInput>): Promise<void> {
  await updateDocument(METRIC_DEFINITIONS_COLLECTION, id, input);
}

export async function deleteMetricDefinition(id: string): Promise<void> {
  await deleteDocument(METRIC_DEFINITIONS_COLLECTION, id);
}

export async function listDashboardCardDefinitions(): Promise<DashboardCardDefinitionRecord[]> {
  const docs = await getCollection<LooseDoc>(DASHBOARD_CARD_DEFINITIONS_COLLECTION);
  return docs
    .map((d) => toCardDefinitionRecord(d.id, d))
    .sort((a, b) => a.order - b.order || a.cardKey.localeCompare(b.cardKey));
}

export async function addDashboardCardDefinition(input: DashboardCardDefinitionUpsertInput): Promise<string> {
  return addDocument(DASHBOARD_CARD_DEFINITIONS_COLLECTION, input);
}

export async function updateDashboardCardDefinition(
  id: string,
  input: Partial<DashboardCardDefinitionUpsertInput>
): Promise<void> {
  await updateDocument(DASHBOARD_CARD_DEFINITIONS_COLLECTION, id, input);
}

export async function deleteDashboardCardDefinition(id: string): Promise<void> {
  await deleteDocument(DASHBOARD_CARD_DEFINITIONS_COLLECTION, id);
}

export async function createEntityCountMetricTemplate(params: {
  entityLabel: string;
  metricKey: string;
  collectionName: string;
  planLimitKey?: string;
  href?: string;
  icon?: string;
  accentClass?: string;
}): Promise<{ metricId: string; cardId: string }> {
  const metricId = await addMetricDefinition({
    metricKey: params.metricKey,
    label: params.entityLabel,
    description: `Conteo de registros de ${params.entityLabel}.`,
    type: "entityCount",
    measureType: "gaugeCurrent",
    enforcement: "none",
    planLimitKey: params.planLimitKey,
    valueFormat: "number",
    active: true,
    source: {
      collectionName: params.collectionName,
      filters: [],
    },
  });

  const cardId = await addDashboardCardDefinition({
    cardKey: `${params.metricKey}Card`,
    metricKey: params.metricKey,
    title: params.entityLabel,
    subtitle: "Tenant activo",
    icon: params.icon || "chart-line",
    accentClass: params.accentClass || "text-sky-600",
    href: params.href,
    order: Date.now(),
    visible: true,
    active: true,
    valueFormat: "number",
  });

  return { metricId, cardId };
}
