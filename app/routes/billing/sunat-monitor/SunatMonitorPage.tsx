import { useMemo, useRef, useState } from "react";
import { useNavigate, useNavigation, useRevalidator, redirect } from "react-router";
import { getAuthUser } from "~/lib/get-auth-user";
import type { Route } from "./+types/SunatMonitorPage";
import { DpContent, DpContentFilter, DpContentHeader, type DpContentFilterRef, type DpFilterDef } from "~/components/DpContent";
import { DpTable, type DpTableRef } from "~/components/DpTable";
import DpTColumn from "~/components/DpTable/DpTColumn";
import { moduleTableDef } from "~/data/system-modules";
import { statusToSelectOptions } from "~/constants/status-options";
import { listSunatMonitorRows, SUNAT_JOB_STATUS, SUNAT_JOB_TYPE, type SunatMonitorRow } from "~/features/billing/sunat-monitor";
import { sendInvoicesToSunat } from "~/features/billing/invoice";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Monitor SUNAT" }];
}

export async function clientLoader(args: Route.ClientLoaderArgs) {
  const user = await getAuthUser();
  if (!user) throw redirect("/login");

  const requestArg = (args as Route.ClientLoaderArgs & { request?: Request }).request;
  const url = requestArg ? new URL(requestArg.url) : null;
  const params = url?.searchParams;

  const from = String(params?.get("from") ?? "").trim();
  const to = String(params?.get("to") ?? "").trim();
  const status = params?.getAll("status").map((x) => x.trim()).filter(Boolean) ?? [];
  const jobType = params?.getAll("jobType").map((x) => x.trim()).filter(Boolean) ?? [];
  const docType = params?.getAll("docType").map((x) => x.trim()).filter(Boolean) ?? [];
  const documentNo = String(params?.get("documentNo") ?? "").trim();

  const { items } = await listSunatMonitorRows({
    from: from || undefined,
    to: to || undefined,
    status: status.length ? status : undefined,
    jobType: jobType.length ? jobType : undefined,
    docType: docType.length ? docType : undefined,
    documentNo: documentNo || undefined,
  });

  return {
    items,
    appliedFilters: {
      dateRange: { from, to },
      status,
      jobType,
      docType,
      documentNo,
    },
  };
}

const TABLE_DEF = moduleTableDef("sunat-monitor", {
  status: SUNAT_JOB_STATUS,
  jobType: SUNAT_JOB_TYPE,
});

type MonitorFiltersForm = {
  dateRange: { from: string; to: string };
  status: string[];
  jobType: string[];
  docType: string[];
  documentNo: string;
};

