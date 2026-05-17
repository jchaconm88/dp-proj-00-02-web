import { useState, useRef, useCallback } from "react";
import { useNavigate, useNavigation, useRevalidator, useMatch } from "react-router";
import { Button } from "primereact/button";
import {
  DpContent,
  DpContentHeader,
  DpContentHeaderAction,
  DpTable,
  DpTColumn,
  DpConfirmDialog,
  DpContentSet,
  DpInput,
  type DpTableRef,
} from "~/components/ui";
import { moduleTableDef } from "~/data/system-modules";
import { getAuthUser } from "~/lib/get-auth-user";
import {
  getOrders,
  deleteOrders,
  transitionOrder,
  type ProductionOrderRecord,
} from "~/features/production";
import { statusToSelectOptions } from "~/constants/status-options";
import OrderDialog from "./OrderDialog";
import {
  ORDER_STATUS_OPTIONS,
  getAvailableTransitions,
  canEditOrder,
  canDeleteOrder,
} from "./production-order-workflow";
import type { Route } from "./+types/OrdersPage";

const PRIORITY_OPTIONS = {
  alta: { label: "Alta", severity: "danger" as const },
  media: { label: "Media", severity: "warning" as const },
  baja: { label: "Baja", severity: "info" as const },
};

const TABLE_DEF = moduleTableDef("production-order", { status: ORDER_STATUS_OPTIONS, priority: PRIORITY_OPTIONS });
const STATUS_SELECT_OPTIONS = statusToSelectOptions(ORDER_STATUS_OPTIONS);

export async function clientLoader() {
  await getAuthUser();
  const { items: orders } = await getOrders();
  return { orders };
}

