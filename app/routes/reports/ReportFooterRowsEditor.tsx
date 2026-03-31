import { useMemo, type ReactNode } from "react";
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
import { defaultFooterForGranularity } from "~/features/reports/report-columns.catalog";
import type {
  ReportColumnFormRow,
  ReportFooterRowSpec,
  ReportFooterSpec,
  ReportRowGranularity,
} from "~/features/reports/reports.types";

const DROP_FOOTER_ROWS = "drop-footer-rows";
const FPAL_SUM = "fpal-sum-column";
const FPAL_MUL = "fpal-multiply-footer";
const FPAL_REFS = "fpal-sum-footer-refs";

function newRowId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `fr-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function firstNumericField(columns: ReportColumnFormRow[], gran: ReportRowGranularity): string {
  const numeric =
    gran === "perTrip"
      ? new Set(["total", "totalFlete", "totalApoyoExtra"])
      : new Set(["cantidad", "pUni", "pTotal"]);
  const hit = columns.find((c) => numeric.has(c.field.trim()));
  return hit?.field.trim() ?? columns[0]?.field.trim() ?? "total";
}

function PaletteChip({ id, label }: { id: string; label: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id, data: { type: "fpal", id } });
  return (
    <button
      type="button"
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`touch-none rounded border border-slate-300 bg-white px-2 py-1 text-left text-xs shadow-sm hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:hover:bg-slate-800 ${
        isDragging ? "opacity-60" : ""
      }`}
    >
      {label}
    </button>
  );
}

function DroppableFooterShelf({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: DROP_FOOTER_ROWS });
  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[5rem] flex-col rounded-lg border-2 border-dashed p-2 transition-colors ${
        isOver
          ? "border-indigo-400 bg-indigo-50/50 dark:border-indigo-500 dark:bg-indigo-950/30"
          : "border-slate-200 bg-white/60 dark:border-slate-600 dark:bg-slate-950/40"
      }`}
    >
      <span className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-200">{title}</span>
      {hint ? <p className="mb-2 text-[11px] leading-snug text-slate-500 dark:text-slate-400">{hint}</p> : null}
      {children}
    </div>
  );
}

function rowRefsBefore(rows: ReportFooterRowSpec[], beforeRowId: string): ReportFooterRowSpec[] {
  const idx = rows.findIndex((r) => r.rowId === beforeRowId);
  if (idx <= 0) return [];
  return rows.slice(0, idx);
}

