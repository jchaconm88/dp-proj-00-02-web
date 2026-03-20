import { type ReactNode } from "react";
import { Dialog } from "primereact/dialog";
import { Button } from "primereact/button";

export interface DpConfirmDialogProps {
  visible: boolean;
  onHide: () => void;
  title?: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  /** "danger" para eliminaciones; "primary" para acciones neutras */
  severity?: "danger" | "primary";
  loading?: boolean;
}

/**
 * Modal de confirmación alineado con DpContentSet (PrimeReact Dialog + Tailwind).
 * Uso genérico: controlar `visible` y callbacks desde el padre.
 */
export default function DpConfirmDialog({
  visible,
  onHide,
  title = "Confirmar",
  message,
  confirmLabel = "Aceptar",
  cancelLabel = "Cancelar",
  onConfirm,
  severity = "danger",
  loading = false,
}: DpConfirmDialogProps) {
  const confirmSeverity = severity === "danger" ? "danger" : undefined;

  const footer = (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button
        type="button"
        label={cancelLabel}
        severity="secondary"
        onClick={onHide}
        disabled={loading}
      />
      <Button
        type="button"
        label={confirmLabel}
        severity={confirmSeverity}
        onClick={onConfirm}
        disabled={loading}
        loading={loading}
      />
    </div>
  );

  return (
    <Dialog
      header={title}
      visible={visible}
      onHide={loading ? () => {} : onHide}
      footer={footer}
      style={{ width: "28rem", maxWidth: "calc(100vw - 2rem)" }}
      contentStyle={{ padding: "1rem 1.5rem" }}
      pt={{
        header: { className: "border-b border-zinc-200 dark:border-zinc-700" },
        footer: { className: "border-t border-zinc-200 bg-zinc-50/80 dark:border-zinc-700 dark:bg-zinc-900/50" },
      }}
      closable={!loading}
      closeOnEscape={!loading}
      dismissableMask={!loading}
      blockScroll
      modal
    >
      <div className="flex gap-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-200">
        {severity === "danger" && (
          <span
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-300"
            aria-hidden
          >
            <i className="pi pi-exclamation-triangle text-lg" />
          </span>
        )}
        <div className="min-w-0 flex-1 pt-1">{message}</div>
      </div>
    </Dialog>
  );
}
