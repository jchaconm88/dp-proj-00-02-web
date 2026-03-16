import { useRef, useState } from "react";
import { useNavigate, useNavigation, useRevalidator, useMatch } from "react-router";
import { getTripById } from "~/features/transport/trips";
import {
  getTripCosts,
  deleteTripCost,
  deleteTripCosts,
  type TripCostRecord,
} from "~/features/transport/trip-costs";
import type { Route } from "./+types/TripCostsPage";
import { DpContentInfo, DpContentHeader } from "~/components/DpContent";
import { DpTable, type DpTableRef, type DpTableDefColumn } from "~/components/DpTable";
import {
  TRIP_COST_ENTITY,
  TRIP_COST_TYPE,
  TRIP_COST_SOURCE,
  TRIP_COST_STATUS,
  CURRENCY,
} from "~/constants/status-options";
import TripCostDialog from "./TripCostDialog";

export function meta({ data }: Route.MetaArgs) {
  const tripCode = data?.trip?.code ?? "Viaje";
  return [
    { title: `Costos: ${tripCode}` },
    { name: "description", content: `Costos del viaje ${tripCode}` },
  ];
}

const TABLE_DEF: DpTableDefColumn[] = [
  { header: "Código", column: "code", order: 1, display: true, filter: true },
  { header: "Entidad", column: "entity", order: 2, display: true, filter: true, type: "status", typeOptions: TRIP_COST_ENTITY },
  { header: "ID entidad", column: "entityId", order: 3, display: true, filter: true },
  { header: "Tipo", column: "type", order: 4, display: true, filter: true, type: "status", typeOptions: TRIP_COST_TYPE },
  { header: "Origen", column: "source", order: 5, display: true, filter: true, type: "status", typeOptions: TRIP_COST_SOURCE },
  { header: "Monto", column: "amount", order: 6, display: true, filter: true },
  { header: "Moneda", column: "currency", order: 7, display: true, filter: true, type: "status", typeOptions: CURRENCY },
  { header: "Estado", column: "status", order: 8, display: true, filter: true, type: "status", typeOptions: TRIP_COST_STATUS },
];

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const tripId = (params?.id ?? "") as string;
  if (!tripId) throw new Error("ID de viaje no encontrado");
  const trip = await getTripById(tripId);
  if (!trip) throw new Error("Viaje no encontrado");
  const { items } = await getTripCosts(tripId);
  return { trip, costs: items, tripId };
}

export default function TripCostsPage({ loaderData }: Route.ComponentProps) {
  const { trip, costs, tripId } = loaderData;
  const navigate = useNavigate();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const tableRef = useRef<DpTableRef<TripCostRecord>>(null);

  const isLoading = navigation.state !== "idle" || revalidator.state === "loading";
  const isAdd = !!useMatch("/transport/trips/:id/trip-costs/add");
  const editMatch = useMatch("/transport/trips/:id/trip-costs/edit/:costId");
  const editCostId = editMatch?.params.costId ?? null;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterValue, setFilterValue] = useState("");
  const [selectedCount, setSelectedCount] = useState(0);

  const dialogVisible = isAdd || !!editCostId;

  const handleFilter = (value: string) => {
    setFilterValue(value);
    tableRef.current?.filter(value);
  };

  const openAdd = () => navigate(`/transport/trips/${encodeURIComponent(tripId)}/trip-costs/add`);
  const openEdit = (row: TripCostRecord) =>
    navigate(`/transport/trips/${encodeURIComponent(tripId)}/trip-costs/edit/${encodeURIComponent(row.id)}`);

  const handleDelete = async () => {
    const selected = tableRef.current?.getSelectedRows() ?? [];
    if (!selected.length) return;
    if (!confirm(`¿Eliminar ${selected.length} costo(s)?`)) return;
    setSaving(true);
    setError(null);
    try {
      if (selected.length === 1) {
        await deleteTripCost(selected[0].id);
      } else {
        await deleteTripCosts(selected.map((r) => r.id));
      }
      tableRef.current?.clearSelectedRows();
      revalidator.revalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar.");
    } finally {
      setSaving(false);
    }
  };

  const handleSuccess = () => {
    navigate(`/transport/trips/${encodeURIComponent(tripId)}/trip-costs`);
    revalidator.revalidate();
  };
  const handleHide = () => navigate(`/transport/trips/${encodeURIComponent(tripId)}/trip-costs`);
  const onBack = () => navigate("/transport/trips");

  return (
    <DpContentInfo
      title={trip ? `Costos: ${trip.code}` : "Costos del viaje"}
      backLabel="Volver a viajes"
      onBack={onBack}
    >
      <DpContentHeader
        onLoad={() => revalidator.revalidate()}
        onCreate={openAdd}
        onDelete={handleDelete}
        deleteDisabled={selectedCount === 0 || saving}
        filterValue={filterValue}
        onFilter={handleFilter}
        filterPlaceholder="Filtrar costos..."
      />
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}
      <DpTable<TripCostRecord>
        ref={tableRef}
        data={loaderData.costs}
        loading={isLoading || saving}
        tableDef={TABLE_DEF}
        onSelectionChange={(rows) => setSelectedCount(rows.length)}
        onEdit={openEdit}
        showFilterInHeader={false}
        emptyMessage="No hay costos en este viaje."
        emptyFilterMessage="No se encontraron costos."
      />
      {dialogVisible && (
        <TripCostDialog
          visible={dialogVisible}
          tripId={tripId}
          costId={editCostId}
          onSuccess={handleSuccess}
          onHide={handleHide}
        />
      )}
    </DpContentInfo>
  );
}
