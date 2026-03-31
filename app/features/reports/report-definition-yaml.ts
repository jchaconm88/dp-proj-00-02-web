import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { z } from "zod";
import {
  buildReportDefinitionPersistPayload,
  formValuesFromDefinition,
  reportDefinitionRecordFromPlainDoc,
  validateReportDefinitionRecordTripColumns,
} from "./reports.service";
import type { ReportDefinitionFormValues } from "./reports.types";

const YAML_PARSE_OPTS = { maxAliasCount: 20, merge: false } as const;

const pivotFilterOpSchema = z.enum(["eq", "ne", "in", "nin"]);

const columnSchema = z
  .object({
    field: z.string().min(1),
    header: z.string(),
    width: z.number().finite().positive().optional(),
    bindingId: z.string().min(1).optional(),
  })
  .strict();

const headerSchema = z
  .object({
    companyName: z.string().optional(),
    companyRuc: z.string().optional(),
    reportTitle: z.string().optional(),
  })
  .strict();

const footerLabelsSchema = z
  .object({
    subtotal: z.string().optional(),
    igv: z.string().optional(),
    total: z.string().optional(),
  })
  .strict()
  .optional();

const footerRowYamlSchema = z.discriminatedUnion("op", [
  z
    .object({
      rowId: z.string().min(1),
      label: z.string(),
      op: z.literal("sumColumn"),
      sourceField: z.string().min(1),
    })
    .strict(),
  z
    .object({
      rowId: z.string().min(1),
      label: z.string(),
      op: z.literal("multiplyFooter"),
      refRowId: z.string().min(1),
      factor: z.number().finite(),
    })
    .strict(),
  z
    .object({
      rowId: z.string().min(1),
      label: z.string(),
      op: z.literal("sumFooterRefs"),
      refRowIds: z.array(z.string().min(1)).min(1),
    })
    .strict(),
]);

const footerSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("none") }).strict(),
  z
    .object({
      mode: z.literal("sumColumn"),
      field: z.string().min(1),
      sumLabel: z.string().optional(),
    })
    .strict(),
  z
    .object({
      mode: z.literal("subtotalIgvTotal"),
      sumField: z.string().min(1),
      igvRate: z.number().finite().optional(),
      labels: footerLabelsSchema,
    })
    .strict(),
  z
    .object({
      mode: z.literal("rows"),
      rows: z.array(footerRowYamlSchema),
    })
    .strict(),
]);

const topBlockRowYamlSchema = z.discriminatedUnion("op", [
  z
    .object({
      rowId: z.string().min(1),
      label: z.string(),
      op: z.literal("staticText"),
      valueText: z.string(),
    })
    .strict(),
  z
    .object({
      rowId: z.string().min(1),
      label: z.string(),
      op: z.literal("sumColumn"),
      sourceField: z.string().min(1),
    })
    .strict(),
  z
    .object({
      rowId: z.string().min(1),
      label: z.string(),
      op: z.literal("multiplyFooter"),
      refRowId: z.string().min(1),
      factor: z.number().finite(),
    })
    .strict(),
  z
    .object({
      rowId: z.string().min(1),
      label: z.string(),
      op: z.literal("sumFooterRefs"),
      refRowIds: z.array(z.string().min(1)).min(1),
    })
    .strict(),
]);

const topBlockSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("none") }).strict(),
  z
    .object({
      mode: z.literal("rows"),
      rows: z.array(topBlockRowYamlSchema).min(1),
    })
    .strict(),
]);

const scheduleSchema = z.discriminatedUnion("enabled", [
  z.object({ enabled: z.literal(false) }).strict(),
  z
    .object({
      enabled: z.literal(true),
      frequency: z.enum(["daily", "weekly", "monthly"]),
      timeLocal: z.string().min(1),
      timeZone: z.string().min(1),
    })
    .strict(),
]);

const pivotAxisSlotYamlSchema = z
  .object({
    bindingId: z.string().min(1),
    field: z.string().min(1),
    label: z.string().optional(),
  })
  .strict();

const pivotValueSlotYamlSchema = pivotAxisSlotYamlSchema.extend({
  agg: z.enum(["sum", "count", "avg", "min", "max"]),
});

const pivotFilterClauseYamlSchema = z
  .object({
    field: z.string().min(1),
    op: pivotFilterOpSchema,
    values: z.array(z.string()),
  })
  .strict();

const pivotSpecYamlSchema = z
  .object({
    outputKind: z.enum(["detail", "aggregate"]).optional(),
    filters: z.array(pivotFilterClauseYamlSchema).optional(),
    rows: z.array(pivotAxisSlotYamlSchema).optional(),
    columns: z.array(pivotAxisSlotYamlSchema).optional(),
    values: z.array(pivotValueSlotYamlSchema).optional(),
  })
  .strict();

