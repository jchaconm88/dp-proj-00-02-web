import { Children, Fragment, isValidElement, type ReactElement, type ReactNode } from "react";
import { Button } from "primereact/button";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { InputText } from "primereact/inputtext";
import DpContentHeaderAction from "./DpContentHeaderAction";

export interface DpContentHeaderProps {
  /** Valor del filtro (controlado) */
  filterValue?: string;
  /** Se invoca al cambiar el texto del filtro */
  onFilter?: (value: string) => void;
  /** Recargar / refrescar datos */
  onLoad?: () => void;
  /** Crear / agregar nuevo */
  onCreate?: () => void;
  /** Eliminar selección */
  onDelete?: () => void;
  /** Deshabilita el botón Eliminar (ej. sin filas seleccionadas) */
  deleteDisabled?: boolean;
  /** Loading durante recarga */
  loading?: boolean;
  /** Placeholder del campo de filtro */
  filterPlaceholder?: string;
  /**
   * Acciones extra: usar `<DpContentHeaderAction>…</DpContentHeaderAction>`.
   * Se muestran después de Actualizar y antes de Eliminar.
   */
  children?: ReactNode;
}

function isDpContentHeaderActionChild(
  child: ReactNode
): child is ReactElement<{ children: ReactNode }> {
  return isValidElement(child) && child.type === DpContentHeaderAction;
}

export default function DpContentHeader({
  filterValue = "",
  onFilter,
  onLoad,
  onCreate,
  onDelete,
  deleteDisabled = true,
  loading = false,
  filterPlaceholder = "Filtrar...",
  children,
}: DpContentHeaderProps) {
  const customActions: ReactNode[] = [];
  Children.forEach(children, (child) => {
    if (isDpContentHeaderActionChild(child)) {
      customActions.push(child.props.children);
    }
  });

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {onFilter != null && (
        <IconField iconPosition="left">
          <InputIcon className="pi pi-search" />
          <InputText
            id="filterInput"
            type="search"
            value={filterValue}
            placeholder={filterPlaceholder}
            onChange={(e) => onFilter(e.target.value)}
            className="w-full sm:w-auto"
          />
        </IconField>
      )}
      {onLoad != null && (
        <Button
          icon="pi pi-refresh"
          rounded
          onClick={onLoad}
          disabled={loading}
          aria-label="Actualizar"
        />
      )}
      {customActions.map((node, i) => (
        <Fragment key={i}>{node}</Fragment>
      ))}
      {onDelete != null && (
        <Button
          size="small"
          icon="pi pi-trash"
          label="Eliminar"
          onClick={onDelete}
          disabled={deleteDisabled}
        />
      )}
      {onCreate != null && (
        <Button
          size="small"
          onClick={onCreate}
          icon="pi pi-plus"
          label="Agregar"
        />
      )}
    </div>
  );
}

export { DpContentHeaderAction };
