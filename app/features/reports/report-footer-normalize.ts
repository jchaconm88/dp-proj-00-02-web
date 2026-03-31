import type {
  ReportFooterRowSpec,
  ReportFooterSpec,
  ReportTopBlockRowSpec,
  ReportTopBlockSpec,
} from "./reports.types";

/** IDs estables del preset DD (referencias entre filas). */
export const PRESET_DD_FOOTER_SUB = "preset-dd-subtotal";
export const PRESET_DD_FOOTER_IGV = "preset-dd-igv";
export const PRESET_DD_FOOTER_TOT = "preset-dd-total";
export const PRESET_RA_FOOTER_SUM = "preset-ra-sum";

/** Filas de cabecera superior por defecto (DD: empresa, RUC, título dinámico). */
export const PRESET_TOP_DD_LINE1 = "preset-top-dd-1";
export const PRESET_TOP_DD_LINE2 = "preset-top-dd-2";
export const PRESET_TOP_DD_TITLE = "preset-top-dd-title";
export const PRESET_TOP_RA_TITLE = "preset-top-ra-title";

/** Convierte footer legacy a `mode: "rows"` para el formulario y persistencia unificada. */
export function normalizeFooterToRowsForm(footer: ReportFooterSpec): ReportFooterSpec {
  if (footer.mode === "none") return { mode: "none" };
  if (footer.mode === "rows") {
    return { mode: "rows", rows: Array.isArray(footer.rows) ? footer.rows : [] };
  }
  if (footer.mode === "subtotalIgvTotal" && footer.sumField) {
    const rate =
      typeof footer.igvRate === "number" && Number.isFinite(footer.igvRate) && footer.igvRate >= 0
        ? footer.igvRate
        : 0.18;
    const lb = footer.labels ?? {};
    return {
      mode: "rows",
      rows: [
        {
          rowId: PRESET_DD_FOOTER_SUB,
          label: (lb.subtotal ?? "SUB TOTAL").trim() || "SUB TOTAL",
          op: "sumColumn",
          sourceField: footer.sumField.trim(),
        },
        {
          rowId: PRESET_DD_FOOTER_IGV,
          label: (lb.igv ?? "IGV 18%").trim() || "IGV 18%",
          op: "multiplyFooter",
          refRowId: PRESET_DD_FOOTER_SUB,
          factor: rate,
        },
        {
          rowId: PRESET_DD_FOOTER_TOT,
          label: (lb.total ?? "TOTAL").trim() || "TOTAL",
          op: "sumFooterRefs",
          refRowIds: [PRESET_DD_FOOTER_SUB, PRESET_DD_FOOTER_IGV],
        },
      ],
    };
  }
  if (footer.mode === "sumColumn" && footer.field) {
    return {
      mode: "rows",
      rows: [
        {
          rowId: PRESET_RA_FOOTER_SUM,
          label: (footer.sumLabel ?? "TOTALES").trim() || "TOTALES",
          op: "sumColumn",
          sourceField: footer.field.trim(),
        },
      ],
    };
  }
  return { mode: "none" };
}

export function footerHasMultiplyRow(footer: ReportFooterSpec): boolean {
  if (footer.mode === "rows" && footer.rows) {
    return footer.rows.some((r) => r.op === "multiplyFooter");
  }
  return footer.mode === "subtotalIgvTotal";
}

export function persistableFooter(footer: ReportFooterSpec): ReportFooterSpec {
  const n = normalizeFooterToRowsForm(footer);
  if (n.mode === "none") return { mode: "none" };
  if (n.mode === "rows" && n.rows?.length) {
    return { mode: "rows", rows: n.rows };
  }
  return { mode: "none" };
}

