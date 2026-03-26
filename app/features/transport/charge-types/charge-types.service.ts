import {
  getDocument,
  getCollection,
  addDocument,
  updateDocument,
  deleteDocument,
  deleteManyDocuments,
} from "~/lib/firestore.service";
import type {
  ChargeTypeRecord,
  ChargeTypeAddInput,
  ChargeTypeEditInput,
  ChargeTypeKind,
  ChargeTypeSource,
  ChargeTypeCategory,
} from "./charge-types.types";

const COLLECTION = "charge-types";

function toKind(v: unknown): ChargeTypeKind {
  const s = String(v ?? "").toLowerCase();
  return s === "cost" ? "cost" : "charge";
}

function toSource(v: unknown): ChargeTypeSource {
  const s = String(v ?? "").toLowerCase();
  if (!s.trim()) return "";
  if (s === "service" || s === "employee" || s === "resource" || s === "employee_resource") {
    return s as ChargeTypeSource;
  }
  return "";
}

function toCategory(v: unknown): ChargeTypeCategory {
  const s = String(v ?? "").toLowerCase();
  if (s === "base" || s === "extra" || s === "variable") return s as ChargeTypeCategory;
  return "extra";
}

function toRecord(doc: { id: string } & Record<string, unknown>): ChargeTypeRecord {
  return {
    id: doc.id,
    code: String(doc.code ?? ""),
    type: toKind(doc.type),
    source: toSource(doc.source),
    name: String(doc.name ?? ""),
    category: toCategory(doc.category),
    active: doc.active !== false,
  };
}

export async function getChargeType(id: string): Promise<ChargeTypeRecord | null> {
  const doc = await getDocument<Record<string, unknown>>(COLLECTION, id);
  return doc ? toRecord(doc) : null;
}

export async function getChargeTypes(): Promise<{ items: ChargeTypeRecord[]; total: number }> {
  const list = await getCollection<Record<string, unknown>>(COLLECTION);
  const items = list.map(toRecord);
  return { items, total: items.length };
}

/** Tipos de cargo aplicables a asignaciones de viaje (origen empleado/recurso). */
const CHARGE_TYPE_SOURCES_FOR_TRIP_ASSIGNMENT = new Set<ChargeTypeSource>([
  "employee",
  "resource",
  "employee_resource",
]);

export async function getChargeTypesForTripAssignments(): Promise<ChargeTypeRecord[]> {
  const { items } = await getChargeTypes();
  return items.filter(
    (ct) => ct.active !== false && CHARGE_TYPE_SOURCES_FOR_TRIP_ASSIGNMENT.has(ct.source)
  );
}

export async function addChargeType(data: ChargeTypeAddInput): Promise<string> {
  return addDocument(COLLECTION, {
    code: data.code.trim(),
    type: data.type,
    source: data.source,
    name: data.name.trim(),
    category: data.category,
    active: data.active !== false,
  });
}

export async function updateChargeType(id: string, data: ChargeTypeEditInput): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (data.code !== undefined) payload.code = String(data.code).trim();
  if (data.type !== undefined) payload.type = data.type;
  if (data.source !== undefined) payload.source = data.source;
  if (data.name !== undefined) payload.name = String(data.name).trim();
  if (data.category !== undefined) payload.category = data.category;
  if (data.active !== undefined) payload.active = !!data.active;
  await updateDocument(COLLECTION, id, payload);
}

export async function deleteChargeType(id: string): Promise<void> {
  return deleteDocument(COLLECTION, id);
}

export async function deleteChargeTypes(ids: string[]): Promise<void> {
  return deleteManyDocuments(COLLECTION, ids);
}

