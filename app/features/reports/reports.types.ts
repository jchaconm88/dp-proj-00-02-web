/** @deprecated Solo lectura legacy al migrar documentos; usar rowGranularity + columns. */
export type ReportTemplateId = "dd-despacho-domicilio" | "ra-reporte-apoyo";

export type ReportOutputFormat = "xlsx" | "pdf";

export type ReportRunStatus = "pending" | "processing" | "completed" | "error";

export type ReportScheduleFrequency = "daily" | "weekly" | "monthly";

/** Origen de datos del reporte (motor genérico). */
export type ReportDataSource = "trips";

/** Lista de columnas fijas (actual) vs diseño tipo tabla dinámica. */
export type ReportLayoutKind = "tabular" | "pivot";

/** Submodo pivot: lista plana (ex-tabular) vs tabla agregada. */
export type PivotOutputKind = "detail" | "aggregate";

/** Agregaciones soportadas en el estante Valores (pivot). */
export type PivotMeasureAgg = "sum" | "count" | "avg" | "min" | "max";

/** Rol en el constructor pivot (catálogo de campos). */
export type ReportPivotFieldRole = "dimension" | "measure";

/** Operadores de filtro pivot (y formulario de filtros opcionales). */
export type PivotFilterOp = "eq" | "ne" | "in" | "nin";

/** Filtros aplicados sobre filas ya materializadas (AND). */
export interface ReportPivotFilterClause {
  field: string;
  op: PivotFilterOp;
  values: string[];
}

/** Slot persistido en Firestore (sin ids de UI). */
export interface ReportPivotAxisSlot {
  bindingId: string;
  field: string;
  label?: string;
}

export interface ReportPivotValueSlot extends ReportPivotAxisSlot {
  agg: PivotMeasureAgg;
}

export interface ReportPivotSpec {
  /** Por defecto `aggregate` en documentos sin campo (compatibilidad). */
  outputKind?: PivotOutputKind;
  filters: ReportPivotFilterClause[];
  rows: ReportPivotAxisSlot[];
  columns: ReportPivotAxisSlot[];
  values: ReportPivotValueSlot[];
}

/** Ítem en estantes del formulario pivot (incluye slotId para DnD). */
export interface ReportPivotShelfItem {
  slotId: string;
  bindingId: string;
  field: string;
  label: string;
  agg?: PivotMeasureAgg;
}

/** Una fila de detalle por viaje o por asignación al viaje. */
export type ReportRowGranularity = "perTrip" | "perAssignment";

export interface ReportDefinitionHeader {
  companyName?: string;
  companyRuc?: string;
  reportTitle?: string;
}

export interface ReportSchedule {
  enabled?: boolean;
  frequency?: ReportScheduleFrequency;
  timeLocal?: string;
  timeZone?: string;
}

/** Filtros pivot (sobre claves de fila materializada). */
export interface ReportPivotFilterFormRow {
  rowId: string;
  field: string;
  op: PivotFilterOp;
  valuesText: string;
}

export interface ReportPivotFormState {
  outputKind: PivotOutputKind;
  filterRows: ReportPivotFilterFormRow[];
  rows: ReportPivotShelfItem[];
  columns: ReportPivotShelfItem[];
  values: Array<ReportPivotShelfItem & { agg: PivotMeasureAgg }>;
}

/** Columna exportada: campo en la fila + texto de cabecera en Excel. */
export interface ReportColumnDef {
  /** Clave en el objeto fila que genera el origen (p. ej. guias, total). */
  field: string;
  header: string;
  width?: number;
  /** Origen semántico en catálogo (p. ej. trip.transportGuide); opcional en documentos legacy. */
  bindingId?: string;
}

export type ReportFooterMode = "none" | "sumColumn" | "subtotalIgvTotal" | "rows";

/** Una fila del pie: suma sobre datos, producto por factor sobre otra fila del pie, o suma de celdas del pie. */
export interface ReportFooterRowSumColumn {
  rowId: string;
  label: string;
  op: "sumColumn";
  /** Campo exportado (debe existir en columnas del informe). */
  sourceField: string;
}

export interface ReportFooterRowMultiplyFooter {
  rowId: string;
  label: string;
  op: "multiplyFooter";
  /** Fila del pie ya definida **antes** en la lista. */
  refRowId: string;
  factor: number;
}

export interface ReportFooterRowSumFooterRefs {
  rowId: string;
  label: string;
  op: "sumFooterRefs";
  refRowIds: string[];
}

export type ReportFooterRowSpec =
  | ReportFooterRowSumColumn
  | ReportFooterRowMultiplyFooter
  | ReportFooterRowSumFooterRefs;

/** Fila de cabecera superior: texto libre (sustituye empresa/RUC/título) o mismas ops que el pie. */
export interface ReportTopBlockRowStaticText {
  rowId: string;
  label: string;
  op: "staticText";
  /** `{{resolvedTitle}}` se reemplaza al exportar por el título resuelto (período, secuencia, etc.). */
  valueText: string;
}

export type ReportTopBlockRowSpec = ReportFooterRowSpec | ReportTopBlockRowStaticText;

export type ReportTopBlockMode = "none" | "rows";

