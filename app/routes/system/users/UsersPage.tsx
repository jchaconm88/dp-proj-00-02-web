import { useRef, useState } from "react";
import { useNavigation, useRevalidator } from "react-router";
import {
  deleteProfile,
  getProfiles,
  saveProfile,
  type ProfileRecord,
} from "~/features/system/users";
import type { Route } from "./+types/UsersPage";
import { DpContent, DpContentHeader } from "~/components/DpContent";
import { DpTable, type DpTableRef, type DpTableDefColumn } from "~/components/DpTable";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Usuarios" },
    { name: "description", content: "Mantenimiento de usuarios" },
  ];
}

// clientLoader: carga datos antes de renderizar el componente.
export async function clientLoader({}: Route.ClientLoaderArgs) {
  const { items } = await getProfiles();
  return { users: items };
}

const TABLE_DEF: DpTableDefColumn[] = [
  { header: "Nombre", column: "displayName", order: 1, display: true, filter: true },
  { header: "Correo",  column: "email",       order: 2, display: true, filter: true },
  { header: "Roles",   column: "roleIds",     order: 3, display: true, filter: false },
];

export default function Users({ loaderData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const tableRef = useRef<DpTableRef<ProfileRecord>>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedCount, setSelectedCount] = useState(0);
  const [filterValue, setFilterValue] = useState("");
  const [editing, setEditing] = useState<ProfileRecord | null>(null);

  // Loading unificado: navegación entre rutas + revalidaciones
  const isLoading = navigation.state !== "idle" || revalidator.state === "loading";

  const handleFilter = (value: string) => {
    setFilterValue(value);
    tableRef.current?.filter(value);
  };

  const handleDeleteSelected = async () => {
    const selected = tableRef.current?.getSelectedRows() ?? [];
    if (selected.length === 0) return;
    if (!confirm(`Â¿Eliminar ${selected.length} usuario(s)?`)) return;
    try {
      await Promise.all(selected.map((u) => deleteProfile(u.id)));
      tableRef.current?.clearSelectedRows();
      revalidator.revalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar.");
    }
  };

  const handleEdit = (user: ProfileRecord) => {
    setEditing({ ...user });
  };

  const handleSave = async () => {
    if (!editing) return;
    try {
      await saveProfile(editing.id, {
        email: editing.email,
        displayName: editing.displayName,
        roleIds: editing.roleIds,
      });
      setEditing(null);
      revalidator.revalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.");
    }
  };

  return (
    <DpContent title="USUARIOS">
      <DpContentHeader
        filterValue={filterValue}
        onFilter={handleFilter}
        onLoad={() => revalidator.revalidate()}
        onDelete={handleDeleteSelected}
        deleteDisabled={selectedCount === 0 || isLoading}
        loading={isLoading}
        filterPlaceholder="Filtrar por nombre o correo..."
      />

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}

      {/* data prop: modo controlado â€” se actualiza automáticamente con cada revalidación */}
      <DpTable<ProfileRecord>
        ref={tableRef}
        data={loaderData.users}
        loading={isLoading}
        tableDef={TABLE_DEF}
        linkColumn="displayName"
        onDetail={handleEdit}
        onEdit={handleEdit}
        onSelectionChange={(rows) => setSelectedCount(rows.length)}
        showFilterInHeader={false}
        filterPlaceholder="Filtrar por nombre o correo..."
        emptyMessage='No hay usuarios en la colección.'
        emptyFilterMessage="No hay resultados para el filtro."
      />

      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full space-y-4">
            <h2 className="text-lg font-semibold">Editar usuario</h2>
            <div>
              <label className="block text-sm font-medium mb-1">Nombre</label>
              <input
                value={editing.displayName}
                onChange={(e) =>
                  setEditing((prev) =>
                    prev ? { ...prev, displayName: e.target.value } : null
                  )
                }
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Correo</label>
              <input
                type="email"
                value={editing.email}
                onChange={(e) =>
                  setEditing((prev) =>
                    prev ? { ...prev, email: e.target.value } : null
                  )
                }
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </DpContent>
  );
}
