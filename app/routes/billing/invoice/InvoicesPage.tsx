import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useNavigation, useRevalidator, useMatch } from "react-router";
import { Button } from "primereact/button";
import { getFirestore, collection, query, where, onSnapshot } from "firebase/firestore";
import {
  getInvoices,
  getInvoicesByFilters,
  deleteInvoice,
  deleteInvoices,
  sendInvoicesToSunat,
  queryInvoicesCdr,
  sendInvoicesPack,
  retryInvoiceSunat,
  type InvoiceRecord,
  type InvoiceQueryFilters,
  type InvoiceStatus,
} from "~/features/billing/invoice";
import { getClients } from "~/features/master/clients";
import { getSunatConfig, isSunatConfigOperational } from "~/features/billing/sunat-config";
import type { Route } from "./+types/InvoicesPage";
import { withUrlSearch } from "~/lib/url-search";
import { getAuthUser } from "~/lib/get-auth-user";
import { getActiveCompanyId } from "~/lib/tenant";
import {
  DpContent,
  DpContentFilter,
  DpContentHeader,
  DpContentHeaderAction,
  type DpContentFilterRef,
  type DpFilterDef,
} from "~/components/DpContent";
import { DpTable, type DpTableRef } from "~/components/DpTable";
import { DpConfirmDialog } from "~/components/DpConfirmDialog";
import DpTColumn from "~/components/DpTable/DpTColumn";
import {
  INVOICE_STATUS,
  INVOICE_TYPE,
  PAYMENT_CONDITION,
  CURRENCY,
  OPERATION_TYPE_CODE,
  statusToSelectOptions,
} from "~/constants/status-options";
import { formatAmountWithSymbol } from "~/constants/currency-format";
import { moduleTableDef } from "~/data/system-modules";
import InvoiceDialog from "./InvoiceDialog";

const TABLE_DEF = moduleTableDef("invoice", {
  operationTypeCode: OPERATION_TYPE_CODE,
  type: INVOICE_TYPE,
  status: INVOICE_STATUS,
  payTerm: PAYMENT_CONDITION,
  currency: CURRENCY,
});

const INVOICE_STATUS_OPTIONS = statusToSelectOptions(INVOICE_STATUS);

type InvoiceFiltersForm = {
  issuedRange: { from: string; to: string };
  status: string[];
  clientIds: string[];
};

type InvoiceRow = InvoiceRecord & {
  clientName: string;
  totalPriceFormatted: string;
  totalTaxFormatted: string;
  totalFormatted: string;
};

export function meta({}: Route.MetaArgs) {
  return [{ title: "Facturas" }];
}

export async function clientLoader(args: Route.ClientLoaderArgs) {
  await getAuthUser(); // espera a que Firebase Auth hidrate antes de leer companyId
  const requestArg = (args as Route.ClientLoaderArgs & { request?: Request }).request;
  const url = requestArg ? new URL(requestArg.url) : null;
  const params = url?.searchParams;

  const fromParam = String(params?.get("from") ?? "").trim();
  const toParam = String(params?.get("to") ?? "").trim();
  const statusParams = params?.getAll("status").map((x) => x.trim()).filter(Boolean) as InvoiceStatus[] | undefined;
  const clientIdParams = params?.getAll("clientId").map((x) => x.trim()).filter(Boolean) || undefined;

  const hasExplicitFilters = Boolean(params && Array.from(params.keys()).length > 0);

  const filters: InvoiceQueryFilters = {
    issueDateFrom: fromParam || undefined,
    issueDateTo: toParam || undefined,
    status: statusParams?.length ? statusParams : undefined,
    clientIds: clientIdParams?.length ? clientIdParams : undefined,
  };

  const hasFilters = Boolean(
    filters.issueDateFrom ||
      filters.issueDateTo ||
      (filters.status?.length ?? 0) > 0 ||
      (filters.clientIds?.length ?? 0) > 0
  );

  const { items } = hasFilters ? await getInvoicesByFilters(filters) : await getInvoices();

  let sunatWarning: "inactive" | "missing" | null = null;
  try {
    const sc = await getSunatConfig();
    if (!sc) sunatWarning = "missing";
    else if (!isSunatConfigOperational(sc)) sunatWarning = "inactive";
  } catch {
    sunatWarning = "missing";
  }

  const rows: InvoiceRow[] = items.map((invoice) => ({
    ...invoice,
    clientName: invoice.client.name || invoice.client.businessName || "—",
    settlement: invoice.settlement?.trim() || "—",
    totalPriceFormatted: formatAmountWithSymbol(invoice.totalPrice, invoice.currency),
    totalTaxFormatted: formatAmountWithSymbol(invoice.totalTax, invoice.currency),
    totalFormatted: formatAmountWithSymbol(invoice.totalAmount, invoice.currency),
  }));

  return {
    items: rows,
    appliedFilters: {
      issuedRange: { from: fromParam, to: toParam },
      status: statusParams ?? [],
      clientIds: clientIdParams ?? [],
    } satisfies InvoiceFiltersForm,
    hasExplicitFilters,
    sunatWarning,
  };
}

