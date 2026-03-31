import type { ReportColumnDef, ReportFooterSpec, ReportRowGranularity, ReportTopBlockSpec } from "./reports.types";
import {
  PRESET_DD_FOOTER_IGV,
  PRESET_DD_FOOTER_SUB,
  PRESET_DD_FOOTER_TOT,
  PRESET_RA_FOOTER_SUM,
  PRESET_TOP_DD_LINE1,
  PRESET_TOP_DD_LINE2,
  PRESET_TOP_DD_TITLE,
  PRESET_TOP_RA_TITLE,
  REPORT_TOP_RESOLVED_TITLE_TOKEN,
} from "./report-footer-normalize";
import { getBindingIdForOutputKey } from "./report-trips-bindings.catalog";

export interface SourceFieldMeta {
  id: string;
  defaultHeader: string;
  defaultWidth: number;
  group: string;
}

/**
 * Columnas del preset DD por defecto (sin campos derivados opcionales).
 * Debe coincidir con `TRIPS_PER_TRIP_DEFAULT_ORDER` en Functions.
 */
export const TRIPS_PER_TRIP_DEFAULT_COLUMN_IDS: readonly string[] = [
  "no",
  "ruta",
  "fecha",
  "placa",
  "chofer",
  "guias",
  "total",
  "observacion",
];

/** Campos exportables por viaje; incluye derivados de asignaciones (no todos van en el preset por defecto). */
export const TRIPS_PER_TRIP_FIELDS: SourceFieldMeta[] = [
  { id: "no", defaultHeader: "No.", defaultWidth: 10, group: "Detalle" },
  { id: "ruta", defaultHeader: "RUTA", defaultWidth: 28, group: "Detalle" },
  { id: "fecha", defaultHeader: "FECHA", defaultWidth: 12, group: "Detalle" },
  { id: "status", defaultHeader: "ESTADO", defaultWidth: 14, group: "Detalle" },
  { id: "placa", defaultHeader: "PLACA", defaultWidth: 14, group: "Detalle" },
  {
    id: "chofer",
    defaultHeader: "CHOFER",
    defaultWidth: 22,
    group: "Conductor",
  },
  {
    id: "choferEmployee",
    defaultHeader: "CHOFER (empleado)",
    defaultWidth: 22,
    group: "Conductor",
  },
  {
    id: "choferResource",
    defaultHeader: "CHOFER (recurso)",
    defaultWidth: 22,
    group: "Conductor",
  },
  { id: "guias", defaultHeader: "GUIAS T.", defaultWidth: 18, group: "Detalle" },
  { id: "total", defaultHeader: "TOTAL", defaultWidth: 12, group: "Importes" },
  {
    id: "totalFlete",
    defaultHeader: "TOTAL FLETE",
    defaultWidth: 12,
    group: "Importes",
  },
  {
    id: "totalApoyoExtra",
    defaultHeader: "TOTAL APOYO EXTRA",
    defaultWidth: 14,
    group: "Importes",
  },
  { id: "observacion", defaultHeader: "OBSERVACIÓN", defaultWidth: 36, group: "Detalle" },
];

/** Campos disponibles: una fila por asignación (ex-RA). */
export const TRIPS_PER_ASSIGNMENT_FIELDS: SourceFieldMeta[] = [
  { id: "dia", defaultHeader: "DIA", defaultWidth: 8, group: "Detalle" },
  { id: "autoriza", defaultHeader: "AUTORIZA", defaultWidth: 14, group: "Detalle" },
  { id: "empresa", defaultHeader: "EMPRESA", defaultWidth: 22, group: "Detalle" },
  { id: "documento", defaultHeader: "DOCUMENTO", defaultWidth: 18, group: "Detalle" },
  { id: "cliente", defaultHeader: "CLIENTE", defaultWidth: 22, group: "Detalle" },
  { id: "distrito", defaultHeader: "DISTRITO", defaultWidth: 16, group: "Detalle" },
  {
    id: "stopExternalDocument",
    defaultHeader: "DOC. EXT. PARADA",
    defaultWidth: 18,
    group: "Parada",
  },
  {
    id: "stopObservations",
    defaultHeader: "OBS. PARADA",
    defaultWidth: 28,
    group: "Parada",
  },
  { id: "ruta", defaultHeader: "RUTA", defaultWidth: 24, group: "Detalle" },
  { id: "placa", defaultHeader: "PLACA", defaultWidth: 12, group: "Detalle" },
  { id: "nombreApoyo", defaultHeader: "NOMBRE DEL APOYO", defaultWidth: 28, group: "Apoyo" },
  { id: "cantidad", defaultHeader: "CANTIDAD", defaultWidth: 10, group: "Importes" },
  { id: "producto", defaultHeader: "PRODUCTO", defaultWidth: 20, group: "Detalle" },
  { id: "motivo", defaultHeader: "MOTIVO", defaultWidth: 14, group: "Detalle" },
  { id: "pUni", defaultHeader: "P.UNI.", defaultWidth: 10, group: "Importes" },
  { id: "pTotal", defaultHeader: "P.TOTAL", defaultWidth: 12, group: "Importes" },
];

