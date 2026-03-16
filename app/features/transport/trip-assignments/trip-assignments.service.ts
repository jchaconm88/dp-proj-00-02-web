import {
  getDocument,
  getCollectionWithFilter,
  addDocument,
  updateDocument,
  deleteDocument,
  deleteManyDocuments,
} from "~/lib/firestore.service";
import type {
  TripAssignmentRecord,
  TripAssignmentAddInput,
  TripAssignmentEditInput,
  AssignmentEntityType,
} from "./trip-assignments.types";

const COLLECTION = "tripAssignments";

function toEntityType(s: string): AssignmentEntityType {
  return (s || "").toLowerCase() === "resource" ? "resource" : "employee";
}

function toRecord(doc: { id: string } & Record<string, unknown>): TripAssignmentRecord {
  return {
    id: doc.id,
    code: String(doc.code ?? ""),
    tripId: String(doc.tripId ?? ""),
    entityType: toEntityType(String(doc.entityType ?? "employee")),
    entityId: String(doc.entityId ?? ""),
    position: String(doc.position ?? ""),
    displayName: String(doc.displayName ?? ""),
    resourceCostId: String(doc.resourceCostId ?? ""),
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
    code: data.code.trim(),
    tripId: data.tripId.trim(),
    entityType: data.entityType,
    entityId: data.entityId.trim(),
    position: data.position.trim(),
    displayName: data.displayName.trim(),
  };
  if (data.entityType === "resource" && data.resourceCostId?.trim()) {
    payload.resourceCostId = data.resourceCostId.trim();
  }
  return addDocument(COLLECTION, payload);
}

export async function updateTripAssignment(id: string, data: TripAssignmentEditInput): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (data.code !== undefined) payload.code = data.code.trim();
  if (data.tripId !== undefined) payload.tripId = data.tripId.trim();
  if (data.entityType !== undefined) payload.entityType = data.entityType;
  if (data.entityId !== undefined) payload.entityId = data.entityId.trim();
  if (data.position !== undefined) payload.position = data.position.trim();
  if (data.displayName !== undefined) payload.displayName = data.displayName.trim();
  if (data.resourceCostId !== undefined) payload.resourceCostId = data.resourceCostId.trim();
  await updateDocument(COLLECTION, id, payload);
}

export async function deleteTripAssignment(id: string): Promise<void> {
  return deleteDocument(COLLECTION, id);
}

export async function deleteTripAssignments(ids: string[]): Promise<void> {
  return deleteManyDocuments(COLLECTION, ids);
}
