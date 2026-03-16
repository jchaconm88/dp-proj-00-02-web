import { useRef, useState } from "react";
import { useNavigate, useNavigation, useRevalidator } from "react-router";
import { getModules, deleteModule, type ModuleRecord } from "~/features/system/modules";
import type { Route } from "./+types/ModulesPage";
import { DpContent, DpContentHeader } from "~/components/DpContent";
import { DpTable, type DpTableRef, type DpTableDefColumn } from "~/components/DpTable";
import ModuleDialog from "./ModuleDialog";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Módulos" },
    { name: "description", content: "Mantenimiento de módulos del sistema" },
  ];
}

// clientLoader: carga datos antes de renderizar el componente.
export async function clientLoader({}: Route.ClientLoaderArgs) {
  const { items } = await getModules();
  return { modules: items };
}

const TABLE_DEF: DpTableDefColumn[] = [
  { header: "Colección", column: "id", order: 1, display: true, filter: true },
  { header: "Descripción", column: "description", order: 2, display: true, filter: true },
];

export default function Modules({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const tableRef = useRef<DpTableRef<ModuleRecord>>(null);
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

  const openEdit = (module: ModuleRecord) => {
    setEditingId(module.id);
    setDialogVisible(true);
  };

  const openInfo = (module: ModuleRecord) => {
    navigate("/system/modules/" + encodeURIComponent(module.id));
  };

  const handleDeleteSelected = async () => {
    const selected = tableRef.current?.getSelectedRows() ?? [];
    if (selected.length === 0) return;
    if (!confirm(`Â¿Eliminar ${selected.length} módulo(s)?`)) return;
    setSaving(true);
    setError(null);
    try {
      await Promise.all(selected.map((m) => deleteModule(m.id)));
      tableRef.current?.clearSelectedRows();
      revalidator.revalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DpContent title="MÓDULOS">
      <DpContentHeader
        filterValue={filterValue}
        onFilter={handleFilter}
        onLoad={() => revalidator.revalidate()}
        onCreate={openAdd}
        onDelete={handleDeleteSelected}
        deleteDisabled={selectedCount === 0 || saving}
        loading={isLoading}
        filterPlaceholder="Filtrar por colección o descripción..."
      />

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}

      {/* data prop: modo controlado â€” se actualiza automáticamente con cada revalidación */}
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
        filterPlaceholder="Filtrar por colección o descripción..."
        emptyMessage='No hay módulos en la colección "modules".'
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
    </DpContent>
  );
}
