import { useRef, useState } from "react";
import { useNavigate, useNavigation, useRevalidator, useMatch, Outlet } from "react-router";
import { Button } from "primereact/button";
import {
  getPurchaseOrders,
  deletePurchaseOrder,
  deletePurchaseOrders,
  updatePurchaseOrdersStatus,
  type PurchaseOrderRecord,
  type PurchaseOrderStatus,
} from "~/features/purchasing/purchase-orders";
import { getAuthUser } from "~/lib/get-auth-user";
import type { Route } from "./+types/PurchaseOrdersPage";
import { DpContent, DpContentHeader, DpContentHeaderAction, DpContentSet } from "~/components/ui";
import { DpInput } from "~/components/ui";
import { DpTable, type DpTableRef } from "~/components/ui";
import DpTColumn from "~/components/DpTable/DpTColumn";
import { DpConfirmDialog } from "~/components/ui";
import { PURCHASE_ORDER_STATUS, statusToSelectOptions } from "~/constants/status-options";
import { moduleTableDef } from "~/data/system-modules";
import PurchaseOrderDialog from "./PurchaseOrderDialog";

const TABLE_DEF = moduleTableDef("purchase-order", { status: PURCHASE_ORDER_STATUS });
const PURCHASE_ORDER_STATUS_OPTIONS = statusToSelectOptions(PURCHASE_ORDER_STATUS);

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Órdenes de Compra" },
    { name: "description", content: "Gestión de órdenes de compra" },
  ];
}

export async function clientLoader() {
  await getAuthUser();
  const { items } = await getPurchaseOrders();
  return { items };
}

export default function PurchaseOrdersPage({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const tableRef = useRef<DpTableRef<PurchaseOrderRecord>>(null);

  const isLoading = navigation.state !== "idle" || revalidator.state === "loading";
  const isAdd = !!useMatch("/purchasing/purchase-orders/add");
  const editMatch = useMatch("/purchasing/purchase-orders/edit/:id");
  const editId = editMatch?.params.id ? decodeURIComponent(editMatch.params.id) : null;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterValue, setFilterValue] = useState("");
  const [selectedCount, setSelectedCount] = useState(0);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(null);
  const [statusChangeOpen, setStatusChangeOpen] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<PurchaseOrderStatus>("draft");
  const [bulkTargetCount, setBulkTargetCount] = useState(0);
  const [bulkOrderIds, setBulkOrderIds] = useState<string[]>([]);
  const [statusChangeSaving, setStatusChangeSaving] = useState(false);

  const dialogVisible = isAdd || !!editId;

  const handleFilter = (value: string) => {
    setFilterValue(value);
    tableRef.current?.filter(value);
  };

  const openAdd = () => navigate("/purchasing/purchase-orders/add");
  const openEdit = (row: PurchaseOrderRecord) => {
    if (row.status !== "draft") {
      setError("Solo se pueden editar órdenes en estado Borrador.");
      return;
    }
    navigate(`/purchasing/purchase-orders/edit/${encodeURIComponent(row.id)}`);
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
        await deletePurchaseOrder(ids[0]);
      } else {
        await deletePurchaseOrders(ids);
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
      await updatePurchaseOrdersStatus(bulkOrderIds, bulkStatus);
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

  const handleSuccess = () => {
    navigate("/purchasing/purchase-orders");
    revalidator.revalidate();
  };

  const handleHide = () => navigate("/purchasing/purchase-orders");

  return (
    <>
      <DpContent
        title="ÓRDENES DE COMPRA"
        breadcrumbItems={["COMPRAS", "ÓRDENES DE COMPRA"]}
        onCreate={openAdd}
      >
        <DpContentHeader
          filterValue={filterValue}
          onFilter={handleFilter}
          onLoad={() => revalidator.revalidate()}
          showCreateButton={false}
          onDelete={openDeleteConfirm}
          deleteDisabled={selectedCount === 0 || saving}
          loading={isLoading || saving}
          filterPlaceholder="Filtrar por código, proveedor..."
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
        </DpContentHeader>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
            {error}
          </div>
        )}

        <DpTable<PurchaseOrderRecord>
          ref={tableRef}
          data={loaderData.items}
          loading={isLoading || saving}
          tableDef={TABLE_DEF}
          onEdit={openEdit}
          onDetail={(row) =>
            navigate(`/purchasing/purchase-orders/${encodeURIComponent(row.id)}/items`)
          }
          onSelectionChange={(rows) => setSelectedCount(rows.length)}
          showFilterInHeader={false}
          emptyMessage="No hay órdenes de compra registradas."
          emptyFilterMessage="No se encontraron órdenes de compra."
        >
          <DpTColumn<PurchaseOrderRecord> name="purchaseOrderItems">
            {(row) => (
              <button
                type="button"
                onClick={() =>
                  navigate(`/purchasing/purchase-orders/${encodeURIComponent(row.id)}/items`)
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
        <PurchaseOrderDialog
          visible={dialogVisible}
          orderId={editId}
          onSuccess={handleSuccess}
          onHide={handleHide}
        />
      )}

      <DpConfirmDialog
        visible={pendingDeleteIds !== null}
        onHide={closeDeleteConfirm}
        title="Eliminar órdenes de compra"
        message={
          pendingDeleteIds?.length
            ? `¿Eliminar ${pendingDeleteIds.length} orden(es) de compra? Esta acción no se puede deshacer.`
            : ""
        }
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={handleConfirmDelete}
        severity="danger"
        loading={saving}
      />

      <DpContentSet
        title="Cambiar estado de órdenes de compra"
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
          onChange={(v) => setBulkStatus(String(v) as PurchaseOrderStatus)}
          options={PURCHASE_ORDER_STATUS_OPTIONS}
        />
      </DpContentSet>

      <Outlet />
    </>
  );
}
