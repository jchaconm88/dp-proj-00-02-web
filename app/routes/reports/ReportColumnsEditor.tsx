import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  DndContext,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DpInput } from "~/components/DpInput";
import type { ReportColumnFormRow, ReportRowGranularity } from "~/features/reports/reports.types";
import {
  getBindingIdForOutputKey,
  getTripBindingById,
  getTripBindingsForGranularity,
} from "~/features/reports/report-trips-bindings.catalog";

const DROP_EXPORT_COLUMNS = "drop-export-columns";

function newRowId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `r-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function effectiveBindingId(row: ReportColumnFormRow, granularity: ReportRowGranularity): string {
  return row.bindingId?.trim() || getBindingIdForOutputKey(row.field, granularity) || row.field;
}

function ColumnPaletteChip({
  bindingId,
  used,
}: {
  bindingId: string;
  used: boolean;
}) {
  const meta = getTripBindingById(bindingId);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `pal-${bindingId}`,
    data: { type: "palette", bindingId },
    disabled: used,
  });
  if (!meta) return null;
  return (
    <button
      type="button"
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`touch-none rounded border border-slate-300 bg-white px-2 py-1 text-left text-xs shadow-sm dark:border-slate-600 dark:bg-slate-900 ${
        used
          ? "cursor-not-allowed opacity-45"
          : "hover:bg-slate-50 dark:hover:bg-slate-800"
      } ${isDragging ? "opacity-60" : ""}`}
    >
      <span className="font-medium text-slate-800 dark:text-slate-100">{meta.label}</span>
      <span className="ml-1 font-mono text-[11px] text-slate-500 dark:text-slate-400">({meta.id})</span>
    </button>
  );
}

function DroppableColumnsShelf({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: DROP_EXPORT_COLUMNS });
  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[6rem] flex-col rounded-lg border-2 border-dashed p-2 transition-colors ${
        isOver
          ? "border-indigo-400 bg-indigo-50/50 dark:border-indigo-500 dark:bg-indigo-950/30"
          : "border-slate-200 bg-white/60 dark:border-slate-600 dark:bg-slate-950/40"
      }`}
    >
      <div className="mb-1">
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{title}</span>
      </div>
      {hint ? <p className="mb-2 text-[11px] leading-snug text-slate-500 dark:text-slate-400">{hint}</p> : null}
      {children}
    </div>
  );
}

