import { useMemo, useRef, useState } from "react";
import { useNavigate, useNavigation, useRevalidator, useMatch } from "react-router";
import {
  getPurchaseOrderById,
  getPurchaseOrderItems,
  deletePurchaseOrderItem,
  type PurchaseOrderItemRecord,
} from "~/features/purchasing/purchase-orders";
import { getUnitsOfMeasureCatalog } from "~/features/system/units-of-measure";
import { getAuthUser } from "~/lib/get-auth-user";
import type { Route } from "./+types/PurchaseOrderItemsPage";
import { DpContentInfo, DpContentHeader } from "~/components/DpContent";
import { DpTable, type DpTableRef, type DpTableFooterTotals } from "~/components/DpTable";
import { DpConfirmDialog } from "~/components/DpConfirmDialog";
import { moduleTableDef } from "~/data/system-modules";
import PurchaseOrderItemDialog from "./PurchaseOrderItemDialog";
import PurchaseOrderReceptionDialog from "./PurchaseOrderReceptionDialog";

const TABLE_DEF = moduleTableDef("purchase-order-item");

export function meta({ data }: Route.MetaArgs) {
  return [
    { title: `Ítems: ${data?.order?.code || "Orden de Compra"}` },
  ];
}

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  await getAuthUser();
  const orderId = params.id ?? "";
  if (!orderId) throw new Error("ID de orden no encontrado");
  const [order, { items }, unitsCatalog] = await Promise.all([
    getPurchaseOrderById(orderId),
    getPurchaseOrderItems(orderId),
    getUnitsOfMeasureCatalog(),
  ]);
  if (!order) throw new Error("Orden de compra no encontrada");
  return { order, items, orderId, unitsCatalog };
}

export default function PurchaseOrderItemsPage({ loaderData }: Route.ComponentProps) {
  const { order, items, orderId, unitsCatalog } = loaderData;
  const navigate = useNavigate();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const tableRef = useRef<DpTableRef<PurchaseOrderItemRecord>>(null);

  const basePath = `/purchasing/purchase-orders/${encodeURIComponent(orderId)}/items`;
  const lockedByStatus = order.status !== "draft";
  const canReceive = order.status === "confirmed" || order.status === "partial_received";

  const isLoading = navigation.state !== "idle" || revalidator.state === "loading";
  const isAdd = !!useMatch("/purchasing/purchase-orders/:id/items/add");
  const editMatch = useMatch("/purchasing/purchase-orders/:id/items/edit/:itemId");
  const editItemId = editMatch?.params.itemId ?? null;
  const dialogVisible = isAdd || !!editItemId;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterValue, setFilterValue] = useState("");
  const [selectedCount, setSelectedCount] = useState(0);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(null);
  const [receptionVisible, setReceptionVisible] = useState(false);

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

  const openEdit = (row: PurchaseOrderItemRecord) => {
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
        await deletePurchaseOrderItem(orderId, itemId);
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

  const handleReceptionSuccess = () => {
    setReceptionVisible(false);
    revalidator.revalidate();
  };

  const onBack = () => navigate("/purchasing/purchase-orders");

  return (
    <DpContentInfo
      title={`Ítems: ${order.code}`}
      breadcrumbItems={["COMPRAS", "ÓRDENES DE COMPRA", "ÍTEMS"]}
      backLabel="Volver a órdenes de compra"
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

      {canReceive && (
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setReceptionVisible(true)}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            <i className="pi pi-download" />
            Recibir mercadería
          </button>
        </div>
      )}

      <DpTable<PurchaseOrderItemRecord>
        ref={tableRef}
        data={items}
        loading={isLoading || saving}
        tableDef={TABLE_DEF}
        paginator={false}
        footerTotals={footerTotals}
        onEdit={lockedByStatus ? undefined : openEdit}
        onSelectionChange={(rows) => setSelectedCount(rows.length)}
        showFilterInHeader={false}
        emptyMessage="No hay ítems en esta orden de compra."
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
        <PurchaseOrderItemDialog
          visible={dialogVisible}
          orderId={orderId}
          itemId={editItemId}
          unitsCatalog={unitsCatalog}
          locked={lockedByStatus}
          onSuccess={handleSuccess}
          onHide={() => navigate(basePath)}
        />
      )}

      <PurchaseOrderReceptionDialog
        visible={receptionVisible}
        orderId={orderId}
        items={items}
        onSuccess={handleReceptionSuccess}
        onHide={() => setReceptionVisible(false)}
      />
    </DpContentInfo>
  );
}
