import { webFetch } from "~/lib/backend-client";
import { requireActiveCompanyId, resolveActiveAccountId, getLocationFilterId } from "~/lib/tenant";
import type { WarehouseRecord, WarehouseAddInput, WarehouseEditInput } from "./warehouses.types";

function queryParams(companyId: string, locationId?: string | null): string {
  let qs = `?companyId=${encodeURIComponent(companyId)}`;
  if (locationId) qs += `&locationId=${encodeURIComponent(locationId)}`;
  return qs;
}

function toWarehouseRecord(doc: Record<string, unknown>): WarehouseRecord {
  return {
    id: String(doc.id ?? ""),
    code: String(doc.code ?? ""),
    name: String(doc.name ?? ""),
    address: doc.address ? String(doc.address) : undefined,
    district: doc.district ? String(doc.district) : undefined,
    city: doc.city ? String(doc.city) : undefined,
    country: doc.country ? String(doc.country) : undefined,
    ubigeo: doc.ubigeo ? String(doc.ubigeo) : undefined,
    type: (["principal", "secondary", "transit"].includes(String(doc.type ?? ""))
      ? String(doc.type)
      : "principal") as WarehouseRecord["type"],
    active: doc.active !== false,
    locationId: String(doc.locationId ?? ""),
    locationName: String(doc.locationName ?? ""),
    companyId: String(doc.companyId ?? ""),
    accountId: String(doc.accountId ?? ""),
    createAt: doc.createAt ?? undefined,
    createBy: doc.createBy ? String(doc.createBy) : undefined,
    updateAt: doc.updateAt ?? undefined,
    updateBy: doc.updateBy ? String(doc.updateBy) : undefined,
  };
}

export async function getWarehouses(): Promise<{ items: WarehouseRecord[] }> {
  const companyId = requireActiveCompanyId();
  const locationId = getLocationFilterId();
  const data = await webFetch<{ items: Record<string, unknown>[] }>(
    `/inventory/warehouses${queryParams(companyId, locationId)}`
  );
  return { items: (data.items ?? []).map(toWarehouseRecord) };
}

export async function getWarehouseById(id: string): Promise<WarehouseRecord | null> {
  const companyId = requireActiveCompanyId();
  try {
    const data = await webFetch<Record<string, unknown>>(
      `/inventory/warehouses/${encodeURIComponent(id)}?companyId=${encodeURIComponent(companyId)}`
    );
    return data ? toWarehouseRecord(data) : null;
  } catch {
    return null;
  }
}

export async function addWarehouse(data: WarehouseAddInput): Promise<string> {
  const companyId = requireActiveCompanyId();
  const accountId = await resolveActiveAccountId();
  const result = await webFetch<{ id: string }>("/inventory/warehouses", {
    method: "POST",
    body: JSON.stringify({
      companyId,
      accountId,
      code: data.code.trim(),
      name: data.name.trim(),
      address: data.address?.trim() ?? "",
      district: data.district?.trim() ?? "",
      city: data.city?.trim() ?? "",
      country: data.country?.trim() ?? "",
      ubigeo: data.ubigeo?.trim() ?? "",
      type: data.type,
      active: data.active !== false,
      locationId: data.locationId,
      locationName: data.locationName.trim(),
    }),
  });
  return result.id;
}

export async function updateWarehouse(id: string, data: WarehouseEditInput): Promise<void> {
  const companyId = requireActiveCompanyId();
  const payload: Record<string, unknown> = { companyId };
  if (data.code !== undefined) payload.code = data.code.trim();
  if (data.name !== undefined) payload.name = data.name.trim();
  if (data.address !== undefined) payload.address = data.address.trim();
  if (data.district !== undefined) payload.district = data.district.trim();
  if (data.city !== undefined) payload.city = data.city.trim();
  if (data.country !== undefined) payload.country = data.country.trim();
  if (data.ubigeo !== undefined) payload.ubigeo = data.ubigeo.trim();
  if (data.type !== undefined) payload.type = data.type;
  if (data.active !== undefined) payload.active = data.active;
  if (data.locationId !== undefined) payload.locationId = data.locationId;
  if (data.locationName !== undefined) payload.locationName = data.locationName.trim();
  await webFetch(`/inventory/warehouses/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteWarehouse(id: string): Promise<void> {
  const companyId = requireActiveCompanyId();
  await webFetch(`/inventory/warehouses/${encodeURIComponent(id)}?companyId=${encodeURIComponent(companyId)}`, {
    method: "DELETE",
  });
}

export async function deleteWarehouses(ids: string[]): Promise<void> {
  const companyId = requireActiveCompanyId();
  await Promise.all(
    ids.map((id) =>
      webFetch(`/inventory/warehouses/${encodeURIComponent(id)}?companyId=${encodeURIComponent(companyId)}`, {
        method: "DELETE",
      })
    )
  );
}
