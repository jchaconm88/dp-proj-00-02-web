import { useRef, useState, useMemo } from "react";
import { useNavigate, useNavigation, useRevalidator } from "react-router";
import { getModule, saveModule } from "~/features/system/modules";
import type { ModuleRecord, ModulePermission, ModuleColumn } from "~/features/system/modules";
import type { Route } from "./+types/ModulesDetail";
import { DpContentInfo, DpContentHeader } from "~/components/DpContent";
import { DpTable, type DpTableRef, type DpTableDefColumn } from "~/components/DpTable";
import PermissionDialog from "./PermissionDialog";
import ColumnDialog from "./ColumnDialog";
import ModuleDialog from "./ModuleDialog";

export function meta({ params }: Route.MetaArgs) {
  return [
    { title: `Módulo: ${params.id}` },
    { name: "description", content: `Detalle del módulo ${params.id}` },
  ];
}

interface PermissionRow extends ModulePermission {
  id: string;
}

interface ColumnRow extends ModuleColumn {
  id: string;
}

const PERMISSIONS_TABLE_DEF: DpTableDefColumn[] = [
  { header: "Código", column: "code", order: 1, display: true, filter: true },
  { header: "Etiqueta", column: "label", order: 2, display: true, filter: true },
  { header: "Descripción", column: "description", order: 3, display: true, filter: true },
];

const COLUMNS_TABLE_DEF: DpTableDefColumn[] = [
  { header: "Orden", column: "order", order: 1, display: true, filter: false },
  { header: "Nombre", column: "name", order: 2, display: true, filter: true },
  { header: "Encabezado", column: "header", order: 3, display: true, filter: true },
  { header: "Filtro", column: "filter", order: 4, display: true, filter: false, type: "bool" },
  { header: "Formato", column: "format", order: 5, display: true, filter: true },
];

// clientLoader: carga el módulo por ID antes de renderizar el componente.
export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  if (!params.id) return { module: null };
  const module = await getModule(params.id);
  return { module: module ?? null };
}

