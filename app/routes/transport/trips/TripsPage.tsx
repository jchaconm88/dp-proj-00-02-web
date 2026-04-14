import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useNavigation, useRevalidator, useMatch } from "react-router";
import { Button } from "primereact/button";
import {
  getTrips,
  getTripsByFilters,
  deleteTrip,
  deleteTrips,
  getTripsCascadeDeleteTotals,
  updateTripsStatus,
  type TripCascadeDeleteCounts,
  type TripRecord,
  type TripQueryFilters,
  type TripStatus,
} from "~/features/transport/trips";
import { getVehicles } from "~/features/transport/vehicles";
import { getTransportServices } from "~/features/transport/transport-services";
import type { Route } from "./+types/TripsPage";
import { withUrlSearch } from "~/lib/url-search";
import {
  DpContent,
  DpContentFilter,
  DpContentHeader,
  DpContentHeaderAction,
  DpContentSet,
  createDateRangeMaxDaysRule,
  type DpContentFilterRef,
  type DpFilterDef,
} from "~/components/DpContent";
import { DpInput } from "~/components/DpInput";
import { DpTable, type DpTableRef } from "~/components/DpTable";
import { DpConfirmDialog } from "~/components/DpConfirmDialog";
import DpTColumn from "~/components/DpTable/DpTColumn";
import { TRIP_STATUS, TRIP_STATUS_DEFAULT, statusToSelectOptions } from "~/constants/status-options";
import { moduleTableDef } from "~/data/system-modules";
import TripDialog from "./TripDialog";

const TRIP_STATUS_SELECT_OPTIONS = statusToSelectOptions(TRIP_STATUS);
const TRIP_FILTER_STATUS_OPTIONS = TRIP_STATUS_SELECT_OPTIONS;
const MAX_TRIP_FILTER_RANGE_DAYS = 60;

type TripFiltersForm = {
  scheduledRange: { from: string; to: string };
  status: string[];
  vehicleIds: string[];
  transportServiceIds: string[];
};

function todayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

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

function scheduledStartToTime(value: string): number {
  const s = String(value ?? "").trim();
  if (!s) return Number.NEGATIVE_INFINITY;
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (dateOnly) {
    const y = Number(dateOnly[1]);
    const m = Number(dateOnly[2]);
    const d = Number(dateOnly[3]);
    return new Date(y, m - 1, d).getTime();
  }
  const t = new Date(s).getTime();
  return Number.isFinite(t) ? t : Number.NEGATIVE_INFINITY;
}

// Columnas del catálogo + sort en routeDisplay y scheduledStart
const TABLE_DEF = moduleTableDef("trip", { status: TRIP_STATUS }).map((col) => {
  if (col.column === "routeDisplay" || col.column === "scheduledStart") return { ...col, sort: true };
  return col;
});

