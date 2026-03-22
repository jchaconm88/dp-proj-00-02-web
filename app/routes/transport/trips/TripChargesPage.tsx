import { useMemo, useRef, useState } from "react";
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
import {
  DpTable,
  type DpTableRef,
  type DpTableDefColumn,
  type DpTableFooterTotals,
} from "~/components/DpTable";
import { DpConfirmDialog } from "~/components/DpConfirmDialog";
import {
  TRIP_CHARGE_TYPE,
  TRIP_CHARGE_SOURCE,
  TRIP_CHARGE_STATUS,
} from "~/constants/status-options";
import { formatAmountWithSymbol } from "~/constants/currency-format";
import TripChargeDialog from "./TripChargeDialog";

type TripChargeTableRow = TripChargeRecord & { amountFormatted: string; settlementDisplay: string };

export function meta({ data }: Route.MetaArgs) {
  const tripCode = data?.trip?.code ?? "Viaje";
  return [
    { title: `Cargos: ${tripCode}` },
    { name: "description", content: `Cargos del viaje ${tripCode}` },
  ];
}

const TABLE_DEF: DpTableDefColumn[] = [
  { header: "Código", column: "code", order: 1, display: true, filter: true },
  { header: "Nombre", column: "name", order: 2, display: true, filter: true },
  { header: "Tipo", column: "type", order: 3, display: true, filter: true, type: "label", typeOptions: TRIP_CHARGE_TYPE },
  { header: "Origen", column: "source", order: 4, display: true, filter: true, type: "label", typeOptions: TRIP_CHARGE_SOURCE },
  { header: "Monto", column: "amountFormatted", order: 5, display: true, filter: true },
  { header: "Estado", column: "status", order: 6, display: true, filter: true, type: "status", typeOptions: TRIP_CHARGE_STATUS },
  { header: "ID liquidación", column: "settlementDisplay", order: 7, display: true, filter: true },
];

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
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const tableRef = useRef<DpTableRef<TripChargeTableRow>>(null);

  const tableRows = useMemo<TripChargeTableRow[]>(
    () =>
      charges.map((c) => ({
        ...c,
        amountFormatted: formatAmountWithSymbol(c.amount, c.currency),
        settlementDisplay: (c.settlementId ?? "").trim() || "—",
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

  const handleFilter = (value: string) => {
    setFilterValue(value);
    tableRef.current?.filter(value);
  };

  const openAdd = () => navigate(`/transport/trips/${encodeURIComponent(tripId)}/trip-charges/add`);
  const openEdit = (row: TripChargeTableRow) =>
    navigate(`/transport/trips/${encodeURIComponent(tripId)}/trip-charges/edit/${encodeURIComponent(row.id)}`);

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
      />
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
