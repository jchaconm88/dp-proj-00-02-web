import { useRef, useState } from "react";
import { useNavigate, useNavigation, useRevalidator, useMatch } from "react-router";
import { getTripById } from "~/features/transport/trips";
import {
  getTripCharges,
  deleteTripCharge,
  deleteTripCharges,
  type TripChargeRecord,
} from "~/features/transport/trip-charges";
import type { Route } from "./+types/TripChargesPage";
import { DpContentInfo, DpContentHeader } from "~/components/DpContent";
import { DpTable, type DpTableRef, type DpTableDefColumn } from "~/components/DpTable";
import {
  TRIP_CHARGE_TYPE,
  TRIP_CHARGE_SOURCE,
  TRIP_CHARGE_STATUS,
  CURRENCY,
} from "~/constants/status-options";
import TripChargeDialog from "./TripChargeDialog";

export function meta({ data }: Route.MetaArgs) {
  const tripCode = data?.trip?.code ?? "Viaje";
  return [
    { title: `Cargos: ${tripCode}` },
    { name: "description", content: `Cargos del viaje ${tripCode}` },
  ];
}

const TABLE_DEF: DpTableDefColumn[] = [
  { header: "Código", column: "code", order: 1, display: true, filter: true },
  { header: "Tipo", column: "type", order: 2, display: true, filter: true, type: "status", typeOptions: TRIP_CHARGE_TYPE },
  { header: "Origen", column: "source", order: 3, display: true, filter: true, type: "status", typeOptions: TRIP_CHARGE_SOURCE },
  { header: "Monto", column: "amount", order: 4, display: true, filter: true },
  { header: "Moneda", column: "currency", order: 5, display: true, filter: true, type: "status", typeOptions: CURRENCY },
  { header: "Estado", column: "status", order: 6, display: true, filter: true, type: "status", typeOptions: TRIP_CHARGE_STATUS },
];

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const tripId = (params?.id ?? "") as string;
  if (!tripId) throw new Error("ID de viaje no encontrado");
  const trip = await getTripById(tripId);
  if (!trip) throw new Error("Viaje no encontrado");
  const { items } = await getTripCharges(tripId);
  return { trip, charges: items, tripId };
}

export default function TripChargesPage({ loaderData }: Route.ComponentProps) {
  const { trip, charges, tripId } = loaderData;
  const navigate = useNavigate();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const tableRef = useRef<DpTableRef<TripChargeRecord>>(null);

  const isLoading = navigation.state !== "idle" || revalidator.state === "loading";
  const isAdd = !!useMatch("/transport/trips/:id/trip-charges/add");
  const editMatch = useMatch("/transport/trips/:id/trip-charges/edit/:chargeId");
  const editChargeId = editMatch?.params.chargeId ?? null;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterValue, setFilterValue] = useState("");
  const [selectedCount, setSelectedCount] = useState(0);

  const dialogVisible = isAdd || !!editChargeId;

  const handleFilter = (value: string) => {
    setFilterValue(value);
    tableRef.current?.filter(value);
  };

  const openAdd = () => navigate(`/transport/trips/${encodeURIComponent(tripId)}/trip-charges/add`);
  const openEdit = (row: TripChargeRecord) =>
    navigate(`/transport/trips/${encodeURIComponent(tripId)}/trip-charges/edit/${encodeURIComponent(row.id)}`);

  const handleDelete = async () => {
    const selected = tableRef.current?.getSelectedRows() ?? [];
    if (!selected.length) return;
    if (!confirm(`¿Eliminar ${selected.length} cargo(s)?`)) return;
    setSaving(true);
    setError(null);
    try {
      if (selected.length === 1) {
        await deleteTripCharge(selected[0].id);
      } else {
        await deleteTripCharges(selected.map((r) => r.id));
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
    navigate(`/transport/trips/${encodeURIComponent(tripId)}/trip-charges`);
    revalidator.revalidate();
  };
  const handleHide = () => navigate(`/transport/trips/${encodeURIComponent(tripId)}/trip-charges`);
  const onBack = () => navigate("/transport/trips");

  return (
    <DpContentInfo
      title={trip ? `Cargos: ${trip.code}` : "Cargos del viaje"}
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
        filterPlaceholder="Filtrar cargos..."
      />
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}
      <DpTable<TripChargeRecord>
        ref={tableRef}
        data={loaderData.charges}
        loading={isLoading || saving}
        tableDef={TABLE_DEF}
        onSelectionChange={(rows) => setSelectedCount(rows.length)}
        onEdit={openEdit}
        showFilterInHeader={false}
        emptyMessage="No hay cargos en este viaje."
        emptyFilterMessage="No se encontraron cargos."
      />
      {dialogVisible && (
        <TripChargeDialog
          visible={dialogVisible}
          tripId={tripId}
          chargeId={editChargeId}
          onSuccess={handleSuccess}
          onHide={handleHide}
        />
      )}
    </DpContentInfo>
  );
}
