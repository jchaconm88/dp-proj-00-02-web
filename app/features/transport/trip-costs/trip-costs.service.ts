import { webFetch } from "~/lib/backend-client";
import { requireActiveCompanyId } from "~/lib/tenant";
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
import { callHttpsFunction } from "~/lib/functions.service";

function toSyncMeta(raw: unknown): TripCostRecord["sync"] {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const source = String(o.source ?? "").trim();
  const sourceId = String(o.sourceId ?? "").trim();
  const process = String(o.process ?? "").trim();
  if (!source || !sourceId || !process) return null;
  return { source, sourceId, process };
}

function toRecord(doc: Record<string, unknown>): TripCostRecord {
  return {
    id: String(doc.id ?? ""),
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

function queryParams(companyId: string): string {
  return `?companyId=${encodeURIComponent(companyId)}`;
}

export async function getTripCosts(tripId: string): Promise<{ items: TripCostRecord[] }> {
  const companyId = requireActiveCompanyId();
  const data = await webFetch<{ items: Record<string, unknown>[] }>(
    `/transport/trip-costs?companyId=${encodeURIComponent(companyId)}&tripId=${encodeURIComponent(tripId)}`
  );
  return { items: (data.items ?? []).map((doc: Record<string, unknown>) => toRecord({ ...doc, id: doc.id })) };
}

export async function getTripCostById(id: string): Promise<TripCostRecord | null> {
  const companyId = requireActiveCompanyId();
  const data = await webFetch<Record<string, unknown> | null>(
    `/transport/trip-costs/${encodeURIComponent(id)}${queryParams(companyId)}`
  );
  return data ? toRecord(data) : null;
}

export async function addTripCost(data: TripCostAddInput): Promise<string> {
  const companyId = requireActiveCompanyId();
  const result = await webFetch<{ id: string }>("/transport/trip-costs", {
    method: "POST",
    body: JSON.stringify({
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
    }),
  });
  return result.id;
}

export async function updateTripCost(id: string, data: TripCostEditInput): Promise<void> {
  const companyId = requireActiveCompanyId();
  const patch: Record<string, unknown> = { companyId };
  if (data.code !== undefined) patch.code = data.code.trim();
  if (data.displayName !== undefined) patch.displayName = String(data.displayName).trim();
  if (data.tripId !== undefined) patch.tripId = data.tripId.trim();
  if (data.entity !== undefined) patch.entity = data.entity;
  if (data.entityId !== undefined) patch.entityId = data.entityId.trim();
  if (data.chargeTypeId !== undefined) patch.chargeTypeId = data.chargeTypeId.trim();
  if (data.chargeType !== undefined) patch.chargeType = data.chargeType.trim();
  if (data.type !== undefined) patch.type = data.type;
  if (data.source !== undefined) patch.source = data.source;
  if (data.amount !== undefined) patch.amount = Number(data.amount) ?? 0;
  if (data.currency !== undefined) patch.currency = data.currency.trim();
  if (data.status !== undefined) patch.status = data.status;
  if (data.settlementId !== undefined) patch.settlementId = data.settlementId ?? null;
  await webFetch(`/transport/trip-costs/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(patch) });
}

export async function deleteTripCost(id: string): Promise<void> {
  const companyId = requireActiveCompanyId();
  await webFetch(`/transport/trip-costs/${encodeURIComponent(id)}${queryParams(companyId)}`, { method: "DELETE" });
}

export async function deleteTripCosts(ids: string[]): Promise<void> {
  await Promise.all(ids.map((id) => deleteTripCost(id)));
}

export async function getTripCostByAssignment(tripAssignmentId: string): Promise<GetResourcePerTripCostResponse> {
  const id = tripAssignmentId.trim();
  if (!id) throw new Error("tripAssignmentId es obligatorio.");
  return callHttpsFunction<GetResourcePerTripCostRequest, GetResourcePerTripCostResponse>(
    "getResourcePerTripCost",
    { tripAssignmentId: id, companyId: requireActiveCompanyId() },
    { errorFallback: "No se pudo obtener el costo calculado para la asignación." }
  );
}

export const getResourcePerTripCostByAssignment = getTripCostByAssignment;

export async function getPerTripCostByEntity(entityType: "employee" | "resource", entityId: string): Promise<GetPerTripCostByEntityResponse> {
  const t = String(entityType ?? "").trim();
  const id = String(entityId ?? "").trim();
  if (t !== "employee" && t !== "resource") throw new Error("entityType debe ser employee o resource.");
  if (!id) throw new Error("entityId es obligatorio.");
  return callHttpsFunction<GetPerTripCostByEntityRequest, GetPerTripCostByEntityResponse>(
    "getPerTripCostByEntity",
    { entityType: t as "employee" | "resource", entityId: id, companyId: requireActiveCompanyId() },
    { errorFallback: "No se pudo obtener el costo calculado para la entidad." }
  );
}