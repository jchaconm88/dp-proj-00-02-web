import { useMemo, useRef, useState } from "react";
import { useNavigate, useNavigation, useRevalidator, useMatch } from "react-router";
import {
  getSettlements,
  deleteSettlement,
  deleteSettlements,
  buildSettlementPeriodLabel,
  type Settlement,
} from "~/features/transport/settlements";
import type { Route } from "./+types/SettlementsPage";
import { DpContent, DpContentHeader } from "~/components/DpContent";
import { DpTable, type DpTableRef, type DpTableDefColumn } from "~/components/DpTable";
import { DpConfirmDialog } from "~/components/DpConfirmDialog";
import DpTColumn from "~/components/DpTable/DpTColumn";
import {
  SETTLEMENT_TYPE,
  SETTLEMENT_CATEGORY,
  SETTLEMENT_STATUS,
  SETTLEMENT_PAYMENT_STATUS,
} from "~/constants/status-options";
import { formatAmountWithSymbol } from "~/constants/currency-format";
import SettlementDialog from "./SettlementDialog";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Liquidaciones" },
    { name: "description", content: "Liquidaciones de transporte" },
  ];
}

type SettlementRow = Settlement & {
  entityDisplay: string;
  grossFormatted: string;
  periodLabel: string;
};

const TABLE_DEF: DpTableDefColumn[] = [
  { header: "Código", column: "code", order: 1, display: true, filter: true },
  {
    header: "Tipo",
    column: "type",
    order: 2,
    display: true,
    filter: true,
    type: "label",
    typeOptions: SETTLEMENT_TYPE,
  },
  {
    header: "Categoría",
    column: "category",
    order: 3,
    display: true,
    filter: true,
    type: "label",
    typeOptions: SETTLEMENT_CATEGORY,
  },
  { header: "Entidad", column: "entityDisplay", order: 4, display: true, filter: true },
  { header: "Periodo", column: "periodLabel", order: 5, display: true, filter: true },
  { header: "Bruto", column: "grossFormatted", order: 6, display: true, filter: true },
  {
    header: "Estado",
    column: "status",
    order: 7,
    display: true,
    filter: true,
    type: "status",
    typeOptions: SETTLEMENT_STATUS,
  },
  {
    header: "Pago",
    column: "paymentStatus",
    order: 8,
    display: true,
    filter: true,
    type: "status",
    typeOptions: SETTLEMENT_PAYMENT_STATUS,
  },
  { header: "Ítems", column: "itemsLink", order: 9, display: true, filter: false },
];

export async function clientLoader() {
  const items = await getSettlements();
  return { items };
}

export default function SettlementsPage({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const tableRef = useRef<DpTableRef<SettlementRow>>(null);

  const rows = useMemo<SettlementRow[]>(
    () =>
      loaderData.items.map((s) => ({
        ...s,
        entityDisplay: `${s.entity.name}`.trim(),
        periodLabel:
          (s.period.start?.trim() || s.period.end?.trim())
            ? buildSettlementPeriodLabel(s.period.start, s.period.end)
            : s.period.label || "",
        grossFormatted: formatAmountWithSymbol(s.totals.grossAmount, s.totals.currency),
      })),
    [loaderData.items]
  );

  const isLoading = navigation.state !== "idle" || revalidator.state === "loading";
  const isAdd = !!useMatch("/transport/settlements/add");
  const editMatch = useMatch("/transport/settlements/edit/:id");
  const editId = editMatch?.params.id ?? null;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterValue, setFilterValue] = useState("");
  const [selectedCount, setSelectedCount] = useState(0);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(null);

  const dialogVisible = isAdd || !!editId;

  const handleFilter = (value: string) => {
    setFilterValue(value);
    tableRef.current?.filter(value);
  };

  const openAdd = () => navigate("/transport/settlements/add");
  const openEdit = (row: SettlementRow) =>
    navigate(`/transport/settlements/edit/${encodeURIComponent(row.id)}`);

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
        await deleteSettlement(ids[0]!);
      } else {
        await deleteSettlements(ids);
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
    navigate("/transport/settlements");
    revalidator.revalidate();
  };
  const handleHide = () => navigate("/transport/settlements");

  return (
    <DpContent title="LIQUIDACIONES">
      <DpContentHeader
        onLoad={() => revalidator.revalidate()}
        onCreate={openAdd}
        onDelete={openDeleteConfirm}
        deleteDisabled={selectedCount === 0 || saving}
        filterValue={filterValue}
        onFilter={handleFilter}
        filterPlaceholder="Filtrar por código, entidad..."
      />
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}
      <DpTable<SettlementRow>
        ref={tableRef}
        data={rows}
        loading={isLoading || saving}
        tableDef={TABLE_DEF}
        onSelectionChange={(r) => setSelectedCount(r.length)}
        onEdit={openEdit}
        showFilterInHeader={false}
        emptyMessage="No hay liquidaciones."
        emptyFilterMessage="No se encontraron liquidaciones."
      >
        <DpTColumn<SettlementRow> name="itemsLink">
          {(row) => (
            <button
              type="button"
              onClick={() =>
                navigate(`/transport/settlements/${encodeURIComponent(row.id)}/items`)
              }
              className="p-button p-button-text p-button-rounded p-button-icon-only"
              aria-label="Ítems de liquidación"
              title="Ítems"
            >
              <i className="pi pi-list" />
            </button>
          )}
        </DpTColumn>
      </DpTable>

      {dialogVisible && (
        <SettlementDialog
          visible={dialogVisible}
          settlementId={editId}
          onSuccess={handleSuccess}
          onHide={handleHide}
        />
      )}

      <DpConfirmDialog
        visible={pendingDeleteIds !== null}
        onHide={closeDeleteConfirm}
        title="Eliminar liquidaciones"
        message={
          pendingDeleteIds?.length
            ? `¿Eliminar ${pendingDeleteIds.length} liquidación(es) y sus ítems? Esta acción no se puede deshacer.`
            : ""
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
