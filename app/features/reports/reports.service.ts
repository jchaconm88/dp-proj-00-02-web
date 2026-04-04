import {
  collection,
  doc,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  deleteField,
  type Timestamp,
} from "firebase/firestore";
import {
  getCollectionWithMultiFilter,
  addDocument,
  updateDocument,
  deleteDocument,
} from "~/lib/firestore.service";
import { db } from "~/lib/firebase";
import { callHttpsFunction } from "~/lib/functions.service";
import {
  requireActiveCompanyId,
  resolveActiveAccountId,
  documentMatchesActiveTenant,
} from "~/lib/tenant";
import type {
  PivotMeasureAgg,
  PivotOutputKind,
  ReportColumnDef,
  ReportColumnFormRow,
  ReportDefinitionFormValues,
  ReportDefinitionRecord,
  ReportFooterSpec,
  ReportLayoutKind,
  ReportOutputFormat,
  ReportPivotAxisSlot,
  ReportPivotFilterClause,
  ReportPivotFilterFormRow,
  ReportPivotFormState,
  ReportPivotSpec,
  ReportPivotValueSlot,
  ReportRowGranularity,
  ReportRunRecord,
  ReportTemplateId,
  ReportTopBlockRowSpec,
  ReportTopBlockSpec,
} from "./reports.types";
import {
  columnsFromLegacyLayout,
  defaultFooterForGranularity,
  defaultTopBlockForGranularity,
  getDefaultColumns,
} from "./report-columns.catalog";
import {
  footerHasMultiplyRow,
  normalizeFooterToRowsForm,
  persistableFooter,
  persistableTopBlock,
  REPORT_TOP_RESOLVED_TITLE_TOKEN,
  validateFooterRows,
  validateTopBlockRows,
} from "./report-footer-normalize";
import {
  getBindingIdForOutputKey,
  getTripBindingById,
  getTripBindingsForGranularity,
  inferPivotRole,
  pivotAggAllowed,
  validateTripReportColumns,
} from "./report-trips-bindings.catalog";
import type {
  CreateReportRunRequest,
  CreateReportRunResponse,
  GetReportRunDownloadUrlRequest,
  GetReportRunDownloadUrlResponse,
  PreviewReportPivotRequest,
  PreviewReportPivotResponse,
} from "./reports-callables.types";

const COL_DEF = "report-definitions";
const COL_RUN = "report-runs";

function periodLabelFromRange(dateFrom: string, dateTo: string): string {
  const a = String(dateFrom).slice(0, 7).replace(/-/g, "");
  const b = String(dateTo).slice(0, 7).replace(/-/g, "");
  if (!a || !b) return "";
  return a === b ? a : `${a}-${b}`;
}

function inferLegacyExportFileNameTemplate(
  row: ReportDefinitionRecord | null,
  granularity: ReportRowGranularity
): string {
  const tag = String(row?.exportTag ?? "").trim();
  // Replica la lógica antigua del backend: `${tag}-${YYYYMM}-${seq}` o `DD/RA-${YYYYMM}-${seq}`.
  const prefix = tag || (granularity === "perAssignment" ? "RA" : "DD");
  return `${prefix}-{periodCompact}-{seq}`;
}

function inferLegacyExportTitleTemplate(row: ReportDefinitionRecord | null, granularity: ReportRowGranularity): string {
  const headerTitle = String(row?.header?.reportTitle ?? "").trim();
  if (headerTitle) {
    return `${headerTitle} {exportTag}`.trim();
  }
  // Default UI-only (legacy backend tenía defaults internos)
  const base = granularity === "perAssignment" ? "REPORTE DE APOYO" : "DESPACHO DOMICILIO";
  return `${base} {period} {seq}`.trim();
}

