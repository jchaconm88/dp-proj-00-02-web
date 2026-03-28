import { useRef, useState } from "react";
import { useNavigate, useNavigation, useRevalidator, useMatch } from "react-router";
import { Button } from "primereact/button";
import {
  getTrips,
  deleteTrip,
  deleteTrips,
  getTripsCascadeDeleteTotals,
  updateTripsStatus,
  type TripCascadeDeleteCounts,
  type TripRecord,
  type TripStatus,
} from "~/features/transport/trips";
import type { Route } from "./+types/TripsPage";
import {
  DpContent,
  DpContentHeader,
  DpContentHeaderAction,
  DpContentSet,
} from "~/components/DpContent";
import { DpInput } from "~/components/DpInput";
import { DpTable, type DpTableRef, type DpTableDefColumn } from "~/components/DpTable";
import { DpConfirmDialog } from "~/components/DpConfirmDialog";
import DpTColumn from "~/components/DpTable/DpTColumn";
import { TRIP_STATUS, TRIP_STATUS_DEFAULT, statusToSelectOptions } from "~/constants/status-options";
import TripDialog from "./TripDialog";

const TRIP_STATUS_SELECT_OPTIONS = statusToSelectOptions(TRIP_STATUS);

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
  { header: "Ruta", column: "routeDisplay", order: 2, display: true, filter: true, sort: true },
  { header: "Servicio", column: "transportServiceDisplay", order: 3, display: true, filter: true },
  { header: "Cliente", column: "clientDisplay", order: 4, display: true, filter: true },
  { header: "Guía", column: "transportGuide", order: 5, display: true, filter: true },
  { header: "Vehículo", column: "vehicle", order: 6, display: true, filter: true },
  {
    header: "Estado",
    column: "status",
    order: 7,
    display: true,
    filter: true,
    type: "status",
    typeOptions: TRIP_STATUS,
  },
  {
    header: "Inicio programado",
    column: "scheduledStart",
    order: 8,
    display: true,
    filter: true,
    sort: true,
    type: "datetime",
  },
  { header: "Paradas", column: "tripStops", order: 9, display: true, filter: false },
  { header: "Asignaciones", column: "tripAssignments", order: 10, display: true, filter: false },
  { header: "Cargos", column: "tripCharges", order: 11, display: true, filter: false },
  { header: "Costos", column: "tripCosts", order: 12, display: true, filter: false },
];

