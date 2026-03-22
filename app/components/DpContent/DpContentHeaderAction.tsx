import type { ReactNode } from "react";

/**
 * Slot de acciones personalizadas dentro de `DpContentHeader` (patrón similar a `DpTColumn` en `DpTable`).
 * El componente no renderiza nada por sí mismo; el padre extrae `children` y los coloca en la barra de herramientas.
 *
 * @example
 * ```tsx
 * <DpContentHeader ...>
 *   <DpContentHeaderAction>
 *     <Button label="Extra" onClick={...} />
 *   </DpContentHeaderAction>
 * </DpContentHeader>
 * ```
 */
export interface DpContentHeaderActionProps {
  children: ReactNode;
}

function DpContentHeaderAction(_props: DpContentHeaderActionProps): null {
  return null;
}

export default DpContentHeaderAction;
