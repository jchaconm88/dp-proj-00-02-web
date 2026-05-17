import { webFetch } from "~/lib/backend-client";
import { requireActiveCompanyId } from "~/lib/tenant";
import type {
  CompanyLocationRecord,
  CompanyLocationAddInput,
  CompanyLocationEditInput,
} from "./company-locations.types";

const BASE = "/platform/company-locations";

function toRecord(data: Record<string, unknown>): CompanyLocationRecord {
  return {
    id: String(data.id ?? ""),
    name: String(data.name ?? ""),
    description: String(data.description ?? ""),
    ubigeo: String(data.ubigeo ?? ""),
    city: String(data.city ?? ""),
    country: String(data.country ?? ""),
    district: String(data.district ?? ""),
    address: String(data.address ?? ""),
    active: data.active !== false,
  };
}

export async function getCompanyLocations(companyId: string): Promise<{ items: CompanyLocationRecord[] }> {
  const cid = String(companyId ?? "").trim();
  if (!cid) return { items: [] };
  const result = await webFetch<{ items: Record<string, unknown>[] }>(`${BASE}?companyId=${encodeURIComponent(cid)}`);
  const items = (result.items ?? []).map(toRecord).sort((a, b) => a.name.localeCompare(b.name));
  return { items };
}

export async function getCompanyLocation(
  companyId: string,
  locationId: string
): Promise<CompanyLocationRecord | null> {
  const cid = String(companyId ?? "").trim();
  const lid = String(locationId ?? "").trim();
  if (!cid || !lid) return null;
  try {
    const row = await webFetch<Record<string, unknown>>(`${BASE}/${encodeURIComponent(lid)}?companyId=${encodeURIComponent(cid)}`);
    return toRecord(row);
  } catch {
    return null;
  }
}

export async function addCompanyLocation(companyId: string, data: CompanyLocationAddInput): Promise<string> {
  const res = await webFetch<{ ok: boolean; id: string }>(BASE, {
    method: "POST",
    body: JSON.stringify({ ...data, companyId }),
  });
  return res.id;
}

export async function updateCompanyLocation(
  companyId: string,
  locationId: string,
  data: CompanyLocationEditInput
): Promise<void> {
  await webFetch(`${BASE}/${encodeURIComponent(locationId)}`, {
    method: "PUT",
    body: JSON.stringify({ ...data, companyId }),
  });
}

export async function deleteCompanyLocation(companyId: string, locationId: string): Promise<void> {
  await webFetch(`${BASE}/${encodeURIComponent(locationId)}?companyId=${encodeURIComponent(companyId)}`, { method: "DELETE" });
}

export async function deleteCompanyLocations(companyId: string, ids: string[]): Promise<void> {
  await Promise.all(ids.map((id) => deleteCompanyLocation(companyId, id)));
}

export async function getActiveCompanyLocations(): Promise<{ items: CompanyLocationRecord[] }> {
  const companyId = requireActiveCompanyId();
  return getCompanyLocations(companyId);
}
