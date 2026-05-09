import { webFetch } from "~/lib/backend-client";
import { requireActiveCompanyId } from "~/lib/tenant";
import type { VehicleRecord, VehicleAddInput, VehicleEditInput, VehicleStatus } from "./vehicles.types";

function toRecord(data: Record<string, unknown> & { id?: string }): VehicleRecord {
  return {
    id: String(data.id ?? ""),
    plate: String(data.plate ?? ""),
    type: String(data.type ?? ""),
    brand: String(data.brand ?? ""),
    model: String(data.model ?? ""),
    capacityKg: Number(data.capacityKg) || 0,
    status: (data.status as VehicleStatus) ?? "available",
    currentTripId: String(data.currentTripId ?? ""),
    active: data.active === true,
    createdAt: typeof data.createdAt === "string" ? data.createdAt : undefined,
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : undefined,
  };
}

export async function getVehicles(): Promise<{ items: VehicleRecord[] }> {
  const companyId = requireActiveCompanyId();
  const res = await webFetch<{ items: Record<string, unknown>[] }>(
    `/transport/vehicles?companyId=${encodeURIComponent(companyId)}`
  );
  return { items: (res.items ?? []).map(toRecord) };
}

export async function getVehicleById(id: string): Promise<VehicleRecord | null> {
  const companyId = requireActiveCompanyId();
  const data = await webFetch<Record<string, unknown> | null>(
    `/transport/vehicles/${encodeURIComponent(id)}?companyId=${encodeURIComponent(companyId)}`
  );
  return data ? toRecord(data) : null;
}

export async function addVehicle(data: VehicleAddInput): Promise<string> {
  const companyId = requireActiveCompanyId();
  const res = await webFetch<{ id: string }>("/transport/vehicles", {
    method: "POST",
    body: JSON.stringify({
      companyId,
      plate: data.plate?.trim() ?? "",
      type: data.type?.trim() ?? "",
      brand: data.brand?.trim() ?? "",
      model: data.model?.trim() ?? "",
      capacityKg: Number(data.capacityKg) || 0,
      status: data.status ?? "available",
      currentTripId: data.currentTripId?.trim() ?? "",
      active: data.active !== false,
    }),
  });
  return res.id;
}

export async function updateVehicle(id: string, data: VehicleEditInput): Promise<void> {
  const companyId = requireActiveCompanyId();
  const payload: Record<string, unknown> = {};
  if (data.plate !== undefined) payload.plate = data.plate?.trim();
  if (data.type !== undefined) payload.type = data.type?.trim();
  if (data.brand !== undefined) payload.brand = data.brand?.trim();
  if (data.model !== undefined) payload.model = data.model?.trim();
  if (data.capacityKg !== undefined) payload.capacityKg = Number(data.capacityKg) || 0;
  if (data.status !== undefined) payload.status = data.status;
  if (data.currentTripId !== undefined) payload.currentTripId = data.currentTripId?.trim() || "";
  if (data.active !== undefined) payload.active = data.active;
  await webFetch(`/transport/vehicles/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({ companyId, ...payload }),
  });
}

export async function deleteVehicle(id: string): Promise<void> {
  const companyId = requireActiveCompanyId();
  await webFetch(`/transport/vehicles/${encodeURIComponent(id)}?companyId=${encodeURIComponent(companyId)}`, {
    method: "DELETE",
  });
}