const reportDefinitionYamlBodySchema = z
  .object({
    schemaVersion: z.literal(1),
    name: z.string().min(1),
    source: z.literal("trips"),
    rowGranularity: z.enum(["perTrip", "perAssignment"]),
    templateId: z.enum(["dd-despacho-domicilio", "ra-reporte-apoyo"]),
    outputFormat: z.enum(["xlsx", "pdf"]),
    exportTitleTemplate: z.string().min(1).max(300),
    exportFileNameTemplate: z.string().min(1).max(200),
    notifyEmails: z.array(z.string().min(3)).max(30).optional(),
    notifyEmailSubjectTemplate: z.string().max(65536).optional(),
    notifyEmailBodyHtml: z.string().max(65536).optional(),
    layoutKind: z.enum(["tabular", "pivot"]).optional(),
    header: headerSchema.optional(),
    columns: z.array(columnSchema).optional(),
    footer: footerSchema.optional(),
    topBlock: topBlockSchema.optional(),
    pivotSpec: pivotSpecYamlSchema.optional(),
    exportTag: z.string().optional(),
    includeSubtotalsIgft: z.boolean().optional(),
    schedule: scheduleSchema.optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    const okAssignment = data.rowGranularity === "perAssignment" && data.templateId === "ra-reporte-apoyo";
    const okTrip = data.rowGranularity === "perTrip" && data.templateId === "dd-despacho-domicilio";
    if (!okAssignment && !okTrip) {
      ctx.addIssue({
        code: "custom",
        message:
          "templateId debe ser ra-reporte-apoyo si rowGranularity es perAssignment, y dd-despacho-domicilio si es perTrip.",
        path: ["templateId"],
      });
    }
    const isPivot = data.layoutKind === "pivot";
    if (isPivot) {
      if (!data.pivotSpec) {
        ctx.addIssue({
          code: "custom",
          message: "Modo pivot: se requiere pivotSpec.",
          path: ["pivotSpec"],
        });
        return;
      }
      const pivotDetail = data.pivotSpec.outputKind === "detail";
      if (pivotDetail) {
        if (!data.columns || data.columns.length === 0) {
          ctx.addIssue({
            code: "custom",
            message: "Pivot detalle: se requiere al menos una columna.",
            path: ["columns"],
          });
        }
        if (!data.footer) {
          ctx.addIssue({
            code: "custom",
            message: "Pivot detalle: se requiere footer.",
            path: ["footer"],
          });
        }
      } else if (!data.pivotSpec.values || data.pivotSpec.values.length === 0) {
        ctx.addIssue({
          code: "custom",
          message: "Pivot resumen: pivotSpec.values debe tener al menos un elemento.",
          path: ["pivotSpec", "values"],
        });
      }
    } else {
      if (!data.columns || data.columns.length === 0) {
        ctx.addIssue({
          code: "custom",
          message: "Modo tabular: se requiere al menos una columna.",
          path: ["columns"],
        });
      }
      if (!data.footer) {
        ctx.addIssue({
          code: "custom",
          message: "Modo tabular: se requiere footer.",
          path: ["footer"],
        });
      }
    }
  });

export type ReportDefinitionYamlDocument = z.infer<typeof reportDefinitionYamlBodySchema>;

function yamlParseErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

function formatZodError(e: z.ZodError): string {
  return z.prettifyError(e);
}

/**
 * Parsea YAML con límites de alias, valida con Zod (objetos estrictos) y devuelve valores de formulario
 * alineados al modelo persistido en Firestore.
 */
export function parseReportDefinitionYaml(text: string):
  | { ok: true; values: ReportDefinitionFormValues }
  | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = parseYaml(text, YAML_PARSE_OPTS);
  } catch (e) {
    return { ok: false, error: `YAML inválido: ${yamlParseErrorMessage(e)}` };
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, error: "El documento YAML debe ser un objeto en la raíz." };
  }
  const result = reportDefinitionYamlBodySchema.safeParse(parsed);
  if (!result.success) {
    return { ok: false, error: formatZodError(result.error) };
  }
  const data = result.data;
  const { schemaVersion: _sv, ...persistShape } = data;
  const record = reportDefinitionRecordFromPlainDoc("yaml-import", persistShape as Record<string, unknown>);
  const colErr = validateReportDefinitionRecordTripColumns(record);
  if (colErr) return { ok: false, error: colErr };
  return { ok: true, values: formValuesFromDefinition(record) };
}

/**
 * Serializa el estado del formulario a YAML (schemaVersion 1), usando el mismo payload que se persiste.
 */
export function serializeReportDefinitionFormToYaml(values: ReportDefinitionFormValues): string {
  const payload = buildReportDefinitionPersistPayload(values);
  const doc = { schemaVersion: 1 as const, ...payload };
  const cleaned = JSON.parse(JSON.stringify(doc)) as Record<string, unknown>;
  return stringifyYaml(cleaned, { lineWidth: 100, indent: 2 });
}
