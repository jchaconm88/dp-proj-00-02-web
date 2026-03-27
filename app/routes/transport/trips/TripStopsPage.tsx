import { useRef, useState } from "react";
import { useNavigate, useNavigation, useRevalidator, useMatch } from "react-router";
import {
  getTripById,
  getTripStops,
  deleteTripStop,
  type TripRecord,
  type TripStopRecord,
} from "~/features/transport/trips";
import type { Route } from "./+types/TripStopsPage";
import { DpContentInfo, DpContentHeader } from "~/components/DpContent";
import { DpTable, type DpTableRef, type DpTableDefColumn } from "~/components/DpTable";
import { DpConfirmDialog } from "~/components/DpConfirmDialog";
import { STOP_TYPE, STOP_STATUS } from "~/constants/status-options";
import TripStopDialog from "./TripStopDialog";

export function meta({ data }: Route.MetaArgs) {
  const tripCode = data?.trip?.code ?? "Viaje";
  return [
    { title: `Paradas: ${tripCode}` },
    { name: "description", content: `Paradas del viaje ${tripCode}` },
  ];
}

const TABLE_DEF: DpTableDefColumn[] = [
  { header: "Orden", column: "order", order: 1, display: true, filter: true },
  { header: "Código", column: "code", order: 2, display: true, filter: true },
  { header: "Tipo", column: "type", order: 3, display: true, filter: true, type: "status", typeOptions: STOP_TYPE },
  { header: "Nombre", column: "name", order: 4, display: true, filter: true },
  { header: "Documento externo", column: "externalDocument", order: 5, display: true, filter: true },
  { header: "Distrito", column: "districtName", order: 6, display: true, filter: true },
  { header: "Observaciones", column: "observations", order: 7, display: true, filter: true },
  { header: "Estado", column: "status", order: 8, display: true, filter: true, type: "status", typeOptions: STOP_STATUS },
  { header: "Llegada planificada", column: "plannedArrival", order: 9, display: true, filter: true, type: "datetime" },
];

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const tripId = (params?.id ?? "") as string;
  if (!tripId) throw new Error("ID de viaje no encontrado");
  const trip = await getTripById(tripId);
  if (!trip) throw new Error("Viaje no encontrado");
  const { items } = await getTripStops(tripId);
  return { trip, stops: items, tripId };
}

export default function TripStopsPage({ loaderData }: Route.ComponentProps) {
  const { trip, stops, tripId } = loaderData;
  const navigate = useNavigate();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const tableRef = useRef<DpTableRef<TripStopRecord>>(null);

  const isLoading = navigation.state !== "idle" || revalidator.state === "loading";
  const isAdd = !!useMatch("/transport/trips/:id/trip-stops/add");
  const editMatch = useMatch("/transport/trips/:id/trip-stops/edit/:stopId");
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

  const openAdd = () => navigate(`/transport/trips/${encodeURIComponent(tripId)}/trip-stops/add`);
  const openEdit = (row: TripStopRecord) =>
    navigate(`/transport/trips/${encodeURIComponent(tripId)}/trip-stops/edit/${encodeURIComponent(row.id)}`);

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
        await deleteTripStop(tripId, id);
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
    navigate(`/transport/trips/${encodeURIComponent(tripId)}/trip-stops`);
    revalidator.revalidate();
  };
  const handleHide = () => navigate(`/transport/trips/${encodeURIComponent(tripId)}/trip-stops`);
  const onBack = () => navigate("/transport/trips");

  return (
    <DpContentInfo
      title={trip ? `Paradas: ${trip.code}` : "Paradas del viaje"}
      backLabel="Volver a viajes"
      onBack={onBack}
    >
      <DpContentHeader
        onLoad={() => revalidator.revalidate()}
        onCreate={openAdd}
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
      <DpTable<TripStopRecord>
        ref={tableRef}
        data={loaderData.stops}
        loading={isLoading || saving}
        tableDef={TABLE_DEF}
        onSelectionChange={(rows) => setSelectedCount(rows.length)}
        onEdit={openEdit}
        showFilterInHeader={false}
        emptyMessage="No hay paradas en este viaje."
        emptyFilterMessage="No se encontraron paradas."
      />
      {dialogVisible && (
        <TripStopDialog
          visible={dialogVisible}
          tripId={tripId}
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
            ? `¿Eliminar ${pendingDeleteStopIds.length} parada(s) de este viaje? Esta acción no se puede deshacer.`
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
