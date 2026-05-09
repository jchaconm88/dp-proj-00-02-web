import { COMPANIES_COLLECTION } from "~/lib/auth-context";
import { webFetch } from "~/lib/backend-client";
import { addDocument, deleteDocument, updateDocument } from "~/lib/firestore.service";
import type { CompanyRecord } from "./companies.types";

function normalizeStatus(value: unknown): "active" | "inactive" {
  return String(value ?? "").trim() === "inactive" ? "inactive" : "active";
}

function normalizeText(value: unknown): string | undefined {
  const out = String(value ?? "").trim();
  return out || undefined;
}

function toCompanyRecord(id: string, d: Record<string, unknown>): CompanyRecord {
  return {
    id,
    name: String(d.name ?? ""),
    status: normalizeStatus(d.status),
    accountId: normalizeText(d.accountId),
    code: normalizeText(d.code),
    taxId: normalizeText(d.taxId),
    logoUrl: normalizeText(d.logoUrl),
    logoPath: normalizeText(d.logoPath),
    logoLightUrl: normalizeText(d.logoLightUrl),
    logoLightPath: normalizeText(d.logoLightPath),
    logoDarkUrl: normalizeText(d.logoDarkUrl),
    logoDarkPath: normalizeText(d.logoDarkPath),
  };
}

export async function getCompanyById(id: string): Promise<CompanyRecord | null> {
  const cid = String(id ?? "").trim();
  if (!cid) return null;
  const raw = await webFetch<Record<string, unknown> | null>(`/system/companies/${encodeURIComponent(cid)}`);
  if (!raw) return null;
  return toCompanyRecord(String(raw.id ?? ""), raw);
}

export async function getCompanies(): Promise<CompanyRecord[]> {
  const result = await webFetch<{ items: Record<string, unknown>[] }>("/system/companies");
  const items = result.items.map((r) => toCompanyRecord(String(r.id ?? ""), r));
  items.sort((a, b) => a.name.localeCompare(b.name));
  return items;
}

export async function addCompany(data: {
  name: string;
  accountId?: string | null;
  code?: string | null;
  taxId?: string | null;
  logoUrl?: string | null;
  logoPath?: string | null;
  logoLightUrl?: string | null;
  logoLightPath?: string | null;
  logoDarkUrl?: string | null;
  logoDarkPath?: string | null;
}): Promise<string> {
  return addDocument(COMPANIES_COLLECTION, {
    name: data.name,
    status: "active",
    accountId: data.accountId?.trim() || undefined,
    code: data.code ?? undefined,
    taxId: data.taxId ?? undefined,
    logoUrl: data.logoUrl?.trim() || undefined,
    logoPath: data.logoPath?.trim() || undefined,
    logoLightUrl: data.logoLightUrl?.trim() || undefined,
    logoLightPath: data.logoLightPath?.trim() || undefined,
    logoDarkUrl: data.logoDarkUrl?.trim() || undefined,
    logoDarkPath: data.logoDarkPath?.trim() || undefined,
  });
}

export async function updateCompany(
  id: string,
  data: Partial<Omit<CompanyRecord, "id">>
): Promise<void> {
  await updateDocument(COMPANIES_COLLECTION, id, data);
}

export async function deleteCompany(id: string): Promise<void> {
  await deleteDocument(COMPANIES_COLLECTION, id);
}

