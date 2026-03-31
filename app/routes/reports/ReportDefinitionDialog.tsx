import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import type { MenuItem } from "primereact/menuitem";
import { TabMenu } from "primereact/tabmenu";
import { DpContentSet } from "~/components/DpContent";
import { DpInput } from "~/components/DpInput";
import type {
  PivotOutputKind,
  ReportDataSource,
  ReportDefinitionFormValues,
  ReportDefinitionRecord,
  ReportFooterMode,
  ReportFooterSpec,
  ReportRowGranularity,
  ReportTopBlockMode,
  ReportTopBlockSpec,
} from "~/features/reports/reports.types";
import {
  defaultFooterForGranularity,
  defaultTopBlockForGranularity,
  getDefaultColumns,
} from "~/features/reports/report-columns.catalog";
import { footerHasMultiplyRow } from "~/features/reports/report-footer-normalize";
import {
  getReportDataSourceMeta,
  granularitySelectOptions,
  REPORT_DATA_SOURCES,
} from "~/features/reports/report-data-sources.catalog";
import {
  parseReportDefinitionYaml,
  serializeReportDefinitionFormToYaml,
} from "~/features/reports/report-definition-yaml";
import type { PreviewReportPivotResponse } from "~/features/reports/reports-callables.types";
import { reportNotifyTokensHelpInline } from "~/features/reports/report-notify-tokens";
import {
  addReportDefinition,
  columnFormRowsFromDefs,
  defaultPivotDetailFormState,
  defaultPivotFormState,
  formValuesFromDefinition,
  NOTIFY_EMAIL_TEMPLATE_MAX_LEN,
  previewReportPivotCallable,
  updateReportDefinition,
} from "~/features/reports/reports.service";
import NotifyEmailBodyEditor from "./NotifyEmailBodyEditor";
import ReportColumnsEditor from "./ReportColumnsEditor";
import ReportFooterRowsEditor from "./ReportFooterRowsEditor";
import ReportPivotShelves from "./ReportPivotShelves";
import ReportTopBlockRowsEditor from "./ReportTopBlockRowsEditor";

function FormSection({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-600 dark:bg-slate-900/35">
      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
      {hint ? <p className="mt-1 text-xs leading-snug text-slate-600 dark:text-slate-400">{hint}</p> : null}
      <div className="mt-3 flex flex-col gap-3">{children}</div>
    </section>
  );
}

const FOOTER_MODE_OPTIONS: { label: string; value: ReportFooterMode }[] = [
  { label: "Sin pie", value: "none" },
  { label: "Pie por filas (subtotal, IGV, totales, …)", value: "rows" },
];

const TOP_BLOCK_MODE_OPTIONS: { label: string; value: ReportTopBlockMode }[] = [
  { label: "Sin cabecera de bloque", value: "none" },
  { label: "Cabecera por filas (texto, sumas…)", value: "rows" },
];

const SCHEDULE_FREQ_OPTIONS = [
  { label: "Diario", value: "daily" },
  { label: "Semanal", value: "weekly" },
  { label: "Mensual", value: "monthly" },
];

function applyGranularityPreset(gran: ReportRowGranularity): Pick<
  ReportDefinitionFormValues,
  "rowGranularity" | "columns" | "footer" | "topBlock" | "includeSubtotalsIgft"
> {
  const footer = defaultFooterForGranularity(gran);
  const topBlock = defaultTopBlockForGranularity(gran);
  return {
    rowGranularity: gran,
    columns: columnFormRowsFromDefs(getDefaultColumns(gran), gran),
    topBlock,
    footer,
    includeSubtotalsIgft: footerHasMultiplyRow(footer),
  };
}

function normalizeFooterForMode(
  mode: ReportFooterMode,
  gran: ReportRowGranularity,
  prev: ReportFooterSpec
): ReportFooterSpec {
  if (mode === "none") return { mode: "none" };
  if (mode === "rows") {
    if (prev.mode === "rows" && prev.rows && prev.rows.length > 0) {
      return { mode: "rows", rows: prev.rows };
    }
    return defaultFooterForGranularity(gran);
  }
  return { mode: "none" };
}

