import { useRef, useState } from "react";
import { useNavigate, useNavigation, useRevalidator, useMatch } from "react-router";
import {
  getRouteById,
  getRouteStops,
  deleteRouteStop,
  type RouteRecord,
  type StopRecord,
} from "~/features/transport/routes";
import type { Route } from "./+types/StopsPage";
import { DpContentInfo, DpContentHeader } from "~/components/DpContent";
import { DpTable, type DpTableRef, type DpTableDefColumn } from "~/components/DpTable";
import { DpConfirmDialog } from "~/components/DpConfirmDialog";
import { STOP_TYPE, STOP_STATUS } from "~/constants/status-options";
import StopDialog from "./StopDialog";

export function meta({ data }: Route.MetaArgs) {
  const routeName = data?.route?.name ?? "Ruta";
  return [
    { title: `Paradas: ${routeName}` },
    { name: "description", content: `Paradas de la ruta ${routeName}` },
  ];
}

type StopRow = StopRecord & { arrivalWindowStr?: string };

const TABLE_DEF: DpTableDefColumn[] = [
  { header: "Pedido", column: "orderId", order: 1, display: true, filter: true },
  { header: "Secuencia", column: "sequence", order: 2, display: true, filter: true },
  { header: "ETA", column: "eta", order: 3, display: true, filter: true },
  {
    header: "Ventana",
    column: "arrivalWindowStr",
    order: 4,
    display: true,
    filter: true,
  },
  {
    header: "Estado",
    column: "status",
    order: 5,
    display: true,
    filter: true,
    type: "status",
    typeOptions: STOP_STATUS,
  },
  {
    header: "Tipo",
    column: "type",
    order: 6,
    display: true,
    filter: true,
    type: "status",
    typeOptions: STOP_TYPE,
  },
  { header: "Nombre", column: "name", order: 7, display: true, filter: true },
  { header: "Dirección", column: "address", order: 8, display: true, filter: true },
  { header: "Lat", column: "lat", order: 9, display: true, filter: true },
  { header: "Lng", column: "lng", order: 10, display: true, filter: true },
];

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const routeId = (params?.id ?? "") as string;
  if (!routeId) throw new Error("ID de ruta no encontrado");
  const route = await getRouteById(routeId);
  if (!route) {
    throw new Error("Ruta no encontrada");
  }
  const { items } = await getRouteStops(routeId);
  return {
    route,
    stops: items.map((s) => ({
      ...s,
      arrivalWindowStr:
        s.arrivalWindowStart || s.arrivalWindowEnd
          ? `${s.arrivalWindowStart || "—"} - ${s.arrivalWindowEnd || "—"}`
          : "—",
    })),
    routeId,
  };
}

export default function StopsPage({ loaderData }: Route.ComponentProps) {
  const { route, stops, routeId } = loaderData;
  const navigate = useNavigate();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const tableRef = useRef<DpTableRef<StopRow>>(null);

  const isLoading = navigation.state !== "idle" || revalidator.state === "loading";
  const isAdd = !!useMatch("/transport/routes/:id/stops/add");
  const editMatch = useMatch("/transport/routes/:id/stops/edit/:stopId");
  const editStopId = editMatch?.params.stopId ?? null;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterValue, setFilterValue] = useState("");
  const [selectedCount, setSelectedCount] = useState(0);
  const [pendingDeleteStopIds, setPendingDeleteStopIds] = useState<string[] | null>(null);

  const dialogVisible = isAdd || !!editStopId;

  const handleFilter = (value: string) => {
    setFilterValue(value);
    tableRef.current?.filter(value);
  };

  const openAdd = () =>
    navigate(`/transport/routes/${encodeURIComponent(routeId)}/stops/add`);
  const openEdit = (row: StopRow) =>
    navigate(
      `/transport/routes/${encodeURIComponent(routeId)}/stops/edit/${encodeURIComponent(row.id)}`
    );

  const openDeleteConfirm = () => {
    const selected = tableRef.current?.getSelectedRows() ?? [];
    if (!selected.length) return;
    setPendingDeleteStopIds(selected.map((s) => s.id));
  };

  const handleConfirmDelete = async () => {
    const ids = pendingDeleteStopIds;
    if (!ids?.length) return;
    setSaving(true);
    setError(null);
    try {
      for (const id of ids) {
        await deleteRouteStop(routeId, id);
      }
      tableRef.current?.clearSelectedRows();
      setPendingDeleteStopIds(null);
      revalidator.revalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar.");
    } finally {
      setSaving(false);
    }
  };

  const closeDeleteConfirm = () => {
    if (!saving) setPendingDeleteStopIds(null);
  };

  const handleSuccess = () => {
    navigate(`/transport/routes/${encodeURIComponent(routeId)}/stops`);
    revalidator.revalidate();
  };

  const handleHide = () =>
    navigate(`/transport/routes/${encodeURIComponent(routeId)}/stops`);
  const onBack = () => navigate("/transport/routes");

  return (
    <DpContentInfo
      title={route ? `Paradas: ${route.name}` : "Paradas"}
      breadcrumbItems={["TRANSPORTE", "RUTAS", "PARADAS"]}
      backLabel="Volver a rutas"
      onBack={onBack}
      onCreate={openAdd}
    >
      <DpContentHeader
        onLoad={() => revalidator.revalidate()}
        onDelete={openDeleteConfirm}
        deleteDisabled={selectedCount === 0 || saving}
        filterValue={filterValue}
        onFilter={handleFilter}
        filterPlaceholder="Filtrar paradas..."
      />
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}
      <DpTable<StopRow>
        ref={tableRef}
        data={loaderData.stops}
        loading={isLoading || saving}
        tableDef={TABLE_DEF}
        onSelectionChange={(rows) => setSelectedCount(rows.length)}
        onEdit={openEdit}
        showFilterInHeader={false}
        emptyMessage="No hay paradas en esta ruta."
        emptyFilterMessage="No se encontraron paradas."
      />

      {dialogVisible && (
        <StopDialog
          visible={dialogVisible}
          routeId={routeId}
          stopId={editStopId}
          onSuccess={handleSuccess}
          onHide={handleHide}
        />
      )}

      <DpConfirmDialog
        visible={pendingDeleteStopIds !== null}
        onHide={closeDeleteConfirm}
        title="Eliminar paradas"
        message={
          pendingDeleteStopIds?.length
            ? `¿Eliminar ${pendingDeleteStopIds.length} parada(s) de esta ruta? Esta acción no se puede deshacer.`
            : ""
        }
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={handleConfirmDelete}
        severity="danger"
        loading={saving}
      />
    </DpContentInfo>
  );
}
