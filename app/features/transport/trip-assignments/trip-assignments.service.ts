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

const COLLECTION = "trip-assignments";

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

function toRecord(doc: { id: string } & Record<string, unknown>): TripAssignmentRecord {
  return {
    id: doc.id,
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

export async function getTripAssignments(tripId: string): Promise<{ items: TripAssignmentRecord[] }> {
  const list = await getCollectionWithFilter<Record<string, unknown>>(COLLECTION, "tripId", tripId);
  return { items: list.map(toRecord) };
}

export async function getTripAssignmentById(id: string): Promise<TripAssignmentRecord | null> {
  const d = await getDocument<Record<string, unknown>>(COLLECTION, id);
  return d ? toRecord(d) : null;
}

export async function addTripAssignment(data: TripAssignmentAddInput): Promise<string> {
  const payload: Record<string, unknown> = {
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
  };
  return addDocument(COLLECTION, payload);
}

export async function updateTripAssignment(id: string, data: TripAssignmentEditInput): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (data.code !== undefined) payload.code = data.code.trim();
  if (data.tripId !== undefined) payload.tripId = data.tripId.trim();
  if (data.chargeTypeId !== undefined) payload.chargeTypeId = data.chargeTypeId.trim();
  if (data.chargeType !== undefined) payload.chargeType = data.chargeType.trim();
  if (data.type !== undefined) payload.type = data.type;
  if (data.entityType !== undefined) payload.entityType = data.entityType;
  if (data.entityId !== undefined) payload.entityId = data.entityId.trim();
  if (data.position !== undefined) payload.position = data.position.trim();
  if (data.positionId !== undefined) payload.positionId = data.positionId.trim();
  if (data.displayName !== undefined) payload.displayName = data.displayName.trim();
  if (data.scope !== undefined) {
    payload.scope = {
      type: data.scope.type,
      stopId: data.scope.stopId.trim(),
      fromStopId: data.scope.fromStopId.trim(),
      toStopId: data.scope.toStopId.trim(),
      display: data.scope.display.trim(),
    };
  }
  await updateDocument(COLLECTION, id, payload);
}

export async function deleteTripAssignment(id: string): Promise<void> {
  return deleteDocument(COLLECTION, id);
}

export async function deleteTripAssignments(ids: string[]): Promise<void> {
  return deleteManyDocuments(COLLECTION, ids);
}
