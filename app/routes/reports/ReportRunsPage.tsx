import { useEffect, useMemo, useState } from "react";
import { useNavigate, useNavigation, useRevalidator } from "react-router";
import { Button } from "primereact/button";
import type { Route } from "./+types/ReportRunsPage";
import { DpContentHeader, DpContentHeaderAction, DpContentInfo } from "~/components/DpContent";
import { DpTable, type DpTableDefColumn } from "~/components/DpTable";
import DpTColumn from "~/components/DpTable/DpTColumn";
import type { ReportDefinitionRecord, ReportRunRecord } from "~/features/reports/reports.types";
import {
  formatRunTime,
  getReportDefinitionById,
  getReportRunDownloadUrlCallable,
  getReportRunsByDefinitionId,
} from "~/features/reports/reports.service";
import ReportRunDialog from "./ReportRunDialog";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente",
  processing: "Procesando",
  completed: "Listo",
  error: "Error",
};

const NOTIFY_STATUS_LABEL: Record<string, string> = {
  sent: "Enviado",
  failed: "Falló",
  skipped: "Omitido",
};

const NOTIFY_SKIP_REASON_LABEL: Record<string, string> = {
  no_recipients: "sin destinatarios",
  smtp_not_configured: "SMTP no configurado",
  disabled_by_user: "deshabilitado por usuario",
};

type RunRow = ReportRunRecord & {
  statusLabel: string;
  createdLabel: string;
  rangeLabel: string;
  outputFormatLabel: string;
  notifyStatusDisplay: string;
  notifyAttemptedLabel: string;
  notifySubjectLine: string;
  notifyRecipientsLine: string;
  notifyHtmlLabel: string;
  notifyErrorLine: string;
};

/** Paridad con `clientLoader` (tipos generados de la ruta pueden dejar `loaderData` como `never`). */
type ReportRunsPageLoaderData = {
  definition: ReportDefinitionRecord;
  runRows: RunRow[];
};

function formatRunDateRangeLabel(params: Record<string, unknown> | undefined): string {
  const df = String(params?.dateFrom ?? "").trim();
  const dt = String(params?.dateTo ?? "").trim();
  if (!df && !dt) return "—";
  if (df && dt) return `${df} — ${dt}`;
  return df || dt;
}

function formatRunOutputTypeLabel(run: ReportRunRecord): string {
  const fmt = String(run.outputFormat ?? "").toLowerCase();
  if (fmt === "pdf") return "PDF";
  if (fmt === "xlsx") return "Excel";
  const mime = String(run.result?.mimeType ?? "");
  if (mime.includes("pdf")) return "PDF";
  if (mime.includes("spreadsheet") || mime.includes("excel")) return "Excel";
  return "—";
}

function formatNotifyStatusDisplay(run: ReportRunRecord): string {
  if (!run.notifyStatus) return "—";
  const base = NOTIFY_STATUS_LABEL[run.notifyStatus] ?? run.notifyStatus;
  if (run.notifyStatus === "skipped" && run.notifySkippedReason) {
    const reason =
      NOTIFY_SKIP_REASON_LABEL[run.notifySkippedReason] ?? run.notifySkippedReason;
    return `${base} (${reason})`;
  }
  return base;
}

function formatNotifyBodyHtmlLabel(run: ReportRunRecord): string {
  if (run.notifyBodyWasHtml === undefined) return "—";
  return run.notifyBodyWasHtml ? "Sí" : "No";
}

/** Sin columna «Definición»: todas las filas son de la misma definición. */
const RUN_TABLE: DpTableDefColumn[] = [
  { header: "Inicio", column: "createdLabel", order: 1, display: true, filter: true },
  { header: "Rango", column: "rangeLabel", order: 2, display: true, filter: true },
  { header: "Tipo de documento", column: "outputFormatLabel", order: 3, display: true, filter: true },
  { header: "Estado", column: "statusLabel", order: 4, display: true, filter: true },
  { header: "Correo · estado", column: "notifyStatusDisplay", order: 5, display: true, filter: true },
  { header: "Correo · intento", column: "notifyAttemptedLabel", order: 6, display: true, filter: true },
  { header: "Correo · asunto", column: "notifySubjectLine", order: 7, display: true, filter: true },
  { header: "Correo · destinatarios", column: "notifyRecipientsLine", order: 8, display: true, filter: true },
  { header: "Correo · HTML", column: "notifyHtmlLabel", order: 9, display: true, filter: true },
  { header: "Correo · error", column: "notifyErrorLine", order: 10, display: true, filter: true },
  { header: "Descarga", column: "_download", order: 11, display: true, filter: false },
];

function mapRunsToRows(runs: ReportRunRecord[]): RunRow[] {
  return runs.map((r) => {
    const disabledByUser = r.notifyStatus === "skipped" && r.notifySkippedReason === "disabled_by_user";
    return {
      ...r,
      statusLabel: STATUS_LABEL[r.status] ?? r.status,
      createdLabel: formatRunTime(r.createdAt),
      rangeLabel: formatRunDateRangeLabel(r.params),
      outputFormatLabel: formatRunOutputTypeLabel(r),
      notifyStatusDisplay: formatNotifyStatusDisplay(r),
      notifyAttemptedLabel: disabledByUser ? "—" : formatRunTime(r.notifyAttemptedAt),
      notifySubjectLine: disabledByUser ? "—" : r.notifyEmailSubject?.trim() || "—",
      notifyRecipientsLine: disabledByUser ? "—" : r.notifyRecipientsSummary?.trim() || "—",
      notifyHtmlLabel: disabledByUser ? "—" : formatNotifyBodyHtmlLabel(r),
      notifyErrorLine: disabledByUser ? "—" : r.notifyError?.trim() || "—",
    };
  });
}