export async function clientLoader() {
  const { items } = await getTrips();
  return {
    items: items.map((t) => ({
      ...t,
      routeDisplay: (t.route || t.routeId || "—").trim(),
      transportServiceDisplay: (t.transportService || t.transportServiceId || "—").trim(),
      clientDisplay: (t.client || t.clientId || "—").trim(),
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
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(null);
  const [deleteImpact, setDeleteImpact] = useState<TripCascadeDeleteCounts | null>(null);
  const [deleteImpactLoading, setDeleteImpactLoading] = useState(false);
  const [deleteImpactError, setDeleteImpactError] = useState<string | null>(null);
  const deleteImpactRequestId = useRef(0);
  const [statusChangeOpen, setStatusChangeOpen] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<TripStatus>(TRIP_STATUS_DEFAULT);
  const [bulkTargetCount, setBulkTargetCount] = useState(0);
  /** IDs fijados al abrir el modal (no cambian si el usuario altera la selección en la tabla). */
  const [bulkTripIds, setBulkTripIds] = useState<string[]>([]);
  const [statusChangeSaving, setStatusChangeSaving] = useState(false);

  const dialogVisible = isAdd || !!editId;

  const handleFilter = (value: string) => {
    setFilterValue(value);
    tableRef.current?.filter(value);
  };

  const openAdd = () => navigate("/transport/trips/add");
  const openEdit = (row: TripRow) =>
    navigate(`/transport/trips/edit/${encodeURIComponent(row.id)}`);

  const openDeleteConfirm = () => {
    const selected = tableRef.current?.getSelectedRows() ?? [];
    if (!selected.length) return;
    const ids = selected.map((r) => r.id);
    const reqId = ++deleteImpactRequestId.current;
    setPendingDeleteIds(ids);
    setDeleteImpact(null);
    setDeleteImpactError(null);
    setDeleteImpactLoading(true);
    getTripsCascadeDeleteTotals(ids)
      .then((data) => {
        if (deleteImpactRequestId.current !== reqId) return;
        setDeleteImpact(data);
      })
      .catch((err) => {
        if (deleteImpactRequestId.current !== reqId) return;
        setDeleteImpactError(
          err instanceof Error ? err.message : "No se pudo cargar el resumen de registros relacionados."
        );
      })
      .finally(() => {
        if (deleteImpactRequestId.current !== reqId) return;
        setDeleteImpactLoading(false);
      });
  };

  const handleConfirmDelete = async () => {
    const ids = pendingDeleteIds;
    if (!ids?.length) return;
    setSaving(true);
    setError(null);
    try {
      if (ids.length === 1) {
        await deleteTrip(ids[0]);
      } else {
        await deleteTrips(ids);
      }
      tableRef.current?.clearSelectedRows();
      deleteImpactRequestId.current++;
      setPendingDeleteIds(null);
      setDeleteImpact(null);
      setDeleteImpactError(null);
      setDeleteImpactLoading(false);
      revalidator.revalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar");
    } finally {
      setSaving(false);
    }
  };

  const closeDeleteConfirm = () => {
    if (!saving) {
      deleteImpactRequestId.current++;
      setPendingDeleteIds(null);
      setDeleteImpact(null);
      setDeleteImpactError(null);
      setDeleteImpactLoading(false);
    }
  };

  const openBulkStatusChange = () => {
    const selected = tableRef.current?.getSelectedRows() ?? [];
    if (!selected.length) return;
    setBulkStatus(selected[0]!.status);
    setBulkTargetCount(selected.length);
    setBulkTripIds(selected.map((r) => r.id));
    setStatusChangeOpen(true);
  };

  const closeBulkStatusChange = () => {
    if (!statusChangeSaving) setStatusChangeOpen(false);
  };

  const handleBulkStatusConfirm = async () => {
    if (!bulkTripIds.length) return;
    setStatusChangeSaving(true);
    setError(null);
    try {
      await updateTripsStatus(bulkTripIds, bulkStatus);
      tableRef.current?.clearSelectedRows();
      setSelectedCount(0);
      setBulkTripIds([]);
      setStatusChangeOpen(false);
      revalidator.revalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar el estado.");
    } finally {
      setStatusChangeSaving(false);
    }
  };

  const handleSuccess = (createdTripId?: string) => {
    if (createdTripId?.trim()) {
      navigate(`/transport/trips/${encodeURIComponent(createdTripId.trim())}/trip-assignments`);
    } else {
      navigate("/transport/trips");
    }
    revalidator.revalidate();
  };
  const handleHide = () => navigate("/transport/trips");

  return (
    <DpContent title="VIAJES">
      <DpContentHeader
        onLoad={() => revalidator.revalidate()}
        onCreate={openAdd}
        onDelete={openDeleteConfirm}
        deleteDisabled={selectedCount === 0 || saving}
        filterValue={filterValue}
        onFilter={handleFilter}
        filterPlaceholder="Filtrar por código, ruta..."
      >
        <DpContentHeaderAction>
          <Button
            type="button"
            size="small"
            icon="pi pi-flag"
            label="Cambiar estado"
            onClick={openBulkStatusChange}
            disabled={selectedCount === 0 || saving || statusChangeSaving}
            aria-label="Cambiar estado de los viajes seleccionados"
          />
        </DpContentHeaderAction>
      </DpContentHeader>
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

      <DpContentSet
        title="Cambiar estado de viajes"
        variant="dialog"
        visible={statusChangeOpen}
        onHide={closeBulkStatusChange}
        onCancel={closeBulkStatusChange}
        onSave={handleBulkStatusConfirm}
        saving={statusChangeSaving}
        saveLabel="Aplicar"
      >
        <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
          Se actualizará el estado de <strong>{bulkTargetCount}</strong> viaje(s) seleccionado(s).
        </p>
        <DpInput
          type="select"
          label="Nuevo estado"
          value={bulkStatus}
          onChange={(v) => setBulkStatus(String(v) as TripStatus)}
          options={TRIP_STATUS_SELECT_OPTIONS}
        />
      </DpContentSet>

      <DpConfirmDialog
        visible={pendingDeleteIds !== null}
        onHide={closeDeleteConfirm}
        title="Eliminar viajes"
        message={
          pendingDeleteIds?.length ? (
            <div className="space-y-3">
              <p>
                ¿Eliminar <strong>{pendingDeleteIds.length}</strong> viaje(s)? Esta acción no se puede deshacer.
              </p>
              <p className="font-medium text-zinc-800 dark:text-zinc-100">
                También se eliminarán en el servidor los registros vinculados:
              </p>
              {deleteImpactLoading && (
                <p className="text-zinc-500 dark:text-zinc-400">Calculando resumen…</p>
              )}
              {deleteImpactError && (
                <p className="text-red-600 dark:text-red-400">{deleteImpactError}</p>
              )}
              {deleteImpact && !deleteImpactLoading && (
                <ul className="list-inside list-disc space-y-1 text-zinc-600 dark:text-zinc-300">
                  <li>
                    Paradas del viaje (<span className="whitespace-nowrap">subcolección tripStops</span>):{" "}
                    <strong>{deleteImpact.tripStops}</strong>
                  </li>
                  <li>
                    Asignaciones: <strong>{deleteImpact.tripAssignments}</strong>
                  </li>
                  <li>
                    Cargos: <strong>{deleteImpact.tripCharges}</strong>
                  </li>
                  <li>
                    Costos: <strong>{deleteImpact.tripCosts}</strong>
                  </li>
                </ul>
              )}
              {pendingDeleteIds.length > 1 && deleteImpact && !deleteImpactLoading && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Cifras sumadas de todos los viajes seleccionados.
                </p>
              )}
            </div>
          ) : (
            ""
          )
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
