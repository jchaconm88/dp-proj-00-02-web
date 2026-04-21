import { getSystemModuleById } from "~/data/system-modules";
import { hasPermissionCode } from "~/lib/permission-codes";

/**
 * Validación de acceso (como dp-proj-00-01).
 * permission en menú es [action, module] ej. ["view", "user"].
 * effectivePermissions son los códigos de módulo (o "*") que tiene el usuario.
 */

export function toResolvedPermission(permission: string, module: string): string {
  return `${module}:${permission}`;
}

/**
 * Valida si el usuario tiene permiso para ver un ítem.
 * effectivePermissions: lista de módulos que tiene el usuario (ej. ["user", "role"]) o ["*"].
 * permission: [action, module] del ítem del menú (ej. ["view", "user"]).
 */
export function isGranted(
  effectivePermissions: string[],
  permission: string,
  module: string
): boolean {
  return hasPermissionCode(effectivePermissions, permission, module);
}

/**
 * Puede mostrarse el ítem de menú de un módulo: basta con cualquier permiso explícito de ese módulo
 * (`módulo:acción` o `*:módulo`), sin mezclar con otros módulos.
 */
export function canNavigateToModule(effectivePermissions: string[], moduleName: string): boolean {
  if (effectivePermissions.includes("*")) return true;
  const mod = getSystemModuleById(moduleName);
  const actions = mod?.permissions?.map((p) => p.code).filter(Boolean) ?? [
    "view",
    "edit",
    "create",
    "delete",
  ];
  for (const action of actions) {
    if (hasPermissionCode(effectivePermissions, action, moduleName)) return true;
  }
  return false;
}