function newFormRowId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `r-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function recordRowGranularity(doc: Record<string, unknown>): ReportRowGranularity {
  const g = String(doc.rowGranularity ?? "").trim();
  if (g === "perAssignment") return "perAssignment";
  if (g === "perTrip") return "perTrip";
  return doc.templateId === "ra-reporte-apoyo" ? "perAssignment" : "perTrip";
}

/** Granularidad efectiva de una definición ya tipada (Firestore o estado UI). */
export function resolveDefinitionGranularity(row: ReportDefinitionRecord | null): ReportRowGranularity {
  if (!row) return "perTrip";
  if (row.rowGranularity === "perAssignment" || row.rowGranularity === "perTrip") {
    return row.rowGranularity;
  }
  return row.templateId === "ra-reporte-apoyo" ? "perAssignment" : "perTrip";
}

/** Pie que aplicará el backend si no se sobreescribe en la ejecución. */
export function effectiveFooterForDefinition(row: ReportDefinitionRecord): ReportFooterSpec {
  return inferFooter(row, resolveDefinitionGranularity(row));
}

function inferFooter(row: ReportDefinitionRecord | null, gran: ReportRowGranularity): ReportFooterSpec {
  if (row?.footer && typeof row.footer === "object" && row.footer.mode) {
    return normalizeFooterToRowsForm(row.footer as ReportFooterSpec);
  }
  if (gran === "perTrip") {
    return row?.includeSubtotalsIgft === false ? { mode: "none" } : defaultFooterForGranularity("perTrip");
  }
  return defaultFooterForGranularity("perAssignment");
}

function columnsToFormRows(cols: ReportColumnDef[], gran: ReportRowGranularity): ReportColumnFormRow[] {
  return cols.map((c) => ({
    rowId: newFormRowId(),
    field: c.field,
    header: c.header,
    width: c.width != null && c.width > 0 ? String(c.width) : "",
    bindingId: c.bindingId?.trim() || getBindingIdForOutputKey(c.field, gran),
  }));
}

function normalizeColumnFromDoc(raw: unknown, gran: ReportRowGranularity): ReportColumnDef | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const field = String(o.field ?? "").trim();
  if (!field) return null;
  const header = String(o.header ?? "").trim();
  const width = Number(o.width);
  const bindingRaw = o.bindingId;
  const bindingId =
    typeof bindingRaw === "string" && bindingRaw.trim()
      ? bindingRaw.trim()
      : getBindingIdForOutputKey(field, gran);
  const col: ReportColumnDef = {
    field,
    header,
    width: Number.isFinite(width) && width > 0 ? width : undefined,
  };
  if (bindingId) col.bindingId = bindingId;
  return col;
}

function resolveColumnsForRecord(row: ReportDefinitionRecord | null, gran: ReportRowGranularity): ReportColumnDef[] {
  if (row?.columns && row.columns.length > 0) {
    return row.columns;
  }
  return columnsFromLegacyLayout(gran, row?.columnLayout);
}

const PIVOT_FILTER_OPS = new Set<string>(["eq", "ne", "in", "nin"]);

function parseTopBlockRowFromDoc(raw: unknown): ReportTopBlockRowSpec | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const rowId = String(o.rowId ?? "").trim();
  const op = String(o.op ?? "").trim();
  if (!rowId || !op) return null;
  if (op === "staticText") {
    return {
      rowId,
      label: String(o.label ?? ""),
      op: "staticText",
      valueText: String(o.valueText ?? ""),
    };
  }
  const label = String(o.label ?? "").trim();
  if (!label) return null;
  if (op === "sumColumn") {
    const sourceField = String(o.sourceField ?? "").trim();
    if (!sourceField) return null;
    return { rowId, label, op: "sumColumn", sourceField };
  }
  if (op === "multiplyFooter") {
    const refRowId = String(o.refRowId ?? "").trim();
    const factor = Number(o.factor);
    if (!refRowId || !Number.isFinite(factor)) return null;
    return { rowId, label, op: "multiplyFooter", refRowId, factor };
  }
  if (op === "sumFooterRefs") {
    const refRowIds = Array.isArray(o.refRowIds)
      ? o.refRowIds.map((x) => String(x ?? "").trim()).filter(Boolean)
      : [];
    if (refRowIds.length === 0) return null;
    return { rowId, label, op: "sumFooterRefs", refRowIds };
  }
  return null;
}

function parseTopBlockFromDoc(raw: unknown): ReportTopBlockSpec | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const mode = String(o.mode ?? "").trim();
  if (mode === "none") return { mode: "none" };
  if (mode !== "rows" || !Array.isArray(o.rows)) return undefined;
  // mode === "rows" pero sin filas válidas: tratar como ausente (migración desde header)
  const rows: ReportTopBlockRowSpec[] = [];
  for (const x of o.rows) {
    const r = parseTopBlockRowFromDoc(x);
    if (r) rows.push(r);
  }
  if (rows.length === 0) return undefined;
  return { mode: "rows", rows };
}

function inferTopBlockFromLegacyHeader(
  row: ReportDefinitionRecord | null,
  gran: ReportRowGranularity
): ReportTopBlockSpec {
  const h = row?.header ?? {};
  const cn = String(h.companyName ?? "").trim();
  const rucRaw = String(h.companyRuc ?? "").trim();
  const rt = String(h.reportTitle ?? "").trim();
  const rucLine = rucRaw ? (rucRaw.toUpperCase().startsWith("RUC:") ? rucRaw : `RUC: ${rucRaw}`) : "";
  const hasHeaderText = Boolean(cn || rucLine || rt);
  if (!hasHeaderText) {
    return defaultTopBlockForGranularity(gran);
  }
  if (gran === "perAssignment") {
    return {
      mode: "rows",
      rows: [
        {
          rowId: newFormRowId(),
          label: "",
          op: "staticText",
          valueText: rt || REPORT_TOP_RESOLVED_TITLE_TOKEN,
        },
      ],
    };
  }
  return {
    mode: "rows",
    rows: [
      { rowId: newFormRowId(), label: "", op: "staticText", valueText: cn },
      { rowId: newFormRowId(), label: "", op: "staticText", valueText: rucLine },
      {
        rowId: newFormRowId(),
        label: "",
        op: "staticText",
        valueText: rt || REPORT_TOP_RESOLVED_TITLE_TOKEN,
      },
    ],
  };
}

function topBlockFromRecord(row: ReportDefinitionRecord | null, gran: ReportRowGranularity): ReportTopBlockSpec {
  const parsed = row?.topBlock;
  if (parsed && typeof parsed === "object") {
    if (parsed.mode === "none") return { mode: "none" };
    if (parsed.mode === "rows" && parsed.rows?.length) {
      return { mode: "rows", rows: parsed.rows };
    }
  }
  return inferTopBlockFromLegacyHeader(row, gran);
}

function allowedPivotRowFieldKeys(gran: ReportRowGranularity): Set<string> {
  return new Set(getTripBindingsForGranularity(gran).map((b) => b.outputKey));
}

function parsePivotAxisSlot(raw: unknown, gran: ReportRowGranularity): ReportPivotAxisSlot | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const bindingId = String(o.bindingId ?? "").trim();
  const field = String(o.field ?? "").trim();
  if (!bindingId || !field) return null;
  const meta = getTripBindingById(bindingId);
  if (!meta || !meta.granularities.includes(gran) || meta.outputKey !== field) return null;
  const label = String(o.label ?? "").trim();
  const slot: ReportPivotAxisSlot = { bindingId, field };
  if (label) slot.label = label;
  return slot;
}

function parsePivotValueSlot(raw: unknown, gran: ReportRowGranularity): ReportPivotValueSlot | null {
  const axis = parsePivotAxisSlot(raw, gran);
  if (!axis) return null;
  const o = raw as Record<string, unknown>;
  const agg = String(o.agg ?? "sum").trim();
  const allowed: PivotMeasureAgg[] = ["sum", "count", "avg", "min", "max"];
  if (!allowed.includes(agg as PivotMeasureAgg)) return null;
  const meta = getTripBindingById(axis.bindingId);
  if (!meta || !pivotAggAllowed(agg as PivotMeasureAgg, meta, gran)) return null;
  return { ...axis, agg: agg as PivotMeasureAgg };
}

function parsePivotFilterArray(raw: unknown, gran: ReportRowGranularity): ReportPivotFilterClause[] {
  if (!Array.isArray(raw)) return [];
  const allowed = allowedPivotRowFieldKeys(gran);
  const out: ReportPivotFilterClause[] = [];
  for (const c of raw) {
    if (!c || typeof c !== "object") continue;
    const o = c as Record<string, unknown>;
    const field = String(o.field ?? "").trim();
    const op = String(o.op ?? "").trim();
    if (!allowed.has(field) || !PIVOT_FILTER_OPS.has(op)) continue;
    const vals = Array.isArray(o.values)
      ? o.values.map((x) => String(x ?? "").trim()).filter(Boolean)
      : [];
    if (vals.length === 0) continue;
    if (op === "eq" || op === "ne") {
      out.push({ field, op: op as ReportPivotFilterClause["op"], values: [vals[0]!] });
    } else {
      out.push({ field, op: op as ReportPivotFilterClause["op"], values: vals });
    }
  }
  return out;
}

function parsePivotSpecFromDoc(raw: unknown, gran: ReportRowGranularity): ReportPivotSpec | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const okRaw = String(o.outputKind ?? "").trim();
  const explicitOutput: PivotOutputKind | undefined =
    okRaw === "detail" ? "detail" : okRaw === "aggregate" ? "aggregate" : undefined;
  const filters = parsePivotFilterArray(o.filters, gran);
  const rows: ReportPivotAxisSlot[] = [];
  const cols: ReportPivotAxisSlot[] = [];
  const values: ReportPivotValueSlot[] = [];
  if (Array.isArray(o.rows)) {
    for (const x of o.rows) {
      const s = parsePivotAxisSlot(x, gran);
      if (s) rows.push(s);
    }
  }
  if (Array.isArray(o.columns)) {
    for (const x of o.columns) {
      const s = parsePivotAxisSlot(x, gran);
      if (s) cols.push(s);
    }
  }
  if (Array.isArray(o.values)) {
    for (const x of o.values) {
      const s = parsePivotValueSlot(x, gran);
      if (s) values.push(s);
    }
  }
  if (explicitOutput === "detail") {
    return { outputKind: "detail", filters, rows, columns: cols, values };
  }
  if (values.length === 0) return undefined;
  const spec: ReportPivotSpec = { filters, rows, columns: cols, values };
  if (explicitOutput === "aggregate") spec.outputKind = "aggregate";
  return spec;
}

function recordLayoutKind(doc: Record<string, unknown>): ReportLayoutKind {
  return String(doc.layoutKind ?? "").trim() === "pivot" ? "pivot" : "tabular";
}

/** Estantes vacíos; exportación usa `columns` del formulario (modo detalle). */
export function defaultPivotDetailFormState(): ReportPivotFormState {
  return {
    outputKind: "detail",
    filterRows: [],
    rows: [],
    columns: [],
    values: [],
  };
}

export function defaultPivotFormState(gran: ReportRowGranularity): ReportPivotFormState {
  const defaultBindingId =
    gran === "perAssignment" ? "assignment.charges.lineTotal" : "trip.charges.sumAmount";
  const meta = getTripBindingById(defaultBindingId);
  const b = meta ?? getTripBindingsForGranularity(gran).find((x) => inferPivotRole(x, gran) === "measure");
  const slot = b
    ? {
        slotId: newFormRowId(),
        bindingId: b.id,
        field: b.outputKey,
        label: b.defaultHeader,
        agg: "sum" as const,
      }
    : {
        slotId: newFormRowId(),
        bindingId: "trip.charges.sumAmount",
        field: "total",
        label: "TOTAL",
        agg: "sum" as const,
      };
  return {
    outputKind: "aggregate",
    filterRows: [],
    rows: [],
    columns: [],
    values: [slot],
  };
}

function pivotFilterFormRowsFromSpec(spec: ReportPivotSpec | undefined): ReportPivotFilterFormRow[] {
  if (!spec?.filters?.length) return [];
  return spec.filters.map((c) => ({
    rowId: newFormRowId(),
    field: c.field,
    op: c.op,
    valuesText: c.values.join(", "),
  }));
}

function shelfFromAxis(s: ReportPivotAxisSlot): ReportPivotFormState["rows"][0] {
  const m = getTripBindingById(s.bindingId);
  return {
    slotId: newFormRowId(),
    bindingId: s.bindingId,
    field: s.field,
    label: (s.label?.trim() || m?.defaultHeader || s.field).trim(),
  };
}

function pivotFormFromRecord(row: ReportDefinitionRecord | null, gran: ReportRowGranularity): ReportPivotFormState {
  if (row == null) {
    return defaultPivotDetailFormState();
  }
  const legacyTabular = row.layoutKind !== "pivot";
  if (legacyTabular) {
    return defaultPivotDetailFormState();
  }
  const spec = row?.pivotSpec;
  const isDetail = spec?.outputKind === "detail";
  if (isDetail) {
    return {
      outputKind: "detail",
      filterRows: pivotFilterFormRowsFromSpec(spec),
      rows: (spec?.rows ?? []).map(shelfFromAxis),
      columns: (spec?.columns ?? []).map(shelfFromAxis),
      values: (spec?.values ?? []).map((v) => ({
        ...shelfFromAxis(v),
        agg: v.agg,
      })),
    };
  }
  if (!spec || !spec.values?.length) {
    return defaultPivotFormState(gran);
  }
  return {
    outputKind: "aggregate",
    filterRows: pivotFilterFormRowsFromSpec(spec),
    rows: spec.rows.map(shelfFromAxis),
    columns: spec.columns.map(shelfFromAxis),
    values: spec.values.map((v) => ({
      ...shelfFromAxis(v),
      agg: v.agg,
    })),
  };
}

function pivotFiltersFromPivotFormRows(rows: ReportPivotFilterFormRow[], gran: ReportRowGranularity): ReportPivotFilterClause[] {
  const allowed = allowedPivotRowFieldKeys(gran);
  const clauses: ReportPivotFilterClause[] = [];
  for (const r of rows) {
    if (!allowed.has(r.field.trim())) continue;
    const parts = r.valuesText
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) continue;
    const op = r.op;
    if (op === "eq" || op === "ne") {
      clauses.push({ field: r.field.trim(), op, values: [parts[0]!] });
    } else {
      clauses.push({ field: r.field.trim(), op, values: parts });
    }
  }
  return clauses;
}

function axisSlotFromShelf(s: ReportPivotFormState["rows"][0]): ReportPivotAxisSlot {
  const slot: ReportPivotAxisSlot = {
    bindingId: s.bindingId.trim(),
    field: s.field.trim(),
  };
  const lb = s.label.trim();
  if (lb) slot.label = lb;
  return slot;
}

function valueSlotFromShelf(s: ReportPivotFormState["values"][0]): ReportPivotValueSlot {
  return {
    ...axisSlotFromShelf(s),
    agg: s.agg,
  };
}

function pivotSpecFromFormState(p: ReportPivotFormState, gran: ReportRowGranularity): ReportPivotSpec {
  if (p.outputKind === "detail") {
    return {
      outputKind: "detail",
      filters: pivotFiltersFromPivotFormRows(p.filterRows, gran),
      rows: p.rows.map(axisSlotFromShelf),
      columns: p.columns.map(axisSlotFromShelf),
      values: [],
    };
  }
  return {
    outputKind: "aggregate",
    filters: pivotFiltersFromPivotFormRows(p.filterRows, gran),
    rows: p.rows.map(axisSlotFromShelf),
    columns: p.columns.map(axisSlotFromShelf),
    values: p.values.map(valueSlotFromShelf),
  };
}

function validatePivotFormState(values: ReportDefinitionFormValues): string | null {
  const gran = values.rowGranularity;
  if (values.pivot.values.length === 0) {
    return "En modo pivot, añade al menos un campo en el estante Valores.";
  }
  const checkAxis = (label: string, items: ReportPivotFormState["rows"], role: "dimension" | "measure") => {
    const seen = new Set<string>();
    for (let i = 0; i < items.length; i++) {
      const it = items[i]!;
      const meta = getTripBindingById(it.bindingId.trim());
      if (!meta || !meta.granularities.includes(gran) || meta.outputKey !== it.field.trim()) {
        return `${label}: posición ${i + 1}: binding o campo inválido.`;
      }
      if (role === "dimension" && inferPivotRole(meta, gran) !== "dimension") {
        return `${label}: "${meta.label}" es una medida; colócala en Valores o usa Conteo.`;
      }
      const key = `${it.bindingId}:${it.field}`;
      if (seen.has(key)) return `${label}: no repitas el mismo campo en este estante.`;
      seen.add(key);
    }
    return null;
  };
  const e1 = checkAxis("Filas", values.pivot.rows, "dimension");
  if (e1) return e1;
  const e2 = checkAxis("Columnas", values.pivot.columns, "dimension");
  if (e2) return e2;
  for (let i = 0; i < values.pivot.values.length; i++) {
    const it = values.pivot.values[i]!;
    const meta = getTripBindingById(it.bindingId.trim());
    if (!meta || !meta.granularities.includes(gran) || meta.outputKey !== it.field.trim()) {
      return `Valores: posición ${i + 1}: binding o campo inválido.`;
    }
    if (!pivotAggAllowed(it.agg, meta, gran)) {
      return `Valores: la agregación "${it.agg}" no aplica al campo "${meta.label}".`;
    }
  }
  return null;
}

function validatePivotRecord(record: ReportDefinitionRecord | null): string | null {
  if (!record?.pivotSpec) {
    return "Definición pivot incompleta (falta pivotSpec).";
  }
  if (record.pivotSpec.outputKind === "detail") {
    return null;
  }
  if (!record.pivotSpec.values?.length) {
    return "Definición pivot incompleta (falta pivotSpec.values).";
  }
  const gran = resolveDefinitionGranularity(record);
  const exportTitleTemplate =
    String(record.exportTitleTemplate ?? "").trim() || inferLegacyExportTitleTemplate(record, gran);
  const exportFileNameTemplate =
    String(record.exportFileNameTemplate ?? "").trim() || inferLegacyExportFileNameTemplate(record, gran);
  const fv: ReportDefinitionFormValues = {
    name: record.name,
    source: record.source === "trips" ? "trips" : "trips",
    rowGranularity: gran,
    layoutKind: "pivot",
    pivot: pivotFormFromRecord(record, gran),
    exportTag: "",
    exportTitleTemplate,
    exportFileNameTemplate,
    columns: [],
    topBlock: topBlockFromRecord(record, gran),
    footer: { mode: "none" },
    includeSubtotalsIgft: false,
    scheduleEnabled: false,
    scheduleFrequency: "daily",
    scheduleTimeLocal: "06:00",
    scheduleTimeZone: "America/Lima",
    notifyEmailsText: "",
    notifyEmailSubjectTemplate: "",
    notifyEmailBodyHtml: "",
  };
  return validatePivotFormState(fv);
}

function toDefinitionRecord(doc: { id: string } & Record<string, unknown>): ReportDefinitionRecord {
  const gran = recordRowGranularity(doc);
  const templateId: ReportTemplateId =
    doc.templateId === "ra-reporte-apoyo" ? "ra-reporte-apoyo" : "dd-despacho-domicilio";
  let layoutKind = recordLayoutKind(doc);
  let pivotSpec =
    layoutKind === "pivot" ? parsePivotSpecFromDoc(doc.pivotSpec, gran) : undefined;
  if (layoutKind === "pivot" && !pivotSpec) {
    layoutKind = "tabular";
    pivotSpec = undefined;
  }

  const outFmt: ReportOutputFormat = doc.outputFormat === "pdf" ? "pdf" : "xlsx";
  const notifyEmailsRaw = Array.isArray(doc.notifyEmails) ? doc.notifyEmails : [];
  const notifyEmails = notifyEmailsRaw
    .map((e) => String(e ?? "").trim())
    .filter((e) => e.includes("@"))
    .slice(0, 30);

  return {
    id: doc.id,
    name: String(doc.name ?? ""),
    source: doc.source === "trips" ? "trips" : "trips",
    rowGranularity: gran,
    layoutKind,
    pivotSpec,
    templateId,
    outputFormat: outFmt,
    header:
      doc.header && typeof doc.header === "object"
        ? (doc.header as ReportDefinitionRecord["header"])
        : undefined,
    columns: Array.isArray(doc.columns)
      ? (doc.columns
          .map((c) => normalizeColumnFromDoc(c, gran))
          .filter((c): c is ReportColumnDef => c != null))
      : undefined,
    columnLayout: Array.isArray(doc.columnLayout) ? (doc.columnLayout as string[]) : undefined,
    footer: doc.footer && typeof doc.footer === "object" ? (doc.footer as ReportFooterSpec) : undefined,
    exportTag: doc.exportTag != null ? String(doc.exportTag) : undefined,
    exportTitleTemplate:
      doc.exportTitleTemplate != null ? String(doc.exportTitleTemplate) : undefined,
    exportFileNameTemplate:
      doc.exportFileNameTemplate != null ? String(doc.exportFileNameTemplate) : undefined,
    includeSubtotalsIgft: doc.includeSubtotalsIgft !== false,
    topBlock: parseTopBlockFromDoc(doc.topBlock),
    defaultParams:
      doc.defaultParams && typeof doc.defaultParams === "object"
        ? (doc.defaultParams as Record<string, unknown>)
        : undefined,
    schedule:
      doc.schedule && typeof doc.schedule === "object"
        ? (doc.schedule as ReportDefinitionRecord["schedule"])
        : undefined,
    notifyEmails: notifyEmails.length ? notifyEmails : undefined,
    notifyEmailSubjectTemplate:
      doc.notifyEmailSubjectTemplate != null ? String(doc.notifyEmailSubjectTemplate) : undefined,
    notifyEmailBodyHtml: doc.notifyEmailBodyHtml != null ? String(doc.notifyEmailBodyHtml) : undefined,
    createAt: doc.createAt,
    createBy: doc.createBy != null ? String(doc.createBy) : null,
    updateAt: doc.updateAt,
    updateBy: doc.updateBy != null ? String(doc.updateBy) : null,
  };
}

function toRunRecord(doc: { id: string } & Record<string, unknown>): ReportRunRecord {
  const status = String(doc.status ?? "pending");
  const st: ReportRunRecord["status"] =
    status === "processing" || status === "completed" || status === "error" ? status : "pending";
  return {
    id: doc.id,
    reportDefinitionId: String(doc.reportDefinitionId ?? ""),
    params:
      doc.params && typeof doc.params === "object" ? (doc.params as Record<string, unknown>) : undefined,
    status: st,
    trigger: doc.trigger != null ? String(doc.trigger) : undefined,
    outputFormat: doc.outputFormat != null ? String(doc.outputFormat) : undefined,
    requestedBy: doc.requestedBy != null ? String(doc.requestedBy) : null,
    result:
      doc.result && typeof doc.result === "object"
        ? (doc.result as ReportRunRecord["result"])
        : undefined,
    errorMessage: doc.errorMessage != null ? String(doc.errorMessage) : null,
    notifyStatus: doc.notifyStatus != null ? String(doc.notifyStatus) : undefined,
    notifyError: doc.notifyError != null ? String(doc.notifyError) : null,
    notifyAttemptedAt: doc.notifyAttemptedAt,
    notifyEmailSubject:
      doc.notifyEmailSubject != null ? String(doc.notifyEmailSubject).slice(0, 500) : undefined,
    notifyRecipientsSummary:
      doc.notifyRecipientsSummary != null ? String(doc.notifyRecipientsSummary).slice(0, 400) : undefined,
    notifyBodyWasHtml:
      typeof doc.notifyBodyWasHtml === "boolean" ? doc.notifyBodyWasHtml : undefined,
    notifySkippedReason:
      doc.notifySkippedReason != null ? String(doc.notifySkippedReason) : undefined,
    createdAt: doc.createdAt,
    startedAt: doc.startedAt,
    completedAt: doc.completedAt,
  };
}

function toMillisLike(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (v && typeof v === "object" && "toDate" in v && typeof (v as { toDate: () => Date }).toDate === "function") {
    try {
      const d = (v as { toDate: () => Date }).toDate();
      if (d instanceof Date && !Number.isNaN(d.getTime())) return d.getTime();
    } catch {
      /* noop */
    }
  }
  const s = String(v ?? "").trim();
  if (!s) return 0;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

function sortRunsDescByCreated(rows: ReportRunRecord[]): ReportRunRecord[] {
  return [...rows].sort((a, b) => toMillisLike(b.createdAt) - toMillisLike(a.createdAt));
}

function shouldUseLegacyReportQueryFallback(error: unknown): boolean {
  const code = String((error as { code?: unknown })?.code ?? "");
  const message = String((error as { message?: unknown })?.message ?? "").toLowerCase();
  return (
    code.includes("failed-precondition")
    || message.includes("index")
    || message.includes("requires an index")
    || message.includes("query requires")
  );
}

export async function getReportDefinitions(): Promise<ReportDefinitionRecord[]> {
  const companyId = requireActiveCompanyId();
  const accountId = await resolveActiveAccountId();
  try {
    const items = await getCollectionWithMultiFilter<Record<string, unknown>>(COL_DEF, [
      where("companyId", "==", companyId),
      where("accountId", "==", accountId),
    ]);
    return items.map((d) => toDefinitionRecord(d as { id: string } & Record<string, unknown>));
  } catch (error) {
    // Fallback transicional: mientras se terminan índices/backfill de accountId.
    if (!shouldUseLegacyReportQueryFallback(error)) throw error;
    const legacy = await getCollectionWithMultiFilter<Record<string, unknown>>(COL_DEF, [
      where("companyId", "==", companyId),
    ]);
    return legacy
      .filter((d) => documentMatchesActiveTenant(d, companyId, accountId))
      .map((d) => toDefinitionRecord(d as { id: string } & Record<string, unknown>));
  }
}

export async function getReportDefinitionById(id: string): Promise<ReportDefinitionRecord | null> {
  const sid = String(id ?? "").trim();
  if (!sid) return null;
  const snap = await getDoc(doc(db, COL_DEF, sid));
  if (!snap.exists()) return null;
  const row = { id: snap.id, ...snap.data() } as Record<string, unknown>;
  const companyId = requireActiveCompanyId();
  const accountId = await resolveActiveAccountId();
  if (!documentMatchesActiveTenant(row, companyId, accountId)) return null;
  return toDefinitionRecord(row as { id: string } & Record<string, unknown>);
}

export async function getReportRuns(max = 80): Promise<ReportRunRecord[]> {
  const companyId = requireActiveCompanyId();
  const accountId = await resolveActiveAccountId();
  try {
    const q = query(
      collection(db, COL_RUN),
      where("companyId", "==", companyId),
      where("accountId", "==", accountId),
      orderBy("createdAt", "desc"),
      limit(max)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) =>
      toRunRecord({ id: d.id, ...d.data() } as { id: string } & Record<string, unknown>)
    );
  } catch (error) {
    if (!shouldUseLegacyReportQueryFallback(error)) throw error;
    const legacy = await getCollectionWithMultiFilter<Record<string, unknown>>(COL_RUN, [
      where("companyId", "==", companyId),
    ]);
    const filtered = legacy
      .filter((d) => documentMatchesActiveTenant(d, companyId, accountId))
      .map((d) => toRunRecord(d as { id: string } & Record<string, unknown>));
    return sortRunsDescByCreated(filtered).slice(0, max);
  }
}

export async function getReportRunsByDefinitionId(
  reportDefinitionId: string,
  max = 200
): Promise<ReportRunRecord[]> {
  const defId = String(reportDefinitionId ?? "").trim();
  if (!defId) return [];
  const companyId = requireActiveCompanyId();
  const accountId = await resolveActiveAccountId();
  try {
    const q = query(
      collection(db, COL_RUN),
      where("companyId", "==", companyId),
      where("accountId", "==", accountId),
      where("reportDefinitionId", "==", defId),
      orderBy("createdAt", "desc"),
      limit(max)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) =>
      toRunRecord({ id: d.id, ...d.data() } as { id: string } & Record<string, unknown>)
    );
  } catch (error) {
    if (!shouldUseLegacyReportQueryFallback(error)) throw error;
    const legacy = await getCollectionWithMultiFilter<Record<string, unknown>>(COL_RUN, [
      where("companyId", "==", companyId),
    ]);
    const filtered = legacy
      .filter((d) => String(d.reportDefinitionId ?? "") === defId)
      .filter((d) => documentMatchesActiveTenant(d, companyId, accountId))
      .map((d) => toRunRecord(d as { id: string } & Record<string, unknown>));
    return sortRunsDescByCreated(filtered).slice(0, max);
  }
}

export function formValuesFromDefinition(row: ReportDefinitionRecord | null): ReportDefinitionFormValues {
  const sch = row?.schedule ?? {};
  const gran = resolveDefinitionGranularity(row);
  const cols = resolveColumnsForRecord(row, gran);
  const footer = inferFooter(row, gran);

  const exportTitleTemplate =
    String(row?.exportTitleTemplate ?? "").trim() || inferLegacyExportTitleTemplate(row, gran);
  const exportFileNameTemplate =
    String(row?.exportFileNameTemplate ?? "").trim() || inferLegacyExportFileNameTemplate(row, gran);

  return {
    name: row?.name ?? "",
    source: row?.source === "trips" ? "trips" : "trips",
    rowGranularity: gran,
    layoutKind: "pivot",
    pivot: pivotFormFromRecord(row, gran),
    exportTag: row?.exportTag ?? "",
    exportTitleTemplate,
    exportFileNameTemplate,
    columns: columnsToFormRows(cols, gran),
    topBlock: topBlockFromRecord(row, gran),
    footer,
    includeSubtotalsIgft: footerHasMultiplyRow(footer),
    scheduleEnabled: sch.enabled === true,
    scheduleFrequency: sch.frequency === "weekly" || sch.frequency === "monthly" ? sch.frequency : "daily",
    scheduleTimeLocal: String(sch.timeLocal ?? "06:00"),
    scheduleTimeZone: String(sch.timeZone ?? "America/Lima"),
    notifyEmailsText: (row?.notifyEmails?.length ? row.notifyEmails.join(", ") : "") ?? "",
    notifyEmailSubjectTemplate: row?.notifyEmailSubjectTemplate ?? "",
    notifyEmailBodyHtml: row?.notifyEmailBodyHtml ?? "",
  };
}

export function formColumnsToDef(rows: ReportColumnFormRow[], gran: ReportRowGranularity): ReportColumnDef[] {
  return rows.map((r) => {
    const w = parseFloat(String(r.width).replace(",", "."));
    const col: ReportColumnDef = {
      field: r.field.trim(),
      header: r.header.trim(),
      width: Number.isFinite(w) && w > 0 ? w : undefined,
    };
    const bid = r.bindingId?.trim() || getBindingIdForOutputKey(r.field.trim(), gran);
    if (bid) col.bindingId = bid;
    return col;
  });
}

/** Límite alineado con `NOTIFY_TEMPLATE_MAX_LEN` en Cloud Functions. */
export const NOTIFY_EMAIL_TEMPLATE_MAX_LEN = 64 * 1024;

/** Normaliza cuerpo HTML del editor (p. ej. Quill vacío) para persistir u omitir el campo. */
export function normalizeNotifyEmailBodyHtml(html: string): string {
  const t = String(html ?? "").trim();
  if (!t) return "";
  const compact = t.replace(/\s+/g, "").toLowerCase();
  if (
    compact === "<p><br></p>" ||
    compact === "<p></p>" ||
    compact === "<br>" ||
    compact === "<br/>" ||
    compact === "<br />"
  ) {
    return "";
  }
  return t;
}

/** Parsea correos desde texto del formulario (comas, punto y coma o espacios). */
export function parseNotifyEmailsText(text: string): string[] {
  return String(text ?? "")
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter((s) => s.includes("@"))
    .slice(0, 30);
}

/** Payload persistible en `report-definitions` (mismo shape que add/update). */
export function buildReportDefinitionPersistPayload(values: ReportDefinitionFormValues): Record<string, unknown> {
  const schedule = values.scheduleEnabled
    ? {
        enabled: true,
        frequency: values.scheduleFrequency,
        timeLocal: values.scheduleTimeLocal.trim() || "06:00",
        timeZone: values.scheduleTimeZone.trim() || "America/Lima",
      }
    : { enabled: false };

  const templateId: ReportTemplateId =
    values.rowGranularity === "perAssignment" ? "ra-reporte-apoyo" : "dd-despacho-domicilio";

  const pivotSpec = pivotSpecFromFormState(values.pivot, values.rowGranularity);
  const isDetail = values.pivot.outputKind === "detail";
  const columns = isDetail ? formColumnsToDef(values.columns, values.rowGranularity) : [];
  const notifyEmails = parseNotifyEmailsText(values.notifyEmailsText);
  const subjT = values.notifyEmailSubjectTemplate.trim().slice(0, NOTIFY_EMAIL_TEMPLATE_MAX_LEN);
  const bodyHtmlT = normalizeNotifyEmailBodyHtml(values.notifyEmailBodyHtml).slice(
    0,
    NOTIFY_EMAIL_TEMPLATE_MAX_LEN
  );
  return {
    name: values.name.trim(),
    source: values.source,
    rowGranularity: values.rowGranularity,
    layoutKind: "pivot",
    pivotSpec,
    templateId,
    outputFormat: "xlsx",
    columns,
    topBlock: persistableTopBlock(values.topBlock),
    footer: persistableFooter(values.footer),
    exportTag: values.exportTag.trim() || undefined,
    exportTitleTemplate: values.exportTitleTemplate.trim(),
    exportFileNameTemplate: values.exportFileNameTemplate.trim(),
    includeSubtotalsIgft: footerHasMultiplyRow(values.footer),
    schedule,
    ...(notifyEmails.length ? { notifyEmails } : {}),
    ...(subjT ? { notifyEmailSubjectTemplate: subjT } : {}),
    ...(bodyHtmlT ? { notifyEmailBodyHtml: bodyHtmlT } : {}),
  };
}

/**
 * Convierte un documento legacy `layoutKind: tabular` al shape persistido unificado (pivot + detalle).
 * Útil para migraciones batch sobre `report-definitions`.
 */
export function migrateTabularDefinitionDocToPivotDetail(
  doc: Record<string, unknown>
): Record<string, unknown> {
  if (String(doc.layoutKind ?? "").trim() !== "tabular") return doc;
  return {
    ...doc,
    layoutKind: "pivot",
    pivotSpec: {
      outputKind: "detail",
      filters: [],
      rows: [],
      columns: [],
      values: [],
    },
  };
}

/** Reconstruye el registro como al leer Firestore (p. ej. import YAML). */
export function reportDefinitionRecordFromPlainDoc(
  id: string,
  doc: Record<string, unknown>
): ReportDefinitionRecord {
  return toDefinitionRecord({ ...doc, id });
}

function validateTripsColumnsForFormValues(values: ReportDefinitionFormValues): string | null {
  if (values.source !== "trips") return null;
  const titleTpl = String(values.exportTitleTemplate ?? "");
  const fileTpl = String(values.exportFileNameTemplate ?? "");
  if (!titleTpl.trim()) {
    return "La plantilla del título (exportTitleTemplate) es obligatoria.";
  }
  if (!fileTpl.trim()) {
    return "La plantilla del nombre de archivo (exportFileNameTemplate) es obligatoria.";
  }
  if (titleTpl.length > 300) {
    return "La plantilla del título no puede exceder 300 caracteres.";
  }
  if (fileTpl.length > 200) {
    return "La plantilla del nombre de archivo no puede exceder 200 caracteres.";
  }
  if (values.pivot.outputKind === "detail") {
    const columns = formColumnsToDef(values.columns, values.rowGranularity);
    const colErr = validateTripReportColumns(columns, values.rowGranularity);
    if (colErr) return colErr;
    const fields = new Set(columns.map((c) => c.field.trim()).filter(Boolean));
    const tb = values.topBlock;
    if (tb.mode === "rows" && tb.rows?.length) {
      const te = validateTopBlockRows(tb.rows, fields);
      if (te) return te;
    }
    const f = normalizeFooterToRowsForm(values.footer);
    if (f.mode === "rows" && f.rows?.length) {
      return validateFooterRows(f.rows, fields);
    }
    return null;
  }
  const tb = values.topBlock;
  if (tb.mode === "rows" && tb.rows?.length) {
    const pivotFields = new Set(getTripBindingsForGranularity(values.rowGranularity).map((b) => b.outputKey));
    const te = validateTopBlockRows(tb.rows, pivotFields);
    if (te) return te;
  }
  return validatePivotFormState(values);
}

/**
 * Valida columnas/bindings tras reconstruir un registro (p. ej. import YAML).
 * Origen distinto de `trips` se ignora hasta que exista catálogo equivalente.
 */
function validateRecordFooterAgainstColumns(record: ReportDefinitionRecord, cols: ReportColumnDef[]): string | null {
  const fields = new Set(cols.map((c) => c.field.trim()).filter(Boolean));
  const top = record.topBlock;
  if (top?.mode === "rows" && top.rows?.length) {
    const te = validateTopBlockRows(top.rows, fields);
    if (te) return te;
  }
  const raw = record.footer;
  if (!raw || typeof raw !== "object" || !raw.mode) return null;
  const f = normalizeFooterToRowsForm(raw as ReportFooterSpec);
  if (f.mode !== "rows" || !f.rows?.length) return null;
  return validateFooterRows(f.rows, fields);
}

export function validateReportDefinitionRecordTripColumns(record: ReportDefinitionRecord | null): string | null {
  if (!record) return "Definición vacía.";
  const src = record.source ?? "trips";
  if (src !== "trips") return null;
  if (record.layoutKind === "pivot") {
    if (record.pivotSpec?.outputKind === "detail") {
      const gran = resolveDefinitionGranularity(record);
      const cols = resolveColumnsForRecord(record, gran);
      const colErr = validateTripReportColumns(cols, gran);
      if (colErr) return colErr;
      return validateRecordFooterAgainstColumns(record, cols);
    }
    const gran = resolveDefinitionGranularity(record);
    const top = record.topBlock;
    if (top?.mode === "rows" && top.rows?.length) {
      const pivotFields = new Set(getTripBindingsForGranularity(gran).map((b) => b.outputKey));
      const te = validateTopBlockRows(top.rows, pivotFields);
      if (te) return te;
    }
    return validatePivotRecord(record);
  }
  const gran = resolveDefinitionGranularity(record);
  const cols = resolveColumnsForRecord(record, gran);
  const colErr = validateTripReportColumns(cols, gran);
  if (colErr) return colErr;
  return validateRecordFooterAgainstColumns(record, cols);
}

export async function addReportDefinition(values: ReportDefinitionFormValues): Promise<string> {
  const err = validateTripsColumnsForFormValues(values);
  if (err) throw new Error(err);
  const companyId = requireActiveCompanyId();
  const accountId = await resolveActiveAccountId();
  return addDocument(COL_DEF, {
    companyId,
    accountId,
    ...buildReportDefinitionPersistPayload(values),
  });
}

export async function updateReportDefinition(id: string, values: ReportDefinitionFormValues): Promise<void> {
  const err = validateTripsColumnsForFormValues(values);
  if (err) throw new Error(err);
  const payload = buildReportDefinitionPersistPayload(values);
  const notifyEmails = parseNotifyEmailsText(values.notifyEmailsText);
  const subjT = values.notifyEmailSubjectTemplate.trim().slice(0, NOTIFY_EMAIL_TEMPLATE_MAX_LEN);
  const bodyHtmlT = normalizeNotifyEmailBodyHtml(values.notifyEmailBodyHtml).slice(
    0,
    NOTIFY_EMAIL_TEMPLATE_MAX_LEN
  );
  await updateDocument(COL_DEF, id, {
    ...payload,
    columnLayout: deleteField(),
    header: deleteField(),
    sourceFilters: deleteField(),
    notifyEmails: notifyEmails.length > 0 ? notifyEmails : deleteField(),
    notifyEmailSubjectTemplate: subjT ? subjT : deleteField(),
    notifyEmailBodyHtml: bodyHtmlT ? bodyHtmlT : deleteField(),
  });
}

export async function deleteReportDefinition(id: string): Promise<void> {
  await deleteDocument(COL_DEF, id);
}

export async function createReportRunCallable(body: CreateReportRunRequest): Promise<CreateReportRunResponse> {
  const companyId = requireActiveCompanyId();
  return callHttpsFunction<CreateReportRunRequest, CreateReportRunResponse>(
    "createReportRun",
    { ...body, companyId },
    {
    errorFallback: "No se pudo encolar el reporte.",
    }
  );
}

export async function getReportRunDownloadUrlCallable(
  body: GetReportRunDownloadUrlRequest
): Promise<GetReportRunDownloadUrlResponse> {
  return callHttpsFunction<GetReportRunDownloadUrlRequest, GetReportRunDownloadUrlResponse>(
    "getReportRunDownloadUrl",
    body,
    { errorFallback: "No se pudo obtener el enlace de descarga." }
  );
}

export async function previewReportPivotCallable(
  body: PreviewReportPivotRequest
): Promise<PreviewReportPivotResponse> {
  return callHttpsFunction<PreviewReportPivotRequest, PreviewReportPivotResponse>("previewReportPivot", body, {
    errorFallback: "No se pudo generar la vista previa.",
  });
}

export function formatRunTime(value: unknown): string {
  if (value && typeof value === "object" && "toDate" in value && typeof (value as Timestamp).toDate === "function") {
    try {
      return (value as Timestamp).toDate().toLocaleString();
    } catch {
      return "—";
    }
  }
  return "—";
}

export function displayGranularityLabel(row: ReportDefinitionRecord): string {
  return resolveDefinitionGranularity(row) === "perAssignment" ? "Por asignación" : "Por viaje";
}

export function columnFormRowsFromDefs(cols: ReportColumnDef[], gran: ReportRowGranularity): ReportColumnFormRow[] {
  return columnsToFormRows(cols, gran);
}

export { getDefaultColumns, defaultFooterForGranularity, defaultTopBlockForGranularity };
