import {
  getDocument,
  getCollectionWithFilter,
  addDocument,
  updateDocument,
  deleteDocument,
  deleteManyDocuments,
} from "~/lib/firestore.service";
import { TRIP_COST_ENTITY, TRIP_COST_TYPE, TRIP_COST_SOURCE, TRIP_COST_STATUS } from "~/constants/status-options";
import type {
  TripCostRecord,
  TripCostAddInput,
  TripCostEditInput,
  TripCostEntity,
  TripCostType,
  TripCostSource,
  TripCostStatus,
} from "./trip-costs.types";

const COLLECTION = "tripCosts";

function toEntity(s: string): TripCostEntity {
  return Object.prototype.hasOwnProperty.call(TRIP_COST_ENTITY, s) ? (s as TripCostEntity) : ("assignment" as TripCostEntity);
}
function toType(s: string): TripCostType {
  return Object.prototype.hasOwnProperty.call(TRIP_COST_TYPE, s) ? (s as TripCostType) : ("driver_payment" as TripCostType);
}
function toSource(s: string): TripCostSource {
  return Object.prototype.hasOwnProperty.call(TRIP_COST_SOURCE, s) ? (s as TripCostSource) : ("manual" as TripCostSource);
}
function toStatus(s: string): TripCostStatus {
  return Object.prototype.hasOwnProperty.call(TRIP_COST_STATUS, s) ? (s as TripCostStatus) : ("open" as TripCostStatus);
}

function toRecord(doc: { id: string } & Record<string, unknown>): TripCostRecord {
  return {
    id: doc.id,
    code: String(doc.code ?? ""),
    tripId: String(doc.tripId ?? ""),
    entity: toEntity(String(doc.entity ?? "assignment")),
    entityId: String(doc.entityId ?? ""),
    type: toType(String(doc.type ?? "driver_payment")),
    source: toSource(String(doc.source ?? "manual")),
    amount: Number(doc.amount) ?? 0,
    currency: String(doc.currency ?? "PEN"),
    status: toStatus(String(doc.status ?? "open")),
    settlementId: doc.settlementId != null ? String(doc.settlementId) : null,
  };
}

export async function getTripCosts(tripId: string): Promise<{ items: TripCostRecord[] }> {
  const list = await getCollectionWithFilter<Record<string, unknown>>(COLLECTION, "tripId", tripId);
  return { items: list.map(toRecord) };
}

export async function getTripCostById(id: string): Promise<TripCostRecord | null> {
  const d = await getDocument<Record<string, unknown>>(COLLECTION, id);
  return d ? toRecord(d) : null;
}

export async function addTripCost(data: TripCostAddInput): Promise<string> {
  return addDocument(COLLECTION, {
    code: data.code.trim(),
    tripId: data.tripId.trim(),
    entity: data.entity,
    entityId: data.entityId.trim(),
    type: data.type,
    source: data.source,
    amount: Number(data.amount) ?? 0,
    currency: (data.currency ?? "PEN").trim(),
    status: data.status,
    settlementId: data.settlementId ?? null,
  });
}

export async function updateTripCost(id: string, data: TripCostEditInput): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (data.code !== undefined) payload.code = data.code.trim();
  if (data.tripId !== undefined) payload.tripId = data.tripId.trim();
  if (data.entity !== undefined) payload.entity = data.entity;
  if (data.entityId !== undefined) payload.entityId = data.entityId.trim();
  if (data.type !== undefined) payload.type = data.type;
  if (data.source !== undefined) payload.source = data.source;
  if (data.amount !== undefined) payload.amount = Number(data.amount) ?? 0;
  if (data.currency !== undefined) payload.currency = data.currency.trim();
  if (data.status !== undefined) payload.status = data.status;
  if (data.settlementId !== undefined) payload.settlementId = data.settlementId ?? null;
  await updateDocument(COLLECTION, id, payload);
}

export async function deleteTripCost(id: string): Promise<void> {
  return deleteDocument(COLLECTION, id);
}

export async function deleteTripCosts(ids: string[]): Promise<void> {
  return deleteManyDocuments(COLLECTION, ids);
}
