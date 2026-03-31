/**
 * Catálogo de orígenes de datos (F0): documentación y metadatos para UI.
 * Debe alinearse con `report-data-sources.registry.js` en Functions.
 */

import type { ReportDataSource, ReportRowGranularity } from "./reports.types";

export type ReportParamScope = "run";

export interface ReportSourceParameterMeta {
  id: string;
  label: string;
  kind: "date" | "string";
  /** dónde se captura el valor */
  scope: ReportParamScope;
  description?: string;
}

export interface ReportGranularityCatalogEntry {
  id: ReportRowGranularity;
  label: string;
  description: string;
}

export interface ReportDataSourceCatalogEntry {
  id: ReportDataSource;
  label: string;
  /** Qué filas produce el “query” lógico detrás del origen */
  description: string;
  parameters: ReportSourceParameterMeta[];
  granularities: ReportGranularityCatalogEntry[];
}

export const REPORT_DATA_SOURCES: ReportDataSourceCatalogEntry[] = [
  {
    id: "trips",
    label: "Viajes",
    description:
      "Viajes en un rango de fechas, con cargos y asignaciones resueltos en servidor. Puedes añadir filtros " +
      "declarativos (estado, cliente, ruta, vehículo, servicio por ID) que se aplican después del rango. " +
      "Hay columnas derivadas opcionales (p. ej. conductor solo empleado o solo recurso) además de CHOFER combinado. " +
      "La granularidad define si cada fila del Excel es un viaje o una asignación de apoyo.",
    parameters: [
      {
        id: "dateFrom",
        label: "Fecha desde",
        kind: "date",
        scope: "run",
        description: "Se indica al ejecutar el reporte o en la programación.",
      },
      {
        id: "dateTo",
        label: "Fecha hasta",
        kind: "date",
        scope: "run",
        description: "Se indica al ejecutar el reporte o en la programación.",
      },
    ],
    granularities: [
      {
        id: "perTrip",
        label: "Por viaje (una fila por viaje)",
        description: "Una fila por viaje; importes agregados por viaje (p. ej. despacho domicilio).",
      },
      {
        id: "perAssignment",
        label: "Por asignación (una fila por apoyo)",
        description: "Una fila por cada asignación de apoyo ligada al viaje (p. ej. reporte de apoyo).",
      },
    ],
  },
];

export function getReportDataSourceMeta(
  id: ReportDataSource
): ReportDataSourceCatalogEntry | undefined {
  return REPORT_DATA_SOURCES.find((s) => s.id === id);
}

export function granularitySelectOptions(source: ReportDataSource): { label: string; value: ReportRowGranularity }[] {
  const m = getReportDataSourceMeta(source);
  if (!m) {
    return [
      { label: "Por viaje", value: "perTrip" },
      { label: "Por asignación", value: "perAssignment" },
    ];
  }
  return m.granularities.map((g) => ({ label: g.label, value: g.id }));
}