export function getFieldCatalogForGranularity(granularity: ReportRowGranularity): SourceFieldMeta[] {
  return granularity === "perAssignment" ? TRIPS_PER_ASSIGNMENT_FIELDS : TRIPS_PER_TRIP_FIELDS;
}

function columnWithBinding(
  field: string,
  header: string,
  width: number,
  granularity: ReportRowGranularity
): ReportColumnDef {
  const bindingId = getBindingIdForOutputKey(field, granularity);
  return bindingId ? { field, header, width, bindingId } : { field, header, width };
}

export function getDefaultColumns(granularity: ReportRowGranularity): ReportColumnDef[] {
  if (granularity === "perAssignment") {
    return TRIPS_PER_ASSIGNMENT_FIELDS.map((f) =>
      columnWithBinding(f.id, f.defaultHeader, f.defaultWidth, granularity)
    );
  }
  const byId = new Map(TRIPS_PER_TRIP_FIELDS.map((f) => [f.id, f]));
  return TRIPS_PER_TRIP_DEFAULT_COLUMN_IDS.map((id) => {
    const f = byId.get(id);
    return columnWithBinding(id, f?.defaultHeader ?? id, f?.defaultWidth ?? 14, granularity);
  });
}

/** Cabecera superior por defecto (equivalente al antiguo bloque empresa / RUC / título). */
export function defaultTopBlockForGranularity(granularity: ReportRowGranularity): ReportTopBlockSpec {
  if (granularity === "perTrip") {
    return {
      mode: "rows",
      rows: [
        { rowId: PRESET_TOP_DD_LINE1, label: "", op: "staticText", valueText: "" },
        { rowId: PRESET_TOP_DD_LINE2, label: "", op: "staticText", valueText: "" },
        {
          rowId: PRESET_TOP_DD_TITLE,
          label: "",
          op: "staticText",
          valueText: REPORT_TOP_RESOLVED_TITLE_TOKEN,
        },
      ],
    };
  }
  return {
    mode: "rows",
    rows: [
      {
        rowId: PRESET_TOP_RA_TITLE,
        label: "",
        op: "staticText",
        valueText: REPORT_TOP_RESOLVED_TITLE_TOKEN,
      },
    ],
  };
}

export function defaultFooterForGranularity(granularity: ReportRowGranularity): ReportFooterSpec {
  if (granularity === "perTrip") {
    return {
      mode: "rows",
      rows: [
        { rowId: PRESET_DD_FOOTER_SUB, label: "SUB TOTAL", op: "sumColumn", sourceField: "total" },
        {
          rowId: PRESET_DD_FOOTER_IGV,
          label: "IGV 18%",
          op: "multiplyFooter",
          refRowId: PRESET_DD_FOOTER_SUB,
          factor: 0.18,
        },
        {
          rowId: PRESET_DD_FOOTER_TOT,
          label: "TOTAL",
          op: "sumFooterRefs",
          refRowIds: [PRESET_DD_FOOTER_SUB, PRESET_DD_FOOTER_IGV],
        },
      ],
    };
  }
  return {
    mode: "rows",
    rows: [
      {
        rowId: PRESET_RA_FOOTER_SUM,
        label: "TOTALES",
        op: "sumColumn",
        sourceField: "pTotal",
      },
    ],
  };
}

/** Convierte `columnLayout` legacy a columnas con cabeceras por defecto. */
export function columnsFromLegacyLayout(
  granularity: ReportRowGranularity,
  columnLayout: string[] | undefined
): ReportColumnDef[] {
  const catalog = getFieldCatalogForGranularity(granularity);
  const byId = new Map(catalog.map((f) => [f.id, f]));
  const defaultOrder =
    granularity === "perAssignment"
      ? catalog.map((f) => f.id)
      : [...TRIPS_PER_TRIP_DEFAULT_COLUMN_IDS];
  const allowed = new Set(catalog.map((f) => f.id));

  let keys: string[];
  if (columnLayout && columnLayout.length > 0) {
    const seen = new Set<string>();
    keys = [];
    for (const x of columnLayout) {
      const id = String(x ?? "").trim();
      if (!allowed.has(id) || seen.has(id)) continue;
      seen.add(id);
      keys.push(id);
    }
    if (keys.length === 0) keys = [...defaultOrder];
  } else {
    keys = [...defaultOrder];
  }

  return keys.map((id) => {
    const m = byId.get(id);
    return columnWithBinding(id, m?.defaultHeader ?? id, m?.defaultWidth ?? 14, granularity);
  });
}

export function numericFieldOptions(granularity: ReportRowGranularity): { value: string; label: string }[] {
  const cat = getFieldCatalogForGranularity(granularity);
  const numericIds =
    granularity === "perTrip"
      ? new Set(["total", "totalFlete", "totalApoyoExtra"])
      : new Set(["cantidad", "pUni", "pTotal"]);
  return cat.filter((f) => numericIds.has(f.id)).map((f) => ({ value: f.id, label: f.defaultHeader }));
}
