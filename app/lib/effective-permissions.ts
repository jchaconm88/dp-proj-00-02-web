import { COMPANY_ADMIN_ROLE_MARKER } from "~/features/system/company-users";
import { collectPermissionCodes } from "~/lib/permission-codes";
import type { RoleRecord } from "~/features/system/roles";

/**
 * Permisos efectivos para la empresa activa: unión de códigos de los `roles` asignados al miembro.
 */
export function getEffectivePermissions(
  membershipRoleIds: string[],
  membershipRoleNames: string[],
  roles: RoleRecord[]
): string[] {
  const roleMap = new Map(roles.map((r) => [r.id, r]));
  const byName = new Map(roles.map((r) => [r.name.toLowerCase(), r]));
  let hasWildcard = false;
  const set = new Set<string>();
  for (const rid of membershipRoleIds) {
    if (rid === COMPANY_ADMIN_ROLE_MARKER) continue;
    const role = roleMap.get(rid) ?? byName.get(rid.toLowerCase());
    const perms = role ? collectPermissionCodes(role) : [];
    if (perms.includes("*")) hasWildcard = true;
    perms.forEach((p) => set.add(p));
  }
  for (const roleName of membershipRoleNames) {
    const role = byName.get(String(roleName).toLowerCase());
    const perms = role ? collectPermissionCodes(role) : [];
    if (perms.includes("*")) hasWildcard = true;
    perms.forEach((p) => set.add(p));
  }
  if (hasWildcard) return ["*"];
  return Array.from(set);
}
