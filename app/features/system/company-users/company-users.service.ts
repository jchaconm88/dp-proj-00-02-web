import { COMPANY_USERS_COLLECTION } from "~/lib/auth-context";
import {
  createDocumentWithId,
  deleteDocument,
  getCollectionWithFilter,
  getCollectionWithMultiFilter,
  getDocument,
  updateDocument,
} from "~/lib/firestore.service";
import { where, type QueryConstraint } from "firebase/firestore";
import type { CompanyUserRecord } from "./company-users.types";

type CompanyUserDoc = {
  companyId?: string;
  uid?: string;
  roleIds?: string[];
  status?: string;
};

function toCompanyUserRecord(id: string, d: CompanyUserDoc): CompanyUserRecord {
  const status = d.status === "inactive" ? "inactive" : "active";
  return {
    id,
    companyId: d.companyId ?? "",
    uid: d.uid ?? "",
    roleIds: Array.isArray(d.roleIds) ? d.roleIds : [],
    status,
  };
}

export async function getCompanyUsersByUid(uid: string): Promise<CompanyUserRecord[]> {
  const rows = await getCollectionWithFilter<CompanyUserDoc>(COMPANY_USERS_COLLECTION, "uid", uid);
  const items = rows.map((r) => toCompanyUserRecord(r.id, r));
  items.sort((a, b) => a.companyId.localeCompare(b.companyId));
  return items;
}

/** Membresías para la sesión: primero por Auth UID; si no hay filas, por ID legacy del doc `users`. */
export async function getCompanyMembershipsForSession(
  authUid: string,
  legacyUsersDocId?: string | null
): Promise<CompanyUserRecord[]> {
  const primary = await getCompanyUsersByUid(authUid);
  if (primary.length > 0) return primary;
  if (legacyUsersDocId && legacyUsersDocId !== authUid) {
    return getCompanyUsersByUid(legacyUsersDocId);
  }
  return [];
}

export async function getCompanyUsersByCompanyId(companyId: string): Promise<CompanyUserRecord[]> {
  const rows = await getCollectionWithFilter<CompanyUserDoc>(
    COMPANY_USERS_COLLECTION,
    "companyId",
    companyId
  );
  const items = rows.map((r) => toCompanyUserRecord(r.id, r));
  items.sort((a, b) => a.uid.localeCompare(b.uid));
  return items;
}

export async function getCompanyUser(uid: string, companyId: string): Promise<CompanyUserRecord | null> {
  const filters: QueryConstraint[] = [where("uid", "==", uid), where("companyId", "==", companyId)];
  const rows = await getCollectionWithMultiFilter<CompanyUserDoc>(COMPANY_USERS_COLLECTION, filters);
  const first = rows[0];
  return first ? toCompanyUserRecord(first.id, first) : null;
}

export async function addCompanyUser(data: {
  companyId: string;
  uid: string;
  roleIds?: string[];
  status?: "active" | "inactive";
}): Promise<string> {
  const id = `${data.companyId}_${data.uid}`;
  const status = data.status === "inactive" ? "inactive" : "active";
  await createDocumentWithId(COMPANY_USERS_COLLECTION, id, {
    companyId: data.companyId,
    uid: data.uid,
    roleIds: data.roleIds ?? [],
    status,
  });
  return id;
}

/** Alta o actualización de membresía (mismo id determinístico). */
export async function saveCompanyMembership(data: {
  companyId: string;
  uid: string;
  roleIds: string[];
  status: "active" | "inactive";
}): Promise<string> {
  const id = `${data.companyId}_${data.uid}`;
  const existing = await getDocument<CompanyUserDoc>(COMPANY_USERS_COLLECTION, id);
  if (existing) {
    await updateCompanyUser(id, {
      roleIds: data.roleIds,
      status: data.status,
    });
    return id;
  }
  return addCompanyUser({
    companyId: data.companyId,
    uid: data.uid,
    roleIds: data.roleIds,
    status: data.status,
  });
}

export async function deleteCompanyUser(id: string): Promise<void> {
  await deleteDocument(COMPANY_USERS_COLLECTION, id);
}

export async function updateCompanyUser(
  id: string,
  data: Partial<Omit<CompanyUserRecord, "id">>
): Promise<void> {
  await updateDocument(COMPANY_USERS_COLLECTION, id, data);
}

