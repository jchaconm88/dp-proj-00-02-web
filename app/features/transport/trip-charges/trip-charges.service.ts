import {
  getDocument,
  getCollectionWithFilter,
  addDocument,
  updateDocument,
  deleteDocument,
  deleteManyDocuments,
} from "~/lib/firestore.service";
import { TRIP_CHARGE_TYPE, TRIP_CHARGE_SOURCE, TRIP_CHARGE_STATUS } from "~/constants/status-options";
import type {
  TripChargeRecord,
  TripChargeAddInput,
  TripChargeEditInput,
  TripChargeType,
  TripChargeSource,
  TripChargeStatus,
} from "./trip-charges.types";

const COLLECTION = "tripCharges";

function toType(s: string): TripChargeType {
  return Object.prototype.hasOwnProperty.call(TRIP_CHARGE_TYPE, s) ? (s as TripChargeType) : "freight";
}
function toSource(s: string): TripChargeSource {
  return Object.prototype.hasOwnProperty.call(TRIP_CHARGE_SOURCE, s) ? (s as TripChargeSource) : "manual";
}
function toStatus(s: string): TripChargeStatus {
  return Object.prototype.hasOwnProperty.call(TRIP_CHARGE_STATUS, s) ? (s as TripChargeStatus) : "open";
}

function toRecord(doc: { id: string } & Record<string, unknown>): TripChargeRecord {
  return {
    id: doc.id,
    code: String(doc.code ?? ""),
    tripId: String(doc.tripId ?? ""),
    name: String(doc.name ?? ""),
    type: toType(String(doc.type ?? "freight")),
    source: toSource(String(doc.source ?? "manual")),
    transportServiceId: String(doc.transportServiceId ?? ""),
    amount: Number(doc.amount) ?? 0,
    currency: String(doc.currency ?? "PEN"),
    status: toStatus(String(doc.status ?? "open")),
    settlementId: doc.settlementId != null ? String(doc.settlementId) : null,
    settlement: String(doc.settlement ?? ""),
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
    type: data.type,
    source: data.source,
    transportServiceId: (data.transportServiceId ?? "").trim(),
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
  if (data.type !== undefined) payload.type = data.type;
  if (data.source !== undefined) payload.source = data.source;
  if (data.transportServiceId !== undefined) payload.transportServiceId = data.transportServiceId.trim();
  if (data.amount !== undefined) payload.amount = Number(data.amount) ?? 0;
  if (data.currency !== undefined) payload.currency = data.currency.trim();
  if (data.status !== undefined) payload.status = data.status;
  if (data.settlementId !== undefined) payload.settlementId = data.settlementId ?? null;
  await updateDocument(COLLECTION, id, payload);
}

export async function deleteTripCharge(id: string): Promise<void> {
  return deleteDocument(COLLECTION, id);
}

export async function deleteTripCharges(ids: string[]): Promise<void> {
  return deleteManyDocuments(COLLECTION, ids);
}
