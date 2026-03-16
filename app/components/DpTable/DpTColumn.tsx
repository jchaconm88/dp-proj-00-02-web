import type { ReactNode } from "react";

/**
 * Props para definir una columna personalizada en DpTable (equivalente a dp-per-column en Angular).
 */
export interface DpTColumnProps<T = unknown> {
  /** Nombre de la columna (debe coincidir con tableDef[].column) */
  name: string;
  /** Render de la celda: recibe la fila y devuelve el contenido */
  children: (row: T) => ReactNode;
}

/**
 * Columna personalizada para DpTable. Se usa como hijo de DpTable para redefinir
 * el contenido de una columna por nombre.
 */
function DpTColumn<T>(_props: DpTColumnProps<T>): null {
  return null;
}

export default DpTColumn;