export async function clientLoader(args: Route.ClientLoaderArgs) {
  const requestArg = (args as Route.ClientLoaderArgs & { request?: Request }).request;
  const url = requestArg ? new URL(requestArg.url) : null;
  const params = url?.searchParams;
  const fromParam = String(params?.get("from") ?? "").trim();
  const toParam = String(params?.get("to") ?? "").trim();
  const today = todayYmd();
  const defaultFrom = fromParam || toParam || today;
  const defaultTo = toParam || fromParam || today;
  const hasExplicitFilters = Boolean(params && Array.from(params.keys()).length > 0);
  const filters: TripQueryFilters = {
    scheduledStartFrom: defaultFrom,
    scheduledStartTo: defaultTo,
    status: params?.getAll("status").map((x) => x.trim()).filter(Boolean) as TripStatus[] | undefined,
    vehicleIds: params?.getAll("vehicleId").map((x) => x.trim()).filter(Boolean) || undefined,
    transportServiceIds: params?.getAll("transportServiceId").map((x) => x.trim()).filter(Boolean) || undefined,
  };
  const hasFilters = Boolean(
    filters.scheduledStartFrom ||
      filters.scheduledStartTo ||
      (filters.status?.length ?? 0) > 0 ||
      (filters.vehicleIds?.length ?? 0) > 0 ||
      (filters.transportServiceIds?.length ?? 0) > 0
  );
  const [tripResult, vehiclesResult, servicesResult] = await Promise.all([
    hasFilters ? getTripsByFilters(filters) : getTrips(),
    getVehicles(),
    getTransportServices(),
  ]);
  const { items } = tripResult;
  const rows = items.map((t) => ({
    ...t,
    routeDisplay: (t.route || t.routeId || "—").trim(),
    transportServiceDisplay: (t.transportService || t.transportServiceId || "—").trim(),
    clientDisplay: (t.client || t.clientId || "—").trim(),
    vehicle: (t.vehicle || t.vehicleId || "—").trim(),
  }));
  rows.sort((a, b) => scheduledStartToTime(b.scheduledStart) - scheduledStartToTime(a.scheduledStart));
  return {
    items: rows,
    appliedFilters: {
      scheduledRange: {
        from: filters.scheduledStartFrom ?? "",
        to: filters.scheduledStartTo ?? "",
      },
      status: filters.status ?? [],
      vehicleIds: filters.vehicleIds ?? [],
      transportServiceIds: filters.transportServiceIds ?? [],
    } satisfies TripFiltersForm,
    vehicleOptions: vehiclesResult.items
      .filter((v) => v.active)
      .map((v) => ({ label: (v.plate || v.id).trim(), value: v.id })),
    transportServiceOptions: servicesResult.items
      .filter((s) => s.active)
      .map((s) => ({
        label: `${(s.code || "").trim()}${s.code && s.name ? " · " : ""}${(s.name || s.id).trim()}`,
        value: s.id,
      })),
    hasExplicitFilters,
  };
}

