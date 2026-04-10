import type { ReactNode } from "react";
import { Button } from "primereact/button";

export interface DpContentInfoProps {
  /** Título del panel */
  title: string;
  /** Breadcrumb mapeado (ej. ["TRANSPORTE", "VIAJES", "COSTOS"]) */
  breadcrumbItems?: string[];
  backLabel: string;
  onBack: () => void;
  /** Acción del botón superior "Nuevo" */
  onCreate?: () => void;
  /** Texto del botón superior "Nuevo" */
  createLabel?: string;
  /** Controla visibilidad del botón Nuevo (además de tener handler) */
  showCreateButton?: boolean;
  editLabel?: string;
  onEdit?: () => void;
  children: ReactNode;
}

export default function DpContentInfo({
  title,
  breadcrumbItems,
  backLabel,
  onBack,
  onCreate,
  createLabel = "Nuevo",
  showCreateButton = true,
  editLabel,
  onEdit,
  children,
}: DpContentInfoProps) {
  const canShowEdit = editLabel != null && onEdit != null;
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
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            label={backLabel}
            icon="pi pi-chevron-left"
            className="dp-btn-soft"
            onClick={onBack}
          />
          {canShowEdit && (
            <Button
              type="button"
              label={editLabel}
              icon="pi pi-pencil"
              className="dp-btn-soft"
              onClick={onEdit}
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
      </div>
      <section className="dp-content-surface">
        <div className="relative">{children}</div>
      </section>
    </div>
  );
}