/** Bloque encima de los encabezados de columnas (mismo patrón que el pie). */
export interface ReportTopBlockSpec {
  mode: ReportTopBlockMode;
  rows?: ReportTopBlockRowSpec[];
}

/** Pie de tabla: modo `rows` (dinámico) o valores legacy leídos de Firestore. */
export interface ReportFooterSpec {
  mode: ReportFooterMode;
  /** Modo dinámico: filas ordenadas; referencias solo a filas anteriores. */
  rows?: ReportFooterRowSpec[];
  /** @deprecated Legacy: suma una columna (RA). */
  field?: string;
  sumLabel?: string;
  /** @deprecated Legacy: base imponible DD. */
  sumField?: string;
  igvRate?: number;
  labels?: {
    subtotal?: string;
    igv?: string;
    total?: string;
  };
}

export interface ReportDefinitionRecord {
  id: string;
  name: string;
  source?: ReportDataSource;
  rowGranularity?: ReportRowGranularity;
  /** @deprecated Inferido si falta rowGranularity. */
  templateId?: ReportTemplateId;
  /** Por defecto `tabular` en documentos legacy. */
  layoutKind?: ReportLayoutKind;
  pivotSpec?: ReportPivotSpec;
  outputFormat: ReportOutputFormat;
  header?: ReportDefinitionHeader;
  /** Columnas del Excel (orden = orden de exportación). */
  columns?: ReportColumnDef[];
  /** @deprecated Usar columns; se migra al cargar. */
  columnLayout?: string[];
  footer?: ReportFooterSpec;
  /** Prefijo de archivo/título (opcional). */
  exportTag?: string;
  /** Plantilla obligatoria: título resuelto (usa muletillas tipo `{year}`, `{month}`, etc.). */
  exportTitleTemplate?: string;
  /** Plantilla obligatoria: nombre base de archivo sin extensión (usa mismas muletillas). */
  exportFileNameTemplate?: string;
  /** @deprecated Si no hay footer, el backend usa esto para pie IGV. */
  includeSubtotalsIgft?: boolean;
  /** Cabecera impresa antes de los títulos de columnas (modo none | filas). */
  topBlock?: ReportTopBlockSpec;
  defaultParams?: Record<string, unknown>;
  /** Correos a notificar al completar una corrida (si SMTP está configurado en Functions). */
  notifyEmails?: string[];
  /** Plantilla de asunto; muletillas: {{resolvedTitle}}, {{definitionName}}, {{dateFrom}}, {{dateTo}}, {{fileName}}, {{downloadUrl}}. */
  notifyEmailSubjectTemplate?: string;
  /** Cuerpo HTML del correo; mismas muletillas que el asunto. */
  notifyEmailBodyHtml?: string;
  schedule?: ReportSchedule;
  createAt?: unknown;
  createBy?: string | null;
  updateAt?: unknown;
  updateBy?: string | null;
}

/** Fila en el formulario (rowId solo UI). */
export interface ReportColumnFormRow {
  rowId: string;
  field: string;
  header: string;
  width: string;
  /** Id del binding en catálogo; si falta se infiere desde `field`. */
  bindingId?: string;
}

export interface ReportDefinitionFormValues {
  name: string;
  source: ReportDataSource;
  rowGranularity: ReportRowGranularity;
  layoutKind: ReportLayoutKind;
  pivot: ReportPivotFormState;
  exportTag: string;
  exportTitleTemplate: string;
  exportFileNameTemplate: string;
  columns: ReportColumnFormRow[];
  topBlock: ReportTopBlockSpec;
  footer: ReportFooterSpec;
  /** Solo para ejecución legacy / compat con backend si footer explícito no aplica. */
  includeSubtotalsIgft: boolean;
  scheduleEnabled: boolean;
  scheduleFrequency: ReportScheduleFrequency;
  scheduleTimeLocal: string;
  scheduleTimeZone: string;
  /** Lista separada por comas, punto y coma o saltos de línea. */
  notifyEmailsText: string;
  notifyEmailSubjectTemplate: string;
  /** HTML del correo (pegar etiquetas o estilos simples). */
  notifyEmailBodyHtml: string;
}

export interface ReportRunResult {
  storagePath?: string;
  fileName?: string;
  mimeType?: string;
  byteLength?: number;
}

export interface ReportRunRecord {
  id: string;
  reportDefinitionId: string;
  params?: Record<string, unknown>;
  status: ReportRunStatus;
  trigger?: string;
  outputFormat?: string;
  requestedBy?: string | null;
  result?: ReportRunResult;
  notifyStatus?: string;
  notifyError?: string | null;
  /** Fecha/hora del último intento de notificación por correo (Firestore timestamp). */
  notifyAttemptedAt?: unknown;
  /** Asunto final enviado o que se habría usado (plantilla resuelta). */
  notifyEmailSubject?: string;
  /** Lista corta de destinatarios o resumen (p. ej. «N destinatarios»). */
  notifyRecipientsSummary?: string;
  /** Si el cuerpo enviado incluía parte HTML. */
  notifyBodyWasHtml?: boolean;
  /** Motivo cuando no se envió correo (`no_recipients`, `smtp_not_configured`, …). */
  notifySkippedReason?: string;
  errorMessage?: string | null;
  createdAt?: unknown;
  startedAt?: unknown;
  completedAt?: unknown;
}
