import { useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useNavigation, useRevalidator, useMatch } from "react-router";
import { getTripById } from "~/features/transport/trips";
import {
  getTripCharges,
  deleteTripCharge,
  deleteTripCharges,
  type TripChargeRecord,
} from "~/features/transport/trip-charges";
import type { Route } from "./+types/TripChargesPage";
import { withUrlSearch } from "~/lib/url-search";
import { DpContentInfo, DpContentHeader } from "~/components/DpContent";
import {
  DpTable,
  type DpTableRef,
  type DpTableFooterTotals,
} from "~/components/DpTable";
import DpTColumn from "~/components/DpTable/DpTColumn";
import { DpConfirmDialog } from "~/components/DpConfirmDialog";
import {
  TRIP_CHARGE_SOURCE,
  TRIP_CHARGE_STATUS,
  TRIP_CHARGE_TYPE,
} from "~/constants/status-options";
import { formatAmountWithSymbol } from "~/constants/currency-format";
import { moduleTableDef } from "~/data/system-modules";
import TripChargeDialog from "./TripChargeDialog";

type TripChargeTableRow = TripChargeRecord & { amountFormatted: string; chargeTypeLabel: string };

export function meta({ data }: Route.MetaArgs) {
  const tripCode = data?.trip?.code ?? "Viaje";
  return [
    { title: `Cargos: ${tripCode}` },
    { name: "description", content: `Cargos del viaje ${tripCode}` },
  ];
}

const TABLE_DEF = moduleTableDef("trip-charge", { source: TRIP_CHARGE_SOURCE, status: TRIP_CHARGE_STATUS });

const TRIP_CHARGES_FOOTER_TOTALS: DpTableFooterTotals = {
  label: "Total:",
  sumColumns: ["amountFormatted"],
  sumValueKey: { amountFormatted: "amount" },
};

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
  const location = useLocation();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const tableRef = useRef<DpTableRef<TripChargeTableRow>>(null);

  const tableRows = useMemo<TripChargeTableRow[]>(
    () =>
      charges.map((c) => ({
        ...c,
        amountFormatted: formatAmountWithSymbol(c.amount, c.currency),
        chargeTypeLabel: c.chargeType?.trim() || c.chargeTypeId?.trim() || TRIP_CHARGE_TYPE[c.type]?.label || c.type,
      })),
    [charges]
  );

  const totalFooterCurrency = useMemo(() => {
    if (!charges.length) return "PEN";
    const c0 = (charges[0]!.currency || "PEN").trim() || "PEN";
    return charges.every((c) => (String(c.currency ?? "PEN").trim() || "PEN") === c0) ? c0 : "PEN";
  }, [charges]);

  const tripChargesFooterTotals = useMemo<DpTableFooterTotals>(
    () => ({
      ...TRIP_CHARGES_FOOTER_TOTALS,
      formatSum: (sum) => formatAmountWithSymbol(sum, totalFooterCurrency),
    }),
    [totalFooterCurrency]
  );

  const isLoading = navigation.state !== "idle" || revalidator.state === "loading";
  const isAdd = !!useMatch("/transport/trips/:id/trip-charges/add");
  const editMatch = useMatch("/transport/trips/:id/trip-charges/edit/:chargeId");
  const editChargeId = editMatch?.params.chargeId ?? null;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterValue, setFilterValue] = useState("");
  const [selectedCount, setSelectedCount] = useState(0);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(null);

  const dialogVisible = isAdd || !!editChargeId;
  const listQuery = location.search;
  const chargesBase = `/transport/trips/${encodeURIComponent(tripId)}/trip-charges`;

  const handleFilter = (value: string) => {
    setFilterValue(value);
    tableRef.current?.filter(value);
  };

  const openAdd = () => navigate(withUrlSearch(`${chargesBase}/add`, listQuery));
  const openEdit = (row: TripChargeTableRow) =>
    navigate(withUrlSearch(`${chargesBase}/edit/${encodeURIComponent(row.id)}`, listQuery));

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
        await deleteTripCharge(ids[0]);
      } else {
        await deleteTripCharges(ids);
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
    navigate(withUrlSearch(chargesBase, listQuery));
    revalidator.revalidate();
  };
  const handleHide = () => navigate(withUrlSearch(chargesBase, listQuery));
  const onBack = () => navigate(withUrlSearch("/transport/trips", listQuery));

  return (
    <DpContentInfo
      title={trip ? `Cargos: ${trip.code}` : "Cargos del viaje"}
      breadcrumbItems={["TRANSPORTE", "VIAJES", "CARGOS"]}
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
        filterPlaceholder="Filtrar cargos..."
      />
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}
      <DpTable<TripChargeTableRow>
        ref={tableRef}
        data={tableRows}
        loading={isLoading || saving}
        tableDef={TABLE_DEF}
        paginator={false}
        footerTotals={tripChargesFooterTotals}
        onSelectionChange={(rows) => setSelectedCount(rows.length)}
        onEdit={openEdit}
        showFilterInHeader={false}
        emptyMessage="No hay cargos en este viaje."
        emptyFilterMessage="No se encontraron cargos."
      >
        <DpTColumn<TripChargeTableRow> name="settlement">
          {(row) => {
            const settlementLabel = String(row.settlement ?? "").trim();
            const settlementId = String(row.settlementId ?? "").trim();
            if (!settlementLabel || !settlementId) return <span>{settlementLabel || "—"}</span>;
            return (
              <button
                type="button"
                onClick={() => navigate(`/transport/settlements/${encodeURIComponent(settlementId)}/items`)}
                className="dp-table-link-button"
                aria-label={`Ver liquidación ${settlementLabel}`}
              >
                {settlementLabel}
              </button>
            );
          }}
        </DpTColumn>
      </DpTable>
      {dialogVisible && (
        <TripChargeDialog
          visible={dialogVisible}
          tripId={tripId}
          clientId={trip?.clientId ?? ""}
          chargeId={editChargeId}
          onSuccess={handleSuccess}
          onHide={handleHide}
        />
      )}

      <DpConfirmDialog
        visible={pendingDeleteIds !== null}
        onHide={closeDeleteConfirm}
        title="Eliminar cargos"
        message={
          pendingDeleteIds?.length
            ? `¿Eliminar ${pendingDeleteIds.length} cargo(s)? Esta acción no se puede deshacer.`
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
