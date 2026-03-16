import type { ReactNode } from "react";
import { Panel } from "primereact/panel";

export interface DpContentInfoProps {
  /** Título del panel */
  title: string;
  backLabel: string;
  onBack: () => void;
  editLabel?: string;
  onEdit?: () => void;
  children: ReactNode;
}

const btnClass =
  "flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700";

export default function DpContentInfo({
  title,
  backLabel,
  onBack,
  editLabel,
  onEdit,
  children,
}: DpContentInfoProps) {
  return (
    <Panel header={title}>
      <div className="space-y-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <button type="button" onClick={onBack} className={btnClass}>
            <i className="pi pi-chevron-left text-xs" />
            {backLabel}
          </button>
          {editLabel != null && onEdit != null && (
            <button type="button" onClick={onEdit} className={btnClass}>
              <i className="pi pi-pencil text-xs" />
              {editLabel}
            </button>
          )}
        </div>
        {children}
      </div>
    </Panel>
  );
}
