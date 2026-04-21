import { useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useNavigation, useRevalidator, useMatch } from "react-router";
import { getTripById } from "~/features/transport/trips";
import {
  getTripCosts,
  deleteTripCost,
  deleteTripCosts,
  type TripCostRecord,
} from "~/features/transport/trip-costs";
import type { Route } from "./+types/TripCostsPage";
import { withUrlSearch } from "~/lib/url-search";
import { DpContentInfo, DpContentHeader } from "~/components/DpContent";
import {
  DpTable,
  type DpTableRef,
  type DpTableFooterTotals,
} from "~/components/DpTable";
import {
  TRIP_COST_SOURCE,
  TRIP_COST_STATUS,
  TRIP_COST_TYPE,
} from "~/constants/status-options";
import { formatAmountWithSymbol } from "~/constants/currency-format";
import { moduleTableDef } from "~/data/system-modules";
import TripCostDialog from "./TripCostDialog";
import { DpConfirmDialog } from "~/components/DpConfirmDialog";

type TripCostTableRow = TripCostRecord & { amountFormatted: string; chargeTypeLabel: string };

export function meta({ data }: Route.MetaArgs) {
  const tripCode = data?.trip?.code ?? "Viaje";
  return [
    { title: `Costos: ${tripCode}` },
    { name: "description", content: `Costos del viaje ${tripCode}` },
  ];
}

const TABLE_DEF = moduleTableDef("trip-cost", { source: TRIP_COST_SOURCE, status: TRIP_COST_STATUS });

const TRIP_COSTS_FOOTER_TOTALS: DpTableFooterTotals = {
  label: "Total:",
  sumColumns: ["amountFormatted"],
  sumValueKey: { amountFormatted: "amount" },
};

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
  const location = useLocation();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const tableRef = useRef<DpTableRef<TripCostTableRow>>(null);

  const tableRows = useMemo<TripCostTableRow[]>(
    () =>
      costs.map((c) => ({
        ...c,
        amountFormatted: formatAmountWithSymbol(c.amount, c.currency),
        chargeTypeLabel: c.chargeType?.trim() || c.chargeTypeId?.trim() || TRIP_COST_TYPE[c.type]?.label || c.type,
      })),
    [costs]
  );

  /** Moneda para el total: homogénea si todas las filas coinciden; si no, PEN (suma numérica igualmente). */
  const totalFooterCurrency = useMemo(() => {
    if (!costs.length) return "PEN";
    const c0 = (costs[0]!.currency || "PEN").trim() || "PEN";
    return costs.every((c) => (String(c.currency ?? "PEN").trim() || "PEN") === c0) ? c0 : "PEN";
  }, [costs]);

  const tripCostsFooterTotals = useMemo<DpTableFooterTotals>(
    () => ({
      ...TRIP_COSTS_FOOTER_TOTALS,
      formatSum: (sum) => formatAmountWithSymbol(sum, totalFooterCurrency),
    }),
    [totalFooterCurrency]
  );

  const isLoading = navigation.state !== "idle" || revalidator.state === "loading";
  const isAdd = !!useMatch("/transport/trips/:id/trip-costs/add");
  const editMatch = useMatch("/transport/trips/:id/trip-costs/edit/:costId");
  const editCostId = editMatch?.params.costId ?? null;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterValue, setFilterValue] = useState("");
  const [selectedCount, setSelectedCount] = useState(0);
  /** IDs seleccionados para eliminar tras confirmar en el modal */
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(null);

  const dialogVisible = isAdd || !!editCostId;
  const listQuery = location.search;
  const costsBase = `/transport/trips/${encodeURIComponent(tripId)}/trip-costs`;

  const handleFilter = (value: string) => {
    setFilterValue(value);
    tableRef.current?.filter(value);
  };

  const openAdd = () => navigate(withUrlSearch(`${costsBase}/add`, listQuery));
  const openEdit = (row: TripCostTableRow) =>
    navigate(withUrlSearch(`${costsBase}/edit/${encodeURIComponent(row.id)}`, listQuery));

  const openDeleteConfirm = () => {
    const selected = tableRef.current?.getSelectedRows() ?? [];
    if (!selected.length) return;
    setPendingDeleteIds(selected.map((r) => r.id));
  };

  const handleConfirmDelete = async () => {
    const ids = pendingDeleteIds;
    if (!ids?.length) return;
    setSaving(true);
    setError(null);
    try {
      if (ids.length === 1) {
        await deleteTripCost(ids[0]);
      } else {
        await deleteTripCosts(ids);
      }
      tableRef.current?.clearSelectedRows();
      setPendingDeleteIds(null);
      revalidator.revalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar.");
    } finally {
      setSaving(false);
    }
  };

  const closeDeleteConfirm = () => {
    if (!saving) setPendingDeleteIds(null);
  };

  const handleSuccess = () => {
    navigate(withUrlSearch(costsBase, listQuery));
    revalidator.revalidate();
  };
  const handleHide = () => navigate(withUrlSearch(costsBase, listQuery));
  const onBack = () => navigate(withUrlSearch("/transport/trips", listQuery));

  return (
    <DpContentInfo
      title={trip ? `Costos: ${trip.code}` : "Costos del viaje"}
      breadcrumbItems={["TRANSPORTE", "VIAJES", "COSTOS"]}
      backLabel="Volver a viajes"
      onBack={onBack}
      onCreate={openAdd}
    >
      <DpContentHeader
        onLoad={() => revalidator.revalidate()}
        onDelete={openDeleteConfirm}
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
      <DpTable<TripCostTableRow>
        ref={tableRef}
        data={tableRows}
        loading={isLoading || saving}
        tableDef={TABLE_DEF}
        paginator={false}
        footerTotals={tripCostsFooterTotals}
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
      <DpConfirmDialog
        visible={pendingDeleteIds !== null}
        onHide={closeDeleteConfirm}
        title="Eliminar costos"
        message={
          pendingDeleteIds?.length
            ? `¿Eliminar ${pendingDeleteIds.length} costo(s)? Esta acción no se puede deshacer.`
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