/** Valida orden y referencias; devuelve mensaje o null. */
export function validateFooterRows(
  rows: ReportFooterRowSpec[] | undefined,
  columnFields: Set<string>
): string | null {
  if (!rows || rows.length === 0) return "Añade al menos una fila de pie o elige «Sin pie».";
  const prev = new Set<string>();
  const seenIds = new Set<string>();
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]!;
    if (!r.rowId?.trim()) return `Fila ${i + 1}: falta identificador interno.`;
    if (seenIds.has(r.rowId)) return `Fila ${i + 1}: rowId duplicado.`;
    seenIds.add(r.rowId);
    if (!r.label?.trim()) return `Fila ${i + 1}: la etiqueta no puede estar vacía.`;
    if (r.op === "sumColumn") {
      const f = r.sourceField?.trim() ?? "";
      if (!f || !columnFields.has(f)) {
        return `Fila ${i + 1}: el campo «${f}» no está en las columnas del informe.`;
      }
    } else if (r.op === "multiplyFooter") {
      if (!r.refRowId?.trim() || !prev.has(r.refRowId)) {
        return `Fila ${i + 1}: la fila referenciada debe aparecer antes en la lista.`;
      }
      if (!Number.isFinite(r.factor)) return `Fila ${i + 1}: factor numérico inválido.`;
    } else if (r.op === "sumFooterRefs") {
      if (!r.refRowIds?.length) return `Fila ${i + 1}: elegí al menos una fila del pie a sumar.`;
      for (const id of r.refRowIds) {
        if (!prev.has(id)) return `Fila ${i + 1}: la fila «${id}» debe estar antes en la lista.`;
      }
    } else {
      return `Fila ${i + 1}: operación no reconocida.`;
    }
    prev.add(r.rowId);
  }
  return null;
}

/** Placeholder sustituido en exportación por el título resuelto (período, archivo, etc.). */
export const REPORT_TOP_RESOLVED_TITLE_TOKEN = "{{resolvedTitle}}";

export function persistableTopBlock(top: ReportTopBlockSpec): ReportTopBlockSpec {
  if (top.mode === "none") return { mode: "none" };
  if (top.mode === "rows" && top.rows?.length) {
    return { mode: "rows", rows: top.rows };
  }
  return { mode: "none" };
}

/** Valida filas del bloque superior (texto estático + mismas ops que el pie). */
export function validateTopBlockRows(
  rows: ReportTopBlockRowSpec[] | undefined,
  columnFields: Set<string>
): string | null {
  if (!rows || rows.length === 0) {
    return "Añade al menos una fila de cabecera o elige «Sin cabecera de bloque».";
  }
  const prev = new Set<string>();
  const seenIds = new Set<string>();
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]!;
    if (!r.rowId?.trim()) return `Cabecera fila ${i + 1}: falta identificador interno.`;
    if (seenIds.has(r.rowId)) return `Cabecera fila ${i + 1}: rowId duplicado.`;
    seenIds.add(r.rowId);
    if (r.op === "staticText") {
      /* Fila en blanco permitida (plantilla DD con líneas a completar). */
    } else {
      if (!r.label?.trim()) return `Cabecera fila ${i + 1}: la etiqueta no puede estar vacía.`;
      if (r.op === "sumColumn") {
        const f = r.sourceField?.trim() ?? "";
        if (!f || !columnFields.has(f)) {
          return `Cabecera fila ${i + 1}: el campo «${f}» no está en las columnas del informe.`;
        }
      } else if (r.op === "multiplyFooter") {
        if (!r.refRowId?.trim() || !prev.has(r.refRowId)) {
          return `Cabecera fila ${i + 1}: la fila referenciada debe aparecer antes en la lista.`;
        }
        if (!Number.isFinite(r.factor)) return `Cabecera fila ${i + 1}: factor numérico inválido.`;
      } else if (r.op === "sumFooterRefs") {
        if (!r.refRowIds?.length) return `Cabecera fila ${i + 1}: elegí al menos una fila anterior a sumar.`;
        for (const id of r.refRowIds) {
          if (!prev.has(id)) return `Cabecera fila ${i + 1}: la fila «${id}» debe estar antes en la lista.`;
        }
      } else {
        return `Cabecera fila ${i + 1}: operación no reconocida.`;
      }
    }
    prev.add(r.rowId);
  }
  return null;
}
