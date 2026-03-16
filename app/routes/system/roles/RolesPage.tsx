import { useRef, useState } from "react";
import { useNavigate, useNavigation, useRevalidator } from "react-router";
import { getRoles, deleteRole, type RoleRecord } from "~/features/system/roles";
import type { Route } from "./+types/RolesPage";
import { DpContent, DpContentHeader } from "~/components/DpContent";
import { DpTable, type DpTableRef, type DpTableDefColumn } from "~/components/DpTable";
import RoleDialog from "./RoleDialog";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Roles" },
    { name: "description", content: "Mantenimiento de roles" },
  ];
}

// clientLoader: carga datos antes de renderizar el componente.
export async function clientLoader({}: Route.ClientLoaderArgs) {
  const { items } = await getRoles();
  return { roles: items };
}

const TABLE_DEF: DpTableDefColumn[] = [
  { header: "Nombre", column: "name", order: 1, display: true, filter: true },
  { header: "Descripción", column: "description", order: 2, display: true, filter: true },
];

export default function Roles({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const tableRef = useRef<DpTableRef<RoleRecord>>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedCount, setSelectedCount] = useState(0);
  const [filterValue, setFilterValue] = useState("");
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Loading unificado: navegación entre rutas + revalidaciones
  const isLoading = navigation.state !== "idle" || revalidator.state === "loading";

  const handleFilter = (value: string) => {
    setFilterValue(value);
    tableRef.current?.filter(value);
  };

  const openAdd = () => {
    setEditingId(null);
    setDialogVisible(true);
  };

  const openEdit = (role: RoleRecord) => {
    setEditingId(role.id);
    setDialogVisible(true);
  };

  const openInfo = (role: RoleRecord) => {
    navigate("/system/roles/" + encodeURIComponent(role.id));
  };

  const handleDeleteSelected = async () => {
    const selected = tableRef.current?.getSelectedRows() ?? [];
    if (selected.length === 0) return;
    if (!confirm(`Â¿Eliminar ${selected.length} rol(es)?`)) return;
    setSaving(true);
    setError(null);
    try {
      await Promise.all(selected.map((r) => deleteRole(r.id)));
      tableRef.current?.clearSelectedRows();
      revalidator.revalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DpContent title="ROLES">
      <DpContentHeader
        filterValue={filterValue}
        onFilter={handleFilter}
        onLoad={() => revalidator.revalidate()}
        onCreate={openAdd}
        onDelete={handleDeleteSelected}
        deleteDisabled={selectedCount === 0 || saving}
        loading={isLoading}
        filterPlaceholder="Filtrar por nombre o descripción..."
      />

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}

      {/* data prop: modo controlado â€” se actualiza automáticamente con cada revalidación */}
      <DpTable<RoleRecord>
        ref={tableRef}
        data={loaderData.roles}
        loading={isLoading}
        tableDef={TABLE_DEF}
        linkColumn="name"
        onDetail={openInfo}
        onEdit={openEdit}
        onSelectionChange={(rows) => setSelectedCount(rows.length)}
        showFilterInHeader={false}
        filterPlaceholder="Filtrar por nombre o descripción..."
        emptyMessage='No hay roles en la colección "roles".'
        emptyFilterMessage="No hay resultados para el filtro."
      />

      <RoleDialog
        visible={dialogVisible}
        roleId={editingId}
        onSuccess={() => {
          setDialogVisible(false);
          revalidator.revalidate();
        }}
        onHide={() => setDialogVisible(false)}
      />
    </DpContent>
  );
}
