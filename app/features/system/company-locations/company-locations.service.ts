import {
  getSubcollection,
  getDocumentFromSubcollection,
  addDocumentToSubcollection,
  updateDocumentInSubcollection,
  deleteDocumentFromSubcollection,
} from "~/lib/firestore.service";
import { COMPANIES_COLLECTION } from "~/lib/auth-context";
import { requireActiveCompanyId, resolveActiveAccountId } from "~/lib/tenant";
import type {
  CompanyLocationRecord,
  CompanyLocationAddInput,
  CompanyLocationEditInput,
} from "./company-locations.types";

const SUB = "companyLocations";

function toRecord(doc: { id: string } & Record<string, unknown>): CompanyLocationRecord {
  return {
    id: doc.id,
    name: String(doc.name ?? ""),
    description: String(doc.description ?? ""),
    ubigeo: String(doc.ubigeo ?? ""),
    city: String(doc.city ?? ""),
    country: String(doc.country ?? ""),
    district: String(doc.district ?? ""),
    address: String(doc.address ?? ""),
    active: doc.active !== false,
  };
}

export async function getCompanyLocations(companyId: string): Promise<{ items: CompanyLocationRecord[] }> {
  const list = await getSubcollection<Record<string, unknown>>(COMPANIES_COLLECTION, companyId, SUB);
  const items = list.map(toRecord).sort((a, b) => a.name.localeCompare(b.name));
  return { items };
}

export async function getCompanyLocation(
  companyId: string,
  locationId: string
): Promise<CompanyLocationRecord | null> {
  const d = await getDocumentFromSubcollection<Record<string, unknown>>(
    COMPANIES_COLLECTION,
    companyId,
    SUB,
    locationId
  );
  return d ? toRecord(d) : null;
}

export async function addCompanyLocation(companyId: string, data: CompanyLocationAddInput): Promise<string> {
  const accountId = await resolveActiveAccountId();
  const payload = {
    companyId,
    accountId,
    name: data.name.trim(),
    description: data.description.trim(),
    ubigeo: data.ubigeo.trim(),
    city: data.city.trim(),
    country: data.country.trim() || "PE",
    district: data.district.trim(),
    address: data.address.trim(),
    active: data.active !== false,
  };
  return addDocumentToSubcollection(COMPANIES_COLLECTION, companyId, SUB, payload);
}

export async function updateCompanyLocation(
  companyId: string,
  locationId: string,
  data: CompanyLocationEditInput
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (data.name !== undefined) payload.name = String(data.name).trim();
  if (data.description !== undefined) payload.description = String(data.description).trim();
  if (data.ubigeo !== undefined) payload.ubigeo = String(data.ubigeo).trim();
  if (data.city !== undefined) payload.city = String(data.city).trim();
  if (data.country !== undefined) payload.country = String(data.country).trim();
  if (data.district !== undefined) payload.district = String(data.district).trim();
  if (data.address !== undefined) payload.address = String(data.address).trim();
  if (data.active !== undefined) payload.active = data.active;
  await updateDocumentInSubcollection(COMPANIES_COLLECTION, companyId, SUB, locationId, payload);
}

export async function deleteCompanyLocation(companyId: string, locationId: string): Promise<void> {
  return deleteDocumentFromSubcollection(COMPANIES_COLLECTION, companyId, SUB, locationId);
}

export async function deleteCompanyLocations(companyId: string, ids: string[]): Promise<void> {
  await Promise.all(ids.map((id) => deleteCompanyLocation(companyId, id)));
}

/** Sedes de la empresa activa (tenant). */
export async function getActiveCompanyLocations(): Promise<{ items: CompanyLocationRecord[] }> {
  const companyId = requireActiveCompanyId();
  return getCompanyLocations(companyId);
}
