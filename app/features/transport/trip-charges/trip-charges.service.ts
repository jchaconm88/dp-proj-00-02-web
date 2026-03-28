import { deleteField } from "firebase/firestore";
import {
  getDocument,
  getCollectionWithFilter,
  addDocument,
  updateDocument,
  deleteDocument,
  deleteManyDocuments,
} from "~/lib/firestore.service";
import {
  parseStatus,
  TRIP_CHARGE_ENTITY_TYPE,
  TRIP_CHARGE_SOURCE,
  TRIP_CHARGE_STATUS,
  TRIP_CHARGE_TYPE,
} from "~/constants/status-options";
import type {
  TripChargeRecord,
  TripChargeAddInput,
  TripChargeEditInput,
  TripChargeType,
  TripChargeSource,
  TripChargeStatus,
  TripChargeEntityType,
} from "./trip-charges.types";

const COLLECTION = "trip-charges";

function toSyncMeta(raw: unknown): TripChargeRecord["sync"] {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const source = String(o.source ?? "").trim();
  const sourceId = String(o.sourceId ?? "").trim();
  const process = String(o.process ?? "").trim();
  if (!source || !sourceId || !process) return null;
  return { source, sourceId, process };
}

function toRecord(doc: { id: string } & Record<string, unknown>): TripChargeRecord {
  const chargeType = parseStatus(doc.type ?? "freight", TRIP_CHARGE_TYPE) as TripChargeType;
  const legacyTransportServiceId = String(doc.transportServiceId ?? "").trim();
  let entityType = parseStatus(doc.entityType, TRIP_CHARGE_ENTITY_TYPE) as TripChargeEntityType;
  let entityId = String(doc.entityId ?? "").trim();
  /** Documentos antiguos con `transportServiceId` o flete con `entityId` sin tipo explícito. */
  if (chargeType === "freight") {
    if (legacyTransportServiceId && !entityId) entityId = legacyTransportServiceId;
    if (entityId && !entityType) entityType = "transportService";
  }
  return {
    id: doc.id,
    code: String(doc.code ?? ""),
    tripId: String(doc.tripId ?? ""),
    name: String(doc.name ?? ""),
    chargeTypeId: String(doc.chargeTypeId ?? "").trim(),
    chargeType: String(doc.chargeType ?? "").trim(),
    type: chargeType,
    source: parseStatus(doc.source ?? "manual", TRIP_CHARGE_SOURCE, "manual") as TripChargeSource,
    entityType,
    entityId,
    amount: Number(doc.amount) ?? 0,
    currency: String(doc.currency ?? "PEN"),
    status: parseStatus(doc.status ?? "open", TRIP_CHARGE_STATUS) as TripChargeStatus,
    settlementId: doc.settlementId != null ? String(doc.settlementId) : null,
    settlement: String(doc.settlement ?? ""),
    sync: toSyncMeta(doc.sync),
  };
}

export async function getTripCharges(tripId: string): Promise<{ items: TripChargeRecord[] }> {
  const list = await getCollectionWithFilter<Record<string, unknown>>(COLLECTION, "tripId", tripId);
  return { items: list.map(toRecord) };
}

export async function getTripChargeById(id: string): Promise<TripChargeRecord | null> {
  const d = await getDocument<Record<string, unknown>>(COLLECTION, id);
  return d ? toRecord(d) : null;
}

export async function addTripCharge(data: TripChargeAddInput): Promise<string> {
  return addDocument(COLLECTION, {
    code: data.code.trim(),
    tripId: data.tripId.trim(),
    name: data.name.trim(),
    chargeTypeId: data.chargeTypeId.trim(),
    chargeType: data.chargeType.trim(),
    type: data.type,
    source: data.source,
    entityType: (data.entityType ?? "") as TripChargeEntityType,
    entityId: (data.entityId ?? "").trim(),
    amount: Number(data.amount) ?? 0,
    currency: (data.currency ?? "PEN").trim(),
    status: data.status,
    settlementId: data.settlementId ?? null,
  });
}

export async function updateTripCharge(id: string, data: TripChargeEditInput): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (data.code !== undefined) payload.code = data.code.trim();
  if (data.tripId !== undefined) payload.tripId = data.tripId.trim();
  if (data.name !== undefined) payload.name = data.name.trim();
  if (data.chargeTypeId !== undefined) payload.chargeTypeId = data.chargeTypeId.trim();
  if (data.chargeType !== undefined) payload.chargeType = data.chargeType.trim();
  if (data.type !== undefined) payload.type = data.type;
  if (data.source !== undefined) payload.source = data.source;
  if (data.entityType !== undefined) payload.entityType = data.entityType;
  if (data.entityId !== undefined) payload.entityId = data.entityId.trim();
  if (data.amount !== undefined) payload.amount = Number(data.amount) ?? 0;
  if (data.currency !== undefined) payload.currency = data.currency.trim();
  if (data.status !== undefined) payload.status = data.status;
  if (data.settlementId !== undefined) payload.settlementId = data.settlementId ?? null;
  /** Deja de persistir el campo legado en trip-charges. */
  payload.transportServiceId = deleteField();
  await updateDocument(COLLECTION, id, payload);
}

export async function deleteTripCharge(id: string): Promise<void> {
  return deleteDocument(COLLECTION, id);
}

export async function deleteTripCharges(ids: string[]): Promise<void> {
  return deleteManyDocuments(COLLECTION, ids);
}
