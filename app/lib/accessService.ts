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
  if (effectivePermissions.includes("*")) return true;
  if (effectivePermissions.includes(module)) return true;
  const exact = toResolvedPermission(permission, module);
  if (effectivePermissions.includes(exact)) return true;
  if (effectivePermissions.includes("*:" + module)) return true;
  return false;
}