export default function TripsPage({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const tableRef = useRef<DpTableRef<TripRow>>(null);

  const isLoading = navigation.state !== "idle" || revalidator.state === "loading";
  const isAdd = !!useMatch("/transport/trips/add");
  const editMatch = useMatch("/transport/trips/edit/:id");
  const editId = editMatch?.params.id ?? null;
  /** Query de la lista (filtros) reutilizada en add/edit para no perderla al cerrar o compartir URL. */
  const listQuery = location.search;

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
  const [filters, setFilters] = useState<TripFiltersForm>(loaderData.appliedFilters);
  const contentFilterRef = useRef<DpContentFilterRef>(null);
  const defaultTripFilters = useRef<TripFiltersForm>({
    scheduledRange: { from: todayYmd(), to: todayYmd() },
    status: [],
    vehicleIds: [],
    transportServiceIds: [],
  }).current;

  const dialogVisible = isAdd || !!editId;

  useEffect(() => {
    setFilters(loaderData.appliedFilters);
  }, [loaderData.appliedFilters]);

  const vehicleLabelById = new Map(loaderData.vehicleOptions.map((o) => [String(o.value), o.label]));
  const serviceLabelById = new Map(loaderData.transportServiceOptions.map((o) => [String(o.value), o.label]));
  const statusLabelById = new Map(TRIP_FILTER_STATUS_OPTIONS.map((o) => [String(o.value), o.label]));
  const filterDefs = useMemo<DpFilterDef[]>(
    () => [
      {
        name: "scheduledRange",
        label: "Inicio programado",
        type: "date-range",
        colSpan: 2,
        summary: (value) => {
          const v = (value as { from?: string; to?: string }) ?? {};
          const from = String(v.from ?? "").trim();
          const to = String(v.to ?? "").trim();
          if (from && to) return `${from} a ${to}`;
          return from || to;
        },
        validators: createDateRangeMaxDaysRule(MAX_TRIP_FILTER_RANGE_DAYS),
      },
      {
        name: "status",
        label: "Estado",
        type: "multiselect",
        options: TRIP_FILTER_STATUS_OPTIONS,
        placeholder: "— Todos los estados —",
        filter: true,
        summary: (value) =>
          ((value as string[]) ?? [])
            .map((id) => statusLabelById.get(id) || id)
            .filter(Boolean)
            .join(", "),
      },
      {
        name: "vehicleIds",
        label: "Vehículo",
        type: "multiselect",
        options: loaderData.vehicleOptions,
        placeholder: "— Todos los vehículos —",
        filter: true,
        summary: (value) =>
          ((value as string[]) ?? [])
            .map((id) => vehicleLabelById.get(id) || id)
            .filter(Boolean)
            .join(", "),
      },
      {
        name: "transportServiceIds",
        label: "Servicio",
        type: "multiselect",
        options: loaderData.transportServiceOptions,
        placeholder: "— Todos los servicios —",
        filter: true,
        summary: (value) =>
          ((value as string[]) ?? [])
            .map((id) => serviceLabelById.get(id) || id)
            .filter(Boolean)
            .join(", "),
      },
    ],
    [
      loaderData.transportServiceOptions,
      loaderData.vehicleOptions,
      serviceLabelById,
      statusLabelById,
      vehicleLabelById,
    ]
  );

  const handleFilter = (value: string) => {
    setFilterValue(value);
    tableRef.current?.filter(value);
  };

  const applySearchParams = (nextFilters: TripFiltersForm) => {
    const params = new URLSearchParams();
    if (nextFilters.scheduledRange.from.trim()) params.set("from", nextFilters.scheduledRange.from.trim());
    if (nextFilters.scheduledRange.to.trim()) params.set("to", nextFilters.scheduledRange.to.trim());
    for (const st of nextFilters.status) {
      const v = String(st).trim();
      if (v) params.append("status", v);
    }
    for (const id of nextFilters.vehicleIds) {
      const v = String(id).trim();
      if (v) params.append("vehicleId", v);
    }
    for (const id of nextFilters.transportServiceIds) {
      const v = String(id).trim();
      if (v) params.append("transportServiceId", v);
    }
    const qs = params.toString();
    navigate(qs ? `/transport/trips?${qs}` : "/transport/trips");
  };

  const openAdd = () => navigate(withUrlSearch("/transport/trips/add", listQuery));
  const openEdit = (row: TripRow) =>
    navigate(withUrlSearch(`/transport/trips/edit/${encodeURIComponent(row.id)}`, listQuery));

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
      navigate(
        withUrlSearch(
          `/transport/trips/${encodeURIComponent(createdTripId.trim())}/trip-assignments`,
          listQuery
        )
      );
    } else {
      navigate(withUrlSearch("/transport/trips", listQuery));
    }
    revalidator.revalidate();
  };
  const handleHide = () => navigate(withUrlSearch("/transport/trips", listQuery));

  return (
    <DpContent
      title="VIAJES"
      breadcrumbItems={["TRANSPORTE", "VIAJES"]}
      onFilterAction={() => contentFilterRef.current?.toggle()}
      onCreate={openAdd}
    >
      <DpContentFilter
        ref={contentFilterRef}
        defaultShow={false}
        filterDefs={filterDefs}
        initialValues={defaultTripFilters as Record<string, unknown>}
        values={filters as Record<string, unknown>}
        onValuesChange={(next) => setFilters(next as TripFiltersForm)}
        onSearch={(mapped) => applySearchParams(mapped as TripFiltersForm)}
        searchLabel="Buscar"
      />
      <DpContentHeader
        onLoad={() => revalidator.revalidate()}
        showCreateButton={false}
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
              onClick={() =>
                navigate(
                  withUrlSearch(`/transport/trips/${encodeURIComponent(row.id)}/trip-stops`, listQuery)
                )
              }
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
              onClick={() =>
                navigate(
                  withUrlSearch(`/transport/trips/${encodeURIComponent(row.id)}/trip-assignments`, listQuery)
                )
              }
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
              onClick={() =>
                navigate(
                  withUrlSearch(`/transport/trips/${encodeURIComponent(row.id)}/trip-charges`, listQuery)
                )
              }
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
              onClick={() =>
                navigate(
                  withUrlSearch(`/transport/trips/${encodeURIComponent(row.id)}/trip-costs`, listQuery)
                )
              }
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
