import { useEffect, useState, type ReactNode } from "react";
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
   * "dialog" = solo documentación; el modo diálogo se activa con `visible`.
   */
  variant?: "panel" | "inline" | "dialog";
  visible?: boolean;
  onHide?: () => void;
  /** Para un segundo `Dialog` encima de otro (p. ej. modal dentro de modal). */
  dialogBaseZIndex?: number;
  /** Ancho del `Dialog` cuando `visible` está definido (p. ej. `min(56rem, 96vw)`). Por defecto `36rem`. */
  dialogWidth?: string;
  showLoading?: boolean;
  loadingMessage?: string;
  showError?: boolean;
  errorMessage?: string;
  dismissibleError?: boolean;
  /**
   * Solo en modo diálogo (`visible`): contenido fijo encima del área con scroll.
   * Útil cuando `position: sticky` no aplica (p. ej. por `transform` en el `Dialog` de PrimeReact).
   */
  dialogBodyHeader?: ReactNode;
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
        label={saving ? "Guardando..." : saveLabel}
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
  dialogBaseZIndex,
  dialogWidth,
  showLoading = false,
  loadingMessage = "Cargando...",
  showError = false,
  errorMessage = "",
  dismissibleError = true,
  dialogBodyHeader,
  children,
}: DpContentSetProps) {
  const [errorClosed, setErrorClosed] = useState(false);

  useEffect(() => {
    setErrorClosed(false);
  }, [errorMessage]);

  const canShowError = showError && !!errorMessage && !errorClosed;

  const errorBannerDialog = canShowError && !showLoading && (
    <div className="px-6 pt-3">
      <div
        role="alert"
        className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-white px-4 py-3 text-sm text-red-700 shadow-md dark:border-red-900/40 dark:bg-zinc-900 dark:text-red-300"
      >
        <span className="min-w-0 flex-1 leading-snug">{errorMessage}</span>
        {dismissibleError && (
          <button
            type="button"
            onClick={() => setErrorClosed(true)}
            aria-label="Cerrar error"
            className="flex-shrink-0 rounded p-1 text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-900/30"
          >
            <i className="pi pi-times" />
          </button>
        )}
      </div>
    </div>
  );

  /** Mismo estilo “toast” que en diálogo, para panel/inline */
  const errorBannerInline = canShowError && !showLoading && (
    <div
      role="alert"
      className="flex w-full flex-shrink-0 items-start justify-between gap-3 rounded-xl border border-red-200 bg-white px-4 py-3 text-sm text-red-700 shadow-md dark:border-red-900/40 dark:bg-zinc-900 dark:text-red-300"
    >
      <span className="min-w-0 flex-1 leading-snug">{errorMessage}</span>
      {dismissibleError && (
        <button
          type="button"
          onClick={() => setErrorClosed(true)}
          aria-label="Cerrar error"
          className="flex-shrink-0 rounded p-1 text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-900/30"
        >
          <i className="pi pi-times" />
        </button>
      )}
    </div>
  );

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

  const scrollBody = showLoading ? (
    <div className="py-8 text-center text-zinc-500">{loadingMessage}</div>
  ) : (
    children
  );

  /** Contenido con error embebido (panel / inline): barra opaca ancho completo */
  const contentElWithInlineError = showLoading ? (
    <div className="py-8 text-center text-zinc-500">{loadingMessage}</div>
  ) : (
    <>
      {errorBannerInline}
      {children}
    </>
  );

  if (visible !== undefined) {
    return (
      <Dialog
        header={title}
        visible={visible}
        onHide={onHide ?? onCancel}
        baseZIndex={dialogBaseZIndex}
        style={{ width: dialogWidth ?? "36rem", maxHeight: "90vh" }}
        contentStyle={{ overflow: "hidden", display: "flex", flexDirection: "column", padding: 0 }}
        pt={{
          header: { className: "border-b border-zinc-200 dark:border-zinc-700" },
        }}
        closable={!saving}
        closeOnEscape={!saving}
        dismissableMask={!saving}
        blockScroll
        modal
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {errorBannerDialog}
          {dialogBodyHeader != null ? (
            <div className="flex-shrink-0 border-b border-zinc-200 bg-white px-6 pt-3 dark:border-zinc-700 dark:bg-zinc-950">
              {dialogBodyHeader}
            </div>
          ) : null}
          <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-4 pb-4">
            <div className="flex flex-col gap-4">{scrollBody}</div>
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
        {contentElWithInlineError}
        {footerEl}
      </div>
    );
  }

  return (
    <Panel header={title}>
      <div className="space-y-4">
        {contentElWithInlineError}
        {footerEl}
      </div>
    </Panel>
  );
}
