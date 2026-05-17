import { useRef, useState, useMemo } from "react";
import { useNavigate, useNavigation, useRevalidator, useMatch, Outlet } from "react-router";
import { Button } from "primereact/button";
import {
  getSaleOrders,
  deleteSaleOrder,
  deleteSaleOrders,
  updateSaleOrdersStatus,
  createInvoiceFromSaleOrder,
  type SaleOrderRecord,
  type SaleOrderStatus,
} from "~/features/sales/sale-orders";
import { getAuthUser } from "~/lib/get-auth-user";
import type { Route } from "./+types/SaleOrdersPage";
import { DpContent, DpContentHeader, DpContentHeaderAction, DpContentSet } from "~/components/ui";
import { DpInput } from "~/components/ui";
import { DpTable, type DpTableRef } from "~/components/ui";
import DpTColumn from "~/components/DpTable/DpTColumn";
import { DpConfirmDialog } from "~/components/ui";
import { SALE_ORDER_STATUS, statusToSelectOptions, statusDefaultKey } from "~/constants/status-options";
import { moduleTableDef } from "~/data/system-modules";
import SaleOrderDialog from "./SaleOrderDialog";
import GenerateInvoiceDialog from "./GenerateInvoiceDialog";

const TABLE_DEF = moduleTableDef("sale-order", { status: SALE_ORDER_STATUS });
const SALE_ORDER_STATUS_OPTIONS = statusToSelectOptions(SALE_ORDER_STATUS);

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Órdenes de Venta" },
    { name: "description", content: "Gestión de órdenes de venta" },
  ];
}

export async function clientLoader() {
  await getAuthUser();
  const { items } = await getSaleOrders();
  return { items };
}

