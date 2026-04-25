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
  changeInvoiceStatusRemote,
  getInvoiceById,
  type InvoiceRecord,
  type InvoiceQueryFilters,
  type InvoiceStatus,
} from "~/features/billing/invoice";
import { getClients } from "~/features/master/clients";
import { getActiveSunatConfig, isSunatConfigOperational } from "~/features/billing/sunat-config";
import type { Route } from "./+types/InvoicesPage";
import { withUrlSearch } from "~/lib/url-search";
import { getAuthUser } from "~/lib/get-auth-user";
import { getActiveCompanyId } from "~/lib/tenant";
import { useCompany } from "~/lib/company-context";
import { getEffectivePermissions } from "~/lib/effective-permissions";
import { isGranted } from "~/lib/accessService";
import { getAllRoles, type RoleRecord } from "~/features/system/roles";
import {
  DpContent,
  DpContentFilter,
  DpContentHeader,
  DpContentHeaderAction,
  DpContentSet,
  type DpContentFilterRef,
  type DpFilterDef,
} from "~/components/DpContent";
import { DpTable, type DpTableRef } from "~/components/DpTable";
import { DpConfirmDialog } from "~/components/DpConfirmDialog";
import { DpInput } from "~/components/DpInput";
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

/** Estados en los que la factura sigue el flujo asíncrono SUNAT (`sendBill`); fuera de esto no mostramos spinner aunque haya jobs huérfanos. */
const SUNAT_ASYNC_INVOICE_STATUSES = new Set(["queued", "processing", "pending_retry"]);

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
  issueBlockReason: string;
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

  // Orden por fecha/hora de emisión (desc).
  items.sort((a, b) => {
    const av = String(a.issueDate ?? "").trim();
    const bv = String(b.issueDate ?? "").trim();
    if (av && bv) {
      if (av > bv) return -1;
      if (av < bv) return 1;
    }
    // Fallback (por si algún registro legacy no cumple ISO)
    const ad = Date.parse(av);
    const bd = Date.parse(bv);
    if (!Number.isNaN(ad) && !Number.isNaN(bd)) return bd - ad;
    return 0;
  });

  let sunatWarning: "inactive" | "missing" | null = null;
  try {
    const sc = await getActiveSunatConfig();
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
    issueBlockReason: invoice.issueBlockReason?.trim() || "",
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
  const [selectedRows, setSelectedRows] = useState<InvoiceRow[]>([]);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(null);
  const [sunatSending, setSunatSending] = useState(false);
  const [cdrQuerying, setCdrQuerying] = useState(false);
  const [filters, setFilters] = useState<InvoiceFiltersForm>(loaderData.appliedFilters);
  const [processingInvoiceIds, setProcessingInvoiceIds] = useState<Set<string>>(new Set());
  const [clientFilterOptions, setClientFilterOptions] = useState<{ label: string; value: string }[]>([]);
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [statusChangeOpen, setStatusChangeOpen] = useState(false);
  const [statusChangeSaving, setStatusChangeSaving] = useState(false);
  const [statusChangeError, setStatusChangeError] = useState<string | null>(null);
  const [statusChangeDone, setStatusChangeDone] = useState(false);
  const [statusChangePdfUrl, setStatusChangePdfUrl] = useState<string | null>(null);
  const [pendingStatusInvoice, setPendingStatusInvoice] = useState<InvoiceRow | null>(null);
  const [selectedNextStatus, setSelectedNextStatus] = useState("");
  const [selectedIssueBlockReason, setSelectedIssueBlockReason] = useState<string | null>(null);

  const { activeCompanyId, memberships } = useCompany();

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
    let cancelled = false;
    async function run() {
      if (!activeCompanyId) {
        setRoles([]);
        return;
      }
      try {
        const next = await getAllRoles(activeCompanyId);
        if (!cancelled) setRoles(next);
      } catch {
        if (!cancelled) setRoles([]);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [activeCompanyId]);

  const activeMembership = useMemo(() => {
    if (!activeCompanyId) return [];
    return memberships.filter((x) => x.companyId === activeCompanyId && x.status === "active");
  }, [memberships, activeCompanyId]);
  const membershipRoleIds = useMemo(
    () => (activeMembership[0]?.roleIds ?? []).map((x) => String(x)),
    [activeMembership]
  );
  const membershipRoleNames = useMemo(
    () => (activeMembership[0]?.roleNames ?? []).map((x) => String(x)),
    [activeMembership]
  );
  const effectivePermissions = useMemo(
    () => getEffectivePermissions(membershipRoleIds, membershipRoleNames, roles),
    [membershipRoleIds, membershipRoleNames, roles]
  );

  const statusDestinationOptions = useMemo(() => {
    if (!pendingStatusInvoice) return [];
    const current = String(pendingStatusInvoice.status);
    const allowedTargets =
      current === "draft" ? new Set(["issued"]) : current === "issued" ? new Set(["draft"]) : new Set<string>();
    return INVOICE_STATUS_OPTIONS.filter((o) => {
      const next = String(o.value);
      if (!allowedTargets.has(next)) return false;
      return isGranted(effectivePermissions, `change_status_${o.value}`, "invoice");
    });
  }, [pendingStatusInvoice, effectivePermissions]);

  const canChangeStatus = useMemo(() => {
    if (selectedRows.length !== 1) return false;
    const row = selectedRows[0]!;
    const current = String(row.status);
    const next = current === "draft" ? "issued" : current === "issued" ? "draft" : "";
    if (!next) return false;
    return isGranted(effectivePermissions, `change_status_${next}`, "invoice");
  }, [selectedRows, effectivePermissions]);

  const canSendToSunat = useMemo(() => {
    if (!selectedRows.length) return false;
    return selectedRows.every((r) => r.status === "issued" || r.status === "rejected");
  }, [selectedRows]);

  useEffect(() => {
    if (!statusChangeOpen || !statusDestinationOptions.length) return;
    const stillValid = statusDestinationOptions.some((o) => String(o.value) === selectedNextStatus);
    if (!stillValid) setSelectedNextStatus(String(statusDestinationOptions[0]!.value));
  }, [statusChangeOpen, statusDestinationOptions, selectedNextStatus]);

  useEffect(() => {
    const companyId = getActiveCompanyId();
    if (!companyId) return;

    const db = getFirestore();
    // Debe coincidir con las reglas (companyId + miembro): una query sin companyId
    // puede denegarse aunque los jobs sean de la misma cuenta.
    // Solo `sendBill`: jobs `sendPack` / otros pueden quedar en `queued` sin procesador y
    // arrastraría el spinner aunque la factura ya esté aceptada.
    const q = query(
      collection(db, "sunat-jobs"),
      where("companyId", "==", companyId),
      where("jobType", "==", "sendBill"),
      where("status", "in", ["queued", "processing", "pending_retry"])
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ids = new Set<string>();
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        if (data.invoiceId) ids.add(String(data.invoiceId));
        if (Array.isArray(data.invoiceIds)) {
          data.invoiceIds.forEach((id: string) => ids.add(String(id)));
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
  const openEdit = (row: InvoiceRow) => {
    if (String(row.status) !== "draft") {
      setError("Solo se puede editar una factura en estado Borrador.");
      return;
    }
    navigate(withUrlSearch(`/billing/invoices/edit/${encodeURIComponent(row.id)}`, listQuery));
  };

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
    const selected = selectedRows.length ? selectedRows : tableRef.current?.getSelectedRows() ?? [];
    if (!selected.length) return;
    const invalid = selected.filter((r) => r.status !== "issued" && r.status !== "rejected");
    if (invalid.length) {
      setError("Solo puede enviar a SUNAT facturas en estado Emitida o Rechazada SUNAT.");
      return;
    }
    const ids = selected.map((r) => r.id);
    setSunatSending(true);
    setError(null);
    try {
      await sendInvoicesToSunat(ids);
      // Refrescar para reflejar `status=queued` inmediatamente en la grilla.
      revalidator.revalidate();
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

  const openStatusChangeDialog = () => {
    const selected = tableRef.current?.getSelectedRows() ?? [];
    if (selected.length !== 1) return;
    const row = selected[0];
    const current = String(row.status);
    const allowedTargets =
      current === "draft" ? new Set(["issued"]) : current === "issued" ? new Set(["draft"]) : new Set<string>();
    const allowed = INVOICE_STATUS_OPTIONS.filter((o) => {
      const next = String(o.value);
      if (!allowedTargets.has(next)) return false;
      return isGranted(effectivePermissions, `change_status_${o.value}`, "invoice");
    });
    setStatusChangeError(null);
    setStatusChangeDone(false);
    setStatusChangePdfUrl(null);
    setPendingStatusInvoice(row);
    setSelectedNextStatus(allowed.length ? String(allowed[0]!.value) : "");
    setStatusChangeOpen(true);
  };

  const closeStatusChangeDialog = () => {
    if (statusChangeSaving) return;
    setStatusChangeOpen(false);
    setStatusChangeError(null);
    setStatusChangeDone(false);
    setStatusChangePdfUrl(null);
    setPendingStatusInvoice(null);
    setSelectedNextStatus("");
  };

  const handleConfirmStatusChange = async () => {
    if (!pendingStatusInvoice || !selectedNextStatus) return;
    setStatusChangeSaving(true);
    setStatusChangeError(null);
    try {
      const nextStatus = selectedNextStatus as InvoiceStatus;
      await changeInvoiceStatusRemote(pendingStatusInvoice.id, selectedNextStatus as InvoiceStatus);
      tableRef.current?.clearSelectedRows();
      setSelectedIssueBlockReason(null);
      setStatusChangeError(null);

      if (nextStatus === "issued") {
        setStatusChangeDone(true);
        const inv = await getInvoiceById(pendingStatusInvoice.id);
        const pdf = String(inv?.pdfUrl ?? "").trim();
        setStatusChangePdfUrl(pdf || null);
      } else {
        setStatusChangeOpen(false);
        setPendingStatusInvoice(null);
        setSelectedNextStatus("");
      }
      revalidator.revalidate();
    } catch (err) {
      setStatusChangeError(err instanceof Error ? err.message : "No se pudo cambiar el estado.");
    } finally {
      setStatusChangeSaving(false);
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
            disabled={selectedCount === 0 || sunatSending || !canSendToSunat}
            loading={sunatSending}
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
          <Button
            type="button"
            size="small"
            icon="pi pi-arrow-right-arrow-left"
            label="Cambiar estado"
            onClick={openStatusChangeDialog}
            disabled={selectedCount !== 1 || statusChangeSaving || !canChangeStatus}
            aria-label="Cambiar estado de la factura seleccionada"
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

      {error && !statusChangeOpen && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}

      {selectedIssueBlockReason && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          <strong>Bloqueo de emisión (factura seleccionada):</strong> {selectedIssueBlockReason}
        </div>
      )}

      <DpTable<InvoiceRow>
        ref={tableRef}
        data={loaderData.items}
        loading={isLoading || saving || sunatSending || cdrQuerying}
        tableDef={TABLE_DEF}
        onSelectionChange={(rows) => {
          setSelectedCount(rows.length);
          setSelectedRows(rows);
          if (rows.length === 1) {
            const r = rows[0];
            const msg = r.issueBlockReason?.trim();
            setSelectedIssueBlockReason(msg || null);
          } else {
            setSelectedIssueBlockReason(null);
          }
        }}
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
              {processingInvoiceIds.has(row.id) && SUNAT_ASYNC_INVOICE_STATUSES.has(String(row.status)) && (
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

      <DpContentSet
        title="Cambiar estado de factura"
        variant="dialog"
        visible={statusChangeOpen}
        onHide={closeStatusChangeDialog}
        onCancel={closeStatusChangeDialog}
        onSave={handleConfirmStatusChange}
        saving={statusChangeSaving}
        saveLabel="Aplicar"
        showError={!!statusChangeError}
        errorMessage={statusChangeError ?? ""}
        dialogBodyHeader={
          pendingStatusInvoice ? (
            <div className="flex flex-col gap-3 pb-3">
              {statusDestinationOptions.length === 0 && (
                <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
                  No tiene permiso para cambiar el estado de esta factura.
                </div>
              )}
              {statusChangeDone && selectedNextStatus === "issued" && (
                <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">
                  Estado actualizado a <strong>Emitida</strong>.
                </div>
              )}
              {statusChangeDone && selectedNextStatus === "issued" && (
                <div className="flex flex-wrap items-center gap-2">
                  {statusChangePdfUrl ? (
                    <a
                      href={statusChangePdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-button p-button-sm p-button-outlined"
                      aria-label="Ver PDF generado"
                    >
                      <i className="pi pi-file-pdf mr-2" />
                      Ver PDF
                    </a>
                  ) : (
                    <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                      Aún no hay PDF generado para esta factura.
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null
        }
        saveDisabled={
          statusChangeDone ||
          !pendingStatusInvoice ||
          !selectedNextStatus ||
          statusDestinationOptions.length === 0
        }
      >
        {pendingStatusInvoice && (
          <>
            <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
              Factura <strong>{pendingStatusInvoice.documentNo || pendingStatusInvoice.id}</strong> — estado
              actual:{" "}
              <strong>{statusLabelById.get(String(pendingStatusInvoice.status)) ?? pendingStatusInvoice.status}</strong>
            </p>
            {statusDestinationOptions.length === 0 ? (
              <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                No hay estados de destino permitidos para su usuario.
              </div>
            ) : (
              <DpInput
                type="select"
                label="Nuevo estado"
                value={selectedNextStatus}
                onChange={(v) => setSelectedNextStatus(String(v))}
                options={statusDestinationOptions}
              />
            )}
          </>
        )}
      </DpContentSet>

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
