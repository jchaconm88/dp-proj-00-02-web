import { COMPANY_USERS_COLLECTION } from "~/lib/auth-context";
import { getCompanyById } from "~/features/system/companies";
import {
  createDocumentWithId,
  getCollectionWithFilter,
  getCollectionWithMultiFilter,
  getDocument,
} from "~/lib/firestore.service";
import { where, type QueryConstraint } from "firebase/firestore";
import type { CompanyUserRecord } from "./company-users.types";
import {
  apiDeleteCompanyUser,
  apiListCompanyUsers,
  apiListMyMemberships,
  apiSaveCompanyMembership,
  apiUpdateCompanyUser,
} from "~/features/system/system-store/system-store.api";

type CompanyUserDoc = {
  companyId?: string;
  accountId?: string;
  userId?: string;
  user?: string;
  usersDocId?: string;
  userEmail?: string;
  userDisplayName?: string;
  roleIds?: string[];
  roleNames?: string[];
  status?: string;
};

function toCompanyUserRecord(id: string, d: CompanyUserDoc): CompanyUserRecord {
  const inferredUserId = id.includes("_") ? id.split("_").slice(1).join("_").trim() : "";
  const userId = String(d.userId ?? "").trim() || inferredUserId;
  const status = d.status === "inactive" ? "inactive" : "active";
  return {
    id,
    companyId: d.companyId ?? "",
    accountId: d.accountId?.trim() || undefined,
    userId,
    user:
      String(d.user ?? "").trim() ||
      String(d.userDisplayName ?? "").trim() ||
      String(d.userEmail ?? "").trim() ||
      userId ||
      undefined,
    usersDocId: d.usersDocId?.trim() || undefined,
    userEmail: d.userEmail?.trim() || undefined,
    userDisplayName: d.userDisplayName?.trim() || undefined,
    roleIds: Array.isArray(d.roleIds) ? d.roleIds : [],
    roleNames: Array.isArray(d.roleNames) ? d.roleNames.map((x) => String(x).trim()).filter(Boolean) : [],
    status,
  };
}

export async function getCompanyUsersByUserId(userId: string): Promise<CompanyUserRecord[]> {
  const id = String(userId ?? "").trim();
  if (!id) return [];
  const rows = await getCollectionWithFilter<CompanyUserDoc>(COMPANY_USERS_COLLECTION, "userId", id);
  const items = rows.map((r) => toCompanyUserRecord(r.id, r));
  items.sort((a, b) => a.companyId.localeCompare(b.companyId));
  return items;
}

/** Membresías para la sesión: primero por Auth UID; si no hay filas, por ID legacy del doc `users`. */
export async function getCompanyMembershipsForSession(
  authUid: string,
  legacyUsersDocId?: string | null
): Promise<CompanyUserRecord[]> {
  const { items } = await apiListMyMemberships(legacyUsersDocId);
  return items;
}

export async function getCompanyUsersByCompanyId(companyId: string): Promise<CompanyUserRecord[]> {
  const { items } = await apiListCompanyUsers(companyId);
  return items;
}

export async function getCompanyUser(userId: string, companyId: string): Promise<CompanyUserRecord | null> {
  const id = String(userId ?? "").trim();
  const filtersByUserId: QueryConstraint[] = [
    where("userId", "==", id),
    where("companyId", "==", companyId),
  ];
  const rows = await getCollectionWithMultiFilter<CompanyUserDoc>(COMPANY_USERS_COLLECTION, filtersByUserId);
  const first = rows[0];
  return first ? toCompanyUserRecord(first.id, first) : null;
}

export async function addCompanyUser(data: {
  companyId: string;
  userId: string;
  user?: string;
  usersDocId?: string;
  userEmail?: string;
  userDisplayName?: string;
  roleIds?: string[];
  roleNames?: string[];
  status?: "active" | "inactive";
}): Promise<string> {
  const id = `${data.companyId}_${data.userId}`;
  const status = data.status === "inactive" ? "inactive" : "active";
  const comp = await getCompanyById(data.companyId);
  const accountId = comp?.accountId?.trim() || data.companyId;
  await createDocumentWithId(COMPANY_USERS_COLLECTION, id, {
    companyId: data.companyId,
    accountId,
    userId: data.userId,
    user: data.user?.trim() || undefined,
    usersDocId: data.usersDocId?.trim() || undefined,
    userEmail: data.userEmail?.trim().toLowerCase() || undefined,
    userDisplayName: data.userDisplayName?.trim() || undefined,
    roleIds: data.roleIds ?? [],
    roleNames: data.roleNames ?? [],
    status,
  });
  return id;
}

/** Alta o actualización de membresía (mismo id determinístico). */
export async function saveCompanyMembership(data: {
  companyId: string;
  userId: string;
  user?: string;
  usersDocId?: string;
  userEmail?: string;
  userDisplayName?: string;
  roleIds: string[];
  roleNames?: string[];
  status: "active" | "inactive";
}): Promise<string> {
  const saved = await apiSaveCompanyMembership(data);
  return saved.id;
}

export async function deleteCompanyUser(id: string): Promise<void> {
  await apiDeleteCompanyUser(id);
}

export async function updateCompanyUser(
  id: string,
  data: Partial<Omit<CompanyUserRecord, "id">>
): Promise<void> {
  await apiUpdateCompanyUser(id, data);
}

