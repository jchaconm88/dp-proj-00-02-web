import { useMemo, useRef, useState } from "react";
import { useNavigate, useNavigation, useRevalidator, useMatch, useLocation } from "react-router";
import { Button } from "primereact/button";
import {
  getInvoiceById,
  getInvoiceCredits,
  deleteInvoiceCredit,
  type InvoiceCreditRecord,
} from "~/features/billing/invoice";
import type { Route } from "./+types/InvoiceCreditsPage";
import {
  DpContentInfo,
  DpContentHeader,
  DpContentHeaderAction,
} from "~/components/DpContent";
import { DpTable, type DpTableRef } from "~/components/DpTable";
import { DpConfirmDialog } from "~/components/DpConfirmDialog";
import { formatAmountWithSymbol } from "~/constants/currency-format";
import { moduleTableDef } from "~/data/system-modules";
import { withUrlSearch } from "~/lib/url-search";
import InvoiceCreditDialog from "./InvoiceCreditDialog";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Cuotas de factura" }];
}

type CreditRow = InvoiceCreditRecord & { creditFormatted: string };

const TABLE_DEF = moduleTableDef("invoice-credit");

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const invoiceId = (params?.id ?? "") as string;
  if (!invoiceId) throw new Error("ID de factura no encontrado");
  const [invoice, { items }] = await Promise.all([
    getInvoiceById(invoiceId),
    getInvoiceCredits(invoiceId),
  ]);
  if (!invoice) throw new Error("Factura no encontrada");
  return { invoice, items, invoiceId };
}

export default function InvoiceCreditsPage({ loaderData }: Route.ComponentProps) {
  const { invoice, items, invoiceId } = loaderData;
  const navigate = useNavigate();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const location = useLocation();
  const listQuery = location.search;
  const tableRef = useRef<DpTableRef<CreditRow>>(null);

  const tableRows = useMemo<CreditRow[]>(
    () =>
      items.map((c) => ({
        ...c,
        creditFormatted: formatAmountWithSymbol(c.creditVal, invoice.currency),
      })),
    [items, invoice.currency]
  );

  const isLoading = navigation.state !== "idle" || revalidator.state === "loading";
  const isAdd = !!useMatch("/billing/invoices/:id/credits/add");
  const editMatch = useMatch("/billing/invoices/:id/credits/edit/:creditId");
  const editCreditId = editMatch?.params.creditId ?? null;
  const dialogVisible = isAdd || !!editCreditId;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterValue, setFilterValue] = useState("");
  const [selectedCount, setSelectedCount] = useState(0);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(null);

  const basePath = `/billing/invoices/${encodeURIComponent(invoiceId)}/credits`;

  const handleFilter = (value: string) => {
    setFilterValue(value);
    tableRef.current?.filter(value);
  };

  const openAdd = () => navigate(withUrlSearch(`${basePath}/add`, listQuery));
  const openEdit = (row: CreditRow) =>
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
      await Promise.all(ids.map((id) => deleteInvoiceCredit(invoiceId, id)));
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

  const isCredit = invoice.payTerm === "credit";

  return (
    <DpContentInfo
      title={`Cuotas: ${invoice.documentNo}`}
      breadcrumbItems={["FACTURACIÓN", "FACTURAS", "CUOTAS"]}
      backLabel="Volver a facturas"
      onBack={onBack}
      onCreate={openAdd}
    >
      {!isCredit && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          La condición de pago de esta factura no es <strong>Crédito</strong>. Las cuotas son opcionales;
          revíselas solo si aplican a su proceso.
        </div>
      )}
      <DpContentHeader
        onLoad={() => revalidator.revalidate()}
        onDelete={openDeleteConfirm}
        deleteDisabled={selectedCount === 0 || saving}
        filterValue={filterValue}
        onFilter={handleFilter}
        filterPlaceholder="Filtrar cuotas..."
      >
        <DpContentHeaderAction>
          <Button
            size="small"
            label="Ver ítems"
            icon="pi pi-list"
            type="button"
            severity="secondary"
            outlined
            onClick={() =>
              navigate(withUrlSearch(`/billing/invoices/${encodeURIComponent(invoiceId)}/items`, listQuery))
            }
          />
        </DpContentHeaderAction>
      </DpContentHeader>
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}
      <DpTable<CreditRow>
        ref={tableRef}
        data={tableRows}
        loading={isLoading || saving}
        tableDef={TABLE_DEF}
        paginator={false}
        onSelectionChange={(r) => setSelectedCount(r.length)}
        onEdit={openEdit}
        showFilterInHeader={false}
        emptyMessage="No hay cuotas registradas."
        emptyFilterMessage="No se encontraron cuotas."
      />
      <DpConfirmDialog
        visible={pendingDeleteIds !== null}
        onHide={closeDeleteConfirm}
        title="Eliminar cuotas"
        message={
          pendingDeleteIds?.length
            ? `¿Eliminar ${pendingDeleteIds.length} cuota(s)? Esta acción no se puede deshacer.`
            : ""
        }
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={handleConfirmDelete}
        severity="danger"
        loading={saving}
      />

      {dialogVisible && (
        <InvoiceCreditDialog
          visible={dialogVisible}
          invoiceId={invoiceId}
          creditId={editCreditId}
          invoiceTotalAmount={invoice.totalAmount}
          currency={invoice.currency}
          onSuccess={handleSuccess}
          onHide={() => navigate(basePath)}
        />
      )}
    </DpContentInfo>
  );
}