export default function SunatMonitorPage({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const tableRef = useRef<DpTableRef<SunatMonitorRow>>(null);
  const contentFilterRef = useRef<DpContentFilterRef>(null);

  const isLoading = navigation.state !== "idle" || revalidator.state === "loading";
  const [filterValue, setFilterValue] = useState("");
  const [filters, setFilters] = useState<MonitorFiltersForm>(loaderData.appliedFilters);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailRow, setDetailRow] = useState<SunatMonitorRow | null>(null);

  const STATUS_OPTIONS = useMemo(() => statusToSelectOptions(SUNAT_JOB_STATUS), []);
  const JOB_TYPE_OPTIONS = useMemo(() => statusToSelectOptions(SUNAT_JOB_TYPE), []);
  const DOC_TYPE_OPTIONS = useMemo(
    () => [
      { label: "Factura", value: "invoice" },
      { label: "Nota de crédito", value: "credit_note" },
      { label: "Nota de débito", value: "debit_note" },
    ],
    []
  );

  const filterDefs = useMemo<DpFilterDef[]>(
    () => [
      {
        name: "dateRange",
        label: "Fecha de envío",
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
        options: STATUS_OPTIONS,
        placeholder: "— Todos —",
        filter: true,
      },
      {
        name: "jobType",
        label: "Tipo de envío",
        type: "multiselect",
        options: JOB_TYPE_OPTIONS,
        placeholder: "— Todos —",
        filter: true,
      },
      {
        name: "docType",
        label: "Tipo documento",
        type: "multiselect",
        options: DOC_TYPE_OPTIONS,
        placeholder: "— Todos —",
        filter: true,
      },
      {
        name: "documentNo",
        label: "# Documento",
        type: "input",
        placeholder: "F001-00000001",
        colSpan: 2,
      },
    ],
    [DOC_TYPE_OPTIONS, JOB_TYPE_OPTIONS, JOB_TYPE_OPTIONS, STATUS_OPTIONS]
  );

  const applySearchParams = (next: MonitorFiltersForm) => {
    const params = new URLSearchParams();
    const from = next.dateRange.from.trim();
    const to = next.dateRange.to.trim();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    for (const s of next.status) if (String(s).trim()) params.append("status", String(s).trim());
    for (const jt of next.jobType) if (String(jt).trim()) params.append("jobType", String(jt).trim());
    for (const dt of next.docType) if (String(dt).trim()) params.append("docType", String(dt).trim());
    const dn = next.documentNo.trim();
    if (dn) params.set("documentNo", dn);
    const qs = params.toString();
    navigate(qs ? `/billing/sunat-monitor?${qs}` : "/billing/sunat-monitor");
  };

  const handleFilter = (value: string) => {
    setFilterValue(value);
    tableRef.current?.filter(value);
  };

  // El menú y módulos controlan permisos de acceso. Este botón asume que el usuario ya tiene acceso a la pantalla.
  const canRetry = true;

  const handleRetry = async (row: SunatMonitorRow) => {
    if (!canRetry) return;
    if (!row.invoiceId) {
      setError("Este envío no está asociado a una factura.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await sendInvoicesToSunat([row.invoiceId]);
      revalidator.revalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo reenviar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DpContent
      title="MONITOR DE ENVÍOS A SUNAT"
      breadcrumbItems={["FACTURACIÓN", "MONITOR SUNAT"]}
      onFilterAction={() => contentFilterRef.current?.toggle()}
    >
      <DpContentFilter
        ref={contentFilterRef}
        defaultShow={false}
        filterDefs={filterDefs}
        initialValues={
          {
            dateRange: { from: "", to: "" },
            status: [],
            jobType: [],
            docType: [],
            documentNo: "",
          } satisfies MonitorFiltersForm as unknown as Record<string, unknown>
        }
        values={filters as unknown as Record<string, unknown>}
        onValuesChange={(next) => setFilters(next as MonitorFiltersForm)}
        onSearch={(mapped) => applySearchParams(mapped as MonitorFiltersForm)}
        searchLabel="Buscar"
      />
      <DpContentHeader
        onLoad={() => revalidator.revalidate()}
        showCreateButton={false}
        filterValue={filterValue}
        onFilter={handleFilter}
        filterPlaceholder="Filtrar por documento, jobId, mensaje..."
      />

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}

      <DpTable<SunatMonitorRow>
        ref={tableRef}
        data={loaderData.items}
        loading={isLoading || saving}
        tableDef={TABLE_DEF}
        showFilterInHeader={false}
        emptyMessage="No hay envíos SUNAT para los filtros seleccionados."
        emptyFilterMessage="No se encontraron registros."
      >
        <DpTColumn<SunatMonitorRow> name="sunatDocs">
          {(row) => (
            <div className="flex items-center gap-2">
              {row.xmlUrl && (
                <a href={row.xmlUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">
                  XML
                </a>
              )}
              {row.zipUrl && (
                <a href={row.zipUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">
                  ZIP
                </a>
              )}
              {row.cdrUrl && (
                <a href={row.cdrUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">
                  CDR
                </a>
              )}
              {row.pdfUrl && (
                <a href={row.pdfUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">
                  PDF
                </a>
              )}
              {!row.xmlUrl && !row.zipUrl && !row.cdrUrl && !row.pdfUrl ? <span className="text-xs text-zinc-500">—</span> : null}
            </div>
          )}
        </DpTColumn>

        <DpTColumn<SunatMonitorRow> name="actions">
          {(row) => (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDetailRow(row)}
                className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
              >
                Ver
              </button>
              <button
                type="button"
                disabled={!canRetry || !row.invoiceId || saving}
                onClick={() => void handleRetry(row)}
                className="rounded border border-emerald-600 bg-emerald-50 px-2 py-1 text-xs text-emerald-800 hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-200 dark:hover:bg-emerald-900/50"
                title={!row.invoiceId ? "Solo disponible para facturas" : undefined}
              >
                Reenviar
              </button>
            </div>
          )}
        </DpTColumn>
      </DpTable>

      {detailRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-3xl rounded-lg bg-white p-4 text-sm shadow-lg dark:bg-zinc-900">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  Envío SUNAT · {detailRow.documentNo || detailRow.invoiceId || detailRow.id}
                </div>
                <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                  Job: {detailRow.id} · {detailRow.createdAtLabel} · Estado: {String(detailRow.status)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailRow(null)}
                className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
              >
                Cerrar
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded border border-zinc-200 p-3 dark:border-zinc-700">
                <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Documento</div>
                <div className="mt-1 text-zinc-900 dark:text-zinc-100">
                  {detailRow.documentNo || "—"} {detailRow.issueDate ? `· Emisión ${detailRow.issueDate}` : ""}
                </div>
                <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">Tipo: {String(detailRow.docType ?? "—")}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {detailRow.xmlUrl && (
                    <a href={detailRow.xmlUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">
                      Ver XML
                    </a>
                  )}
                  {detailRow.zipUrl && (
                    <a href={detailRow.zipUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">
                      Descargar ZIP
                    </a>
                  )}
                  {detailRow.cdrUrl && (
                    <a href={detailRow.cdrUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">
                      Descargar CDR
                    </a>
                  )}
                  {detailRow.pdfUrl && (
                    <a href={detailRow.pdfUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">
                      Ver PDF
                    </a>
                  )}
                </div>
              </div>

              <div className="rounded border border-zinc-200 p-3 dark:border-zinc-700">
                <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Respuesta / Error</div>
                {detailRow.errorMessage ? (
                  <div className="mt-2 rounded bg-red-50 p-2 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-300">
                    {detailRow.errorMessage}
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">Sin error registrado.</div>
                )}
                {detailRow.cdrMessages?.length ? (
                  <div className="mt-2">
                    <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Mensajes CDR</div>
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-zinc-800 dark:text-zinc-200">
                      {detailRow.cdrMessages.slice(0, 10).map((m, idx) => (
                        <li key={idx}>{m}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {detailRow.sunatResponse ? (
                  <div className="mt-2">
                    <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">SUNAT response</div>
                    <div className="mt-1 whitespace-pre-wrap rounded bg-zinc-50 p-2 text-xs text-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-200">
                      {detailRow.sunatResponse}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}
    </DpContent>
  );
}