function normalizeTopBlockForMode(
  mode: ReportTopBlockMode,
  gran: ReportRowGranularity,
  prev: ReportTopBlockSpec
): ReportTopBlockSpec {
  if (mode === "none") return { mode: "none" };
  if (mode === "rows") {
    if (prev.mode === "rows" && prev.rows && prev.rows.length > 0) {
      return { mode: "rows", rows: prev.rows };
    }
    return defaultTopBlockForGranularity(gran);
  }
  return { mode: "none" };
}

export interface ReportDefinitionDialogProps {
  visible: boolean;
  editing: ReportDefinitionRecord | null;
  onHide: () => void;
  onSuccess: () => void;
}

export default function ReportDefinitionDialog({
  visible,
  editing,
  onHide,
  onSuccess,
}: ReportDefinitionDialogProps) {
  const [values, setValues] = useState<ReportDefinitionFormValues>(() => formValuesFromDefinition(null));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const yamlFileInputRef = useRef<HTMLInputElement>(null);
  const [previewFrom, setPreviewFrom] = useState("");
  const [previewTo, setPreviewTo] = useState("");
  const [previewBusy, setPreviewBusy] = useState(false);
  const [previewHint, setPreviewHint] = useState<string | null>(null);
  const [previewResult, setPreviewResult] = useState<PreviewReportPivotResponse | null>(null);
  const [activeTabIndex, setActiveTabIndex] = useState(0);

  const sourceMeta = useMemo(() => getReportDataSourceMeta(values.source), [values.source]);
  const granularityOptions = useMemo(
    () => granularitySelectOptions(values.source),
    [values.source]
  );
  const sourceOptions = useMemo(
    () => REPORT_DATA_SOURCES.map((s) => ({ label: s.label, value: s.id })),
    []
  );

  useEffect(() => {
    if (!visible) return;
    setActiveTabIndex(0);
    setValues(formValuesFromDefinition(editing));
    setError(null);
    setPreviewResult(null);
    setPreviewHint(null);
    const d = new Date();
    const to = d.toISOString().slice(0, 10);
    const from = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
    setPreviewFrom(from);
    setPreviewTo(to);
  }, [visible, editing]);

  const title = editing ? "Editar definición de reporte" : "Nueva definición de reporte";

  const handleSave = async () => {
    if (!values.name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await updateReportDefinition(editing.id, values);
      } else {
        await addReportDefinition(values);
      }
      onSuccess();
      onHide();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const setGranularity = (gran: ReportRowGranularity) => {
    setValues((s) => {
      if (s.pivot.outputKind === "aggregate") {
        return { ...s, rowGranularity: gran, pivot: defaultPivotFormState(gran) };
      }
      return {
        ...s,
        ...applyGranularityPreset(gran),
        pivot: { ...defaultPivotDetailFormState() },
      };
    });
  };

  const handlePivotOutputKindChange = (od: PivotOutputKind) => {
    setValues((s) => {
      if (od === "detail") {
        return {
          ...s,
          ...applyGranularityPreset(s.rowGranularity),
          pivot: { ...defaultPivotDetailFormState() },
        };
      }
      return {
        ...s,
        pivot: defaultPivotFormState(s.rowGranularity),
        footer: { mode: "none" },
        includeSubtotalsIgft: false,
      };
    });
  };

  const runPivotPreview = async () => {
    if (!editing?.id) return;
    const df = previewFrom.trim();
    const dt = previewTo.trim();
    if (!df || !dt) {
      setPreviewHint("Indicá fecha desde y hasta.");
      return;
    }
    setPreviewBusy(true);
    setPreviewHint(
      "Vista previa (solo resumen pivot): usa la definición guardada en el servidor. Guardá cambios antes de previsualizar."
    );
    try {
      const r = await previewReportPivotCallable({
        reportDefinitionId: editing.id,
        params: { dateFrom: df, dateTo: dt },
      });
      setPreviewResult(r);
    } catch (e) {
      setPreviewResult(null);
      setError(e instanceof Error ? e.message : "Error en vista previa.");
    } finally {
      setPreviewBusy(false);
    }
  };

  const exportYamlFileName = () => {
    const base = values.name
      .trim()
      .replace(/[^\w\u00C0-\u024f-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);
    return `${base || "definicion-reporte"}.yml`;
  };

  const handleExportYaml = () => {
    const text = serializeReportDefinitionFormToYaml(values);
    const blob = new Blob([text], { type: "text/yaml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = exportYamlFileName();
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePickYamlFile = () => yamlFileInputRef.current?.click();

  const handleYamlFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      const parsed = parseReportDefinitionYaml(text);
      if (parsed.ok) {
        setValues(parsed.values);
        setError(null);
      } else {
        setError(parsed.error);
      }
    };
    reader.onerror = () => setError("No se pudo leer el archivo.");
    reader.readAsText(file, "UTF-8");
  };

  const reportDefinitionDialogTabs = useMemo<MenuItem[]>(
    () => [
      { label: "General" },
      { label: "Datos" },
      { label: "Diseño" },
      { label: "Presentación" },
      { label: "Correo y programación" },
    ],
    []
  );

  return (
    <DpContentSet
      title={title}
      variant="dialog"
      visible={visible}
      onHide={onHide}
      onCancel={onHide}
      onSave={() => void handleSave()}
      saving={saving}
      showError={!!error}
      errorMessage={error ?? ""}
      dismissibleError
      dialogWidth="min(72rem, 96vw)"
      dialogBodyHeader={
        <TabMenu
          className="w-full [&_.p-tabmenu-nav]:flex-wrap"
          model={reportDefinitionDialogTabs}
          activeIndex={activeTabIndex}
          onTabChange={(e) => setActiveTabIndex(e.index)}
        />
      }
    >
      <>
        {activeTabIndex === 0 ? (
          <div className="flex flex-col gap-4 pt-1">
            <DpInput
              type="input"
              label="Nombre"
              value={values.name}
              onChange={(v) => setValues((s) => ({ ...s, name: String(v) }))}
            />

            <DpInput
              type="select"
              label="Salida del informe"
              value={values.pivot.outputKind}
              onChange={(v) => handlePivotOutputKindChange(v === "aggregate" ? "aggregate" : "detail")}
              options={[
                { label: "Detalle (lista de filas)", value: "detail" },
                { label: "Resumen (tabla dinámica / estantes)", value: "aggregate" },
              ]}
            />

            <div className="flex flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-white/80 px-3 py-2 dark:border-slate-600 dark:bg-slate-950/30">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">YAML (schema v1)</span>
              <button
                type="button"
                className="rounded border border-slate-300 px-2 py-1 text-xs font-medium dark:border-slate-600"
                onClick={handleExportYaml}
              >
                Exportar .yml
              </button>
              <button
                type="button"
                className="rounded border border-slate-300 px-2 py-1 text-xs font-medium dark:border-slate-600"
                onClick={handlePickYamlFile}
              >
                Importar YAML…
              </button>
              <input
                ref={yamlFileInputRef}
                type="file"
                accept=".yml,.yaml,text/yaml,text/x-yaml,application/x-yaml"
                className="hidden"
                onChange={handleYamlFileChange}
              />
            </div>
          </div>
        ) : null}
        {activeTabIndex === 1 ? (
          <div className="flex flex-col gap-4 pt-1">
        <FormSection
          title="1. Origen de datos"
          hint={
            sourceMeta?.description ??
            "Define qué conjunto de filas se materializa en el servidor antes de exportar. Más adelante podrás enlazar filtros tipo consulta."
          }
        >
          <DpInput
            type="select"
            label="Origen"
            value={values.source}
            onChange={(v) => {
              const id = String(v);
              if (REPORT_DATA_SOURCES.some((s) => s.id === id)) {
                setValues((s) => ({ ...s, source: id as ReportDataSource }));
              }
            }}
            options={sourceOptions}
            disabled={sourceOptions.length <= 1}
          />
          {sourceMeta?.parameters?.length ? (
            <div className="rounded-md border border-dashed border-slate-300 bg-white/80 px-3 py-2 text-xs text-slate-600 dark:border-slate-600 dark:bg-slate-950/40 dark:text-slate-400">
              <p className="font-medium text-slate-700 dark:text-slate-300">Parámetros en la ejecución</p>
              <ul className="mt-1 list-inside list-disc space-y-0.5">
                {sourceMeta.parameters.map((p) => (
                  <li key={p.id}>
                    <span className="font-medium">{p.label}</span>
                    {p.description ? ` — ${p.description}` : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <DpInput
            type="select"
            label="Granularidad (filas del conjunto)"
            value={values.rowGranularity}
            onChange={(v) => {
              const gran = v === "perAssignment" ? "perAssignment" : "perTrip";
              setGranularity(gran);
            }}
            options={granularityOptions}
          />
          {sourceMeta?.granularities?.find((g) => g.id === values.rowGranularity)?.description ? (
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {sourceMeta.granularities.find((g) => g.id === values.rowGranularity)?.description}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded border border-slate-300 px-2 py-1 text-xs font-medium dark:border-slate-600"
              onClick={() => setGranularity("perTrip")}
            >
              Preset ejemplo DD (por viaje + pie IGV)
            </button>
            <button
              type="button"
              className="rounded border border-slate-300 px-2 py-1 text-xs font-medium dark:border-slate-600"
              onClick={() => setGranularity("perAssignment")}
            >
              Preset ejemplo RA (por asignación + total columna)
            </button>
          </div>
        </FormSection>
          </div>
        ) : null}
        {activeTabIndex === 2 ? (
          <div className="flex flex-col gap-4 pt-1">
        {values.pivot.outputKind === "detail" ? (
          <FormSection
            title="2. Columnas del Excel"
            hint="Misma idea que el constructor pivot: campos a la izquierda, arrastrá al estante derecho; encabezado y ancho por columna. Debajo, filtros opcionales sobre las filas materializadas."
          >
            <ReportColumnsEditor
              granularity={values.rowGranularity}
              value={values.columns}
              onChange={(columns) => setValues((s) => ({ ...s, columns }))}
            />
            <ReportPivotShelves
              variant="filtersOnly"
              granularity={values.rowGranularity}
              value={values.pivot}
              onChange={(pivot) =>
                setValues((s) => ({ ...s, pivot: { ...pivot, outputKind: "detail" } }))
              }
            />
          </FormSection>
        ) : (
          <FormSection
            title="2. Constructor pivot"
            hint="Arrastrá dimensiones y medidas a los estantes. El Excel exportado será la tabla agregada resultante."
          >
            <ReportPivotShelves
              granularity={values.rowGranularity}
              value={values.pivot}
              onChange={(pivot) => setValues((s) => ({ ...s, pivot }))}
            />
          </FormSection>
        )}

        {editing?.id && values.pivot.outputKind === "aggregate" ? (
          <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-600 dark:bg-slate-950/40">
            <p className="text-xs font-medium text-slate-700 dark:text-slate-200">Vista previa (acotada, solo pivot)</p>
            {previewHint ? (
              <p className="text-[11px] text-amber-800 dark:text-amber-200/90">{previewHint}</p>
            ) : null}
            <div className="flex flex-wrap items-end gap-2">
              <DpInput
                type="date"
                label="Desde"
                value={previewFrom}
                onChange={(v) => setPreviewFrom(String(v))}
              />
              <DpInput
                type="date"
                label="Hasta"
                value={previewTo}
                onChange={(v) => setPreviewTo(String(v))}
              />
              <button
                type="button"
                disabled={previewBusy}
                className="rounded border border-slate-300 px-3 py-2 text-xs font-medium disabled:opacity-50 dark:border-slate-600"
                onClick={() => void runPivotPreview()}
              >
                {previewBusy ? "Cargando…" : "Generar vista previa"}
              </button>
            </div>
            {previewResult ? (
              <div className="max-h-56 overflow-auto text-xs">
                <p className="mb-1 text-slate-600 dark:text-slate-400">
                  Filas entrada: {previewResult.inputRowCount}
                  {previewResult.truncatedInput ? " (muestra acotada)" : ""} · Salida:{" "}
                  {previewResult.outputRowCount}
                  {previewResult.truncatedOutput ? " (máx. 500 filas)" : ""}
                </p>
                <table className="min-w-full border-collapse border border-slate-200 dark:border-slate-600">
                  <thead>
                    <tr>
                      {previewResult.columns.map((c) => (
                        <th
                          key={c.field}
                          className="border border-slate-200 bg-slate-100 px-2 py-1 text-left dark:border-slate-600 dark:bg-slate-800"
                        >
                          {c.header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewResult.rows.map((row, ri) => (
                      <tr key={ri}>
                        {previewResult.columns.map((c) => (
                          <td key={c.field} className="border border-slate-200 px-2 py-1 dark:border-slate-600">
                            {row[c.field] == null ? "" : String(row[c.field])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        ) : editing?.id && values.pivot.outputKind === "detail" ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            La vista previa solo está disponible en salida «Resumen (tabla dinámica)».
          </p>
        ) : (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Guardá la definición para habilitar la vista previa en modo resumen.
          </p>
        )}
          </div>
        ) : null}
        {activeTabIndex === 3 ? (
          <div className="flex flex-col gap-4 pt-1">
        <FormSection
          title="3. Presentación y pie"
          hint="Título resuelto, nombre de archivo, cabecera superior y pie."
        >
          <DpInput
            type="input"
            label="Plantilla del título resuelto (obligatorio)"
            value={values.exportTitleTemplate}
            onChange={(v) => setValues((s) => ({ ...s, exportTitleTemplate: String(v) }))}
          />
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Muletillas:{" "}
            <code className="rounded bg-slate-200/80 px-1 dark:bg-slate-700/80">
              {"{year} {month} {day} {dateFrom} {dateTo} {period} {periodCompact} {seq} {granularity} {definitionName} {exportTag}"}
            </code>
          </p>

          <DpInput
            type="input"
            label="Plantilla del nombre de archivo (sin extensión, obligatorio)"
            value={values.exportFileNameTemplate}
            onChange={(v) => setValues((s) => ({ ...s, exportFileNameTemplate: String(v) }))}
          />
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Se sanitiza para descarga y Storage (caracteres inválidos se reemplazan).
          </p>

          <DpInput
            type="input"
            label="Etiqueta de exportación (opcional)"
            value={values.exportTag}
            onChange={(v) => setValues((s) => ({ ...s, exportTag: String(v) }))}
          />

          <DpInput
            type="select"
            label="Cabecera superior (sobre los títulos de columnas)"
            value={values.topBlock.mode === "rows" ? "rows" : "none"}
            onChange={(v) => {
              const mode = (v === "rows" ? "rows" : "none") as ReportTopBlockMode;
              setValues((s) => ({
                ...s,
                topBlock: normalizeTopBlockForMode(mode, s.rowGranularity, s.topBlock),
              }));
            }}
            options={TOP_BLOCK_MODE_OPTIONS}
          />

          {values.topBlock.mode === "rows" ? (
            <ReportTopBlockRowsEditor
              granularity={values.rowGranularity}
              columns={values.columns}
              topBlock={values.topBlock}
              onChange={(topBlock) => setValues((s) => ({ ...s, topBlock }))}
            />
          ) : null}

          <DpInput
            type="select"
            label="Pie de tabla"
            value={values.footer.mode === "rows" ? "rows" : "none"}
            onChange={(v) => {
              const mode = (v === "rows" ? "rows" : "none") as ReportFooterMode;
              setValues((s) => {
                const footer = normalizeFooterForMode(mode, s.rowGranularity, s.footer);
                return {
                  ...s,
                  footer,
                  includeSubtotalsIgft: footerHasMultiplyRow(footer),
                };
              });
            }}
            options={FOOTER_MODE_OPTIONS}
            disabled={values.pivot.outputKind !== "detail"}
          />

          {values.pivot.outputKind === "detail" && values.footer.mode === "rows" ? (
            <ReportFooterRowsEditor
              granularity={values.rowGranularity}
              columns={values.columns}
              footer={values.footer}
              onChange={(footer: ReportFooterSpec) =>
                setValues((s) => ({
                  ...s,
                  footer,
                  includeSubtotalsIgft: footerHasMultiplyRow(footer),
                }))
              }
            />
          ) : null}
        </FormSection>
          </div>
        ) : null}
        {activeTabIndex === 4 ? (
          <div className="flex flex-col gap-4 pt-1">
        <FormSection
          title="4. Notificación al completar"
          hint="Correos que recibirán un enlace de descarga (y adjunto si el archivo es pequeño) cuando una corrida termine en estado listo. Requiere variables SMTP en Cloud Functions."
        >
          <DpInput
            type="input"
            label="Correos (separados por coma, espacio o punto y coma)"
            value={values.notifyEmailsText}
            onChange={(v) => setValues((s) => ({ ...s, notifyEmailsText: String(v) }))}
          />
          <DpInput
            type="input"
            label="Asunto del correo (opcional)"
            value={values.notifyEmailSubjectTemplate}
            onChange={(v) =>
              setValues((s) => ({ ...s, notifyEmailSubjectTemplate: String(v).slice(0, NOTIFY_EMAIL_TEMPLATE_MAX_LEN) }))
            }
          />
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Muletillas en asunto y cuerpo:{" "}
            <code className="rounded bg-slate-200/80 px-1 dark:bg-slate-700/80">
              {reportNotifyTokensHelpInline()}
            </code>
          </p>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
              Cuerpo del correo (opcional)
            </span>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Editor visual; se guarda como HTML para el envío SMTP (mismas muletillas que el asunto).
            </p>
            <NotifyEmailBodyEditor
              value={values.notifyEmailBodyHtml}
              onChange={(html) =>
                setValues((s) => ({
                  ...s,
                  notifyEmailBodyHtml: html.slice(0, NOTIFY_EMAIL_TEMPLATE_MAX_LEN),
                }))
              }
              maxLength={NOTIFY_EMAIL_TEMPLATE_MAX_LEN}
              placeholder="Escribe el mensaje o inserta muletillas con los botones de abajo."
            />
          </div>
        </FormSection>

        <div className="border-t border-slate-200 pt-3 dark:border-slate-700">
          <label className="mb-2 flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={values.scheduleEnabled}
              onChange={(e) => setValues((s) => ({ ...s, scheduleEnabled: e.target.checked }))}
            />
            Programación automática (requiere Cloud Scheduler en GCP)
          </label>
          {values.scheduleEnabled && (
            <div className="mt-2 flex flex-col gap-2">
              <DpInput
                type="select"
                label="Frecuencia"
                value={values.scheduleFrequency}
                onChange={(v) =>
                  setValues((s) => ({
                    ...s,
                    scheduleFrequency: v === "weekly" || v === "monthly" ? v : "daily",
                  }))
                }
                options={SCHEDULE_FREQ_OPTIONS}
              />
              <DpInput
                type="input"
                label="Hora (HH:mm)"
                value={values.scheduleTimeLocal}
                onChange={(v) => setValues((s) => ({ ...s, scheduleTimeLocal: String(v) }))}
              />
              <DpInput
                type="input"
                label="Zona horaria"
                value={values.scheduleTimeZone}
                onChange={(v) => setValues((s) => ({ ...s, scheduleTimeZone: String(v) }))}
              />
            </div>
          )}
        </div>
          </div>
        ) : null}
      </>
    </DpContentSet>
  );
}
