export type PermissionMap = Record<string, string[]>;

export type PermissionSource = {
  permission?: string[];
  permissions?: PermissionMap;
};

export function normalizePermissionCode(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

export function collectPermissionCodes(source: PermissionSource): string[] {
  const out = new Set<string>();

  for (const legacy of source.permission ?? []) {
    const code = normalizePermissionCode(legacy);
    if (code) out.add(code);
  }

  const mapped = source.permissions ?? {};
  for (const [moduleRaw, actionsRaw] of Object.entries(mapped)) {
    const moduleName = normalizePermissionCode(moduleRaw);
    const actions = Array.isArray(actionsRaw) ? actionsRaw : [];
    if (!moduleName || actions.length === 0) continue;

    for (const actionRaw of actions) {
      const action = normalizePermissionCode(actionRaw);
      if (!action) continue;
      if (moduleName === "*" && action === "*") {
        out.add("*");
        continue;
      }
      if (action === "*") {
        out.add(`*:${moduleName}`);
        continue;
      }
      out.add(`${moduleName}:${action}`);
    }
  }

  return Array.from(out);
}

export function hasPermissionCode(
  effectivePermissions: string[],
  permission: string,
  moduleName: string
): boolean {
  const moduleCode = normalizePermissionCode(moduleName);
  const permissionCode = normalizePermissionCode(permission);
  const set = new Set((effectivePermissions ?? []).map((x) => normalizePermissionCode(x)).filter(Boolean));

  return (
    set.has("*")
    || set.has(moduleCode)
    || set.has(`${moduleCode}:${permissionCode}`)
    || set.has(`*:${moduleCode}`)
  );
}
