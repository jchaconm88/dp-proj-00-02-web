import { useRef, useState } from "react";
import { useNavigate, useNavigation, useRevalidator, useMatch } from "react-router";
import {
  getTrips,
  deleteTrip,
  deleteTrips,
  type TripRecord,
} from "~/features/transport/trips";
import type { Route } from "./+types/TripsPage";
import { DpContent, DpContentHeader } from "~/components/DpContent";
import { DpTable, type DpTableRef, type DpTableDefColumn } from "~/components/DpTable";
import DpTColumn from "~/components/DpTable/DpTColumn";
import { TRIP_STATUS } from "~/constants/status-options";
import TripDialog from "./TripDialog";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Viajes" },
    { name: "description", content: "Gestión de viajes de transporte" },
  ];
}

type TripRow = TripRecord & {
  routeDisplay?: string;
  transportServiceDisplay?: string;
  clientDisplay?: string;
};

const TABLE_DEF: DpTableDefColumn[] = [
  { header: "Código", column: "code", order: 1, display: true, filter: true },
  { header: "Ruta", column: "routeDisplay", order: 2, display: true, filter: true },
  { header: "Servicio", column: "transportServiceDisplay", order: 3, display: true, filter: true },
  { header: "Cliente", column: "clientDisplay", order: 4, display: true, filter: true },
  { header: "Guía", column: "transportGuide", order: 5, display: true, filter: true },
  { header: "Conductor", column: "driver", order: 6, display: true, filter: true },
  { header: "Vehículo", column: "vehicle", order: 7, display: true, filter: true },
  {
    header: "Estado",
    column: "status",
    order: 8,
    display: true,
    filter: true,
    type: "status",
    typeOptions: TRIP_STATUS,
  },
  {
    header: "Inicio programado",
    column: "scheduledStart",
    order: 9,
    display: true,
    filter: true,
    type: "datetime",
  },
  { header: "Paradas", column: "tripStops", order: 10, display: true, filter: false },
  { header: "Asignaciones", column: "tripAssignments", order: 11, display: true, filter: false },
  { header: "Cargos", column: "tripCharges", order: 12, display: true, filter: false },
  { header: "Costos", column: "tripCosts", order: 13, display: true, filter: false },
];

export async function clientLoader() {
  const { items } = await getTrips();
  return {
    items: items.map((t) => ({
      ...t,
      routeDisplay: (t.route || t.routeId || "—").trim(),
      transportServiceDisplay: (t.transportService || t.transportServiceId || "—").trim(),
      clientDisplay: (t.client || t.clientId || "—").trim(),
      driver: (t.driver || t.driverId || "—").trim(),
      vehicle: (t.vehicle || t.vehicleId || "—").trim(),
    })),
  };
}

export default function TripsPage({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const tableRef = useRef<DpTableRef<TripRow>>(null);

  const isLoading = navigation.state !== "idle" || revalidator.state === "loading";
  const isAdd = !!useMatch("/transport/trips/add");
  const editMatch = useMatch("/transport/trips/edit/:id");
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

  const openAdd = () => navigate("/transport/trips/add");
  const openEdit = (row: TripRow) =>
    navigate(`/transport/trips/edit/${encodeURIComponent(row.id)}`);

  const handleDelete = async () => {
    const selected = tableRef.current?.getSelectedRows() ?? [];
    if (!selected.length) return;
    if (!confirm(`¿Eliminar ${selected.length} viaje(s)?`)) return;
    setSaving(true);
    setError(null);
    try {
      if (selected.length === 1) {
        await deleteTrip(selected[0].id);
      } else {
        await deleteTrips(selected.map((r) => r.id));
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
    navigate("/transport/trips");
    revalidator.revalidate();
  };
  const handleHide = () => navigate("/transport/trips");

  return (
    <DpContent title="VIAJES">
      <DpContentHeader
        onLoad={() => revalidator.revalidate()}
        onCreate={openAdd}
        onDelete={handleDelete}
        deleteDisabled={selectedCount === 0 || saving}
        filterValue={filterValue}
        onFilter={handleFilter}
        filterPlaceholder="Filtrar por código, ruta..."
      />
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}
      <DpTable<TripRow>
        ref={tableRef}
        data={loaderData.items}
        loading={isLoading || saving}
        tableDef={TABLE_DEF}
        onSelectionChange={(rows) => setSelectedCount(rows.length)}
        onEdit={openEdit}
        showFilterInHeader={false}
        emptyMessage="No hay viajes."
        emptyFilterMessage="No se encontraron viajes."
      >
        <DpTColumn<TripRow> name="tripStops">
          {(row) => (
            <button
              type="button"
              onClick={() => navigate(`/transport/trips/${encodeURIComponent(row.id)}/trip-stops`)}
              className="p-button p-button-text p-button-rounded p-button-icon-only"
              aria-label="Paradas del viaje"
              title="Paradas"
            >
              <i className="pi pi-list" />
            </button>
          )}
        </DpTColumn>
        <DpTColumn<TripRow> name="tripAssignments">
          {(row) => (
            <button
              type="button"
              onClick={() => navigate(`/transport/trips/${encodeURIComponent(row.id)}/trip-assignments`)}
              className="p-button p-button-text p-button-rounded p-button-icon-only"
              aria-label="Asignaciones"
              title="Asignaciones"
            >
              <i className="pi pi-users" />
            </button>
          )}
        </DpTColumn>
        <DpTColumn<TripRow> name="tripCharges">
          {(row) => (
            <button
              type="button"
              onClick={() => navigate(`/transport/trips/${encodeURIComponent(row.id)}/trip-charges`)}
              className="p-button p-button-text p-button-rounded p-button-icon-only"
              aria-label="Cargos"
              title="Cargos"
            >
              <i className="pi pi-dollar" />
            </button>
          )}
        </DpTColumn>
        <DpTColumn<TripRow> name="tripCosts">
          {(row) => (
            <button
              type="button"
              onClick={() => navigate(`/transport/trips/${encodeURIComponent(row.id)}/trip-costs`)}
              className="p-button p-button-text p-button-rounded p-button-icon-only"
              aria-label="Costos"
              title="Costos"
            >
              <i className="pi pi-wallet" />
            </button>
          )}
        </DpTColumn>
      </DpTable>

      {dialogVisible && (
        <TripDialog
          visible={dialogVisible}
          tripId={editId}
          onSuccess={handleSuccess}
          onHide={handleHide}
        />
      )}
    </DpContent>
  );
}