export function meta({ data }: Route.MetaArgs) {
  const name = data?.definition?.name?.trim();
  return [
    { title: name ? `Corridas · ${name}` : "Corridas de reporte" },
    { name: "description", content: "Historial de ejecuciones (colección report-runs) por definición" },
  ];
}

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const definitionId = String(params.definitionId ?? "").trim();
  if (!definitionId) {
    throw new Response("Definición no indicada.", { status: 404 });
  }
  const definition = await getReportDefinitionById(definitionId);
  if (!definition) {
    throw new Response("Definición no encontrada.", { status: 404 });
  }
  const runs = await getReportRunsByDefinitionId(definitionId, 200);
  const runRows = mapRunsToRows(runs);
  return { definition, runRows };
}

export default function ReportRunsPage({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const navigation = useNavigation();
  const revalidator = useRevalidator();

  const loaded = loaderData as ReportRunsPageLoaderData | undefined;
  const runRows: RunRow[] = loaded?.runRows ?? [];
  const definition = loaded?.definition;

  const [runFilter, setRunFilter] = useState("");
  const [runDialogOpen, setRunDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadBusyId, setDownloadBusyId] = useState<string | null>(null);

  const isLoading = navigation.state !== "idle" || revalidator.state === "loading";

  const filteredRunRows = useMemo(() => {
    const q = runFilter.trim().toLowerCase();
    if (!q) return runRows;
    return runRows.filter(
      (r) =>
        r.createdLabel.toLowerCase().includes(q) ||
        r.rangeLabel.toLowerCase().includes(q) ||
        r.outputFormatLabel.toLowerCase().includes(q) ||
        r.statusLabel.toLowerCase().includes(q) ||
        r.notifyStatusDisplay.toLowerCase().includes(q) ||
        r.notifyAttemptedLabel.toLowerCase().includes(q) ||
        r.notifySubjectLine.toLowerCase().includes(q) ||
        r.notifyRecipientsLine.toLowerCase().includes(q) ||
        r.notifyHtmlLabel.toLowerCase().includes(q) ||
        r.notifyErrorLine.toLowerCase().includes(q)
    );
  }, [runRows, runFilter]);

  const pendingRuns = useMemo(
    () => runRows.some((r) => r.status === "pending" || r.status === "processing"),
    [runRows]
  );

  useEffect(() => {
    if (!pendingRuns) return;
    const t = window.setInterval(() => revalidator.revalidate(), 8000);
    return () => window.clearInterval(t);
  }, [pendingRuns, revalidator]);

  const handleDownload = async (row: RunRow) => {
    setDownloadBusyId(row.id);
    setError(null);
    try {
      const { url, fileName } = await getReportRunDownloadUrlCallable({ reportRunId: row.id });
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.rel = "noopener";
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo descargar.");
    } finally {
      setDownloadBusyId(null);
    }
  };

  if (!loaded || !definition) {
    return null;
  }

  return (
    <DpContentInfo
      title={`Historial · ${definition.name}`}
      breadcrumbItems={["REPORTES", "DEFINICIONES", "CORRIDAS"]}
      backLabel="Volver a definiciones"
      onBack={() => navigate("/reports")}
    >
      {error && (
        <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}

      <DpContentHeader
        filterValue={runFilter}
        onFilter={setRunFilter}
        onLoad={() => revalidator.revalidate()}
        loading={isLoading}
        filterPlaceholder="Filtrar historial..."
      >
        <DpContentHeaderAction>
          <Button
            type="button"
            label="Ejecutar"
            icon="pi pi-play"
            size="small"
            severity="success"
            onClick={() => setRunDialogOpen(true)}
          />
        </DpContentHeaderAction>
      </DpContentHeader>

      <DpTable<RunRow>
        data={filteredRunRows}
        loading={isLoading}
        tableDef={RUN_TABLE}
        paginator={false}
        showFilterInHeader={false}
        emptyMessage="Aún no hay ejecuciones para esta definición."
        emptyFilterMessage="Sin resultados."
      >
        <DpTColumn<RunRow> name="_download">
          {(row) =>
            row.status === "completed" ? (
              <Button
                type="button"
                icon="pi pi-download"
                rounded
                text
                title="Descargar archivo"
                loading={downloadBusyId === row.id}
                onClick={() => void handleDownload(row)}
              />
            ) : (
              <span className="text-slate-400">—</span>
            )}
        </DpTColumn>
      </DpTable>

      <ReportRunDialog
        visible={runDialogOpen}
        definition={definition}
        onHide={() => setRunDialogOpen(false)}
        onSuccess={() => revalidator.revalidate()}
      />
    </DpContentInfo>
  );
}
