import { useEffect, useMemo, useState } from "react";
import { DpContentSet } from "~/components/DpContent";
import { DpInput } from "~/components/DpInput";
import { reportNotifyTokensHelpInline } from "~/features/reports/report-notify-tokens";
import { getReportDataSourceMeta } from "~/features/reports/report-data-sources.catalog";
import type { ReportDefinitionRecord, ReportOutputFormat } from "~/features/reports/reports.types";
import { footerHasMultiplyRow } from "~/features/reports/report-footer-normalize";
import {
  createReportRunCallable,
  effectiveFooterForDefinition,
  normalizeNotifyEmailBodyHtml,
  NOTIFY_EMAIL_TEMPLATE_MAX_LEN,
  parseNotifyEmailsText,
} from "~/features/reports/reports.service";
import { requireActiveCompanyId } from "~/lib/tenant";
import NotifyEmailBodyEditor from "./NotifyEmailBodyEditor";

const OUTPUT_FORMAT_OPTIONS: { label: string; value: ReportOutputFormat }[] = [
  { label: "Excel (.xlsx)", value: "xlsx" },
  { label: "PDF (.pdf)", value: "pdf" },
];

export interface ReportRunDialogProps {
  visible: boolean;
  definition: ReportDefinitionRecord | null;
  onHide: () => void;
  onSuccess: () => void;
}

