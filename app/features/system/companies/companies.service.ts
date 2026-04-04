import { COMPANIES_COLLECTION } from "~/lib/auth-context";
import { addDocument, deleteDocument, getCollection, getDocument, updateDocument } from "~/lib/firestore.service";
import type { CompanyRecord } from "./companies.types";

type CompanyDoc = {
  name?: string;
  status?: string;
  accountId?: string;
  code?: string;
  taxId?: string;
};

function toCompanyRecord(id: string, d: CompanyDoc): CompanyRecord {
  const status = d.status === "inactive" ? "inactive" : "active";
  return {
    id,
    name: d.name ?? "",
    status,
    accountId: d.accountId?.trim() || undefined,
    code: d.code,
    taxId: d.taxId,
  };
}

export async function getCompanyById(id: string): Promise<CompanyRecord | null> {
  const snap = await getDocument<CompanyDoc>(COMPANIES_COLLECTION, id);
  if (!snap) return null;
  return toCompanyRecord(snap.id, snap);
}

export async function getCompanies(): Promise<CompanyRecord[]> {
  const rows = await getCollection<CompanyDoc>(COMPANIES_COLLECTION, 200);
  const items = rows.map((r) => toCompanyRecord(r.id, r));
  items.sort((a, b) => a.name.localeCompare(b.name));
  return items;
}

export async function addCompany(data: {
  name: string;
  accountId?: string | null;
  code?: string | null;
  taxId?: string | null;
}): Promise<string> {
  return addDocument(COMPANIES_COLLECTION, {
    name: data.name,
    status: "active",
    accountId: data.accountId?.trim() || undefined,
    code: data.code ?? undefined,
    taxId: data.taxId ?? undefined,
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

