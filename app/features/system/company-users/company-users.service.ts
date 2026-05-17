import { getCollectionWithMultiFilter } from "~/lib/firestore.service";
import { COMPANY_USERS_COLLECTION } from "~/lib/auth-context";
import { getCompanyById } from "~/features/system/companies";
import {
  createDocumentWithId,
} from "~/lib/firestore.service";
import { where, type QueryConstraint } from "firebase/firestore";
import type { CompanyUserRecord } from "./company-users.types";
import {
  apiDeleteCompanyUser,
  apiListCompanyUsers,
  apiListMyCompanyUsers,
  apiUpsertCompanyUser,
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
  webRoleIds?: string[];
  webRoleNames?: string[];
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
    webRoleIds: Array.isArray(d.webRoleIds) ? d.webRoleIds : [],
    webRoleNames: Array.isArray(d.webRoleNames) ? d.webRoleNames.map((x) => String(x).trim()).filter(Boolean) : [],
    status,
  };
}

export async function getCompanyUsersByUserId(userId: string): Promise<CompanyUserRecord[]> {
  const { items } = await apiListMyCompanyUsers();
  const id = String(userId ?? "").trim();
  if (!id) return [];
  return items.filter((u) => u.userId === id);
}

export async function getCompanyUsersForSession(_authUid?: string): Promise<CompanyUserRecord[]> {
  const { items } = await apiListMyCompanyUsers();
  return items;
}

export async function getCompanyUsersByCompanyId(companyId: string): Promise<CompanyUserRecord[]> {
  const { items } = await apiListCompanyUsers(companyId);
  return items;
}

export async function getCompanyUser(userId: string, companyId: string): Promise<CompanyUserRecord | null> {
  const result = await apiListCompanyUsers(companyId);
  const id = String(userId ?? "").trim();
  return result.items.find((u: CompanyUserRecord) => u.userId === id) ?? null;
}

export async function addCompanyUser(data: {
  companyId: string;
  userId: string;
  user?: string;
  usersDocId?: string;
  userEmail?: string;
  userDisplayName?: string;
  webRoleIds?: string[];
  webRoleNames?: string[];
  status?: "active" | "inactive";
}): Promise<string> {
  const comp = await getCompanyById(data.companyId);
  const accountId = comp?.accountId?.trim() || data.companyId;
  return apiUpsertCompanyUser({
    companyId: data.companyId,
    userId: data.userId,
    user: data.user?.trim() || undefined,
    usersDocId: data.usersDocId?.trim() || undefined,
    userEmail: data.userEmail?.trim().toLowerCase() || undefined,
    userDisplayName: data.userDisplayName?.trim() || undefined,
    webRoleIds: data.webRoleIds ?? [],
    webRoleNames: data.webRoleNames ?? [],
    status: data.status === "inactive" ? "inactive" : "active",
  }).then(r => r.id);
}

export async function upsertCompanyUser(data: {
  companyId: string;
  userId: string;
  user?: string;
  usersDocId?: string;
  userEmail?: string;
  userDisplayName?: string;
  webRoleIds: string[];
  webRoleNames?: string[];
  status: "active" | "inactive";
}): Promise<string> {
  const saved = await apiUpsertCompanyUser(data);
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