export default function ReportRunDialog({
  visible,
  definition,
  onHide,
  onSuccess,
}: ReportRunDialogProps) {
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: "", to: "" });
  const [outputFormat, setOutputFormat] = useState<ReportOutputFormat>("xlsx");
  const [includeTopBlock, setIncludeTopBlock] = useState(true);
  const [includeFooter, setIncludeFooter] = useState(true);
  const [notifyEnabled, setNotifyEnabled] = useState(true);
  const [notifyRunEmailsText, setNotifyRunEmailsText] = useState("");
  const [notifyRunSubjectTemplate, setNotifyRunSubjectTemplate] = useState("");
  const [notifyRunBodyHtml, setNotifyRunBodyHtml] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !definition) return;
    setOutputFormat("xlsx");
    setIncludeTopBlock(true);
    setIncludeFooter(true);
    setNotifyEnabled(true);
    setNotifyRunEmailsText(definition.notifyEmails?.length ? definition.notifyEmails.join(", ") : "");
    setNotifyRunSubjectTemplate(definition.notifyEmailSubjectTemplate ?? "");
    setNotifyRunBodyHtml(definition.notifyEmailBodyHtml ?? "");
    setError(null);
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const first = `${y}-${m}-01`;
    const lastDay = new Date(y, today.getMonth() + 1, 0).getDate();
    const last = `${y}-${m}-${String(lastDay).padStart(2, "0")}`;
    setDateRange({ from: first, to: last });
  }, [visible, definition]);

  const runSourceMeta = useMemo(
    () => getReportDataSourceMeta(definition?.source ?? "trips"),
    [definition?.source]
  );

  const handleRun = async () => {
    if (!definition) return;
    const dateFrom = dateRange.from.trim();
    const dateTo = dateRange.to.trim();
    if (!dateFrom || !dateTo) {
      setError("Indica fecha desde y hasta.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const runNotify = notifyEnabled ? parseNotifyEmailsText(notifyRunEmailsText) : [];
      const subjRun = notifyEnabled
        ? notifyRunSubjectTemplate.trim().slice(0, NOTIFY_EMAIL_TEMPLATE_MAX_LEN)
        : "";
      const bodyRun = notifyEnabled
        ? normalizeNotifyEmailBodyHtml(notifyRunBodyHtml).slice(0, NOTIFY_EMAIL_TEMPLATE_MAX_LEN)
        : "";
      const companyId = requireActiveCompanyId();
      await createReportRunCallable({
        companyId,
        reportDefinitionId: definition.id,
        params: {
          dateFrom: dateFrom.trim(),
          dateTo: dateTo.trim(),
          trigger: "manual",
          outputFormat,
          ...(includeTopBlock ? {} : { includeTopBlock: false }),
          ...(includeFooter ? {} : { includeFooter: false }),
          ...(notifyEnabled ? {} : { notifyEnabled: false }),
          ...(runNotify.length ? { notifyEmails: runNotify } : {}),
          ...(subjRun ? { notifyEmailSubjectTemplate: subjRun } : {}),
          ...(bodyRun ? { notifyEmailBodyHtml: bodyRun } : {}),
        },
      });
      onSuccess();
      onHide();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al generar.");
    } finally {
      setSaving(false);
    }
  };

  if (!definition) return null;

  return (
    <DpContentSet
      title={`Ejecutar: ${definition.name}`}
      variant="dialog"
      visible={visible}
      onHide={onHide}
      onCancel={onHide}
      onSave={() => void handleRun()}
      saveLabel="Encolar reporte"
      saving={saving}
      showError={!!error}
      errorMessage={error ?? ""}
      dismissibleError
    >
      <div className="flex flex-col gap-3">
        <DpInput
          type="date-range"
          label="Periodo (desde/hasta)"
          value={dateRange}
          onChange={(v) => setDateRange(v)}
          placeholder="Seleccionar rango"
        />
        <DpInput
          type="select"
          label="Formato de salida"
          value={outputFormat}
          onChange={(v) => setOutputFormat(v === "pdf" ? "pdf" : "xlsx")}
          options={OUTPUT_FORMAT_OPTIONS}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeTopBlock}
            onChange={(e) => setIncludeTopBlock(e.target.checked)}
          />
          Incluir cabecera superior (topBlock)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeFooter}
            onChange={(e) => setIncludeFooter(e.target.checked)}
          />
          Incluir pie (footer)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={notifyEnabled}
            onChange={(e) => setNotifyEnabled(e.target.checked)}
          />
          Enviar correo al finalizar
        </label>

        {notifyEnabled ? (
          <>
            <DpInput
              type="input"
              label="Notificar también a (correos, opcional)"
              value={notifyRunEmailsText}
              onChange={(v) => setNotifyRunEmailsText(String(v))}
            />
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Los correos guardados en la definición del reporte también reciben el aviso si el servidor de correo
              está configurado (SMTP en Cloud Functions).
            </p>
            <DpInput
              type="input"
              label="Asunto del correo (opcional, solo esta ejecución)"
              value={notifyRunSubjectTemplate}
              onChange={(v) =>
                setNotifyRunSubjectTemplate(String(v).slice(0, NOTIFY_EMAIL_TEMPLATE_MAX_LEN))
              }
            />
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Muletillas:{" "}
              <code className="rounded bg-slate-200/80 px-1 dark:bg-slate-700/80">
                {reportNotifyTokensHelpInline()}
              </code>
            </p>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                Cuerpo del correo (opcional, solo esta ejecución)
              </span>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Si lo dejas vacío se usa el cuerpo de la definición. Mismas muletillas que el asunto.
              </p>
              <NotifyEmailBodyEditor
                value={notifyRunBodyHtml}
                onChange={(html) =>
                  setNotifyRunBodyHtml(html.slice(0, NOTIFY_EMAIL_TEMPLATE_MAX_LEN))
                }
                maxLength={NOTIFY_EMAIL_TEMPLATE_MAX_LEN}
                placeholder="Opcional: mensaje para esta corrida."
              />
            </div>
          </>
        ) : null}
        {runSourceMeta?.parameters?.some((p) => p.scope === "run") ? (
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Origen «{runSourceMeta.label}»: el rango de fechas acota los viajes incluidos en el conjunto de
            datos (equivalente a un filtro en la “consulta” del origen).
          </p>
        ) : null}
      </div>
    </DpContentSet>
  );
}
