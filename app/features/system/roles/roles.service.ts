import { webFetch } from "~/lib/backend-client";
import { requireActiveCompanyId } from "~/lib/tenant";
import type { RoleRecord, RolePermissions } from "./roles.types";

const BASE = "/system/web-roles";

function withCompany(path: string, companyId: string): string {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}companyId=${encodeURIComponent(companyId)}`;
}

function normalizePermissions(raw: unknown): RolePermissions {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: RolePermissions = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof key !== "string") continue;
    if (Array.isArray(value)) {
      out[key] = value.filter((c): c is string => typeof c === "string");
    }
  }
  return out;
}

function toRoleRecord(data: Record<string, unknown>): RoleRecord {
  return {
    id: String(data.id ?? ""),
    companyId: String(data.companyId ?? "").trim() || undefined,
    accountId: String(data.accountId ?? "").trim() || undefined,
    name: String(data.name ?? ""),
    description: String(data.description ?? ""),
    permissions: normalizePermissions(data.permissions),
    permission: Array.isArray(data.permission) ? (data.permission as string[]).filter((x) => typeof x === "string") : [],
    createBy: data.createBy != null ? String(data.createBy) : undefined,
    createAt: data.createAt,
    updateBy: data.updateBy != null ? String(data.updateBy) : undefined,
    updateAt: data.updateAt,
    source: data.source === "custom" ? "custom" : "default",
    readonly: data.readonly === true,
  };
}

/** Obtiene un rol por ID (catálogo merge + custom en `roles`). */
export async function getRoleById(id: string): Promise<RoleRecord | null> {
  const companyId = requireActiveCompanyId();
  try {
    const row = await webFetch<Record<string, unknown>>(withCompany(`${BASE}/${encodeURIComponent(id)}`, companyId));
    return toRoleRecord(row);
  } catch {
    return null;
  }
}

export async function getRoles(opts?: {
  companyId?: string | null;
  pageSize?: number;
  last?: unknown;
}): Promise<{ items: RoleRecord[]; last: null }> {
  const fromOpts = opts?.companyId != null ? String(opts.companyId).trim() : "";
  const companyId = fromOpts || requireActiveCompanyId();
  const rows = await webFetch<Record<string, unknown>[]>(withCompany(BASE, companyId));
  const items = rows.map(toRoleRecord).sort((a, b) => a.name.localeCompare(b.name));
  return { items, last: null };
}

/** Todos los roles de la empresa para permisos efectivos y pickers. */
export async function getAllRoles(companyId: string): Promise<RoleRecord[]> {
  const cid = String(companyId ?? "").trim();
  if (!cid) return [];
  const rows = await webFetch<Record<string, unknown>[]>(withCompany(BASE, cid));
  return rows.map(toRoleRecord).sort((a, b) => a.name.localeCompare(b.name));
}

/** Crea un rol custom (solo Firestore `roles`). */
export async function addRole(data: {
  companyId: string;
  name: string;
  description: string | null;
}): Promise<string> {
  if (!data.companyId?.trim()) throw new Error("companyId es obligatorio para crear un rol.");
  const companyId = data.companyId.trim();
  const res = await webFetch<{ ok: boolean; id: string }>(BASE, {
    method: "POST",
    body: JSON.stringify({
      companyId,
      name: data.name.trim(),
      description: (data.description ?? "").trim(),
      permissions: {},
      permission: [],
    }),
  });
  return res.id;
}

export async function updateRole(id: string, data: Partial<Omit<RoleRecord, "id">>): Promise<void> {
  const companyId = requireActiveCompanyId();
  const { id: _i, source: _s, readonly: _r, ...rest } = data as Record<string, unknown>;
  await webFetch(withCompany(`${BASE}/${encodeURIComponent(id)}`, companyId), {
    method: "PUT",
    body: JSON.stringify({ ...rest, companyId }),
  });
}

/** @deprecated Usar addRole/updateRole */
export async function saveRole(id: string, data: Omit<RoleRecord, "id">): Promise<string> {
  const companyId = data.companyId?.trim() || requireActiveCompanyId();
  const payload = {
    name: data.name,
    description: data.description,
    permissions: data.permissions ?? {},
    permission: data.permission ?? [],
  };
  if (!id) {
    if (!companyId) throw new Error("companyId es obligatorio para crear un rol.");
    const res = await webFetch<{ ok: boolean; id: string }>(BASE, {
      method: "POST",
      body: JSON.stringify({ companyId, ...payload }),
    });
    return res.id;
  }
  await webFetch(withCompany(`${BASE}/${encodeURIComponent(id)}`, companyId), {
    method: "PUT",
    body: JSON.stringify({ ...payload, companyId }),
  });
  return id;
}

export async function deleteRole(id: string): Promise<void> {
  const companyId = requireActiveCompanyId();
  await webFetch(withCompany(`${BASE}/${encodeURIComponent(id)}`, companyId), { method: "DELETE" });
}