export default function InvoicesPage({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const tableRef = useRef<DpTableRef<InvoiceRow>>(null);
  const contentFilterRef = useRef<DpContentFilterRef>(null);

  const isLoading = navigation.state !== "idle" || revalidator.state === "loading";
  const isAdd = !!useMatch("/billing/invoices/add");
  const editMatch = useMatch("/billing/invoices/edit/:id");
  const editId = editMatch?.params.id ?? null;
  const listQuery = location.search;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterValue, setFilterValue] = useState("");
  const [selectedCount, setSelectedCount] = useState(0);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(null);
  const [sunatSending, setSunatSending] = useState(false);
  const [cdrQuerying, setCdrQuerying] = useState(false);
  const [filters, setFilters] = useState<InvoiceFiltersForm>(loaderData.appliedFilters);
  const [processingInvoiceIds, setProcessingInvoiceIds] = useState<Set<string>>(new Set());
  const [clientFilterOptions, setClientFilterOptions] = useState<{ label: string; value: string }[]>([]);

  const dialogVisible = isAdd || !!editId;

  const defaultInvoiceFilters = useRef<InvoiceFiltersForm>({
    issuedRange: { from: "", to: "" },
    status: [],
    clientIds: [],
  }).current;

  useEffect(() => {
    setFilters(loaderData.appliedFilters);
  }, [loaderData.appliedFilters]);

  useEffect(() => {
    getClients()
      .then(({ items }) =>
        setClientFilterOptions(
          items.map((c) => ({
            label: `${c.businessName || c.code}${c.code ? ` · ${c.code}` : ""}`,
            value: c.id,
          }))
        )
      )
      .catch(() => setClientFilterOptions([]));
  }, []);

  useEffect(() => {
    const companyId = getActiveCompanyId();
    if (!companyId) return;

    const db = getFirestore();
    // Debe coincidir con las reglas (companyId + miembro): una query sin companyId
    // puede denegarse aunque los jobs sean de la misma cuenta.
    const q = query(
      collection(db, "sunat-jobs"),
      where("companyId", "==", companyId),
      where("status", "in", ["queued", "processing", "pending_retry"])
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ids = new Set<string>();
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        if (data.invoiceId) ids.add(data.invoiceId);
        if (Array.isArray(data.invoiceIds)) {
          data.invoiceIds.forEach((id: string) => ids.add(id));
        }
      });
      setProcessingInvoiceIds(ids);
    });
    return () => unsubscribe();
  }, []);

  const statusLabelById = new Map(INVOICE_STATUS_OPTIONS.map((o) => [String(o.value), o.label]));

  const clientLabelById = useMemo(
    () => new Map(clientFilterOptions.map((o) => [o.value, o.label])),
    [clientFilterOptions]
  );

  const filterDefs = useMemo<DpFilterDef[]>(
    () => [
      {
        name: "issuedRange",
        label: "Fecha de emisión",
        type: "date-range",
        colSpan: 2,
        summary: (value) => {
          const v = (value as { from?: string; to?: string }) ?? {};
          const from = String(v.from ?? "").trim();
          const to = String(v.to ?? "").trim();
          if (from && to) return `${from} a ${to}`;
          return from || to;
        },
      },
      {
        name: "status",
        label: "Estado",
        type: "multiselect",
        options: INVOICE_STATUS_OPTIONS,
        placeholder: "— Todos los estados —",
        filter: true,
        summary: (value) =>
          ((value as string[]) ?? [])
            .map((id) => statusLabelById.get(id) || id)
            .filter(Boolean)
            .join(", "),
      },
      {
        name: "clientIds",
        label: "Cliente",
        type: "multiselect",
        options: clientFilterOptions,
        placeholder: "— Todos los clientes —",
        filter: true,
        summary: (value) =>
          ((value as string[]) ?? [])
            .map((id) => clientLabelById.get(id) || id)
            .filter(Boolean)
            .join(", "),
      },
    ],
    [statusLabelById, clientFilterOptions, clientLabelById]
  );

  const applySearchParams = (nextFilters: InvoiceFiltersForm) => {
    const params = new URLSearchParams();
    if (nextFilters.issuedRange.from.trim()) params.set("from", nextFilters.issuedRange.from.trim());
    if (nextFilters.issuedRange.to.trim()) params.set("to", nextFilters.issuedRange.to.trim());
    for (const st of nextFilters.status) {
      const v = String(st).trim();
      if (v) params.append("status", v);
    }
    for (const id of nextFilters.clientIds) {
      const v = String(id).trim();
      if (v) params.append("clientId", v);
    }
    const qs = params.toString();
    navigate(qs ? `/billing/invoices?${qs}` : "/billing/invoices");
  };

  const handleFilter = (value: string) => {
    setFilterValue(value);
    tableRef.current?.filter(value);
  };

  const openAdd = () => navigate(withUrlSearch("/billing/invoices/add", listQuery));
  const openEdit = (row: InvoiceRow) =>
    navigate(withUrlSearch(`/billing/invoices/edit/${encodeURIComponent(row.id)}`, listQuery));

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
        await deleteInvoice(ids[0]);
      } else {
        await deleteInvoices(ids);
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

  const handleSendToSunat = async () => {
    const selected = tableRef.current?.getSelectedRows() ?? [];
    if (!selected.length) return;
    const ids = selected.map((r) => r.id);
    setSunatSending(true);
    setError(null);
    try {
      await sendInvoicesToSunat(ids);
      // Don't revalidate immediately — the real-time listener will update the UI
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar a SUNAT");
    } finally {
      setSunatSending(false);
    }
  };

  const handleQueryCdr = async () => {
    const selected = tableRef.current?.getSelectedRows() ?? [];
    if (!selected.length) return;
    const ids = selected.map((r) => r.id);
    setCdrQuerying(true);
    setError(null);
    try {
      await queryInvoicesCdr(ids);
      revalidator.revalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al consultar CDR");
    } finally {
      setCdrQuerying(false);
    }
  };

  const handleSendPack = async () => {
    const selected = tableRef.current?.getSelectedRows() ?? [];
    if (selected.length < 2) return;
    const ids = selected.map((r) => r.id);
    setSaving(true);
    setError(null);
    try {
      await sendInvoicesPack(ids);
      revalidator.revalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar lote a SUNAT");
    } finally {
      setSaving(false);
    }
  };

  const handleRetry = async () => {
    const selected = tableRef.current?.getSelectedRows() ?? [];
    if (selected.length !== 1) return;
    setSaving(true);
    setError(null);
    try {
      await retryInvoiceSunat(selected[0].id);
      revalidator.revalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al reintentar envío");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DpContent
      title="FACTURAS"
      breadcrumbItems={["FACTURACIÓN", "FACTURAS"]}
      onFilterAction={() => contentFilterRef.current?.toggle()}
      onCreate={openAdd}
    >
      <DpContentFilter
        ref={contentFilterRef}
        defaultShow={false}
        filterDefs={filterDefs}
        initialValues={defaultInvoiceFilters as Record<string, unknown>}
        values={filters as Record<string, unknown>}
        onValuesChange={(next) => setFilters(next as InvoiceFiltersForm)}
        onSearch={(mapped) => applySearchParams(mapped as InvoiceFiltersForm)}
        searchLabel="Buscar"
      />
      <DpContentHeader
        onLoad={() => revalidator.revalidate()}
        showCreateButton={false}
        onDelete={openDeleteConfirm}
        deleteDisabled={selectedCount === 0 || saving}
        filterValue={filterValue}
        onFilter={handleFilter}
        filterPlaceholder="Filtrar por código, documento..."
      >
        <DpContentHeaderAction>
          <Button
            type="button"
            size="small"
            icon="pi pi-send"
            label="Enviar a SUNAT"
            onClick={handleSendToSunat}
            disabled={selectedCount === 0 || sunatSending}
            aria-label="Enviar facturas seleccionadas a SUNAT"
          />
          <Button
            type="button"
            size="small"
            icon="pi pi-box"
            label="Envío masivo"
            onClick={handleSendPack}
            disabled={selectedCount < 2 || saving}
            aria-label="Enviar facturas seleccionadas en lote a SUNAT"
          />
          <Button
            type="button"
            size="small"
            icon="pi pi-replay"
            label="Reintentar"
            onClick={handleRetry}
            disabled={selectedCount !== 1 || saving}
            aria-label="Reintentar envío de factura a SUNAT"
          />
          <Button
            type="button"
            size="small"
            icon="pi pi-refresh"
            label="Consultar CDR"
            onClick={handleQueryCdr}
            disabled={selectedCount === 0 || cdrQuerying}
            aria-label="Consultar CDR de facturas seleccionadas"
          />
        </DpContentHeaderAction>
      </DpContentHeader>

      {loaderData.sunatWarning === "missing" && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          No hay configuración SUNAT para esta empresa. Créala en{" "}
          <strong>Facturación → Configuración SUNAT</strong> antes de enviar o consultar comprobantes.
        </div>
      )}
      {loaderData.sunatWarning === "inactive" && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          La configuración SUNAT está <strong>desactivada</strong>. Actívala en{" "}
          <strong>Facturación → Configuración SUNAT</strong> para usar envío y consulta SUNAT.
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}

      <DpTable<InvoiceRow>
        ref={tableRef}
        data={loaderData.items}
        loading={isLoading || saving}
        tableDef={TABLE_DEF}
        onSelectionChange={(rows) => setSelectedCount(rows.length)}
        onEdit={openEdit}
        showFilterInHeader={false}
        emptyMessage="No hay facturas."
        emptyFilterMessage="No se encontraron facturas."
      >
        <DpTColumn<InvoiceRow> name="invoiceItems">
          {(row) => (
            <button
              type="button"
              onClick={() =>
                navigate(
                  withUrlSearch(`/billing/invoices/${encodeURIComponent(row.id)}/items`, listQuery)
                )
              }
              className="p-button p-button-text p-button-rounded p-button-icon-only"
              aria-label="Ítems de la factura"
              title="Ítems"
            >
              <i className="pi pi-list" />
            </button>
          )}
        </DpTColumn>
        <DpTColumn<InvoiceRow> name="invoiceCredits">
          {(row) => (
            <button
              type="button"
              onClick={() =>
                navigate(
                  withUrlSearch(`/billing/invoices/${encodeURIComponent(row.id)}/credits`, listQuery)
                )
              }
              className="p-button p-button-text p-button-rounded p-button-icon-only"
              aria-label="Cuotas de la factura"
              title="Cuotas"
            >
              <i className="pi pi-calendar" />
            </button>
          )}
        </DpTColumn>
        <DpTColumn<InvoiceRow> name="sunatDocs">
          {(row) => (
            <div className="flex gap-2 items-center">
              {processingInvoiceIds.has(row.id) && (
                <i className="pi pi-spin pi-spinner text-blue-500" title="Procesando en SUNAT..." />
              )}
              {row.zipUrl && (
                <a
                  href={row.zipUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-600 hover:underline"
                >
                  Zip
                </a>
              )}
              {row.cdrUrl && (
                <a
                  href={row.cdrUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-600 hover:underline"
                >
                  CDR
                </a>
              )}
              {row.pdfUrl && (
                <a
                  href={row.pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-600 hover:underline"
                >
                  PDF
                </a>
              )}
            </div>
          )}
        </DpTColumn>
      </DpTable>

      <DpConfirmDialog
        visible={pendingDeleteIds !== null}
        onHide={closeDeleteConfirm}
        title="Eliminar facturas"
        message={
          pendingDeleteIds?.length ? (
            <p>
              ¿Eliminar <strong>{pendingDeleteIds.length}</strong> factura(s)? Esta acción no se puede deshacer.
            </p>
          ) : (
            ""
          )
        }
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={handleConfirmDelete}
        severity="danger"
        loading={saving}
      />

      {dialogVisible && (
        <InvoiceDialog
          visible={dialogVisible}
          invoiceId={editId}
          onSuccess={(createdId) => {
            if (createdId) {
              navigate(withUrlSearch(`/billing/invoices/${encodeURIComponent(createdId)}/items`, listQuery));
            } else {
              navigate(withUrlSearch("/billing/invoices", listQuery));
            }
            revalidator.revalidate();
          }}
          onHide={() => navigate(withUrlSearch("/billing/invoices", listQuery))}
        />
      )}
    </DpContent>
  );
}
