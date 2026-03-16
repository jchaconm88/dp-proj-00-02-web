import { useRef, useState } from "react";
import { useNavigate, useNavigation, useRevalidator, useMatch } from "react-router";
import {
  getRoutes,
  deleteRoute,
  deleteRoutes,
  type RouteRecord,
} from "~/features/transport/routes";
import type { Route } from "./+types/RoutesPage";
import { DpContent, DpContentHeader } from "~/components/DpContent";
import { DpTable, type DpTableRef, type DpTableDefColumn } from "~/components/DpTable";
import RouteDialog from "./RouteDialog";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Rutas" },
    { name: "description", content: "Gestión de rutas de transporte" },
  ];
}

type RouteRow = RouteRecord & { planCodeDisplay?: string };

const TABLE_DEF: DpTableDefColumn[] = [
  { header: "Código", column: "code", order: 1, display: true, filter: true },
  { header: "Nombre", column: "name", order: 2, display: true, filter: true },
  {
    header: "Plan",
    column: "planCodeDisplay",
    order: 3,
    display: true,
    filter: true,
  },
  {
    header: "Km estimados",
    column: "totalEstimatedKm",
    order: 4,
    display: true,
    filter: true,
  },
  {
    header: "Horas estimadas",
    column: "totalEstimatedHours",
    order: 5,
    display: true,
    filter: true,
  },
  { header: "Activo", column: "active", order: 6, display: true, filter: true },
];

export async function clientLoader() {
  const { items } = await getRoutes();
  return {
    items: items.map((r) => ({
      ...r,
      planCodeDisplay: (r.planCode || r.planId || "—").trim(),
    })),
  };
}

export default function RoutesPage({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const tableRef = useRef<DpTableRef<RouteRow>>(null);

  const isLoading = navigation.state !== "idle" || revalidator.state === "loading";
  const isAdd = !!useMatch("/transport/routes/add");
  const editMatch = useMatch("/transport/routes/edit/:id");
  const editId = editMatch?.params.id ?? null;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterValue, setFilterValue] = useState("");
  const [selectedCount, setSelectedCount] = useState(0);

  const dialogVisible = isAdd || !!editId;

  const handleFilter = (value: string) => {
    setFilterValue(value);
    tableRef.current?.filter(value);
  };

  const openAdd = () => navigate("/transport/routes/add");
  const openEdit = (row: RouteRow) =>
    navigate(`/transport/routes/edit/${encodeURIComponent(row.id)}`);

  const handleDelete = async () => {
    const selected = tableRef.current?.getSelectedRows() ?? [];
    if (!selected.length) return;
    if (!confirm(`¿Eliminar ${selected.length} ruta(s)?`)) return;

    setSaving(true);
    setError(null);
    try {
      if (selected.length === 1) {
        await deleteRoute(selected[0].id);
      } else {
        await deleteRoutes(selected.map((r) => r.id));
      }
      tableRef.current?.clearSelectedRows();
      revalidator.revalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar");
    } finally {
      setSaving(false);
    }
  };

  const handleSuccess = () => {
    navigate("/transport/routes");
    revalidator.revalidate();
  };

  const handleHide = () => navigate("/transport/routes");

  return (
    <DpContent title="RUTAS">
      <DpContentHeader
        onLoad={() => revalidator.revalidate()}
        onCreate={openAdd}
        onDelete={handleDelete}
        deleteDisabled={selectedCount === 0 || saving}
        filterValue={filterValue}
        onFilter={handleFilter}
        filterPlaceholder="Filtrar por nombre, código..."
      />
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}
      <DpTable<RouteRow>
        ref={tableRef}
        data={loaderData.items}
        loading={isLoading || saving}
        tableDef={TABLE_DEF}
        onSelectionChange={(rows) => setSelectedCount(rows.length)}
        onEdit={openEdit}
        showFilterInHeader={false}
        emptyMessage="No hay rutas."
        emptyFilterMessage="No se encontraron rutas."
      />

      {dialogVisible && (
        <RouteDialog
          visible={dialogVisible}
          routeId={editId}
          onSuccess={handleSuccess}
          onHide={handleHide}
        />
      )}
    </DpContent>
  );
}
