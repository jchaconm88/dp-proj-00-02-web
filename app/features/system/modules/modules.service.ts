import { getDocument, getCollection, createDocumentWithId, updateDocument, deleteDocument } from "~/lib/firestore.service";
import type { ModuleRecord, ModuleEditInput } from "./modules.types";

const COLLECTION = "modules";

type ModuleDoc = Omit<ModuleRecord, "id">;

function normalizeRecord(id: string, data: Record<string, unknown>): ModuleRecord {
  const rawPermissions = Array.isArray(data.permissions) ? data.permissions : [];
  const rawColumns = Array.isArray(data.columns) ? data.columns : [];

  return {
    id,
    description: String(data.description ?? ""),
    permissions: rawPermissions
      .map((p: unknown) => {
        if (typeof p === "string") return { code: p, label: p, description: "" };
        if (p != null && typeof p === "object") {
          const o = p as Record<string, unknown>;
          return {
            code: String(o.code ?? ""),
            label: String(o.label ?? ""),
            description: String(o.description ?? ""),
          };
        }
        return { code: "", label: "", description: "" };
      })
      .filter((p) => p.code !== ""),
    columns: rawColumns.map((c: unknown) => {
      const col = c as Record<string, unknown>;
      return {
        order: Number(col?.order) || 0,
        name: String(col?.name ?? ""),
        header: String(col?.header ?? ""),
        filter: Boolean(col?.filter),
        ...(col?.format != null && col.format !== "" ? { format: String(col.format) } : {}),
      };
    }),
  };
}

/** Obtiene un módulo por ID. */
export async function getModule(id: string): Promise<ModuleRecord | null> {
  const snap = await getDocument<Record<string, unknown>>(COLLECTION, id);
  if (!snap) return null;
  return normalizeRecord(snap.id, snap);
}

/** Lista todos los módulos. */
export async function getModules(): Promise<{ items: ModuleRecord[] }> {
  const rows = await getCollection<ModuleDoc>(COLLECTION, 200);
  const items = rows.map((r) => normalizeRecord(r.id, r as unknown as Record<string, unknown>));
  items.sort((a, b) => a.id.localeCompare(b.id));
  return { items };
}

/** Crea un módulo con id = name. */
export async function addModule(data: { name: string; description: string }): Promise<void> {
  await createDocumentWithId(COLLECTION, data.name.trim(), {
    description: data.description.trim(),
    permissions: [],
    columns: [],
  });
}

/** Actualiza un módulo (campos parciales). */
export async function saveModule(id: string, data: ModuleEditInput): Promise<void> {
  await updateDocument<ModuleDoc>(COLLECTION, id, data as Partial<ModuleDoc>);
}

/** Elimina un módulo. */
export async function deleteModule(id: string): Promise<void> {
  await deleteDocument(COLLECTION, id);
}
