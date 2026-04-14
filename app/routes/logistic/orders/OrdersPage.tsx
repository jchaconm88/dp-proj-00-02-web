import { useRef, useState } from "react";
import { useNavigate, useNavigation, useRevalidator, useMatch } from "react-router";
import {
  getOrders,
  deleteOrder,
  deleteOrders,
  type OrderRecord,
} from "~/features/logistic/orders";
import type { Route } from "./+types/OrdersPage";
import { DpContent, DpContentHeader } from "~/components/DpContent";
import { DpTable, type DpTableRef } from "~/components/DpTable";
import { DpConfirmDialog } from "~/components/DpConfirmDialog";
import { ORDER_STATUS } from "~/constants/status-options";
import { moduleTableDef } from "~/data/system-modules";
import OrderDialog from "./OrderDialog";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Pedidos" },
    { name: "description", content: "Gestión de pedidos logísticos" },
  ];
}

type OrderRow = OrderRecord & { locationStr?: string; windowStr?: string };

const TABLE_DEF = moduleTableDef("order", { status: ORDER_STATUS });

export async function clientLoader() {
  const { items } = await getOrders();
  return {
    items: items.map((o) => ({
      ...o,
      locationStr: `${o.location.latitude}, ${o.location.longitude}`,
      windowStr: `${o.deliveryWindowStart} - ${o.deliveryWindowEnd}`,
    })),
  };
}

export default function OrdersPage({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const tableRef = useRef<DpTableRef<OrderRow>>(null);

  const isLoading = navigation.state !== "idle" || revalidator.state === "loading";
  const isAdd = !!useMatch("/logistic/orders/add");
  const editMatch = useMatch("/logistic/orders/edit/:id");
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

  const openAdd = () => navigate("/logistic/orders/add");
  const openEdit = (row: OrderRow) =>
    navigate(`/logistic/orders/edit/${encodeURIComponent(row.id)}`);

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
        await deleteOrder(ids[0]);
      } else {
        await deleteOrders(ids);
      }
      tableRef.current?.clearSelectedRows();
      setPendingDeleteIds(null);
      revalidator.revalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar");
    } finally {
      setSaving(false);
    }
  };

  const closeDeleteConfirm = () => {
    if (!saving) setPendingDeleteIds(null);
  };

  const handleSuccess = () => {
    navigate("/logistic/orders");
    revalidator.revalidate();
  };

  const handleHide = () => navigate("/logistic/orders");

  return (
    <DpContent
      title="PEDIDOS"
      breadcrumbItems={["LOGÍSTICA", "PEDIDOS"]}
      onCreate={openAdd}
    >
      <DpContentHeader
        onLoad={() => revalidator.revalidate()}
        showCreateButton={false}
        onDelete={openDeleteConfirm}
        deleteDisabled={selectedCount === 0 || saving}
        filterValue={filterValue}
        onFilter={handleFilter}
        filterPlaceholder="Filtrar por cliente, dirección..."
      />
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}
      <DpTable<OrderRow>
        ref={tableRef}
        data={loaderData.items}
        loading={isLoading || saving}
        tableDef={TABLE_DEF}
        onSelectionChange={(rows) => setSelectedCount(rows.length)}
        onEdit={openEdit}
        showFilterInHeader={false}
        emptyMessage="No hay pedidos."
        emptyFilterMessage="No se encontraron pedidos."
      />

      {dialogVisible && (
        <OrderDialog
          visible={dialogVisible}
          orderId={editId}
          onSuccess={handleSuccess}
          onHide={handleHide}
        />
      )}

      <DpConfirmDialog
        visible={pendingDeleteIds !== null}
        onHide={closeDeleteConfirm}
        title="Eliminar pedidos"
        message={
          pendingDeleteIds?.length
            ? `¿Eliminar ${pendingDeleteIds.length} pedido(s)? Esta acción no se puede deshacer.`
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
