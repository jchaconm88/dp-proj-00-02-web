import { callHttpsFunction } from "~/lib/functions.service";
import type { ProfileRecord } from "~/features/system/users/users.types";
import type { RoleRecord } from "~/features/system/roles/roles.types";
import type { CompanyUserRecord } from "~/features/system/company-users/company-users.types";
export async function apiListUsers(): Promise<{ items: ProfileRecord[]; last: null }> {
  return callHttpsFunction<{}, { items: ProfileRecord[]; last: null }>("systemListUsers", {});
}

export async function apiListRolesByCompany(companyId: string): Promise<{ items: RoleRecord[] }> {
  return callHttpsFunction<{ companyId: string }, { items: RoleRecord[] }>("systemListRolesByCompany", {
    companyId,
  });
}

export async function apiListCompanyUsers(companyId: string): Promise<{ items: CompanyUserRecord[] }> {
  return callHttpsFunction<{ companyId: string }, { items: CompanyUserRecord[] }>("systemListCompanyUsers", {
    companyId,
  });
}

export async function apiListMyMemberships(legacyUsersDocId?: string | null): Promise<{ items: CompanyUserRecord[] }> {
  return callHttpsFunction<{ legacyUsersDocId?: string | null }, { items: CompanyUserRecord[] }>(
    "systemListMyMemberships",
    { legacyUsersDocId }
  );
}

export async function apiSaveCompanyMembership(data: {
  companyId: string;
  userId: string;
  user?: string;
  usersDocId?: string;
  userEmail?: string;
  userDisplayName?: string;
  roleIds: string[];
  roleNames?: string[];
  status: "active" | "inactive";
}): Promise<{ id: string }> {
  return callHttpsFunction<typeof data, { id: string }>("systemSaveCompanyMembership", data);
}

export async function apiUpdateCompanyUser(
  id: string,
  data: Partial<Omit<CompanyUserRecord, "id">>
): Promise<{ ok: boolean }> {
  return callHttpsFunction<{ id: string; data: Partial<Omit<CompanyUserRecord, "id">> }, { ok: boolean }>(
    "systemUpdateCompanyUser",
    { id, data }
  );
}

export async function apiDeleteCompanyUser(id: string): Promise<{ ok: boolean }> {
  return callHttpsFunction<{ id: string }, { ok: boolean }>("systemDeleteCompanyUser", { id });
}
