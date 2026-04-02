import {
  getDocument,
  getCollectionWithMultiFilter,
  addDocument,
  updateDocument,
  deleteDocument,
  deleteManyDocuments,
} from "~/lib/firestore.service";
import { callHttpsFunction } from "~/lib/functions.service";
import { requireActiveCompanyId } from "~/lib/tenant";
import { where } from "firebase/firestore";
import {
  parseStatus,
  TRIP_COST_ENTITY_TYPE,
  TRIP_COST_SOURCE,
  TRIP_COST_STATUS,
  TRIP_COST_TYPE,
} from "~/constants/status-options";
import type {
  TripCostRecord,
  TripCostAddInput,
  TripCostEditInput,
  TripCostEntity,
  TripCostType,
  TripCostSource,
  TripCostStatus,
  GetResourcePerTripCostRequest,
  GetResourcePerTripCostResponse,
  GetPerTripCostByEntityRequest,
  GetPerTripCostByEntityResponse,
} from "./trip-costs.types";

const COLLECTION = "trip-costs";

function toSyncMeta(raw: unknown): TripCostRecord["sync"] {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const source = String(o.source ?? "").trim();
  const sourceId = String(o.sourceId ?? "").trim();
  const process = String(o.process ?? "").trim();
  if (!source || !sourceId || !process) return null;
  return { source, sourceId, process };
}

function toRecord(doc: { id: string } & Record<string, unknown>): TripCostRecord {
  return {
    id: doc.id,
    code: String(doc.code ?? ""),
    displayName: String(doc.displayName ?? "").trim(),
    tripId: String(doc.tripId ?? ""),
    entity: parseStatus(doc.entity ?? "", TRIP_COST_ENTITY_TYPE) as TripCostEntity,
    entityId: String(doc.entityId ?? ""),
    chargeTypeId: String(doc.chargeTypeId ?? "").trim(),
    chargeType: String(doc.chargeType ?? "").trim(),
    type: parseStatus(doc.type ?? "employee_payment", TRIP_COST_TYPE) as TripCostType,
    source: parseStatus(doc.source ?? "manual", TRIP_COST_SOURCE, "manual") as TripCostSource,
    amount: Number(doc.amount) ?? 0,
    currency: String(doc.currency ?? "PEN"),
    status: parseStatus(doc.status ?? "open", TRIP_COST_STATUS) as TripCostStatus,
    settlementId: doc.settlementId != null ? String(doc.settlementId) : null,
    sync: toSyncMeta(doc.sync),
  };
}

export async function getTripCosts(tripId: string): Promise<{ items: TripCostRecord[] }> {
  const companyId = requireActiveCompanyId();
  const list = await getCollectionWithMultiFilter<Record<string, unknown>>(COLLECTION, [
    where("companyId", "==", companyId),
    where("tripId", "==", tripId),
  ]);
  return { items: list.map(toRecord) };
}

export async function getTripCostById(id: string): Promise<TripCostRecord | null> {
  const d = await getDocument<Record<string, unknown>>(COLLECTION, id);
  return d ? toRecord(d) : null;
}

export async function addTripCost(data: TripCostAddInput): Promise<string> {
  const companyId = requireActiveCompanyId();
  return addDocument(COLLECTION, {
    companyId,
    code: data.code.trim(),
    displayName: String(data.displayName ?? "").trim(),
    tripId: data.tripId.trim(),
    entity: data.entity,
    entityId: data.entityId.trim(),
    chargeTypeId: data.chargeTypeId.trim(),
    chargeType: data.chargeType.trim(),
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
  if (data.displayName !== undefined) payload.displayName = String(data.displayName).trim();
  if (data.tripId !== undefined) payload.tripId = data.tripId.trim();
  if (data.entity !== undefined) payload.entity = data.entity;
  if (data.entityId !== undefined) payload.entityId = data.entityId.trim();
  if (data.chargeTypeId !== undefined) payload.chargeTypeId = data.chargeTypeId.trim();
  if (data.chargeType !== undefined) payload.chargeType = data.chargeType.trim();
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

export async function getTripCostByAssignment(
  tripAssignmentId: string
): Promise<GetResourcePerTripCostResponse> {
  const id = tripAssignmentId.trim();
  if (!id) {
    throw new Error("tripAssignmentId es obligatorio.");
  }
  return callHttpsFunction<GetResourcePerTripCostRequest, GetResourcePerTripCostResponse>(
    "getResourcePerTripCost",
    { tripAssignmentId: id, companyId: requireActiveCompanyId() },
    { errorFallback: "No se pudo obtener el costo calculado para la asignación." }
  );
}

// Alias de compatibilidad (deprecado): mantener hasta migrar llamadas existentes.
export const getResourcePerTripCostByAssignment = getTripCostByAssignment;

export async function getPerTripCostByEntity(
  entityType: "employee" | "resource",
  entityId: string
): Promise<GetPerTripCostByEntityResponse> {
  const t = String(entityType ?? "").trim();
  const id = String(entityId ?? "").trim();
  if (t !== "employee" && t !== "resource") {
    throw new Error("entityType debe ser employee o resource.");
  }
  if (!id) {
    throw new Error("entityId es obligatorio.");
  }
  return callHttpsFunction<GetPerTripCostByEntityRequest, GetPerTripCostByEntityResponse>(
    "getPerTripCostByEntity",
    { entityType: t as "employee" | "resource", entityId: id, companyId: requireActiveCompanyId() },
    { errorFallback: "No se pudo obtener el costo calculado para la entidad." }
  );
}
