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
  {
    id: "purchase-orders",
    label: "Compras por Periodo",
    description:
      "Órdenes de compra filtradas por rango de fechas y status, con totales por proveedor y moneda. " +
      "Incluye resumen con total de registros y suma de montos al final.",
    parameters: [
      {
        id: "dateFrom",
        label: "Fecha desde",
        kind: "date",
        scope: "run",
        description: "Fecha de inicio del periodo a consultar (issueDate).",
      },
      {
        id: "dateTo",
        label: "Fecha hasta",
        kind: "date",
        scope: "run",
        description: "Fecha de fin del periodo a consultar (issueDate).",
      },
      {
        id: "status",
        label: "Estado",
        kind: "string",
        scope: "run",
        description: "Filtro opcional por estado de la orden (draft, confirmed, partial_received, received, cancelled).",
      },
      {
        id: "supplierId",
        label: "Proveedor",
        kind: "string",
        scope: "run",
        description: "Filtro opcional por proveedor específico.",
      },
    ],
    granularities: [
      {
        id: "perTrip",
        label: "Por orden de compra",
        description: "Una fila por cada orden de compra en el periodo.",
      },
    ],
  },
  {
    id: "sale-orders",
    label: "Ventas por Periodo",
    description:
      "Órdenes de venta filtradas por rango de fechas y status, con totales por cliente y moneda. " +
      "Incluye resumen con total de registros y suma de montos al final.",
    parameters: [
      {
        id: "dateFrom",
        label: "Fecha desde",
        kind: "date",
        scope: "run",
        description: "Fecha de inicio del periodo a consultar (issueDate).",
      },
      {
        id: "dateTo",
        label: "Fecha hasta",
        kind: "date",
        scope: "run",
        description: "Fecha de fin del periodo a consultar (issueDate).",
      },
      {
        id: "status",
        label: "Estado",
        kind: "string",
        scope: "run",
        description: "Filtro opcional por estado de la orden (draft, confirmed, in_progress, delivered, invoiced, cancelled).",
      },
      {
        id: "clientId",
        label: "Cliente",
        kind: "string",
        scope: "run",
        description: "Filtro opcional por cliente específico.",
      },
    ],
    granularities: [
      {
        id: "perTrip",
        label: "Por orden de venta",
        description: "Una fila por cada orden de venta en el periodo.",
      },
    ],
  },
  {
    id: "quotations",
    label: "Cotizaciones",
    description:
      "Cotizaciones filtradas por rango de fechas y status, con tasa de conversión (confirmadas/total). " +
      "Incluye resumen con total de registros, cotizaciones confirmadas y tasa de conversión.",
    parameters: [
      {
        id: "dateFrom",
        label: "Fecha desde",
        kind: "date",
        scope: "run",
        description: "Fecha de inicio del periodo a consultar (issueDate).",
      },
      {
        id: "dateTo",
        label: "Fecha hasta",
        kind: "date",
        scope: "run",
        description: "Fecha de fin del periodo a consultar (issueDate).",
      },
      {
        id: "status",
        label: "Estado",
        kind: "string",
        scope: "run",
        description: "Filtro opcional por estado de la cotización (draft, sent, confirmed, rejected, expired).",
      },
      {
        id: "clientId",
        label: "Cliente",
        kind: "string",
        scope: "run",
        description: "Filtro opcional por cliente específico.",
      },
    ],
    granularities: [
      {
        id: "perTrip",
        label: "Por cotización",
        description: "Una fila por cada cotización en el periodo.",
      },
    ],
  },
  {
    id: "inventory-movements",
    label: "Movimientos de Inventario",
    description:
      "Movimientos de inventario filtrados por rango de fechas, tipo y almacén. " +
      "Incluye resumen con total de registros y cantidades por tipo de movimiento.",
    parameters: [
      {
        id: "dateFrom",
        label: "Fecha desde",
        kind: "date",
        scope: "run",
        description: "Fecha de inicio del periodo a consultar.",
      },
      {
        id: "dateTo",
        label: "Fecha hasta",
        kind: "date",
        scope: "run",
        description: "Fecha de fin del periodo a consultar.",
      },
      {
        id: "type",
        label: "Tipo de movimiento",
        kind: "string",
        scope: "run",
        description: "Filtro opcional por tipo (entry, exit, transfer, adjustment).",
      },
      {
        id: "warehouseId",
        label: "Almacén",
        kind: "string",
        scope: "run",
        description: "Filtro opcional por almacén específico.",
      },
      {
        id: "productId",
        label: "Producto",
        kind: "string",
        scope: "run",
        description: "Filtro opcional por producto específico.",
      },
    ],
    granularities: [
      {
        id: "perTrip",
        label: "Por movimiento",
        description: "Una fila por cada movimiento de inventario en el periodo.",
      },
    ],
  },
  {
    id: "stock-valuation",
    label: "Valorización de Stock",
    description:
      "Stock actual valorizado (quantity × purchasePrice) por producto y almacén. " +
      "Muestra el valor monetario del inventario en un momento dado.",
    parameters: [
      {
        id: "warehouseId",
        label: "Almacén",
        kind: "string",
        scope: "run",
        description: "Filtro opcional por almacén específico.",
      },
      {
        id: "productId",
        label: "Producto",
        kind: "string",
        scope: "run",
        description: "Filtro opcional por producto específico.",
      },
    ],
    granularities: [
      {
        id: "perTrip",
        label: "Por producto-almacén",
        description: "Una fila por cada combinación de producto y almacén con stock.",
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
