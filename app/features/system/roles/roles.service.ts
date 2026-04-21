import { ROLES_COLLECTION } from "~/lib/auth-context";
import {
  getDocument,
  addDocument,
  updateDocument,
  deleteDocument,
} from "~/lib/firestore.service";
import { apiListRolesByCompany } from "~/features/system/system-store/system-store.api";
import { getCompanyById } from "~/features/system/companies";
import type { RoleRecord, RolePermissions } from "./roles.types";

function getErrorCode(err: unknown): string {
  if (err && typeof err === "object" && "code" in err) {
    return String((err as { code?: unknown }).code ?? "").trim();
  }
  return "";
}

function mapRolePermissionError(err: unknown, actionLabel: string, requiredPermission: string): Error {
  const code = getErrorCode(err);
  if (code.includes("permission-denied")) {
    return new Error(
      `No tienes permisos para ${actionLabel}. Permiso requerido: ${requiredPermission} (o *).`
    );
  }
  if (code.includes("unauthenticated")) {
    return new Error("Tu sesión expiró. Inicia sesión nuevamente.");
  }
  if (err instanceof Error && err.message.trim()) return err;
  return new Error("Error al procesar roles.");
}

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
  if (opts?.companyId) {
    const { items } = await apiListRolesByCompany(opts.companyId);
    return { items, last: null };
  }
  // Sin companyId: no hay callable para listar todos — devolver vacío
  return { items: [], last: null };
}

/** Obtiene todos los roles para resolver permisos del usuario. */
export async function getAllRoles(companyId: string): Promise<RoleRecord[]> {
  const { items } = await apiListRolesByCompany(companyId);
  return items;
}

/** Crea un rol nuevo (requiere empresa activa / companyId). */
export async function addRole(data: {
  companyId: string;
  name: string;
  description: string | null;
}): Promise<string> {
  try {
    if (!data.companyId?.trim()) throw new Error("companyId es obligatorio para crear un rol.");
    const accountId = await accountIdForCompany(data.companyId);
    return addDocument(ROLES_COLLECTION, {
      companyId: data.companyId.trim(),
      accountId,
      name: data.name,
      description: data.description ?? "",
      permissions: {},
    });
  } catch (err) {
    throw mapRolePermissionError(err, "crear roles", "role:create");
  }
}

/** Actualiza campos parciales de un rol. */
export async function updateRole(id: string, data: Partial<Omit<RoleRecord, "id">>): Promise<void> {
  try {
    await updateDocument(ROLES_COLLECTION, id, data);
  } catch (err) {
    throw mapRolePermissionError(err, "editar roles", "role:edit");
  }
}

/** @deprecated Usar addRole/updateRole */
export async function saveRole(id: string, data: Omit<RoleRecord, "id">): Promise<string> {
  try {
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
  } catch (err) {
    throw mapRolePermissionError(err, id ? "editar roles" : "crear roles", id ? "role:edit" : "role:create");
  }
}

export async function deleteRole(id: string): Promise<void> {
  try {
    await deleteDocument(ROLES_COLLECTION, id);
  } catch (err) {
    throw mapRolePermissionError(err, "eliminar roles", "role:delete");
  }
}
