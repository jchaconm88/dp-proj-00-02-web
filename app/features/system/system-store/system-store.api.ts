import { webFetch } from "~/lib/backend-client";
import type { ProfileRecord } from "~/features/system/users/users.types";
import type { RoleRecord } from "~/features/system/roles/roles.types";
import type { CompanyUserRecord } from "~/features/system/company-users/company-users.types";
import { getAllRoles } from "~/features/system/roles/roles.service";
export async function apiListUsers(): Promise<{ items: ProfileRecord[]; last: null }> {
  const items = await webFetch<ProfileRecord[]>("/system/users");
  return { items, last: null };
}

/** Listado merge (catálogo + `roles`) vía backend Web; alineado con `systemListRolesByCompany`. */
export async function apiListRolesByCompany(companyId: string): Promise<{ items: RoleRecord[] }> {
  const items = await getAllRoles(companyId);
  return { items };
}

export async function apiListCompanyUsers(companyId: string): Promise<{ items: CompanyUserRecord[] }> {
  const cid = String(companyId ?? "").trim();
  if (!cid) return { items: [] };
  return webFetch<{ items: CompanyUserRecord[] }>(`/system/company-users?companyId=${encodeURIComponent(cid)}`);
}

export async function apiListMyCompanyUsers(): Promise<{ items: CompanyUserRecord[] }> {
  return webFetch<{ items: CompanyUserRecord[] }>("/system/company-users/me");
}

export async function apiUpsertCompanyUser(data: {
  companyId: string;
  userId: string;
  user?: string;
  usersDocId?: string;
  userEmail?: string;
  userDisplayName?: string;
  webRoleIds: string[];
  webRoleNames?: string[];
  status: "active" | "inactive";
}): Promise<{ id: string }> {
  return webFetch<{ id: string }>("/system/company-users", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function apiUpdateCompanyUser(
  id: string,
  data: Partial<Omit<CompanyUserRecord, "id">>
): Promise<{ ok: boolean }> {
  const docId = String(id ?? "").trim();
  if (!docId) return { ok: false };
  return webFetch<{ ok: boolean }>(`/system/company-users/${encodeURIComponent(docId)}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function apiDeleteCompanyUser(id: string): Promise<{ ok: boolean }> {
  const docId = String(id ?? "").trim();
  if (!docId) return { ok: false };
  return webFetch<{ ok: boolean }>(`/system/company-users/${encodeURIComponent(docId)}`, { method: "DELETE" });
}
