import { callHttpsFunction } from "~/lib/functions.service";
import type { ProfileRecord } from "~/features/system/users/users.types";
import type { RoleRecord } from "~/features/system/roles/roles.types";
import type { CompanyUserRecord } from "~/features/system/company-users/company-users.types";
import { getAllRoles } from "~/features/system/roles/roles.service";
export async function apiListUsers(): Promise<{ items: ProfileRecord[]; last: null }> {
  return callHttpsFunction<{}, { items: ProfileRecord[]; last: null }>("systemListUsers", {});
}

/** Listado merge (catálogo + `roles`) vía backend Web; alineado con `systemListRolesByCompany`. */
export async function apiListRolesByCompany(companyId: string): Promise<{ items: RoleRecord[] }> {
  const items = await getAllRoles(companyId);
  return { items };
}

export async function apiListCompanyUsers(companyId: string): Promise<{ items: CompanyUserRecord[] }> {
  return callHttpsFunction<{ companyId: string }, { items: CompanyUserRecord[] }>("systemListCompanyUsers", {
    companyId,
  });
}

export async function apiListMyCompanyUsers(): Promise<{ items: CompanyUserRecord[] }> {
  return callHttpsFunction<{}, { items: CompanyUserRecord[] }>(
    "systemListMyCompanyUsers",
    {}
  );
}

export async function apiUpsertCompanyUser(data: {
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
  return callHttpsFunction<typeof data, { id: string }>("systemUpsertCompanyUser", data);
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
