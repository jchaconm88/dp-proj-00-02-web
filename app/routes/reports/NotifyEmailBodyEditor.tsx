import { lazy, Suspense, useEffect, useState } from "react";
import type { NotifyEmailBodyEditorCoreProps } from "./NotifyEmailBodyEditorCore";

const NotifyEmailBodyEditorCore = lazy(() => import("./NotifyEmailBodyEditorCore"));

export type NotifyEmailBodyEditorProps = NotifyEmailBodyEditorCoreProps;

/**
 * Monta el editor solo en el cliente para evitar problemas de SSR/hidratación con Quill.
 */
export default function NotifyEmailBodyEditor(props: NotifyEmailBodyEditorCoreProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className="flex min-h-[220px] items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500 dark:border-slate-600 dark:bg-slate-900/40 dark:text-slate-400"
        aria-hidden
      >
        Cargando editor…
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="flex min-h-[220px] items-center justify-center rounded-md border border-slate-300 bg-slate-50 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
          Cargando editor…
        </div>
      }
    >
      <NotifyEmailBodyEditorCore {...props} />
    </Suspense>
  );
}
