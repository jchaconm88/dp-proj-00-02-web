import {
  getDocument,
  getCollection,
  addDocument,
  updateDocument,
  deleteDocument,
  deleteManyDocuments,
} from "~/lib/firestore.service";
import {
  CHARGE_TYPE_CATEGORY,
  CHARGE_TYPE_KIND,
  CHARGE_TYPE_SOURCE,
  CHARGE_TYPE_SOURCE_TRIP_ASSIGNMENT,
  parseStatus,
} from "~/constants/status-options";
import type {
  ChargeTypeRecord,
  ChargeTypeAddInput,
  ChargeTypeEditInput,
  ChargeTypeKind,
  ChargeTypeSource,
  ChargeTypeCategory,
} from "./charge-types.types";

const COLLECTION = "charge-types";

function toRecord(doc: { id: string } & Record<string, unknown>): ChargeTypeRecord {
  return {
    id: doc.id,
    code: String(doc.code ?? ""),
    type: parseStatus(doc.type, CHARGE_TYPE_KIND) as ChargeTypeKind,
    source: parseStatus(doc.source, CHARGE_TYPE_SOURCE) as ChargeTypeSource,
    name: String(doc.name ?? ""),
    category: parseStatus(doc.category, CHARGE_TYPE_CATEGORY, "extra") as ChargeTypeCategory,
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

const TRIP_ASSIGNMENT_CHARGE_SOURCE_KEYS = Object.keys(
  CHARGE_TYPE_SOURCE_TRIP_ASSIGNMENT
) as ChargeTypeSource[];

export async function getChargeTypesForTripAssignments(): Promise<ChargeTypeRecord[]> {
  const { items } = await getChargeTypes();
  return items.filter(
    (ct) => ct.active !== false && TRIP_ASSIGNMENT_CHARGE_SOURCE_KEYS.includes(ct.source)
  );
}

export async function getChargeTypesForTripCosts(): Promise<ChargeTypeRecord[]> {
  const { items } = await getChargeTypes();
  return items.filter((ct) => ct.active !== false && ct.type === "cost");
}

const CHARGE_TYPE_SOURCE_KEYS_NON_EMPTY = Object.keys(CHARGE_TYPE_SOURCE).filter(Boolean) as ChargeTypeSource[];

export async function getChargeTypesForTripCharges(): Promise<ChargeTypeRecord[]> {
  const { items } = await getChargeTypes();
  return items.filter(
    (ct) =>
      ct.active !== false &&
      ct.type === "charge" &&
      CHARGE_TYPE_SOURCE_KEYS_NON_EMPTY.includes(ct.source)
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