export default function OrdersPage({ loaderData }: Route.ComponentProps) {
  const { orders } = loaderData;
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const navigation = useNavigation();
  const tableRef = useRef<DpTableRef<ProductionOrderRecord>>(null);
  const isLoading = navigation.state !== "idle" || revalidator.state === "loading";

  const [filterValue, setFilterValue] = useState("");
  const handleFilter = (value: string) => {
    setFilterValue(value);
    tableRef.current?.filter(value);
  };
  const [selectedRows, setSelectedRows] = useState<ProductionOrderRecord[]>([]);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const [statusChangeOpen, setStatusChangeOpen] = useState(false);
  const [transitionTarget, setTransitionTarget] = useState("");
  const [transitionOrderRow, setTransitionOrderRow] = useState<ProductionOrderRecord | null>(null);
  const [realQty, setRealQty] = useState("");
  const [transitionSaving, setTransitionSaving] = useState(false);
  const [transitionError, setTransitionError] = useState<string | null>(null);

  const isAdd = !!useMatch("/production/orders/add");
  const editMatch = useMatch("/production/orders/edit/:id");
  const editId = editMatch?.params.id ?? null;
  const dialogVisible = isAdd || !!editId;

  const openAdd = () => navigate("/production/orders/add");
  const handleSuccess = () => {
    navigate("/production/orders");
    revalidator.revalidate();
  };
  const handleHide = () => navigate("/production/orders");

  const handleSelectionChange = useCallback((rows: ProductionOrderRecord[]) => {
    setSelectedRows(rows);
  }, []);

  const openDeleteConfirm = useCallback(() => {
    const rows = tableRef.current?.getSelectedRows() ?? [];
    setPendingDeleteIds(rows.filter(canDeleteOrder).map((r) => r.id));
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (pendingDeleteIds.length === 0) return;
    setSaving(true);
    try {
      await deleteOrders(pendingDeleteIds);
      setPendingDeleteIds([]);
      tableRef.current?.clearSelectedRows();
      setSelectedRows([]);
      revalidator.revalidate();
    } finally {
      setSaving(false);
    }
  }, [pendingDeleteIds, revalidator]);

  const closeDeleteConfirm = useCallback(() => setPendingDeleteIds([]), []);

  const handleEdit = (row: ProductionOrderRecord) => {
    if (canEditOrder(row)) {
      navigate(`/production/orders/edit/${encodeURIComponent(row.id)}`);
    }
  };

  const openStatusChange = () => {
    const selected = tableRef.current?.getSelectedRows() ?? selectedRows;
    if (selected.length !== 1) return;
    const order = selected[0]!;
    const transitions = getAvailableTransitions(order.status);
    if (transitions.length === 0) return;
    setTransitionOrderRow(order);
    setTransitionTarget(transitions.length === 1 ? transitions[0]!.target : "");
    setRealQty("");
    setTransitionError(null);
    setStatusChangeOpen(true);
  };

  const closeStatusChange = () => {
    if (!transitionSaving) setStatusChangeOpen(false);
  };

  const handleTransition = async () => {
    if (!transitionOrderRow) return;
    setTransitionSaving(true);
    setTransitionError(null);
    try {
      await transitionOrder(transitionOrderRow.id, {
        targetStatus: transitionTarget,
        ...(transitionTarget === "completada" ? { realQuantityProduced: Number(realQty) } : {}),
      });
      setStatusChangeOpen(false);
      tableRef.current?.clearSelectedRows();
      setSelectedRows([]);
      revalidator.revalidate();
    } catch (err) {
      setTransitionError(err instanceof Error ? err.message : "Error al cambiar estado");
    } finally {
      setTransitionSaving(false);
    }
  };

  const selectedCount = selectedRows.length;
  const statusChangeTransitions = transitionOrderRow
    ? getAvailableTransitions(transitionOrderRow.status)
    : [];
  const transitionSelectOptions = statusChangeTransitions.map((t) => ({
    label: t.label,
    value: t.target,
  }));
  const needsRealQty = transitionTarget === "completada";
  const canChangeStatus =
    selectedCount === 1 && selectedRows[0] != null && getAvailableTransitions(selectedRows[0].status).length > 0;
  const transitionStatusLabel =
    STATUS_SELECT_OPTIONS.find((o) => o.value === transitionTarget)?.label ?? transitionTarget;

  return (
    <DpContent
      title="Órdenes de Producción"
      breadcrumbItems={["PRODUCCIÓN", "ÓRDENES"]}
      onCreate={openAdd}
    >
      <DpContentHeader
        filterValue={filterValue}
        onFilter={handleFilter}
        onLoad={() => revalidator.revalidate()}
        onDelete={openDeleteConfirm}
        deleteDisabled={selectedRows.length === 0 || !selectedRows.every(canDeleteOrder)}
        filterPlaceholder="Filtrar..."
        loading={isLoading || saving || transitionSaving}
      >
        <DpContentHeaderAction>
          <Button
            type="button"
            size="small"
            icon="pi pi-flag"
            label="Cambiar estado"
            onClick={openStatusChange}
            disabled={!canChangeStatus || saving || transitionSaving}
            aria-label="Cambiar estado de la orden seleccionada"
          />
        </DpContentHeaderAction>
      </DpContentHeader>

      <DpTable<ProductionOrderRecord>
        ref={tableRef}
        data={orders}
        loading={isLoading}
        tableDef={TABLE_DEF}
        onSelectionChange={handleSelectionChange}
        onEdit={handleEdit}
        showFilterInHeader={false}
      >
        <DpTColumn<ProductionOrderRecord> name="orderMaterials">
          {(row) => (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/production/orders/${encodeURIComponent(row.id)}/materials`);
              }}
              className="p-button p-button-text p-button-rounded p-button-icon-only"
              aria-label="Materiales"
              title="Materiales"
            >
              <i className="pi pi-box" />
            </button>
          )}
        </DpTColumn>
        <DpTColumn<ProductionOrderRecord> name="orderResults">
          {(row) => (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/production/orders/${encodeURIComponent(row.id)}/results`);
              }}
              className="p-button p-button-text p-button-rounded p-button-icon-only"
              aria-label="Resultados"
              title="Resultados"
            >
              <i className="pi pi-cog" />
            </button>
          )}
        </DpTColumn>
        <DpTColumn<ProductionOrderRecord> name="orderCosts">
          {(row) => (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/production/orders/${encodeURIComponent(row.id)}/costs`);
              }}
              className="p-button p-button-text p-button-rounded p-button-icon-only"
              aria-label="Costos"
              title="Costos"
            >
              <i className="pi pi-dollar" />
            </button>
          )}
        </DpTColumn>
      </DpTable>

      <DpConfirmDialog
        visible={pendingDeleteIds.length > 0}
        onHide={closeDeleteConfirm}
        message="¿Está seguro de eliminar las órdenes seleccionadas? Esta acción no se puede deshacer."
        title="Confirmar eliminación"
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={handleConfirmDelete}
        loading={saving}
        severity="danger"
      />

      {dialogVisible && (
        <OrderDialog visible={dialogVisible} orderId={editId} onSuccess={handleSuccess} onHide={handleHide} />
      )}

      <DpContentSet
        title="Cambiar estado de orden"
        visible={statusChangeOpen}
        onHide={closeStatusChange}
        onCancel={closeStatusChange}
        onSave={handleTransition}
        saving={transitionSaving || isLoading}
        saveDisabled={
          !transitionTarget ||
          (needsRealQty && (!realQty || Number(realQty) <= 0))
        }
        saveLabel="Aplicar"
        showError={!!transitionError}
        errorMessage={transitionError ?? ""}
      >
        {transitionOrderRow && (
          <p className="mb-3 text-sm text-[var(--dp-on-surface-soft)]">
            Orden <strong>{transitionOrderRow.code}</strong> — estado actual:{" "}
            <strong>
              {STATUS_SELECT_OPTIONS.find((o) => o.value === transitionOrderRow.status)?.label ??
                transitionOrderRow.status}
            </strong>
          </p>
        )}
        {transitionSelectOptions.length > 1 && (
          <DpInput
            type="select"
            label="Acción *"
            name="transitionTarget"
            value={transitionTarget}
            onChange={(v) => setTransitionTarget(String(v))}
            options={transitionSelectOptions}
          />
        )}
        {transitionSelectOptions.length === 1 && transitionTarget && (
          <p className="mb-3 text-sm text-[var(--dp-on-surface-soft)]">
            Nueva acción: <strong>{transitionStatusLabel}</strong>
          </p>
        )}
        {needsRealQty && (
          <DpInput
            type="input"
            label="Cantidad real producida *"
            name="realQuantityProduced"
            value={realQty}
            onChange={(v) => setRealQty(String(v))}
          />
        )}
      </DpContentSet>
    </DpContent>
  );
}
