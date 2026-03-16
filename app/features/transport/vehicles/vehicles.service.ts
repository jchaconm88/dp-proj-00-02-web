import {
  getCollection,
  getDocument,
  addDocument,
  updateDocument,
  deleteDocument,
  deleteManyDocuments,
} from "~/lib/firestore.service";
import type { VehicleRecord, VehicleAddInput, VehicleEditInput, VehicleStatus } from "./vehicles.types";

const COLLECTION = "vehicles";

function toVehicleStatus(v: unknown): VehicleStatus {
  if (v === "available" || v === "assigned" || v === "inactive") return v as VehicleStatus;
  return "available";
}

function toVehicleRecord(doc: { id: string } & Record<string, unknown>): VehicleRecord {
  return {
    id: doc.id,
    plate: String(doc.plate ?? ""),
    type: String(doc.type ?? ""),
    brand: String(doc.brand ?? ""),
    model: String(doc.model ?? ""),
    capacityKg: Number(doc.capacityKg) || 0,
    status: toVehicleStatus(doc.status),
    currentTripId: String(doc.currentTripId ?? ""),
    active: doc.active === true,
    createdAt: doc.createdAt as string | undefined,
    updatedAt: doc.updatedAt as string | undefined,
  };
}

export async function getVehicles(): Promise<{ items: VehicleRecord[] }> {
  const list = await getCollection<Record<string, unknown>>(COLLECTION);
  return { items: list.map(toVehicleRecord) };
}

export async function getVehicleById(id: string): Promise<VehicleRecord | null> {
  const d = await getDocument<Record<string, unknown>>(COLLECTION, id);
  return d ? toVehicleRecord(d) : null;
}

export async function addVehicle(data: VehicleAddInput): Promise<string> {
  return addDocument(COLLECTION, {
    plate: data.plate?.trim(),
    type: data.type?.trim(),
    brand: data.brand?.trim(),
    model: data.model?.trim(),
    capacityKg: Number(data.capacityKg) || 0,
    status: data.status,
    currentTripId: data.currentTripId?.trim() || "",
    active: data.active,
  });
}

export async function updateVehicle(id: string, data: VehicleEditInput): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (data.plate !== undefined) payload.plate = data.plate?.trim();
  if (data.type !== undefined) payload.type = data.type?.trim();
  if (data.brand !== undefined) payload.brand = data.brand?.trim();
  if (data.model !== undefined) payload.model = data.model?.trim();
  if (data.capacityKg !== undefined) payload.capacityKg = Number(data.capacityKg) || 0;
  if (data.status !== undefined) payload.status = data.status;
  if (data.currentTripId !== undefined) payload.currentTripId = data.currentTripId?.trim() || "";
  if (data.active !== undefined) payload.active = data.active;
  return updateDocument(COLLECTION, id, payload);
}

export async function deleteVehicle(id: string): Promise<void> {
  return deleteDocument(COLLECTION, id);
}

export async function deleteVehicles(ids: string[]): Promise<void> {
  return deleteManyDocuments(COLLECTION, ids);
}
