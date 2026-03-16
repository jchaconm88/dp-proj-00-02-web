import type { ReactNode } from "react";
import { Panel } from "primereact/panel";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";

export interface DpContentSetProps {
  /** Título del panel o diálogo */
  title: string;
  cancelLabel?: string;
  onCancel: () => void;
  saveLabel?: string;
  onSave: () => void;
  saving?: boolean;
  saveDisabled?: boolean;
  /**
   * "panel" = Panel con título.
   * "inline" = solo contenido + botones.
   * Si se pasa visible (boolean), se usa modo "dialog".
   */
  variant?: "panel" | "inline";
  visible?: boolean;
  onHide?: () => void;
  children: ReactNode;
}

function FooterButtons({
  cancelLabel,
  saveLabel,
  onCancel,
  onSave,
  saving,
  saveDisabled,
}: {
  cancelLabel: string;
  saveLabel: string;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
  saveDisabled: boolean;
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
      <Button
        type="button"
        label={cancelLabel}
        severity="secondary"
        onClick={onCancel}
        disabled={saving}
      />
      <Button
        type="button"
        label={saving ? "Guardandoâ€¦" : saveLabel}
        onClick={onSave}
        disabled={saving || saveDisabled}
        loading={saving}
      />
    </div>
  );
}

export default function DpContentSet({
  title,
  cancelLabel = "Cancelar",
  onCancel,
  saveLabel = "Guardar",
  onSave,
  saving = false,
  saveDisabled = false,
  variant = "panel",
  visible,
  onHide,
  children,
}: DpContentSetProps) {
  const footerEl = (
    <FooterButtons
      cancelLabel={cancelLabel}
      saveLabel={saveLabel}
      onCancel={onCancel}
      onSave={onSave}
      saving={saving}
      saveDisabled={saveDisabled}
    />
  );

  if (visible !== undefined) {
    return (
      <Dialog
        header={title}
        visible={visible}
        onHide={onHide ?? onCancel}
        style={{ width: "36rem", maxHeight: "90vh" }}
        contentStyle={{ overflow: "hidden", display: "flex", flexDirection: "column", padding: 0 }}
        closable={!saving}
        closeOnEscape={!saving}
        dismissableMask={!saving}
        blockScroll
        modal
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-4 pb-4">
            <div className="flex flex-col gap-4">{children}</div>
          </div>
          <div className="flex-shrink-0 border-t border-zinc-200 bg-zinc-50/80 px-6 py-4 dark:border-zinc-700 dark:bg-zinc-900/50">
            {footerEl}
          </div>
        </div>
      </Dialog>
    );
  }

  if (variant === "inline") {
    return (
      <div className="flex flex-col gap-4">
        {children}
        {footerEl}
      </div>
    );
  }

  return (
    <Panel header={title}>
      <div className="space-y-4">
        {children}
        {footerEl}
      </div>
    </Panel>
  );
}
