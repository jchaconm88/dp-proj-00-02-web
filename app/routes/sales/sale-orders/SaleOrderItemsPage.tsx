import { useMemo, useRef, useState } from "react";
import { useNavigate, useNavigation, useRevalidator, useMatch } from "react-router";
import {
  getSaleOrderById,
  getSaleOrderItems,
  deleteSaleOrderItem,
  createInvoiceFromSaleOrder,
  type SaleOrderItemRecord,
} from "~/features/sales/sale-orders";
import { getUnitsOfMeasureCatalog } from "~/features/system/units-of-measure";
import { getAuthUser } from "~/lib/get-auth-user";
import type { Route } from "./+types/SaleOrderItemsPage";
import { DpContentInfo, DpContentHeader } from "~/components/DpContent";
import { DpTable, type DpTableRef, type DpTableFooterTotals } from "~/components/DpTable";
import { DpConfirmDialog } from "~/components/DpConfirmDialog";
import { moduleTableDef } from "~/data/system-modules";
import SaleOrderItemDialog from "./SaleOrderItemDialog";
import GenerateInvoiceDialog from "./GenerateInvoiceDialog";
import SaleOrderDispatchDialog from "./SaleOrderDispatchDialog";

const TABLE_DEF = moduleTableDef("sale-order-item");

export function meta({ data }: Route.MetaArgs) {
  return [
    { title: `Ítems: ${data?.order?.code || "Orden de Venta"}` },
  ];
}

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  await getAuthUser();
  const orderId = params.id ?? "";
  if (!orderId) throw new Error("ID de orden no encontrado");
  const [order, { items }, unitsCatalog] = await Promise.all([
    getSaleOrderById(orderId),
    getSaleOrderItems(orderId),
    getUnitsOfMeasureCatalog(),
  ]);
  if (!order) throw new Error("Orden de venta no encontrada");
  return { order, items, orderId, unitsCatalog };
}

