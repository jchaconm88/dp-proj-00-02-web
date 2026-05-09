import { webFetch } from "~/lib/backend-client";
import { requireActiveCompanyId, resolveActiveAccountId } from "~/lib/tenant";
import {
  parseStatus,
  TRIP_ASSIGNMENT_ENTITY_TYPE,
  TRIP_ASSIGNMENT_SCOPE_TYPE,
  TRIP_ASSIGNMENT_TYPE,
} from "~/constants/status-options";
import type {
  TripAssignmentRecord,
  TripAssignmentAddInput,
  TripAssignmentEditInput,
  AssignmentEntityType,
  TripAssignmentKind,
  TripAssignmentScope,
  TripAssignmentScopeType,
} from "./trip-assignments.types";

function parseScope(raw: unknown): TripAssignmentScope {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    type: parseStatus(o.type ?? "trip", TRIP_ASSIGNMENT_SCOPE_TYPE) as TripAssignmentScopeType,
    stopId: String(o.stopId ?? "").trim(),
    fromStopId: String(o.fromStopId ?? "").trim(),
    toStopId: String(o.toStopId ?? "").trim(),
    display: String(o.display ?? "").trim(),
  };
}

function toRecord(doc: Record<string, unknown>): TripAssignmentRecord {
  return {
    id: String(doc.id ?? ""),
    code: String(doc.code ?? ""),
    tripId: String(doc.tripId ?? ""),
    chargeTypeId: String(doc.chargeTypeId ?? "").trim(),
    chargeType: String(doc.chargeType ?? "").trim(),
    type: parseStatus(doc.type, TRIP_ASSIGNMENT_TYPE) as TripAssignmentKind,
    entityType: parseStatus(doc.entityType ?? "employee", TRIP_ASSIGNMENT_ENTITY_TYPE) as AssignmentEntityType,
    entityId: String(doc.entityId ?? ""),
    position: String(doc.position ?? ""),
    positionId: String(doc.positionId ?? ""),
    displayName: String(doc.displayName ?? ""),
    scope: parseScope(doc.scope),
  };
}

function queryParams(companyId: string): string {
  return `?companyId=${encodeURIComponent(companyId)}`;
}

export async function getTripAssignments(tripId: string): Promise<{ items: TripAssignmentRecord[] }> {
  const companyId = requireActiveCompanyId();
  const data = await webFetch<{ items: Record<string, unknown>[] }>(
    `/transport/trip-assignments?companyId=${encodeURIComponent(companyId)}&tripId=${encodeURIComponent(tripId)}`
  );
  return { items: (data.items ?? []).map((doc: Record<string, unknown>) => toRecord({ ...doc, id: doc.id })) };
}

export async function getTripAssignmentById(id: string): Promise<TripAssignmentRecord | null> {
  const companyId = requireActiveCompanyId();
  const data = await webFetch<Record<string, unknown> | null>(
    `/transport/trip-assignments/${encodeURIComponent(id)}${queryParams(companyId)}`
  );
  return data ? toRecord(data) : null;
}

export async function addTripAssignment(data: TripAssignmentAddInput): Promise<string> {
  const companyId = requireActiveCompanyId();
  const accountId = await resolveActiveAccountId();
  const result = await webFetch<{ id: string }>("/transport/trip-assignments", {
    method: "POST",
    body: JSON.stringify({
      companyId,
      accountId,
      chargeTypeId: data.chargeTypeId.trim(),
      chargeType: data.chargeType.trim(),
      type: data.type,
      code: data.code.trim(),
      tripId: data.tripId.trim(),
      entityType: data.entityType,
      entityId: data.entityId.trim(),
      position: data.position.trim(),
      positionId: data.positionId.trim(),
      displayName: data.displayName.trim(),
      scope: {
        type: data.scope.type,
        stopId: data.scope.stopId.trim(),
        fromStopId: data.scope.fromStopId.trim(),
        toStopId: data.scope.toStopId.trim(),
        display: data.scope.display.trim(),
      },
    }),
  });
  return result.id;
}

export async function updateTripAssignment(id: string, data: TripAssignmentEditInput): Promise<void> {
  const companyId = requireActiveCompanyId();
  const patch: Record<string, unknown> = { companyId };
  if (data.code !== undefined) patch.code = data.code.trim();
  if (data.tripId !== undefined) patch.tripId = data.tripId.trim();
  if (data.chargeTypeId !== undefined) patch.chargeTypeId = data.chargeTypeId.trim();
  if (data.chargeType !== undefined) patch.chargeType = data.chargeType.trim();
  if (data.type !== undefined) patch.type = data.type;
  if (data.entityType !== undefined) patch.entityType = data.entityType;
  if (data.entityId !== undefined) patch.entityId = data.entityId.trim();
  if (data.position !== undefined) patch.position = data.position.trim();
  if (data.positionId !== undefined) patch.positionId = data.positionId.trim();
  if (data.displayName !== undefined) patch.displayName = data.displayName.trim();
  if (data.scope !== undefined) {
    patch.scope = {
      type: data.scope.type,
      stopId: data.scope.stopId.trim(),
      fromStopId: data.scope.fromStopId.trim(),
      toStopId: data.scope.toStopId.trim(),
      display: data.scope.display.trim(),
    };
  }
  await webFetch(`/transport/trip-assignments/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(patch) });
}

export async function deleteTripAssignment(id: string): Promise<void> {
  const companyId = requireActiveCompanyId();
  await webFetch(`/transport/trip-assignments/${encodeURIComponent(id)}${queryParams(companyId)}`, { method: "DELETE" });
}

export async function deleteTripAssignments(ids: string[]): Promise<void> {
  await Promise.all(ids.map((id) => deleteTripAssignment(id)));
}