import type { ReactNode } from "react";

export interface DpFilterItemRenderProps<T = unknown> {
  value: T;
  onChange: (value: T) => void;
  error?: string;
}

export interface DpFilterItemProps<T = unknown> {
  /** Clave del filtro en el objeto final. */
  name: string;
  /** Etiqueta para validaciones y accesibilidad. */
  label: string;
  /** Si es obligatorio, se valida al pulsar Buscar. */
  required?: boolean;
  /** Span de columnas en grid del bloque de filtros. */
  colSpan?: 1 | 2 | 3 | 4;
  /** Resumen mostrado cuando el panel está oculto y hay filtros activos. */
  summary?: (value: T) => string;
  /** Render del control (normalmente un DpInput). */
  children: (props: DpFilterItemRenderProps<T>) => ReactNode;
}

/** Marcador de composición: el render lo controla DpContentFilter. */
export default function DpFilterItem<T>(_props: DpFilterItemProps<T>): null {
  return null;
}

