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
  /** Muestra/oculta input de filtro aunque tenga handler */
  showFilterInput?: boolean;
  /** Muestra/oculta botón Crear aunque tenga handler */
  showCreateButton?: boolean;
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
  showFilterInput = true,
  showCreateButton = true,
  children,
}: DpContentHeaderProps) {
  const customActions: ReactNode[] = [];
  Children.forEach(children, (child) => {
    if (isDpContentHeaderActionChild(child)) {
      customActions.push(child.props.children);
    }
  });

  return (
    <div className="dp-content-header-shell">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {showFilterInput && onFilter != null && (
          <IconField iconPosition="left" className="w-full md:max-w-sm">
            <InputIcon className="pi pi-search" />
            <InputText
              id="filterInput"
              type="search"
              value={filterValue}
              placeholder={filterPlaceholder}
              onChange={(e) => onFilter(e.target.value)}
              className="dp-toolbar-input w-full text-sm"
            />
          </IconField>
        )}
        <div className="flex flex-wrap items-center justify-end gap-2">
          {onLoad != null && (
            <Button
              icon="pi pi-refresh"
              rounded
              text
              className="dp-btn-soft"
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
              className="dp-btn-soft"
              onClick={onDelete}
              disabled={deleteDisabled}
            />
          )}
          {showCreateButton && onCreate != null && (
            <Button
              size="small"
              onClick={onCreate}
              icon="pi pi-plus"
              label="Nuevo"
              className="dp-btn-neon"
            />
          )}
        </div>
      </div>
    </div>
  );
}

export { DpContentHeaderAction };
