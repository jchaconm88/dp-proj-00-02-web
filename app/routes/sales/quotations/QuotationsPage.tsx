import { useRef, useState, useMemo } from "react";
import { useNavigate, useMatch, Outlet, useNavigation, useRevalidator } from "react-router";
import { Button } from "primereact/button";
import {
  getQuotations,
  deleteQuotation,
  deleteQuotations,
  convertQuotationToSaleOrder,
  updateQuotationsStatus,
  type QuotationRecord,
  type QuotationStatus,
} from "~/features/sales/quotations";
import type { Route } from "./+types/QuotationsPage";
import { DpContent, DpContentHeader, DpContentHeaderAction, DpContentSet } from "~/components/ui";
import { DpTable, type DpTableRef } from "~/components/ui";
import { DpConfirmDialog } from "~/components/ui";
import { DpInput } from "~/components/ui";
import DpTColumn from "~/components/DpTable/DpTColumn";
import { QUOTATION_STATUS, statusToSelectOptions } from "~/constants/status-options";
import { moduleTableDef } from "~/data/system-modules";
import { getAuthUser } from "~/lib/get-auth-user";
import { useLocationContext } from "~/lib/location-context";
import QuotationDialog from "./QuotationDialog";

const TABLE_DEF = moduleTableDef("quotation", { status: QUOTATION_STATUS });
const QUOTATION_STATUS_OPTIONS = statusToSelectOptions(QUOTATION_STATUS);

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Cotizaciones" },
    { name: "description", content: "Gestión de cotizaciones de venta" },
  ];
}

export async function clientLoader({}: Route.ClientLoaderArgs) {
  await getAuthUser();
  const { items } = await getQuotations();
  return { quotations: items };
}

/**
 * Determina si una cotización está expirada:
 * si validUntil < fecha actual y status es "draft" o "sent".
 */
function resolveDisplayStatus(q: QuotationRecord): string {
  if (
    (q.status === "draft" || q.status === "sent") &&
    q.validUntil &&
    q.validUntil < new Date().toISOString().slice(0, 10)
  ) {
    return "expired";
  }
  return q.status;
}

