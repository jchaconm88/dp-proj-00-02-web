import { useMemo, useRef, useState } from "react";
import { useNavigate, useNavigation, useRevalidator, useMatch } from "react-router";
import {
  getQuotationById,
  getQuotationItems,
  deleteQuotationItem,
  deleteQuotationItems,
  convertQuotationToSaleOrder,
  type QuotationItemRecord,
} from "~/features/sales/quotations";
import { getUnitsOfMeasureCatalog } from "~/features/system/units-of-measure";
import { getAuthUser } from "~/lib/get-auth-user";
import { useLocationContext } from "~/lib/location-context";
import type { Route } from "./+types/QuotationItemsPage";
import { DpContentInfo, DpContentHeader } from "~/components/ui";
import { DpTable, type DpTableRef, type DpTableFooterTotals } from "~/components/ui";
import { DpConfirmDialog } from "~/components/ui";
import { moduleTableDef } from "~/data/system-modules";
import QuotationItemDialog from "./QuotationItemDialog";

const TABLE_DEF = moduleTableDef("quotation-item");

export function meta({ data }: Route.MetaArgs) {
  return [
    { title: `Ítems: ${data?.quotation?.code || "Cotización"}` },
  ];
}

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  await getAuthUser();
  const quotationId = (params?.id ?? "") as string;
  if (!quotationId) throw new Error("ID de cotización no encontrado");
  const [quotation, { items }, unitsCatalog] = await Promise.all([
    getQuotationById(quotationId),
    getQuotationItems(quotationId),
    getUnitsOfMeasureCatalog(),
  ]);
  if (!quotation) throw new Error("Cotización no encontrada");
  return { quotation, items, quotationId, unitsCatalog };
}

export default function QuotationItemsPage({ loaderData }: Route.ComponentProps) {
  const { quotation, items, quotationId, unitsCatalog } = loaderData;
  const navigate = useNavigate();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const tableRef = useRef<DpTableRef<QuotationItemRecord>>(null);
  const { activeLocationId, locations } = useLocationContext();

  const isLoading = navigation.state !== "idle" || revalidator.state === "loading";
  const basePath = `/sales/quotations/${encodeURIComponent(quotationId)}/items`;

  // Block editing if status is not draft or sent
  const lockedByStatus = quotation.status !== "draft" && quotation.status !== "sent";
  const canConvert = quotation.status === "confirmed";

  const isAdd = !!useMatch("/sales/quotations/:id/items/add");
  const editMatch = useMatch("/sales/quotations/:id/items/edit/:itemId");
  const editItemId = editMatch?.params.itemId ?? null;
  const dialogVisible = isAdd || !!editItemId;

  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterValue, setFilterValue] = useState("");
  const [selectedCount, setSelectedCount] = useState(0);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(null);

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
      setError("Solo se pueden editar ítems cuando la cotización está en estado Borrador o Enviada.");
      return;
    }
    navigate(`${basePath}/add`);
  };

  const openEdit = (row: QuotationItemRecord) => {
    if (lockedByStatus) {
      setError("Solo se pueden editar ítems cuando la cotización está en estado Borrador o Enviada.");
      return;
    }
    navigate(`${basePath}/edit/${encodeURIComponent(row.id)}`);
  };

  const openDeleteConfirm = () => {
    if (lockedByStatus) {
      setError("Solo se pueden eliminar ítems cuando la cotización está en estado Borrador o Enviada.");
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
      if (ids.length === 1) {
        await deleteQuotationItem(quotationId, ids[0]);
      } else {
        await deleteQuotationItems(quotationId, ids);
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

  const handleConvertToSaleOrder = async () => {
    setConverting(true);
    setError(null);
    try {
      const locationName =
        locations.find((l) => l.id === activeLocationId)?.name ?? "";
      const saleOrderId = await convertQuotationToSaleOrder(
        quotationId,
        activeLocationId ?? "",
        locationName
      );
      navigate(`/sales/sale-orders/${encodeURIComponent(saleOrderId)}/items`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al generar la orden de venta.");
    } finally {
      setConverting(false);
    }
  };

  const handleSuccess = () => {
    navigate(basePath);
    revalidator.revalidate();
  };

  const onBack = () => navigate("/sales/quotations");

  return (
    <DpContentInfo
      title={`Ítems: ${quotation.code}`}
      breadcrumbItems={["VENTAS", "COTIZACIONES", "ÍTEMS"]}
      backLabel="Volver a cotizaciones"
      onBack={onBack}
      onCreate={lockedByStatus ? undefined : openAdd}
    >
      <DpContentHeader
        onLoad={() => revalidator.revalidate()}
        onDelete={openDeleteConfirm}
        deleteDisabled={lockedByStatus || selectedCount === 0 || saving}
        filterValue={filterValue}
        onFilter={handleFilter}
        filterPlaceholder="Filtrar ítems..."
      />

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}

      {lockedByStatus && (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          Esta cotización no está en estado <strong>Borrador</strong> o <strong>Enviada</strong> y no se pueden modificar sus ítems.
        </div>
      )}

      <div className={`mb-4 flex items-center gap-3 rounded-md border px-3 py-2 ${canConvert ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/40" : "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40"}`}>
        <span className={`text-sm ${canConvert ? "text-green-900 dark:text-green-200" : "text-amber-900 dark:text-amber-200"}`}>
          {canConvert ? "Esta cotización está confirmada." : "La cotización debe estar en estado Confirmada para generar una orden de venta."}
        </span>
        <button
          type="button"
          className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          onClick={handleConvertToSaleOrder}
          disabled={!canConvert || converting}
        >
          {converting ? "Generando..." : "Generar Orden de Venta"}
        </button>
      </div>

      <DpTable<QuotationItemRecord>
        ref={tableRef}
        data={items}
        loading={isLoading || saving}
        tableDef={TABLE_DEF}
        paginator={false}
        footerTotals={footerTotals}
        onSelectionChange={(r) => setSelectedCount(r.length)}
        onEdit={lockedByStatus ? undefined : openEdit}
        showFilterInHeader={false}
        emptyMessage="No hay ítems en esta cotización."
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
        <QuotationItemDialog
          visible={dialogVisible}
          quotationId={quotationId}
          itemId={editItemId}
          unitsCatalog={unitsCatalog}
          locked={lockedByStatus}
          onSuccess={handleSuccess}
          onHide={() => navigate(basePath)}
        />
      )}
    </DpContentInfo>
  );
}
