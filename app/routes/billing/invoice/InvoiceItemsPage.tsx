import { useMemo, useRef, useState } from "react";
import { useNavigate, useNavigation, useRevalidator, useMatch, useLocation } from "react-router";
import { Button } from "primereact/button";
import {
  getInvoiceById,
  getInvoiceItems,
  deleteInvoiceItem,
  deleteInvoiceItems,
  type InvoiceItemRecord,
} from "~/features/billing/invoice";
import type { Route } from "./+types/InvoiceItemsPage";
import {
  DpContentInfo,
  DpContentHeader,
  DpContentHeaderAction,
} from "~/components/DpContent";
import {
  DpTable,
  type DpTableRef,
  type DpTableFooterTotals,
} from "~/components/DpTable";
import { DpConfirmDialog } from "~/components/DpConfirmDialog";
import { INVOICE_ITEM_TYPE } from "~/constants/status-options";
import { formatAmountWithSymbol } from "~/constants/currency-format";
import { moduleTableDef } from "~/data/system-modules";
import { withUrlSearch } from "~/lib/url-search";
import InvoiceItemDialog from "./InvoiceItemDialog";

export function meta({ data }: Route.MetaArgs) {
  return [
    { title: `Ítems: ${data?.invoice?.documentNo || "Factura"}` },
  ];
}

type ItemRow = InvoiceItemRecord & {
  measureName: string;
  taxTypeName: string;
  priceFormatted: string;
  taxFormatted: string;
  amountFormatted: string;
};

const TABLE_DEF = moduleTableDef("invoice-item", { itemType: INVOICE_ITEM_TYPE });

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const invoiceId = (params?.id ?? "") as string;
  if (!invoiceId) throw new Error("ID de factura no encontrado");
  const [invoice, { items }] = await Promise.all([
    getInvoiceById(invoiceId),
    getInvoiceItems(invoiceId),
  ]);
  if (!invoice) throw new Error("Factura no encontrada");
  return { invoice, items, invoiceId };
}

export default function InvoiceItemsPage({ loaderData }: Route.ComponentProps) {
  const { invoice, items, invoiceId } = loaderData;
  const navigate = useNavigate();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const location = useLocation();
  const listQuery = location.search;
  const tableRef = useRef<DpTableRef<ItemRow>>(null);

  const tableRows = useMemo<ItemRow[]>(
    () =>
      items.map((item) => ({
        ...item,
        measureName: item.measure.name,
        taxTypeName: item.taxType.name,
        priceFormatted: formatAmountWithSymbol(item.price, item.currency),
        taxFormatted: formatAmountWithSymbol(item.tax, item.currency),
        amountFormatted: formatAmountWithSymbol(item.amount, item.currency),
      })),
    [items]
  );

  const footerTotals = useMemo<DpTableFooterTotals>(
    () => ({
      label: "Total:",
      sumColumns: ["amountFormatted"],
      sumValueKey: { amountFormatted: "amount" },
      formatSum: (sum) => formatAmountWithSymbol(sum, invoice.currency),
    }),
    [invoice.currency]
  );

  const isLoading = navigation.state !== "idle" || revalidator.state === "loading";
  const isAdd = !!useMatch("/billing/invoices/:id/items/add");
  const editMatch = useMatch("/billing/invoices/:id/items/edit/:itemId");
  const editItemId = editMatch?.params.itemId ?? null;
  const dialogVisible = isAdd || !!editItemId;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterValue, setFilterValue] = useState("");
  const [selectedCount, setSelectedCount] = useState(0);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(null);

  const basePath = `/billing/invoices/${encodeURIComponent(invoiceId)}/items`;

  const handleFilter = (value: string) => {
    setFilterValue(value);
    tableRef.current?.filter(value);
  };

  const openAdd = () => navigate(withUrlSearch(`${basePath}/add`, listQuery));
  const openEdit = (row: ItemRow) =>
    navigate(withUrlSearch(`${basePath}/edit/${encodeURIComponent(row.id)}`, listQuery));

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
        await deleteInvoiceItem(invoiceId, ids[0]!);
      } else {
        await deleteInvoiceItems(invoiceId, ids);
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

  const onBack = () => navigate(withUrlSearch("/billing/invoices", listQuery));

  return (
    <DpContentInfo
      title={`Ítems: ${invoice.documentNo}`}
      breadcrumbItems={["FACTURACIÓN", "FACTURAS", "ÍTEMS"]}
      backLabel="Volver a facturas"
      onBack={onBack}
      onCreate={openAdd}
    >
      <DpContentHeader
        onLoad={() => revalidator.revalidate()}
        onDelete={openDeleteConfirm}
        deleteDisabled={selectedCount === 0 || saving}
        filterValue={filterValue}
        onFilter={handleFilter}
        filterPlaceholder="Filtrar ítems..."
      >
        {invoice.payTerm === "credit" && (
          <DpContentHeaderAction>
            <Button
              size="small"
              label="Gestionar cuotas"
              icon="pi pi-calendar"
              type="button"
              severity="secondary"
              outlined
            />
          </DpContentHeaderAction>
        )}
      </DpContentHeader>
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
        emptyMessage="No hay ítems en esta factura."
        emptyFilterMessage="No se encontraron ítems."
      />
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

      {dialogVisible && (
        <InvoiceItemDialog
          visible={dialogVisible}
          invoiceId={invoiceId}
          itemId={editItemId}
          currency={invoice.currency}
          onSuccess={handleSuccess}
          onHide={() => navigate(basePath)}
        />
      )}
    </DpContentInfo>
  );
}
