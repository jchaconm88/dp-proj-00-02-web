import { useMemo, useRef, useState } from "react";
import { useNavigate, useNavigation, useRevalidator, useMatch } from "react-router";
import {
  getSettlementById,
  getSettlementItems,
  deleteSettlementItem,
  deleteSettlementItems,
  type SettlementItem,
} from "~/features/transport/settlements";
import type { Route } from "./+types/SettlementItemsPage";
import { DpContentInfo, DpContentHeader } from "~/components/DpContent";
import {
  DpTable,
  type DpTableRef,
  type DpTableDefColumn,
  type DpTableFooterTotals,
} from "~/components/DpTable";
import { DpConfirmDialog } from "~/components/DpConfirmDialog";
import { SETTLEMENT_MOVEMENT_TYPE } from "~/constants/status-options";
import { formatAmountWithSymbol } from "~/constants/currency-format";
import SettlementItemDialog from "./SettlementItemDialog";

export function meta({ data }: Route.MetaArgs) {
  const code = data?.settlement?.code ?? "Liquidación";
  return [
    { title: `Ítems: ${code}` },
    { name: "description", content: `Ítems de liquidación ${code}` },
  ];
}

type ItemRow = SettlementItem & {
  tripCode: string;
  tripRouteDisplay: string;
  tripStartDate: string;
  movementDisplay: string;
  amountFormatted: string;
  settledFormatted: string;
  pendingFormatted: string;
};

const TABLE_DEF: DpTableDefColumn[] = [
  { header: "Viaje", column: "tripCode", order: 1, display: true, filter: true },
  { header: "Ruta", column: "tripRouteDisplay", order: 2, display: true, filter: true },
  {
    header: "Fecha",
    column: "tripStartDate",
    order: 3,
    display: true,
    filter: true,
    type: "date",
  },
  {
    header: "Tipo de movimiento",
    column: "movementDisplay",
    order: 4,
    display: true,
    filter: true,
  },
  { header: "Tipo cargo", column: "chargeType", order: 5, display: true, filter: true },
  { header: "Concepto", column: "concept", order: 6, display: true, filter: true },
  { header: "Monto", column: "amountFormatted", order: 7, display: true, filter: true },
  { header: "Liquidado", column: "settledFormatted", order: 8, display: true, filter: true },
  { header: "Pendiente", column: "pendingFormatted", order: 9, display: true, filter: true },
];

const FOOTER: DpTableFooterTotals = {
  label: "Total:",
  sumColumns: ["amountFormatted", "settledFormatted", "pendingFormatted"],
  sumValueKey: {
    amountFormatted: "amount",
    settledFormatted: "settledAmount",
    pendingFormatted: "pendingAmount",
  },
};

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const settlementId = (params?.id ?? "") as string;
  if (!settlementId) throw new Error("ID de liquidación no encontrado");
  const settlement = await getSettlementById(settlementId);
  if (!settlement) throw new Error("Liquidación no encontrada");
  const items = await getSettlementItems(settlementId);
  return { settlement, items, settlementId };
}

export default function SettlementItemsPage({ loaderData }: Route.ComponentProps) {
  const { settlement, items, settlementId } = loaderData;
  const navigate = useNavigate();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const tableRef = useRef<DpTableRef<ItemRow>>(null);

  const tableRows = useMemo<ItemRow[]>(
    () =>
      items.map((it) => {
        const typeLabel =
          SETTLEMENT_MOVEMENT_TYPE[it.movement.type]?.label ?? it.movement.type;
        return {
          ...it,
          tripCode: it.trip.code || it.trip.id,
          tripRouteDisplay: it.trip.route.trim() || "—",
          tripStartDate: it.trip.scheduledStart.trim(),
          movementDisplay: `${typeLabel}`,
          amountFormatted: formatAmountWithSymbol(it.amount, it.currency),
          settledFormatted: formatAmountWithSymbol(it.settledAmount, it.currency),
          pendingFormatted: formatAmountWithSymbol(it.pendingAmount, it.currency),
        };
      }),
    [items]
  );

  const footerCurrency = useMemo(() => {
    if (!items.length) return "PEN";
    const c0 = (items[0]!.currency || "PEN").trim() || "PEN";
    return items.every((i) => (String(i.currency ?? "PEN").trim() || "PEN") === c0) ? c0 : "PEN";
  }, [items]);

  const footerTotals = useMemo<DpTableFooterTotals>(
    () => ({
      ...FOOTER,
      formatSum: (sum) => formatAmountWithSymbol(sum, footerCurrency),
    }),
    [footerCurrency]
  );

  const isLoading = navigation.state !== "idle" || revalidator.state === "loading";
  const isAdd = !!useMatch("/transport/settlements/:id/items/add");
  const editMatch = useMatch("/transport/settlements/:id/items/edit/:itemId");
  const editItemId = editMatch?.params.itemId ?? null;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterValue, setFilterValue] = useState("");
  const [selectedCount, setSelectedCount] = useState(0);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(null);

  const dialogVisible = isAdd || !!editItemId;

  const basePath = `/transport/settlements/${encodeURIComponent(settlementId)}/items`;

  const handleFilter = (value: string) => {
    setFilterValue(value);
    tableRef.current?.filter(value);
  };

  const openAdd = () => navigate(`${basePath}/add`);
  const openEdit = (row: ItemRow) => navigate(`${basePath}/edit/${encodeURIComponent(row.id)}`);

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
        await deleteSettlementItem(settlementId, ids[0]!);
      } else {
        await deleteSettlementItems(settlementId, ids);
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
    navigate(basePath);
    revalidator.revalidate();
  };
  const handleHide = () => navigate(basePath);
  const onBack = () => navigate("/transport/settlements");

  return (
    <DpContentInfo
      title={settlement ? `Ítems: ${settlement.code}` : "Ítems de liquidación"}
      backLabel="Volver a liquidaciones"
      onBack={onBack}
    >
      <DpContentHeader
        onLoad={() => revalidator.revalidate()}
        onCreate={openAdd}
        onDelete={openDeleteConfirm}
        deleteDisabled={selectedCount === 0 || saving}
        filterValue={filterValue}
        onFilter={handleFilter}
        filterPlaceholder="Filtrar ítems..."
      />
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}
      <DpTable<ItemRow>
        ref={tableRef}
        data={tableRows}
        loading={isLoading || saving}
        tableDef={TABLE_DEF}
        paginator={false}
        footerTotals={footerTotals}
        onSelectionChange={(r) => setSelectedCount(r.length)}
        onEdit={openEdit}
        showFilterInHeader={false}
        emptyMessage="No hay ítems en esta liquidación."
        emptyFilterMessage="No se encontraron ítems."
      />
      {dialogVisible && (
        <SettlementItemDialog
          visible={dialogVisible}
          settlementId={settlementId}
          itemId={editItemId}
          onSuccess={handleSuccess}
          onHide={handleHide}
        />
      )}
      <DpConfirmDialog
        visible={pendingDeleteIds !== null}
        onHide={closeDeleteConfirm}
        title="Eliminar ítems"
        message={
          pendingDeleteIds?.length
            ? `¿Eliminar ${pendingDeleteIds.length} ítem(es)? Esta acción no se puede deshacer.`
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
