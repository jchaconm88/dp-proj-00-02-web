import type { ReactNode } from "react";
import { Button } from "primereact/button";

export interface DpContentProps {
  /** Título del panel (ej. "USUARIOS") */
  title: string;
  /** Breadcrumb mapeado (ej. ["MANTENEDORES", "SERVICIOS DE TRANSPORTE"]) */
  breadcrumbItems?: string[];
  /** Acción del botón superior "Filtrar" */
  onFilterAction?: () => void;
  /** Acción del botón superior "Nuevo" */
  onCreate?: () => void;
  /** Texto del botón superior "Filtrar" */
  filterLabel?: string;
  /** Texto del botón superior "Nuevo" */
  createLabel?: string;
  /** Controla visibilidad del botón Filtrar (además de tener handler) */
  showFilterButton?: boolean;
  /** Controla visibilidad del botón Nuevo (además de tener handler) */
  showCreateButton?: boolean;
  children: ReactNode;
}

export default function DpContent({
  title,
  breadcrumbItems,
  onFilterAction,
  onCreate,
  filterLabel = "Filtrar",
  createLabel = "Nuevo",
  showFilterButton = true,
  showCreateButton = true,
  children,
}: DpContentProps) {
  const canShowFilter = showFilterButton && onFilterAction != null;
  const canShowCreate = showCreateButton && onCreate != null;

  return (
    <div className="pt-4 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 px-1">
        <div className="space-y-1">
          {breadcrumbItems != null && breadcrumbItems.length > 0 ? (
            <p className="dp-content-breadcrumb">
              {breadcrumbItems.map((item, idx) => (
                <span key={`${item}-${idx}`}>
                  {idx > 0 && <span className="dp-content-breadcrumb-sep">›</span>}
                  <span className={idx === breadcrumbItems.length - 1 ? "dp-content-breadcrumb-current" : ""}>
                    {item}
                  </span>
                </span>
              ))}
            </p>
          ) : (
            <p className="dp-content-subtitle">Kinetic Observatory</p>
          )}
          <h1 className="dp-content-title">{title}</h1>
        </div>
        {(canShowFilter || canShowCreate) && (
          <div className="flex flex-wrap items-center gap-2">
            {canShowFilter && (
              <Button
                type="button"
                label={filterLabel}
                icon="pi pi-filter"
                className="dp-btn-soft"
                onClick={onFilterAction}
              />
            )}
            {canShowCreate && (
              <Button
                type="button"
                label={createLabel}
                icon="pi pi-plus"
                className="dp-btn-neon"
                onClick={onCreate}
              />
            )}
          </div>
        )}
      </div>
      <section className="dp-content-surface">
        <div className="relative">{children}</div>
      </section>
    </div>
  );
}