export default function SaleOrderItemsPage({ loaderData }: Route.ComponentProps) {
  const { order, items, orderId, unitsCatalog } = loaderData;
  const navigate = useNavigate();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const tableRef = useRef<DpTableRef<SaleOrderItemRecord>>(null);

  const basePath = `/sales/sale-orders/${encodeURIComponent(orderId)}/items`;
  const lockedByStatus = order.status !== "draft";
  const canGenerateInvoice = ["confirmed", "in_progress", "delivered"].includes(order.status);

  const isLoading = navigation.state !== "idle" || revalidator.state === "loading";
  const isAdd = !!useMatch("/sales/sale-orders/:id/items/add");
  const editMatch = useMatch("/sales/sale-orders/:id/items/edit/:itemId");
  const editItemId = editMatch?.params.itemId ?? null;
  const dialogVisible = isAdd || !!editItemId;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterValue, setFilterValue] = useState("");
  const [selectedCount, setSelectedCount] = useState(0);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(null);
  const [invoiceDialogVisible, setInvoiceDialogVisible] = useState(false);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const [dispatchDialogVisible, setDispatchDialogVisible] = useState(false);

  const canDispatch = order.status === "confirmed" || order.status === "in_progress";

  const footerTotals = useMemo<DpTableFooterTotals>(
    () => ({
      label: "Total:",
      sumColumns: ["total"],
      sumValueKey: { total: "total" },
      formatSum: (sum) => sum.toFixed(2),
    }),
    []
  );

  const handleFilter = (value: string) => {
    setFilterValue(value);
    tableRef.current?.filter(value);
  };

  const openAdd = () => {
    if (lockedByStatus) {
      setError("Solo se pueden agregar ítems cuando la orden está en estado Borrador.");
      return;
    }
    navigate(`${basePath}/add`);
  };

  const openEdit = (row: SaleOrderItemRecord) => {
    if (lockedByStatus) {
      setError("Solo se pueden editar ítems cuando la orden está en estado Borrador.");
      return;
    }
    navigate(`${basePath}/edit/${encodeURIComponent(row.id)}`);
  };

  const openDeleteConfirm = () => {
    if (lockedByStatus) {
      setError("Solo se pueden eliminar ítems cuando la orden está en estado Borrador.");
      return;
    }
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
      for (const itemId of ids) {
        await deleteSaleOrderItem(orderId, itemId);
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

  const handleGenerateInvoice = async (data: {
    type: string;
    sequenceId: string;
    companyLocationId: string;
    payTerm: string;
    currency: string;
    issueDate: string;
  }) => {
    setGeneratingInvoice(true);
    setError(null);
    try {
      const invoiceId = await createInvoiceFromSaleOrder(orderId, data);
      setInvoiceDialogVisible(false);
      navigate(`/billing/invoices/edit/${encodeURIComponent(invoiceId)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al generar el comprobante.");
    } finally {
      setGeneratingInvoice(false);
    }
  };

  const handleSuccess = () => {
    navigate(basePath);
    revalidator.revalidate();
  };

  const handleDispatchSuccess = () => {
    setDispatchDialogVisible(false);
    revalidator.revalidate();
  };

  const onBack = () => navigate("/sales/sale-orders");

  return (
    <DpContentInfo
      title={`Ítems: ${order.code}`}
      breadcrumbItems={["VENTAS", "ÓRDENES DE VENTA", "ÍTEMS"]}
      backLabel="Volver a órdenes de venta"
      onBack={onBack}
      onCreate={lockedByStatus ? undefined : openAdd}
    >
      <DpContentHeader
        filterValue={filterValue}
        onFilter={handleFilter}
        onLoad={() => revalidator.revalidate()}
        onDelete={openDeleteConfirm}
        deleteDisabled={lockedByStatus || selectedCount === 0 || saving}
        filterPlaceholder="Filtrar ítems..."
      />

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}

      {canDispatch && (
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setDispatchDialogVisible(true)}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            <i className="pi pi-truck" />
            Despachar mercadería
          </button>
        </div>
      )}

      {lockedByStatus && (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          Esta orden no está en estado <strong>Borrador</strong> y no se pueden modificar sus ítems.
        </div>
      )}

      {canGenerateInvoice && (
        <div className="mb-4 flex items-center gap-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 dark:border-blue-800 dark:bg-blue-950/40">
          <span className="text-sm text-blue-900 dark:text-blue-200">
            Puede generar un comprobante de venta desde esta orden.
          </span>
          <button
            type="button"
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            onClick={() => setInvoiceDialogVisible(true)}
            disabled={generatingInvoice}
          >
            {generatingInvoice ? "Generando..." : "Generar Comprobante"}
          </button>
        </div>
      )}

      <DpTable<SaleOrderItemRecord>
        ref={tableRef}
        data={items}
        loading={isLoading || saving}
        tableDef={TABLE_DEF}
        paginator={false}
        footerTotals={footerTotals}
        onEdit={lockedByStatus ? undefined : openEdit}
        onSelectionChange={(rows) => setSelectedCount(rows.length)}
        showFilterInHeader={false}
        emptyMessage="No hay ítems en esta orden de venta."
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
        <SaleOrderItemDialog
          visible={dialogVisible}
          orderId={orderId}
          itemId={editItemId}
          unitsCatalog={unitsCatalog}
          locked={lockedByStatus}
          onSuccess={handleSuccess}
          onHide={() => navigate(basePath)}
        />
      )}

      <SaleOrderDispatchDialog
        visible={dispatchDialogVisible}
        order={order}
        items={items}
        onSuccess={handleDispatchSuccess}
        onHide={() => setDispatchDialogVisible(false)}
      />

      <GenerateInvoiceDialog
        visible={invoiceDialogVisible}
        orderCurrency={order.currency}
        onConfirm={handleGenerateInvoice}
        onHide={() => setInvoiceDialogVisible(false)}
        saving={generatingInvoice}
      />
    </DpContentInfo>
  );
}
