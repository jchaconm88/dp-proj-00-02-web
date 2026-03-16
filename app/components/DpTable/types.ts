/** Tipo de formato de celda: status (chip con color), bool (checkbox no editable), date (DD/MM/YYYY), datetime (DD/MM/YYYY HH:mm). */
export type DpTableDefColumnType = "status" | "bool" | "date" | "datetime";

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
  /** Formato de visualización: status (chip), bool (checkbox), date (DD/MM/YYYY), datetime (DD/MM/YYYY HH:mm) */
  type?: DpTableDefColumnType;
  /** Para type="status": mapa valor â†’ etiqueta (string) o { label, severity } para definir color del chip. Severity: success|info|warning|danger|secondary. */
  typeOptions?: Record<string, string | { label: string; severity?: "success" | "info" | "warning" | "danger" | "secondary" }>;
}

/**
 * Filas deben tener un id para selección.
 */
export interface DpTableRow {
  id: string;
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
