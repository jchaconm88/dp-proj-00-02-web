import { useRef, useState } from "react";
import { useNavigate, useNavigation, useRevalidator, useMatch } from "react-router";
import { DpContentInfo, DpTable, DpConfirmDialog, DpContentHeader, DpContentHeaderAction, type DpTableRef } from "~/components/ui";
import { moduleTableDef } from "~/data/system-modules";
import { getAuthUser } from "~/lib/get-auth-user";
import { getOrderById, getOrderCosts, deleteOrderCost, type ProductionCostRecord } from "~/features/production";
import OrderCostDialog from "./OrderCostDialog";
import type { Route } from "./+types/OrderCostsPage";

const COST_TYPE_OPTIONS = {
  direct_labor: { label: "Mano de obra directa", severity: "info" as const },
  indirect: { label: "Costo indirecto", severity: "warning" as const },
};

const TABLE_DEF = moduleTableDef("production-cost", { type: COST_TYPE_OPTIONS });

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  await getAuthUser();
  const orderId = params.id ?? "";
  const [order, { items }] = await Promise.all([
    getOrderById(orderId),
    getOrderCosts(orderId),
  ]);
  if (!order) throw new Error("Orden no encontrada");
  return { order, orderId, items };
}

export default function OrderCostsPage({ loaderData }: Route.ComponentProps) {
  const { order, items, orderId } = loaderData;
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const navigation = useNavigation();
  const tableRef = useRef<DpTableRef<ProductionCostRecord>>(null);
  const isLoading = navigation.state !== "idle" || revalidator.state === "loading";

  const isAdd = !!useMatch("/production/orders/:id/costs/add");
  const editMatch = useMatch("/production/orders/:id/costs/edit/:costId");
  const editCostId = editMatch?.params.costId ?? null;
  const dialogVisible = isAdd || !!editCostId;

  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const selectionRef = useRef<ProductionCostRecord[]>([]);

  const handleSuccess = () => { navigate(`/production/orders/${encodeURIComponent(orderId)}/costs`); revalidator.revalidate(); };
  const handleHide = () => navigate(`/production/orders/${encodeURIComponent(orderId)}/costs`);

  const handleAdd = () => navigate(`/production/orders/${encodeURIComponent(orderId)}/costs/add`);
  const handleEdit = (row: ProductionCostRecord) => navigate(`/production/orders/${encodeURIComponent(orderId)}/costs/edit/${encodeURIComponent(row.id)}`);

  const openDeleteConfirm = () => {
    const rows = tableRef.current?.getSelectedRows() ?? [];
    setPendingDeleteIds(rows.map((r: ProductionCostRecord) => r.id));
  };

  const closeDeleteConfirm = () => {
    setPendingDeleteIds([]);
  };

  const handleConfirmDelete = async () => {
    setDeleteSaving(true);
    try {
      for (const id of pendingDeleteIds) {
        await deleteOrderCost(orderId, id);
      }
      setPendingDeleteIds([]);
      revalidator.revalidate();
    } catch {
      // error handled by button
    } finally {
      setDeleteSaving(false);
    }
  };

  return (
    <DpContentInfo
      title={`Costos: ${order.code}`}
      breadcrumbItems={["PRODUCCIÓN", "ÓRDENES", "COSTOS"]}
      backLabel="Volver a órdenes"
      onBack={() => navigate("/production/orders")}
    >
      <DpContentHeader
        onCreate={handleAdd}
        onLoad={() => revalidator.revalidate()}
        loading={isLoading}
        onDelete={openDeleteConfirm}
      />

      <DpTable<ProductionCostRecord>
        ref={tableRef}
        data={items}
        loading={isLoading}
        tableDef={TABLE_DEF}
        onEdit={handleEdit}
        onSelectionChange={(rows) => { selectionRef.current = rows; }}
      />

      <DpConfirmDialog
        visible={pendingDeleteIds.length > 0}
        onHide={closeDeleteConfirm}
        title="Confirmar eliminación"
        message={`¿Eliminar ${pendingDeleteIds.length} costo(s)? Esta acción no se puede deshacer.`}
        severity="danger"
        loading={deleteSaving}
        onConfirm={handleConfirmDelete}
      />

      {dialogVisible && (
        <OrderCostDialog
          visible={dialogVisible}
          orderId={orderId}
          costId={editCostId}
          onSuccess={handleSuccess}
          onHide={handleHide}
        />
      )}
    </DpContentInfo>
  );
}