function SortableColumnRow({
  row,
  bindings,
  granularity,
  onBindingChange,
  onHeaderChange,
  onWidthChange,
  onRemove,
}: {
  row: ReportColumnFormRow;
  bindings: ReturnType<typeof getTripBindingsForGranularity>;
  granularity: ReportRowGranularity;
  onBindingChange: (bindingId: string) => void;
  onHeaderChange: (header: string) => void;
  onWidthChange: (width: string) => void;
  onRemove: () => void;
}) {
  const bid = effectiveBindingId(row, granularity);
  const meta = getTripBindingById(bid);

  const bindingSelectOptions = useMemo(() => {
    const opts = bindings.map((b) => ({
      value: b.id,
      label: `${b.group} — ${b.label} (${b.id})`,
    }));
    if (bid && !opts.some((o) => o.value === bid)) {
      opts.unshift({
        value: bid,
        label: `(sin binding) ${row.field}`,
      });
    }
    return opts;
  }, [bindings, bid, row.field]);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.rowId,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-600 dark:bg-slate-900 md:flex-row md:items-end ${
        isDragging ? "z-10 opacity-90 shadow-lg" : ""
      }`}
    >
      <button
        type="button"
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center self-start rounded text-slate-500 touch-none hover:bg-slate-100 dark:hover:bg-slate-800 md:self-end"
        aria-label="Arrastrar"
        {...attributes}
        {...listeners}
      >
        <i className="pi pi-bars" />
      </button>
      <div className="grid min-w-0 w-full flex-1 gap-3 md:grid-cols-[minmax(15rem,1.45fr)_minmax(12rem,1fr)_minmax(4.5rem,0.32fr)]">
        <div className="min-w-0">
          <DpInput
            type="select"
            label="Dato del origen (mapeo)"
            className="min-w-0"
            value={bindingSelectOptions.some((o) => o.value === bid) ? bid : (bindingSelectOptions[0]?.value ?? "")}
            onChange={(v) => onBindingChange(String(v))}
            options={bindingSelectOptions}
            filter
            placeholder="Buscar…"
          />
          {meta ? (
            <p className="mt-1 text-xs leading-snug text-slate-600 dark:text-slate-400">
              <span className="font-medium text-slate-700 dark:text-slate-300">Origen:</span> {meta.mapFrom}
              {" · "}
              <span className="font-medium text-slate-700 dark:text-slate-300">Columna fila:</span>{" "}
              <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">{meta.outputKey}</code>
            </p>
          ) : null}
        </div>
        <DpInput
          type="input"
          label="Encabezado en Excel"
          className="min-w-0"
          value={row.header}
          onChange={(v) => onHeaderChange(String(v))}
        />
        <DpInput
          type="input"
          label="Ancho"
          className="min-w-0"
          value={row.width}
          onChange={(v) => onWidthChange(String(v))}
          placeholder="px"
        />
      </div>
      <button
        type="button"
        className="rounded p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
        aria-label="Eliminar columna"
        onClick={onRemove}
      >
        <i className="pi pi-times" />
      </button>
    </div>
  );
}

export interface ReportColumnsEditorProps {
  granularity: ReportRowGranularity;
  value: ReportColumnFormRow[];
  onChange: (next: ReportColumnFormRow[]) => void;
}

export default function ReportColumnsEditor({ granularity, value, onChange }: ReportColumnsEditorProps) {
  const bindings = useMemo(() => getTripBindingsForGranularity(granularity), [granularity]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const [paletteHint, setPaletteHint] = useState<string | null>(null);

  useEffect(() => {
    if (!paletteHint) return;
    const t = window.setTimeout(() => setPaletteHint(null), 2800);
    return () => window.clearTimeout(t);
  }, [paletteHint]);

  const usedFields = useMemo(() => new Set(value.map((r) => r.field)), [value]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const aid = String(active.id);
    const oid = String(over.id);

    if (aid.startsWith("pal-")) {
      const bindingId = aid.slice(4);
      const b = getTripBindingById(bindingId);
      if (!b) return;
      if (usedFields.has(b.outputKey)) {
        setPaletteHint("Ese campo ya está en la lista de columnas.");
        return;
      }

      const newRow: ReportColumnFormRow = {
        rowId: newRowId(),
        bindingId: b.id,
        field: b.outputKey,
        header: b.defaultHeader,
        width: String(b.defaultWidth),
      };

      if (oid === DROP_EXPORT_COLUMNS) {
        onChange([...value, newRow]);
        return;
      }

      const insertIndex = value.findIndex((r) => r.rowId === oid);
      if (insertIndex >= 0) {
        const next = [...value];
        next.splice(insertIndex, 0, newRow);
        onChange(next);
      }
      return;
    }

    if (aid === oid) return;
    const oldIndex = value.findIndex((r) => r.rowId === aid);
    const newIndex = value.findIndex((r) => r.rowId === oid);
    if (oldIndex < 0 || newIndex < 0) return;
    onChange(arrayMove(value, oldIndex, newIndex));
  };

  const addNextSuggestedColumn = () => {
    const taken = new Set(value.map((r) => r.field));
    const nextB = bindings.find((b) => !taken.has(b.outputKey));
    if (!nextB) return;
    onChange([
      ...value,
      {
        rowId: newRowId(),
        bindingId: nextB.id,
        field: nextB.outputKey,
        header: nextB.defaultHeader,
        width: String(nextB.defaultWidth),
      },
    ]);
  };

  const updateRow = (rowId: string, patch: Partial<ReportColumnFormRow>) => {
    onChange(value.map((r) => (r.rowId === rowId ? { ...r, ...patch } : r)));
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Columnas del reporte</p>
        <button
          type="button"
          className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 dark:border-slate-600 dark:text-slate-400"
          onClick={addNextSuggestedColumn}
          disabled={value.length >= bindings.length}
          title="Añade el siguiente campo del catálogo que aún no esté en la lista"
        >
          Añadir siguiente sugerida
        </button>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Arrastrá campos desde la izquierda al estante de columnas (igual que en el constructor pivot). Podés reordenar
        con ⋮⋮ o cambiar encabezado y ancho en cada fila. Los campos ya agregados aparecen atenuados en la paleta.
      </p>
      {paletteHint ? (
        <p className="text-xs text-amber-800 dark:text-amber-200/90" role="status">
          {paletteHint}
        </p>
      ) : null}

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <div className="grid gap-3 lg:grid-cols-[minmax(14rem,1fr)_2fr]">
          <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-600 dark:bg-slate-900/40">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Campos disponibles</p>
            <p className="text-[11px] leading-snug text-slate-500 dark:text-slate-400">
              Arrastrá hacia “Columnas del Excel”. Cada chip es un dato del origen viajes.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {bindings.map((b) => (
                <ColumnPaletteChip key={b.id} bindingId={b.id} used={usedFields.has(b.outputKey)} />
              ))}
            </div>
          </div>

          <DroppableColumnsShelf
            title="Columnas del Excel (orden de exportación)"
            hint="Soltá aquí los campos de la paleta. El orden de las filas es el orden de columnas en la hoja."
          >
            <SortableContext items={value.map((r) => r.rowId)} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-2">
                {value.length === 0 ? (
                  <p className="py-4 text-center text-xs text-slate-500 dark:text-slate-400">
                    Ninguna columna aún. Arrastrá campos desde la izquierda.
                  </p>
                ) : null}
                {value.map((row) => (
                  <SortableColumnRow
                    key={row.rowId}
                    row={row}
                    bindings={bindings}
                    granularity={granularity}
                    onBindingChange={(bindingId) => {
                      const b = getTripBindingById(bindingId);
                      if (!b) return;
                      updateRow(row.rowId, {
                        bindingId: b.id,
                        field: b.outputKey,
                        header: b.defaultHeader,
                        width: String(b.defaultWidth),
                      });
                    }}
                    onHeaderChange={(header) => updateRow(row.rowId, { header })}
                    onWidthChange={(width) => updateRow(row.rowId, { width })}
                    onRemove={() => onChange(value.filter((r) => r.rowId !== row.rowId))}
                  />
                ))}
              </div>
            </SortableContext>
          </DroppableColumnsShelf>
        </div>
      </DndContext>
    </div>
  );
}