export default function QuotationsPage({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const tableRef = useRef<DpTableRef<QuotationRecord>>(null);
  const { activeLocationId, locations } = useLocationContext();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(false);
  const [selectedCount, setSelectedCount] = useState(0);
  const [selectedRows, setSelectedRows] = useState<QuotationRecord[]>([]);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(null);
  const [filterValue, setFilterValue] = useState("");
  const [statusChangeOpen, setStatusChangeOpen] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<QuotationStatus>("draft");
  const [bulkTargetCount, setBulkTargetCount] = useState(0);
  const [bulkQuotationIds, setBulkQuotationIds] = useState<string[]>([]);
  const [statusChangeSaving, setStatusChangeSaving] = useState(false);

  const allSelectedConfirmed = useMemo(
    () => selectedRows.length > 0 && selectedRows.every((r) => r.status === "confirmed"),
    [selectedRows]
  );

  const isLoading = navigation.state !== "idle" || revalidator.state === "loading";

  const addMatch = useMatch("/sales/quotations/add");
  const editMatch = useMatch("/sales/quotations/edit/:id");
  const isAdd = !!addMatch;
  const editId = editMatch?.params.id ? decodeURIComponent(editMatch.params.id) : null;
  const dialogVisible = isAdd || !!editId;

  // Apply expired status display logic
  const rows = useMemo(
    () =>
      loaderData.quotations.map((q) => ({
        ...q,
        status: resolveDisplayStatus(q) as QuotationRecord["status"],
      })),
    [loaderData.quotations]
  );

  const handleFilter = (value: string) => {
    setFilterValue(value);
    tableRef.current?.filter(value);
  };

  const openAdd = () => navigate("/sales/quotations/add");
  const openEdit = (row: QuotationRecord) => {
    // Block edit if status is not draft or sent
    const original = loaderData.quotations.find((q) => q.id === row.id);
    const realStatus = original?.status ?? row.status;
    if (realStatus !== "draft" && realStatus !== "sent") {
      setError("Solo se pueden editar cotizaciones en estado Borrador o Enviada.");
      return;
    }
    navigate("/sales/quotations/edit/" + encodeURIComponent(row.id));
  };
  const handleHide = () => navigate("/sales/quotations");
  const handleSuccess = (createdQuotationId?: string) => {
    revalidator.revalidate();
    if (createdQuotationId?.trim()) {
      navigate(`/sales/quotations/${encodeURIComponent(createdQuotationId.trim())}/items`);
      return;
    }
    navigate("/sales/quotations");
  };

  const openDeleteConfirm = () => {
    const selected = tableRef.current?.getSelectedRows() ?? [];
    if (selected.length === 0) return;
    // Block delete if any selected is not draft or sent
    const nonDeletable = selected.filter((s) => {
      const original = loaderData.quotations.find((q) => q.id === s.id);
      const realStatus = original?.status ?? s.status;
      return realStatus !== "draft" && realStatus !== "sent";
    });
    if (nonDeletable.length > 0) {
      setError("Solo se pueden eliminar cotizaciones en estado Borrador o Enviada.");
      return;
    }
    setPendingDeleteIds(selected.map((s) => s.id));
  };

  const handleConfirmDelete = async () => {
    const ids = pendingDeleteIds;
    if (!ids?.length) return;
    setSaving(true);
    setError(null);
    try {
      if (ids.length === 1) {
        await deleteQuotation(ids[0]);
      } else {
        await deleteQuotations(ids);
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

  const handleConvertToSaleOrders = async () => {
    const selected = tableRef.current?.getSelectedRows() ?? [];
    if (!selected.length) return;

    const confirmables = selected.filter((s) => {
      const original = loaderData.quotations.find((q) => q.id === s.id);
      return (original?.status ?? s.status) === "confirmed";
    });

    if (!confirmables.length) {
      setError("Ninguna cotización seleccionada está en estado Confirmada.");
      return;
    }

    const locationName =
      locations.find((l) => l.id === activeLocationId)?.name ?? "";

    setConverting(true);
    setError(null);
    try {
      let lastId: string | undefined;
      for (const q of confirmables) {
        const saleOrderId = await convertQuotationToSaleOrder(
          q.id,
          activeLocationId ?? "",
          locationName
        );
        lastId = saleOrderId;
      }
      tableRef.current?.clearSelectedRows();
      revalidator.revalidate();
      if (lastId) {
        navigate(`/sales/sale-orders/${encodeURIComponent(lastId)}/items`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al generar órdenes de venta.");
    } finally {
      setConverting(false);
    }
  };

  const openBulkStatusChange = () => {
    const selected = tableRef.current?.getSelectedRows() ?? [];
    if (!selected.length) return;
    setBulkStatus(selected[0]!.status);
    setBulkTargetCount(selected.length);
    setBulkQuotationIds(selected.map((r) => r.id));
    setStatusChangeOpen(true);
  };

  const closeBulkStatusChange = () => {
    if (!statusChangeSaving) setStatusChangeOpen(false);
  };

  const handleBulkStatusConfirm = async () => {
    if (!bulkQuotationIds.length) return;
    setStatusChangeSaving(true);
    setError(null);
    try {
      await updateQuotationsStatus(bulkQuotationIds, bulkStatus);
      tableRef.current?.clearSelectedRows();
      setSelectedCount(0);
      setBulkQuotationIds([]);
      setStatusChangeOpen(false);
      revalidator.revalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar el estado.");
    } finally {
      setStatusChangeSaving(false);
    }
  };

  return (
    <>
      <DpContent
        title="COTIZACIONES"
        breadcrumbItems={["VENTAS", "COTIZACIONES"]}
        onCreate={openAdd}
      >
        <DpContentHeader
          filterValue={filterValue}
          onFilter={handleFilter}
          onLoad={() => revalidator.revalidate()}
          showCreateButton={false}
          onDelete={openDeleteConfirm}
          deleteDisabled={selectedCount === 0 || saving}
          loading={isLoading || converting}
          filterPlaceholder="Filtrar por código, cliente..."
        >
          <DpContentHeaderAction>
            <Button
              type="button"
              size="small"
              icon="pi pi-receipt"
              label="Generar OV"
              onClick={handleConvertToSaleOrders}
              disabled={!allSelectedConfirmed || converting}
              loading={converting}
              aria-label="Generar órdenes de venta desde cotizaciones seleccionadas"
            />
          </DpContentHeaderAction>
          <DpContentHeaderAction>
            <Button
              type="button"
              size="small"
              icon="pi pi-flag"
              label="Cambiar estado"
              onClick={openBulkStatusChange}
              disabled={selectedCount === 0 || saving || statusChangeSaving}
              aria-label="Cambiar estado de las cotizaciones seleccionadas"
            />
          </DpContentHeaderAction>
        </DpContentHeader>

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
            {error}
          </div>
        )}

        <DpTable<QuotationRecord>
          ref={tableRef}
          data={rows}
          loading={isLoading}
          tableDef={TABLE_DEF}
          onEdit={openEdit}
          onSelectionChange={(r) => {
            setSelectedCount(r.length);
            setSelectedRows(r);
          }}
          showFilterInHeader={false}
          emptyMessage="No hay cotizaciones registradas."
          emptyFilterMessage="No se encontraron cotizaciones."
        >
          <DpTColumn<QuotationRecord> name="quotationItems">
            {(row) => (
              <button
                type="button"
                onClick={() =>
                  navigate(`/sales/quotations/${encodeURIComponent(row.id)}/items`)
                }
                className="p-button p-button-text p-button-rounded p-button-icon-only"
                aria-label="Ítems de la cotización"
                title="Ítems"
              >
                <i className="pi pi-list" />
              </button>
            )}
          </DpTColumn>
          <DpTColumn<QuotationRecord> name="saleOrder">
            {(row) =>
              row.saleOrder ? (
                <button
                  type="button"
                  className="text-link text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  onClick={() =>
                    navigate(`/sales/sale-orders/${encodeURIComponent(row.saleOrderId!)}/items`)
                  }
                  title="Ver orden de venta"
                >
                  {row.saleOrder}
                </button>
              ) : null
            }
          </DpTColumn>
        </DpTable>
      </DpContent>

      {dialogVisible && (
        <QuotationDialog
          visible={dialogVisible}
          quotationId={editId}
          onSuccess={handleSuccess}
          onHide={handleHide}
        />
      )}

      <DpConfirmDialog
        visible={pendingDeleteIds !== null}
        onHide={closeDeleteConfirm}
        title="Eliminar cotizaciones"
        message={
          pendingDeleteIds?.length
            ? `¿Eliminar ${pendingDeleteIds.length} cotización(es)? Esta acción no se puede deshacer.`
            : ""
        }
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={handleConfirmDelete}
        severity="danger"
        loading={saving}
      />

      <DpContentSet
        title="Cambiar estado de cotizaciones"
        variant="dialog"
        visible={statusChangeOpen}
        onHide={closeBulkStatusChange}
        onCancel={closeBulkStatusChange}
        onSave={handleBulkStatusConfirm}
        saving={statusChangeSaving}
        saveLabel="Aplicar"
      >
        <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
          Se actualizará el estado de <strong>{bulkTargetCount}</strong> cotización(es) seleccionada(s).
        </p>
        <DpInput
          type="select"
          label="Nuevo estado"
          value={bulkStatus}
          onChange={(v) => setBulkStatus(String(v) as QuotationStatus)}
          options={QUOTATION_STATUS_OPTIONS}
        />
      </DpContentSet>

      <Outlet />
    </>
  );
}
