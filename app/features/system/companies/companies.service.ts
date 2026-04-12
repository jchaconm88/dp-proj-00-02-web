import { COMPANIES_COLLECTION, COMPANY_USERS_COLLECTION } from "~/lib/auth-context";
import {
  addDocument,
  deleteDocument,
  getCollection,
  getCollectionWithFilter,
  getDocument,
  updateDocument,
} from "~/lib/firestore.service";
import type { CompanyRecord } from "./companies.types";
import { auth } from "~/lib/firebase";

type CompanyDoc = {
  name?: string;
  status?: string;
  accountId?: string;
  code?: string;
  taxId?: string;
  logoUrl?: string;
  logoPath?: string;
  logoLightUrl?: string;
  logoLightPath?: string;
  logoDarkUrl?: string;
  logoDarkPath?: string;
};
type CompanyMembershipDoc = {
  companyId?: string;
  status?: string;
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
    logoUrl: d.logoUrl?.trim() || undefined,
    logoPath: d.logoPath?.trim() || undefined,
    logoLightUrl: d.logoLightUrl?.trim() || undefined,
    logoLightPath: d.logoLightPath?.trim() || undefined,
    logoDarkUrl: d.logoDarkUrl?.trim() || undefined,
    logoDarkPath: d.logoDarkPath?.trim() || undefined,
  };
}

export async function getCompanyById(id: string): Promise<CompanyRecord | null> {
  const snap = await getDocument<CompanyDoc>(COMPANIES_COLLECTION, id);
  if (!snap) return null;
  return toCompanyRecord(snap.id, snap);
}

export async function getCompanies(): Promise<CompanyRecord[]> {
  try {
    const rows = await getCollection<CompanyDoc>(COMPANIES_COLLECTION, 200);
    const items = rows.map((r) => toCompanyRecord(r.id, r));
    items.sort((a, b) => a.name.localeCompare(b.name));
    return items;
  } catch (err) {
    const firebaseErrorCode =
      err && typeof err === "object" && "code" in err ? String((err as { code?: unknown }).code) : "";
    if (!firebaseErrorCode.includes("permission-denied")) {
      throw err;
    }

    const userId = auth.currentUser?.uid?.trim();
    if (!userId) throw err;

    const byUserId = await getCollectionWithFilter<CompanyMembershipDoc>(
      COMPANY_USERS_COLLECTION,
      "userId",
      userId
    );
    const membershipRows = byUserId;

    const activeCompanyIds = Array.from(
      new Set(
        membershipRows
          .filter((m) => (m.status ?? "active") !== "inactive")
          .map((m) => String(m.companyId ?? "").trim())
          .filter(Boolean)
      )
    );

    const fetched = await Promise.all(activeCompanyIds.map((id) => getDocument<CompanyDoc>(COMPANIES_COLLECTION, id)));
    const items = fetched
      .filter((doc): doc is ({ id: string } & CompanyDoc) => Boolean(doc))
      .map((doc) => toCompanyRecord(doc.id, doc))
      .sort((a, b) => a.name.localeCompare(b.name));
    return items;
  }
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

