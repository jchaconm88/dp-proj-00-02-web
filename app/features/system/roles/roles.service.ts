import { where } from "firebase/firestore";
import { ROLES_COLLECTION } from "~/lib/auth-context";
import {
  getDocument,
  getCollection,
  addDocument,
  updateDocument,
  deleteDocument,
  getCollectionWithMultiFilter,
} from "~/lib/firestore.service";
import { getCompanyById } from "~/features/system/companies";
import type { RoleRecord, RolePermissions } from "./roles.types";

async function accountIdForCompany(companyId: string): Promise<string> {
  const c = await getCompanyById(companyId.trim());
  return c?.accountId?.trim() || companyId.trim();
}

type RoleDoc = {
  companyId?: string;
  name?: string;
  description?: string;
  permissions?: unknown;
  permission?: string[];
  createBy?: string;
  createAt?: unknown;
  updateBy?: string;
  updateAt?: unknown;
};

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

function toRoleRecord(id: string, data: RoleDoc): RoleRecord {
  return {
    id,
    companyId: data.companyId,
    name: data.name ?? "",
    description: data.description ?? "",
    permissions: normalizePermissions(data.permissions),
    permission: Array.isArray(data.permission) ? data.permission : [],
    createBy: data.createBy,
    createAt: data.createAt,
    updateBy: data.updateBy,
    updateAt: data.updateAt,
  };
}

/** Obtiene un rol por ID. */
export async function getRoleById(id: string): Promise<RoleRecord | null> {
  const snap = await getDocument<RoleDoc>(ROLES_COLLECTION, id);
  if (!snap) return null;
  return toRoleRecord(snap.id, snap);
}

export async function getRoles(opts?: {
  companyId?: string | null;
  pageSize?: number;
  last?: unknown;
}): Promise<{ items: RoleRecord[]; last: null }> {
  const rows =
    opts?.companyId ?
      await getCollectionWithMultiFilter<RoleDoc>(ROLES_COLLECTION, [
        where("companyId", "==", opts.companyId),
        where("accountId", "==", await accountIdForCompany(opts.companyId)),
      ])
    : await getCollection<RoleDoc>(ROLES_COLLECTION, opts?.pageSize ?? 200);
  const items = rows.map((r) => toRoleRecord(r.id, r));
  items.sort((a, b) => a.name.localeCompare(b.name));
  return { items, last: null };
}

/** Obtiene todos los roles para resolver permisos del usuario. */
export async function getAllRoles(companyId: string): Promise<RoleRecord[]> {
  const accountId = await accountIdForCompany(companyId);
  const rows = await getCollectionWithMultiFilter<RoleDoc>(ROLES_COLLECTION, [
    where("companyId", "==", companyId),
    where("accountId", "==", accountId),
  ]);
  const items = rows.map((r) => toRoleRecord(r.id, r));
  items.sort((a, b) => a.name.localeCompare(b.name));
  return items;
}

/** Crea un rol nuevo (requiere empresa activa / companyId). */
export async function addRole(data: {
  companyId: string;
  name: string;
  description: string | null;
}): Promise<string> {
  if (!data.companyId?.trim()) throw new Error("companyId es obligatorio para crear un rol.");
  const accountId = await accountIdForCompany(data.companyId);
  return addDocument(ROLES_COLLECTION, {
    companyId: data.companyId.trim(),
    accountId,
    name: data.name,
    description: data.description ?? "",
    permissions: {},
  });
}

/** Actualiza campos parciales de un rol. */
export async function updateRole(id: string, data: Partial<Omit<RoleRecord, "id">>): Promise<void> {
  await updateDocument(ROLES_COLLECTION, id, data);
}

/** @deprecated Usar addRole/updateRole */
export async function saveRole(id: string, data: Omit<RoleRecord, "id">): Promise<string> {
  const payload = {
    companyId: data.companyId,
    name: data.name,
    description: data.description,
    permissions: data.permissions ?? {},
  };
  if (!id) {
    if (!data.companyId?.trim()) throw new Error("companyId es obligatorio para crear un rol.");
    const accountId = await accountIdForCompany(data.companyId);
    return addDocument(ROLES_COLLECTION, {
      ...payload,
      companyId: data.companyId!.trim(),
      accountId,
    });
  }
  await updateDocument(ROLES_COLLECTION, id, payload);
  return id;
}

export async function deleteRole(id: string): Promise<void> {
  await deleteDocument(ROLES_COLLECTION, id);
}
