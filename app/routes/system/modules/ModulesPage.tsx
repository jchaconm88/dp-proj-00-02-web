import { useRef, useState } from "react";
import { useNavigate, useNavigation, useRevalidator } from "react-router";
import { getModules, deleteModule, type ModuleRecord } from "~/features/system/modules";
import { getActiveCompanyId } from "~/lib/tenant";
import type { Route } from "./+types/ModulesPage";
import { DpContent, DpContentHeader } from "~/components/DpContent";
import { DpTable, type DpTableRef, type DpTableDefColumn } from "~/components/DpTable";
import { DpConfirmDialog } from "~/components/DpConfirmDialog";
import ModuleDialog from "./ModuleDialog";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Mรณdulos" },
    { name: "description", content: "Mantenimiento de mรณdulos del sistema" },
  ];
}

// clientLoader: carga datos antes de renderizar el componente.
export async function clientLoader({}: Route.ClientLoaderArgs) {
  const companyId = getActiveCompanyId();
  if (!companyId) {
    return { modules: [] as ModuleRecord[], companyId: null as string | null };
  }
  const { items } = await getModules();
  return { modules: items, companyId };
}

const TABLE_DEF: DpTableDefColumn[] = [
  { header: "Colecciรณn", column: "id", order: 1, display: true, filter: true },
  { header: "Descripciรณn", column: "description", order: 2, display: true, filter: true },
];

export default function Modules({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const tableRef = useRef<DpTableRef<ModuleRecord>>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedCount, setSelectedCount] = useState(0);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(null);
  const [filterValue, setFilterValue] = useState("");
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Loading unificado: navegaciรณn entre rutas + revalidaciones
  const isLoading = navigation.state !== "idle" || revalidator.state === "loading";

  const handleFilter = (value: string) => {
    setFilterValue(value);
    tableRef.current?.filter(value);
  };

  const openAdd = () => {
    setEditingId(null);
    setDialogVisible(true);
  };

  const openEdit = (module: ModuleRecord) => {
    setEditingId(module.id);
    setDialogVisible(true);
  };

  const openInfo = (module: ModuleRecord) => {
    navigate("/system/modules/" + encodeURIComponent(module.id));
  };

  const openDeleteConfirm = () => {
    const selected = tableRef.current?.getSelectedRows() ?? [];
    if (selected.length === 0) return;
    setPendingDeleteIds(selected.map((m) => m.id));
  };

  const handleConfirmDelete = async () => {
    const ids = pendingDeleteIds;
    if (!ids?.length) return;
    setSaving(true);
    setError(null);
    try {
      await Promise.all(ids.map((id) => deleteModule(id)));
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
      title="Mร�DULOS"
      breadcrumbItems={["SISTEMA", "Mร�DULOS"]}
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
        filterPlaceholder="Filtrar por colecciรณn o descripciรณn..."
      />

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}

      {!loaderData.companyId && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          Selecciona una empresa en el encabezado para ver y gestionar mรณdulos de esa empresa.
        </div>
      )}

      {/* data prop: modo controlado - se actualiza automรกticamente con cada revalidaciรณn */}
      <DpTable<ModuleRecord>
        ref={tableRef}
        data={loaderData.modules}
        loading={isLoading}
        tableDef={TABLE_DEF}
        linkColumn="id"
        onDetail={openInfo}
        onEdit={openEdit}
        onSelectionChange={(rows) => setSelectedCount(rows.length)}
        showFilterInHeader={false}
        filterPlaceholder="Filtrar por colecciรณn o descripciรณn..."
        emptyMessage='No hay mรณdulos en la colecciรณn "modules".'
        emptyFilterMessage="No hay resultados para el filtro."
      />

      <ModuleDialog
        visible={dialogVisible}
        moduleId={editingId}
        onSuccess={(id) => {
          setDialogVisible(false);
          if (!editingId) {
            // Si es nuevo, navegar a su detalle
            navigate("/system/modules/" + encodeURIComponent(id));
          } else {
            revalidator.revalidate();
          }
        }}
        onHide={() => setDialogVisible(false)}
      />

      <DpConfirmDialog
        visible={pendingDeleteIds !== null}
        onHide={closeDeleteConfirm}
        title="Eliminar mรณdulos"
        message={
          pendingDeleteIds?.length
            ? `ยฟEliminar ${pendingDeleteIds.length} mรณdulo(s)? Esta acciรณn no se puede deshacer.`
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