export default function SaleOrdersPage({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const tableRef = useRef<DpTableRef<SaleOrderRecord>>(null);

  const isLoading = navigation.state !== "idle" || revalidator.state === "loading";
  const isAdd = !!useMatch("/sales/sale-orders/add");
  const editMatch = useMatch("/sales/sale-orders/edit/:id");
  const editId = editMatch?.params.id ? decodeURIComponent(editMatch.params.id) : null;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterValue, setFilterValue] = useState("");
  const [selectedCount, setSelectedCount] = useState(0);
  const [selectedRows, setSelectedRows] = useState<SaleOrderRecord[]>([]);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(null);
  const [statusChangeOpen, setStatusChangeOpen] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<SaleOrderStatus>("draft");
  const [bulkTargetCount, setBulkTargetCount] = useState(0);
  const [bulkOrderIds, setBulkOrderIds] = useState<string[]>([]);
  const [statusChangeSaving, setStatusChangeSaving] = useState(false);
  const [invoiceDialogVisible, setInvoiceDialogVisible] = useState(false);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const [invoicingOrderIds, setInvoicingOrderIds] = useState<string[]>([]);

  const dialogVisible = isAdd || !!editId;

  const allSelectedConfirmed = useMemo(
    () => selectedRows.length > 0 && selectedRows.every((r) => r.status === "confirmed"),
    [selectedRows]
  );

  const handleFilter = (value: string) => {
    setFilterValue(value);
    tableRef.current?.filter(value);
  };

  const openAdd = () => navigate("/sales/sale-orders/add");
  const openEdit = (row: SaleOrderRecord) => {
    if (row.status !== "draft") {
      setError("Solo se pueden editar órdenes en estado Borrador.");
      return;
    }
    navigate(`/sales/sale-orders/edit/${encodeURIComponent(row.id)}`);
  };

  const openDeleteConfirm = () => {
    const selected = tableRef.current?.getSelectedRows() ?? [];
    if (!selected.length) return;
    const nonDraft = selected.filter((s) => s.status !== "draft");
    if (nonDraft.length > 0) {
      setError("Solo se pueden eliminar órdenes en estado Borrador.");
      return;
    }
    setPendingDeleteIds(selected.map((r) => r.id));
  };

  const handleConfirmDelete = async () => {
    const ids = pendingDeleteIds;
    if (!ids?.length) return;
    setSaving(true);
    setError(null);
    try {
      if (ids.length === 1) {
        await deleteSaleOrder(ids[0]);
      } else {
        await deleteSaleOrders(ids);
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

  const openBulkStatusChange = () => {
    const selected = tableRef.current?.getSelectedRows() ?? [];
    if (!selected.length) return;
    setBulkStatus(selected[0]!.status);
    setBulkTargetCount(selected.length);
    setBulkOrderIds(selected.map((r) => r.id));
    setStatusChangeOpen(true);
  };

  const closeBulkStatusChange = () => {
    if (!statusChangeSaving) setStatusChangeOpen(false);
  };

  const handleBulkStatusConfirm = async () => {
    if (!bulkOrderIds.length) return;
    setStatusChangeSaving(true);
    setError(null);
    try {
      await updateSaleOrdersStatus(bulkOrderIds, bulkStatus);
      tableRef.current?.clearSelectedRows();
      setSelectedCount(0);
      setBulkOrderIds([]);
      setStatusChangeOpen(false);
      revalidator.revalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar el estado.");
    } finally {
      setStatusChangeSaving(false);
    }
  };

  const openInvoiceDialog = () => {
    const selected = tableRef.current?.getSelectedRows() ?? [];
    if (!selected.length) return;
    setInvoicingOrderIds(selected.map((r) => r.id));
    setInvoiceDialogVisible(true);
  };

  const handleInvoiceConfirmed = async (data: {
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
      let lastId: string | undefined;
      for (const id of invoicingOrderIds) {
        const invoiceId = await createInvoiceFromSaleOrder(id, data);
        lastId = invoiceId;
      }
      setInvoiceDialogVisible(false);
      tableRef.current?.clearSelectedRows();
      setSelectedCount(0);
      setInvoicingOrderIds([]);
      revalidator.revalidate();
      if (lastId) {
        navigate(`/billing/invoices/edit/${encodeURIComponent(lastId)}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al generar comprobantes.");
    } finally {
      setGeneratingInvoice(false);
    }
  };

  const handleSuccess = () => {
    navigate("/sales/sale-orders");
    revalidator.revalidate();
  };

  const handleHide = () => navigate("/sales/sale-orders");

  return (
    <>
      <DpContent
        title="ÓRDENES DE VENTA"
        breadcrumbItems={["VENTAS", "ÓRDENES DE VENTA"]}
        onCreate={openAdd}
      >
        <DpContentHeader
          filterValue={filterValue}
          onFilter={handleFilter}
          onLoad={() => revalidator.revalidate()}
          showCreateButton={false}
          onDelete={openDeleteConfirm}
          deleteDisabled={selectedCount === 0 || saving}
          loading={isLoading || saving || generatingInvoice}
          filterPlaceholder="Filtrar por código, cliente..."
        >
          <DpContentHeaderAction>
            <Button
              type="button"
              size="small"
              icon="pi pi-flag"
              label="Cambiar estado"
              onClick={openBulkStatusChange}
              disabled={selectedCount === 0 || saving || statusChangeSaving}
              aria-label="Cambiar estado de las órdenes seleccionadas"
            />
          </DpContentHeaderAction>
          <DpContentHeaderAction>
            <Button
              type="button"
              size="small"
              icon="pi pi-file"
              label="Generar Comprobante"
              onClick={openInvoiceDialog}
              disabled={!allSelectedConfirmed || generatingInvoice}
              loading={generatingInvoice}
              aria-label="Generar comprobantes para las órdenes seleccionadas"
            />
          </DpContentHeaderAction>
        </DpContentHeader>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
            {error}
          </div>
        )}

        <DpTable<SaleOrderRecord>
          ref={tableRef}
          data={loaderData.items}
          loading={isLoading || saving}
          tableDef={TABLE_DEF}
          onEdit={openEdit}
          onDetail={(row) =>
            navigate(`/sales/sale-orders/${encodeURIComponent(row.id)}/items`)
          }
          onSelectionChange={(rows) => {
            setSelectedCount(rows.length);
            setSelectedRows(rows);
          }}
          showFilterInHeader={false}
          emptyMessage="No hay órdenes de venta registradas."
          emptyFilterMessage="No se encontraron órdenes de venta."
        >
          <DpTColumn<SaleOrderRecord> name="saleOrderItems">
            {(row) => (
              <button
                type="button"
                onClick={() =>
                  navigate(`/sales/sale-orders/${encodeURIComponent(row.id)}/items`)
                }
                className="p-button p-button-text p-button-rounded p-button-icon-only"
                aria-label="Ítems de la orden"
                title="Ítems"
              >
                <i className="pi pi-list" />
              </button>
            )}
          </DpTColumn>
        </DpTable>
      </DpContent>

      {dialogVisible && (
        <SaleOrderDialog
          visible={dialogVisible}
          orderId={editId}
          onSuccess={handleSuccess}
          onHide={handleHide}
        />
      )}

      <DpConfirmDialog
        visible={pendingDeleteIds !== null}
        onHide={closeDeleteConfirm}
        title="Eliminar órdenes de venta"
        message={
          pendingDeleteIds?.length
            ? `¿Eliminar ${pendingDeleteIds.length} orden(es) de venta? Esta acción no se puede deshacer.`
            : ""
        }
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={handleConfirmDelete}
        severity="danger"
        loading={saving}
      />

      <DpContentSet
        title="Cambiar estado de órdenes de venta"
        variant="dialog"
        visible={statusChangeOpen}
        onHide={closeBulkStatusChange}
        onCancel={closeBulkStatusChange}
        onSave={handleBulkStatusConfirm}
        saving={statusChangeSaving}
        saveLabel="Aplicar"
      >
        <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
          Se actualizará el estado de <strong>{bulkTargetCount}</strong> orden(es) seleccionada(s).
        </p>
        <DpInput
          type="select"
          label="Nuevo estado"
          value={bulkStatus}
          onChange={(v) => setBulkStatus(String(v) as SaleOrderStatus)}
          options={SALE_ORDER_STATUS_OPTIONS}
        />
      </DpContentSet>

      {invoiceDialogVisible && (
        <GenerateInvoiceDialog
          visible={invoiceDialogVisible}
          orderCurrency="PEN"
          onConfirm={handleInvoiceConfirmed}
          onHide={() => setInvoiceDialogVisible(false)}
          saving={generatingInvoice}
        />
      )}

      <Outlet />
    </>
  );
}
