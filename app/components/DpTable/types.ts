import type { ReactNode } from "react";

/** Tipo de formato de celda: status (chip con color), label (texto desde typeOptions), bool (checkbox no editable), date (DD/MM/YYYY), datetime (DD/MM/YYYY HH:mm). */
export type DpTableDefColumnType = "status" | "label" | "bool" | "date" | "datetime";

/**
 * Definición de una columna de la tabla (estilo Angular tableDef).
 */
export interface DpTableDefColumn {
  /** Texto del encabezado */
  header: string;
  /** Clave de la propiedad en el objeto fila */
  column: string;
  /** Orden de la columna (menor = más a la izquierda) */
  order: number;
  /** Si la columna se muestra */
  display: boolean;
  /** Si la columna participa en el filtro global */
  filter?: boolean;
  /**
   * Si es `true`, la columna es ordenable en el encabezado.
   * Con una sola columna en `true`, la tabla usa orden simple; con varias, orden múltiple (`sort-multiple`).
   */
  sort?: boolean;
  /** Formato de visualización: status (chip), label (texto), bool (checkbox), date (DD/MM/YYYY), datetime (DD/MM/YYYY HH:mm) */
  type?: DpTableDefColumnType;
  /** Para type="status" o "label": mapa valor -> etiqueta (string) o { label, severity }. En "label" solo se usa `label`. */
  typeOptions?: Record<string, string | { label: string; severity?: "success" | "info" | "warning" | "danger" | "secondary" }>;
}

/**
 * Filas deben tener un id para selección.
 */
export interface DpTableRow {
  id: string;
}

/**
 * Fila de totales bajo la tabla (suma de columnas numéricas).
 * Las sumas usan por defecto las filas que pasan el filtro global (misma lógica que el buscador).
 */
export interface DpTableFooterTotals {
  /** Texto en la celda de etiqueta (p. ej. primera columna de datos). Por defecto `"Totales:"`. */
  label?: string;
  /** Claves `DpTableDefColumn.column` donde mostrar la suma. */
  sumColumns: string[];
  /**
   * Columna donde mostrar `label`. Por defecto: primera columna visible que no esté en `sumColumns`.
   */
  labelColumn?: string;
  /**
   * Por cada columna sumada, campo numérico en la fila (si difiere del nombre de la columna).
   * Ej.: columna `amountFormatted` → sumar `amount`.
   */
  sumValueKey?: Partial<Record<string, string>>;
  /**
   * Si es `false`, suma todas las filas del `data` sin aplicar el filtro global. Por defecto `true`.
   */
  respectGlobalFilter?: boolean;
  /** Formateo del total; si no se indica, número con 2 decimales (`es-PE`). */
  formatSum?: (sum: number, columnKey: string) => ReactNode;
}

/**
 * API expuesta por DpTable mediante ref (estilo Angular ViewChild).
 */
export interface DpTableRef<T extends DpTableRow> {
  setDatasource(data: T[]): void;
  clearDatasource(): void;
  setLoading(loading: boolean): void;
  getSelectedRows(): T[];
  clearSelectedRows(): void;
  filter(value: string): void;
}