export default function ModuleDetail({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const permissionTableRef = useRef<DpTableRef<PermissionRow>>(null);
  const columnTableRef = useRef<DpTableRef<ColumnRow>>(null);

  const { module } = loaderData;
  const moduleId = module?.id ?? null;
  const isLoading = navigation.state !== "idle" || revalidator.state === "loading";

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [permissionFilter, setPermissionFilter] = useState("");
  const [columnFilter, setColumnFilter] = useState("");
  const [selectedPermissionCount, setSelectedPermissionCount] = useState(0);
  const [selectedColumnCount, setSelectedColumnCount] = useState(0);
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false);
  const [permissionEditIndex, setPermissionEditIndex] = useState<number | null>(null);
  const [columnDialogOpen, setColumnDialogOpen] = useState(false);
  const [columnEditIndex, setColumnEditIndex] = useState<number | null>(null);
  const [editModuleOpen, setEditModuleOpen] = useState(false);

  // Filas derivadas del loaderData â€” se recalculan en cada revalidación (sin useEffect)
  const permissionRows = useMemo<PermissionRow[]>(
    () =>
      (Array.isArray(module?.permissions) ? module.permissions : []).map((p, i) => ({
        id: String(i),
        code: p?.code ?? "",
        label: p?.label ?? "",
        description: p?.description ?? "",
      })),
    [module]
  );

  const columnRows = useMemo<ColumnRow[]>(
    () =>
      (Array.isArray(module?.columns) ? module.columns : []).map((col, i) => ({
        id: String(i),
        ...col,
      })),
    [module]
  );

  const backToModules = () => navigate("/system/modules");

  const deletePermissions = async () => {
    if (!module || !moduleId) return;
    const selected = permissionTableRef.current?.getSelectedRows() ?? [];
    if (selected.length === 0) return;
    const indices = new Set(selected.map((r) => parseInt(r.id, 10)));
    const newPermissions = (Array.isArray(module.permissions) ? module.permissions : []).filter(
      (_, i) => !indices.has(i)
    );
    setSaving(true);
    setError(null);
    try {
      await saveModule(moduleId, { permissions: newPermissions });
      permissionTableRef.current?.clearSelectedRows();
      revalidator.revalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar.");
    } finally {
      setSaving(false);
    }
  };

  const deleteColumns = async () => {
    if (!module || !moduleId) return;
    const selected = columnTableRef.current?.getSelectedRows() ?? [];
    if (selected.length === 0) return;
    const indices = new Set(selected.map((r) => parseInt(r.id, 10)));
    const newColumns = module.columns.filter((_, i) => !indices.has(i));
    setSaving(true);
    setError(null);
    try {
      await saveModule(moduleId, { columns: newColumns });
      columnTableRef.current?.clearSelectedRows();
      revalidator.revalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar.");
    } finally {
      setSaving(false);
    }
  };

  const handlePermissionFilter = (value: string) => {
    setPermissionFilter(value);
    permissionTableRef.current?.filter(value);
  };

  const handleColumnFilter = (value: string) => {
    setColumnFilter(value);
    columnTableRef.current?.filter(value);
  };

  if (!moduleId) {
    return (
      <DpContentInfo title="MÓDULO" backLabel="Volver a módulos" onBack={backToModules}>
        <p className="text-zinc-500">ID de módulo no válido.</p>
      </DpContentInfo>
    );
  }

  if (!module) {
    return (
      <DpContentInfo title="MÓDULO" backLabel="Volver a módulos" onBack={backToModules}>
        <p className="text-zinc-500">Módulo no encontrado.</p>
      </DpContentInfo>
    );
  }

  return (
    <DpContentInfo
      title={module.description || module.id}
      backLabel="Volver a módulos"
      onBack={backToModules}
      editLabel="Editar módulo"
      onEdit={() => setEditModuleOpen(true)}
    >
      <div className="space-y-8">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Permisos */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">Permisos</h2>
          <DpContentHeader
            filterValue={permissionFilter}
            onFilter={handlePermissionFilter}
            onLoad={() => revalidator.revalidate()}
            onCreate={() => { setPermissionEditIndex(null); setPermissionDialogOpen(true); }}
            onDelete={deletePermissions}
            deleteDisabled={selectedPermissionCount === 0 || saving}
            loading={isLoading}
            filterPlaceholder="Filtrar permisos..."
          />
          {/* data prop: modo controlado â€” se actualiza con cada revalidación */}
          <DpTable<PermissionRow>
            ref={permissionTableRef}
            data={permissionRows}
            loading={isLoading}
            tableDef={PERMISSIONS_TABLE_DEF}
            linkColumn="code"
            onDetail={(row) => { setPermissionEditIndex(parseInt(row.id, 10)); setPermissionDialogOpen(true); }}
            onEdit={(row) => { setPermissionEditIndex(parseInt(row.id, 10)); setPermissionDialogOpen(true); }}
            onSelectionChange={(rows) => setSelectedPermissionCount(rows.length)}
            showFilterInHeader={false}
            emptyMessage="No hay permisos. Agregar para definir."
            emptyFilterMessage="No hay resultados."
          />
        </section>

        {/* Columnas */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">Columnas</h2>
          <DpContentHeader
            filterValue={columnFilter}
            onFilter={handleColumnFilter}
            onLoad={() => revalidator.revalidate()}
            onCreate={() => { setColumnEditIndex(null); setColumnDialogOpen(true); }}
            onDelete={deleteColumns}
            deleteDisabled={selectedColumnCount === 0 || saving}
            loading={isLoading}
            filterPlaceholder="Filtrar columnas..."
          />
          {/* data prop: modo controlado â€” se actualiza con cada revalidación */}
          <DpTable<ColumnRow>
            ref={columnTableRef}
            data={columnRows}
            loading={isLoading}
            tableDef={COLUMNS_TABLE_DEF}
            linkColumn="name"
            onDetail={(row) => { setColumnEditIndex(parseInt(row.id, 10)); setColumnDialogOpen(true); }}
            onEdit={(row) => { setColumnEditIndex(parseInt(row.id, 10)); setColumnDialogOpen(true); }}
            onSelectionChange={(rows) => setSelectedColumnCount(rows.length)}
            showFilterInHeader={false}
            emptyMessage="No hay columnas. Agregar para definir."
            emptyFilterMessage="No hay resultados."
          />
        </section>

        <PermissionDialog
          visible={permissionDialogOpen}
          moduleId={moduleId}
          permissionIndex={permissionEditIndex}
          currentPermissions={Array.isArray(module.permissions) ? module.permissions : []}
          onSuccess={async () => { setPermissionDialogOpen(false); revalidator.revalidate(); }}
          onHide={() => setPermissionDialogOpen(false)}
        />

        <ColumnDialog
          visible={columnDialogOpen}
          moduleId={moduleId}
          columnIndex={columnEditIndex}
          currentColumns={Array.isArray(module.columns) ? module.columns : []}
          onSuccess={async () => { setColumnDialogOpen(false); revalidator.revalidate(); }}
          onHide={() => setColumnDialogOpen(false)}
        />

        <ModuleDialog
          visible={editModuleOpen}
          moduleId={moduleId}
          onSuccess={() => { setEditModuleOpen(false); revalidator.revalidate(); }}
          onHide={() => setEditModuleOpen(false)}
        />
      </div>
    </DpContentInfo>
  );
}