function SortableFooterRowEditor({
  row,
  index,
  rows,
  columnOptions,
  onChange,
  onRemove,
}: {
  row: ReportFooterRowSpec;
  index: number;
  rows: ReportFooterRowSpec[];
  columnOptions: { value: string; label: string }[];
  onChange: (next: ReportFooterRowSpec) => void;
  onRemove: () => void;
}) {
  const before = rowRefsBefore(rows, row.rowId);
  const refOptions = before.map((r) => ({
    value: r.rowId,
    label: `${r.label} (${r.rowId.slice(0, 8)}…)`,
  }));

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.rowId,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-600 dark:bg-slate-900 ${
        isDragging ? "z-10 opacity-90 shadow-lg" : ""
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded text-slate-500 touch-none hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Arrastrar"
          {...attributes}
          {...listeners}
        >
          <i className="pi pi-bars" />
        </button>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">Fila {index + 1}</span>
        <button
          type="button"
          className="ml-auto rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
          aria-label="Quitar"
          onClick={onRemove}
        >
          <i className="pi pi-times" />
        </button>
      </div>
      <DpInput
        type="input"
        label="Etiqueta (columna de textos del pie)"
        value={row.label}
        onChange={(v) => onChange({ ...row, label: String(v) })}
      />
      <DpInput
        type="select"
        label="Operación"
        value={row.op}
        onChange={(v) => {
          const op = v as ReportFooterRowSpec["op"];
          if (op === "sumColumn") {
            onChange({
              rowId: row.rowId,
              label: row.label,
              op: "sumColumn",
              sourceField: columnOptions[0]?.value ?? "",
            });
          } else if (op === "multiplyFooter") {
            onChange({
              rowId: row.rowId,
              label: row.label,
              op: "multiplyFooter",
              refRowId: refOptions[0]?.value ?? "",
              factor: 0.18,
            });
          } else {
            onChange({
              rowId: row.rowId,
              label: row.label,
              op: "sumFooterRefs",
              refRowIds: refOptions.slice(-2).map((o) => o.value),
            });
          }
        }}
        options={[
          { label: "Suma columna de datos", value: "sumColumn" },
          { label: "Valor de fila del pie × factor", value: "multiplyFooter" },
          { label: "Suma celdas de filas del pie", value: "sumFooterRefs" },
        ]}
      />
      {row.op === "sumColumn" ? (
        <DpInput
          type="select"
          label="Columna a sumar"
          value={row.sourceField}
          onChange={(v) => onChange({ ...row, op: "sumColumn", sourceField: String(v) })}
          options={columnOptions}
          filter
        />
      ) : null}
      {row.op === "multiplyFooter" ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <DpInput
            type="select"
            label="Fila del pie (referencia)"
            value={row.refRowId}
            onChange={(v) => onChange({ ...row, op: "multiplyFooter", refRowId: String(v) })}
            options={refOptions.length ? refOptions : [{ value: "", label: "(Añadí una fila suma antes)" }]}
          />
          <DpInput
            type="input"
            label="Factor (ej. 0.18)"
            value={String(row.factor)}
            onChange={(v) => {
              const n = parseFloat(String(v).replace(",", "."));
              onChange({
                ...row,
                op: "multiplyFooter",
                factor: Number.isFinite(n) ? n : 0,
              });
            }}
          />
        </div>
      ) : null}
      {row.op === "sumFooterRefs" ? (
        <div className="space-y-1">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Referencias (orden de aparición en el pie). Elegí una o más filas anteriores:
          </p>
          <div className="flex flex-wrap gap-2">
            {refOptions.map((o) => {
              const checked = row.refRowIds.includes(o.value);
              return (
                <label key={o.value} className="flex cursor-pointer items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      const next = checked
                        ? row.refRowIds.filter((id) => id !== o.value)
                        : [...row.refRowIds, o.value];
                      onChange({ ...row, op: "sumFooterRefs", refRowIds: next });
                    }}
                  />
                  {o.label}
                </label>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export interface ReportFooterRowsEditorProps {
  granularity: ReportRowGranularity;
  columns: ReportColumnFormRow[];
  footer: ReportFooterSpec;
  onChange: (footer: ReportFooterSpec) => void;
}

export default function ReportFooterRowsEditor({
  granularity,
  columns,
  footer,
  onChange,
}: ReportFooterRowsEditorProps) {
  const rows = footer.mode === "rows" && footer.rows ? footer.rows : [];
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const columnOptions = useMemo(() => {
    return columns
      .filter((c) => c.field.trim())
      .map((c) => ({ value: c.field.trim(), label: `${c.header || c.field} (${c.field})` }));
  }, [columns]);

  const setRows = (nextRows: ReportFooterRowSpec[]) => {
    onChange({ mode: "rows", rows: nextRows });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const aid = String(active.id);
    const oid = String(over.id);

    if (aid.startsWith("fpal-")) {
      const sf = firstNumericField(columns, granularity);
      if (oid !== DROP_FOOTER_ROWS && !rows.some((r) => r.rowId === oid)) return;
      const newId = newRowId();
      let newRow: ReportFooterRowSpec;
      if (aid === FPAL_SUM) {
        newRow = { rowId: newId, label: "SUB TOTAL", op: "sumColumn", sourceField: sf };
      } else if (aid === FPAL_MUL) {
        const refId = rows.length ? rows[rows.length - 1]!.rowId : "";
        newRow = { rowId: newId, label: "IGV", op: "multiplyFooter", refRowId: refId, factor: 0.18 };
      } else {
        const refIds = rows.slice(-2).map((r) => r.rowId);
        newRow = { rowId: newId, label: "TOTAL", op: "sumFooterRefs", refRowIds: refIds };
      }
      if (oid === DROP_FOOTER_ROWS) {
        setRows([...rows, newRow]);
      } else {
        const ins = rows.findIndex((r) => r.rowId === oid);
        if (ins >= 0) {
          const copy = [...rows];
          copy.splice(ins, 0, newRow);
          setRows(copy);
        }
      }
      return;
    }

    if (aid === oid) return;
    const oldIndex = rows.findIndex((r) => r.rowId === aid);
    const newIndex = rows.findIndex((r) => r.rowId === oid);
    if (oldIndex < 0 || newIndex < 0) return;
    setRows(arrayMove(rows, oldIndex, newIndex));
  };

  const applyTemplate = (kind: "dd" | "ra") => {
    onChange(defaultFooterForGranularity(kind === "dd" ? "perTrip" : "perAssignment"));
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded border border-slate-300 px-2 py-1 text-xs font-medium dark:border-slate-600"
          onClick={() => applyTemplate("dd")}
          disabled={granularity !== "perTrip"}
          title="Solo aplica a granularidad por viaje"
        >
          Plantilla DD (subtotal + IGV + total)
        </button>
        <button
          type="button"
          className="rounded border border-slate-300 px-2 py-1 text-xs font-medium dark:border-slate-600"
          onClick={() => applyTemplate("ra")}
          disabled={granularity !== "perAssignment"}
        >
          Plantilla RA (suma P.TOTAL)
        </button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <div className="grid gap-3 lg:grid-cols-[minmax(12rem,1fr)_2fr]">
          <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-600 dark:bg-slate-900/40">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Añadir fila</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Arrastrá al estante derecho.</p>
            <div className="flex flex-col gap-1.5">
              <PaletteChip id={FPAL_SUM} label="Suma columna de datos" />
              <PaletteChip id={FPAL_MUL} label="Fila del pie × factor" />
              <PaletteChip id={FPAL_REFS} label="Suma filas del pie" />
            </div>
          </div>

          <DroppableFooterShelf
            title="Orden del pie (arriba → abajo en el Excel)"
            hint="Las filas que referencian otras deben ir después. Reordená con ⋮⋮."
          >
            <SortableContext items={rows.map((r) => r.rowId)} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-2">
                {rows.length === 0 ? (
                  <p className="py-3 text-center text-xs text-slate-500 dark:text-slate-400">
                    Soltá aquí o usá una plantilla.
                  </p>
                ) : null}
                {rows.map((r, i) => (
                  <SortableFooterRowEditor
                    key={r.rowId}
                    row={r}
                    index={i}
                    rows={rows}
                    columnOptions={columnOptions}
                    onChange={(next) => setRows(rows.map((x) => (x.rowId === r.rowId ? next : x)))}
                    onRemove={() => setRows(rows.filter((x) => x.rowId !== r.rowId))}
                  />
                ))}
              </div>
            </SortableContext>
          </DroppableFooterShelf>
        </div>
      </DndContext>
    </div>
  );
}
