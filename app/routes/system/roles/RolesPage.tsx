import { useRef, useState } from "react";
import { useNavigate, useNavigation, useRevalidator } from "react-router";
import { getRoles, deleteRole, type RoleRecord } from "~/features/system/roles";
import { getActiveCompanyId } from "~/lib/tenant";
import type { Route } from "./+types/RolesPage";
import { DpContent, DpContentHeader } from "~/components/DpContent";
import { DpTable, type DpTableRef } from "~/components/DpTable";
import { DpConfirmDialog } from "~/components/DpConfirmDialog";
import { moduleTableDef } from "~/data/system-modules";
import RoleDialog from "./RoleDialog";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Roles" },
    { name: "description", content: "Mantenimiento de roles" },
  ];
}

// clientLoader: roles filtrados por empresa activa (localStorage).
export async function clientLoader({}: Route.ClientLoaderArgs) {
  const companyId = getActiveCompanyId();
  if (!companyId) {
    return { roles: [] as RoleRecord[], companyId: null as string | null };
  }
  const { items } = await getRoles({ companyId });
  return { roles: items, companyId };
}

const TABLE_DEF = moduleTableDef("role");

export default function Roles({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const tableRef = useRef<DpTableRef<RoleRecord>>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedCount, setSelectedCount] = useState(0);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(null);
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

  const openDeleteConfirm = () => {
    const selected = tableRef.current?.getSelectedRows() ?? [];
    if (selected.length === 0) return;
    setPendingDeleteIds(selected.map((r) => r.id));
  };

  const handleConfirmDelete = async () => {
    const ids = pendingDeleteIds;
    if (!ids?.length) return;
    setSaving(true);
    setError(null);
    try {
      await Promise.all(ids.map((id) => deleteRole(id)));
      tableRef.current?.clearSelectedRows();
      setPendingDeleteIds(null);
      revalidator.revalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar.");
    } finally {
      setSaving(false);
    }
  };

  const closeDeleteConfirm = () => {
    if (!saving) setPendingDeleteIds(null);
  };

  return (
    <DpContent
      title="ROLES"
      breadcrumbItems={["SISTEMA", "ROLES"]}
      onCreate={loaderData.companyId ? openAdd : undefined}
    >
      <DpContentHeader
        filterValue={filterValue}
        onFilter={handleFilter}
        onLoad={() => revalidator.revalidate()}
        showCreateButton={false}
        onDelete={openDeleteConfirm}
        deleteDisabled={selectedCount === 0 || saving}
        loading={isLoading}
        filterPlaceholder="Filtrar por nombre o descripción..."
      />

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}

      {!loaderData.companyId && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          Selecciona una empresa en el encabezado para ver y gestionar roles de esa empresa.
        </div>
      )}

      {/* data prop: modo controlado - se actualiza automáticamente con cada revalidación */}
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
        companyId={loaderData.companyId}
        onSuccess={() => {
          setDialogVisible(false);
          revalidator.revalidate();
        }}
        onHide={() => setDialogVisible(false)}
      />

      <DpConfirmDialog
        visible={pendingDeleteIds !== null}
        onHide={closeDeleteConfirm}
        title="Eliminar roles"
        message={
          pendingDeleteIds?.length
            ? `¿Eliminar ${pendingDeleteIds.length} rol(es)? Esta acción no se puede deshacer.`
            : ""
        }
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={handleConfirmDelete}
        severity="danger"
        loading={saving}
      />
    </DpContent>
  );
}
