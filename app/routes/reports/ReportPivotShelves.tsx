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
import type {
  PivotFilterOp,
  PivotMeasureAgg,
  ReportPivotFieldRole,
  ReportPivotFormState,
  ReportPivotShelfItem,
  ReportRowGranularity,
} from "~/features/reports/reports.types";
import {
  getTripBindingById,
  getTripBindingsForGranularity,
  inferPivotRole,
  pivotAggAllowed,
} from "~/features/reports/report-trips-bindings.catalog";

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `r-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const DROP_FILTERS = "drop-filters";
const DROP_ROWS = "drop-rows";
const DROP_COLS = "drop-columns";
const DROP_VALS = "drop-values";

const AGG_OPTIONS: { label: string; value: PivotMeasureAgg }[] = [
  { label: "Suma", value: "sum" },
  { label: "Conteo", value: "count" },
  { label: "Promedio", value: "avg" },
  { label: "Mínimo", value: "min" },
  { label: "Máximo", value: "max" },
];

const PIVOT_FILTER_OPS: { label: string; value: PivotFilterOp }[] = [
  { label: "Igual", value: "eq" },
  { label: "Distinto", value: "ne" },
  { label: "En lista", value: "in" },
  { label: "Fuera de lista", value: "nin" },
];

function shelfItemFromBinding(
  bindingId: string,
  gran: ReportRowGranularity,
  shelf: "values"
): ReportPivotFormState["values"][0] | null {
  const meta = getTripBindingById(bindingId);
  if (!meta || !meta.granularities.includes(gran)) return null;
  const role = inferPivotRole(meta, gran);
  const agg: PivotMeasureAgg = role === "measure" ? "sum" : "count";
  if (!pivotAggAllowed(agg, meta, gran)) return null;
  return {
    slotId: newId(),
    bindingId: meta.id,
    field: meta.outputKey,
    label: meta.defaultHeader,
    agg,
  };
}

function axisItemFromBinding(bindingId: string, gran: ReportRowGranularity): ReportPivotShelfItem | null {
  const meta = getTripBindingById(bindingId);
  if (!meta || !meta.granularities.includes(gran)) return null;
  if (inferPivotRole(meta, gran) !== "dimension") return null;
  return {
    slotId: newId(),
    bindingId: meta.id,
    field: meta.outputKey,
    label: meta.defaultHeader,
  };
}

function PaletteChip({
  bindingId,
  role,
}: {
  bindingId: string;
  role: ReportPivotFieldRole;
}) {
  const meta = getTripBindingById(bindingId);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `pal-${bindingId}`,
    data: { type: "palette", bindingId, role },
  });
  if (!meta) return null;
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
      <span className="font-medium text-slate-800 dark:text-slate-100">{meta.label}</span>
      <span className="ml-1 font-mono text-[11px] text-slate-500 dark:text-slate-400">({meta.id})</span>
    </button>
  );
}

function DroppableShelf({
  id,
  title,
  hint,
  children,
}: {
  id: string;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`min-h-[5.5rem] rounded-lg border-2 border-dashed p-2 transition-colors ${
        isOver
          ? "border-indigo-400 bg-indigo-50/50 dark:border-indigo-500 dark:bg-indigo-950/30"
          : "border-slate-200 bg-white/60 dark:border-slate-600 dark:bg-slate-950/40"
      }`}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{title}</span>
      </div>
      {hint ? <p className="mb-2 text-[11px] leading-snug text-slate-500 dark:text-slate-400">{hint}</p> : null}
      {children}
    </div>
  );
}

function SortableAxisCard({
  id,
  item,
  onLabel,
  onRemove,
}: {
  id: string;
  item: ReportPivotShelfItem;
  onLabel: (label: string) => void;
  onRemove: () => void;
}) {
  const meta = getTripBindingById(item.bindingId);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex flex-wrap items-center gap-2 rounded border border-slate-200 bg-slate-50/90 p-2 dark:border-slate-600 dark:bg-slate-900/80 ${
        isDragging ? "z-10 opacity-90 shadow-md" : ""
      }`}
    >
      <button
        type="button"
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded text-slate-500 touch-none hover:bg-slate-200 dark:hover:bg-slate-700"
        aria-label="Arrastrar"
        {...attributes}
        {...listeners}
      >
        <i className="pi pi-bars text-sm" />
      </button>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-xs font-medium text-slate-800 dark:text-slate-100">
          {meta?.label ?? item.field}{" "}
          <code className="rounded bg-slate-200 px-1 text-[10px] dark:bg-slate-800">{item.bindingId}</code>
        </p>
        <DpInput
          type="input"
          label="Etiqueta en tabla"
          className="text-xs"
          value={item.label}
          onChange={(v) => onLabel(String(v))}
        />
      </div>
      <button
        type="button"
        className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
        aria-label="Quitar"
        onClick={onRemove}
      >
        <i className="pi pi-times" />
      </button>
    </div>
  );
}

function SortableValueCard({
  id,
  item,
  onLabel,
  onAgg,
  onRemove,
  gran,
}: {
  id: string;
  item: ReportPivotFormState["values"][0];
  onLabel: (label: string) => void;
  onAgg: (agg: PivotMeasureAgg) => void;
  onRemove: () => void;
  gran: ReportRowGranularity;
}) {
  const meta = getTripBindingById(item.bindingId);
  const allowedAggs = AGG_OPTIONS.filter((o) => meta && pivotAggAllowed(o.value, meta, gran));
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex flex-wrap items-end gap-2 rounded border border-slate-200 bg-amber-50/50 p-2 dark:border-slate-600 dark:bg-amber-950/20 ${
        isDragging ? "z-10 opacity-90 shadow-md" : ""
      }`}
    >
      <button
        type="button"
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center self-center rounded text-slate-500 touch-none hover:bg-amber-100 dark:hover:bg-slate-700"
        aria-label="Arrastrar"
        {...attributes}
        {...listeners}
      >
        <i className="pi pi-bars text-sm" />
      </button>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-xs font-medium text-slate-800 dark:text-slate-100">
          {meta?.label ?? item.field}{" "}
          <code className="rounded bg-slate-200 px-1 text-[10px] dark:bg-slate-800">{item.bindingId}</code>
        </p>
        <div className="flex flex-wrap gap-2">
          <DpInput
            type="select"
            label="Agregación"
            className="min-w-[9rem]"
            value={item.agg}
            onChange={(v) => onAgg((String(v) as PivotMeasureAgg) || "sum")}
            options={allowedAggs.length ? allowedAggs : AGG_OPTIONS}
          />
          <DpInput
            type="input"
            label="Etiqueta"
            className="min-w-[10rem] flex-1"
            value={item.label}
            onChange={(v) => onLabel(String(v))}
          />
        </div>
      </div>
      <button
        type="button"
        className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
        aria-label="Quitar"
        onClick={onRemove}
      >
        <i className="pi pi-times" />
      </button>
    </div>
  );
}

export interface ReportPivotShelvesProps {
  granularity: ReportRowGranularity;
  value: ReportPivotFormState;
  onChange: (next: ReportPivotFormState) => void;
  /** Solo estante de filtros (modo pivot detalle / lista). */
  variant?: "full" | "filtersOnly";
}

export default function ReportPivotShelves({
  granularity,
  value,
  onChange,
  variant = "full",
}: ReportPivotShelvesProps) {
  const bindings = useMemo(() => getTripBindingsForGranularity(granularity), [granularity]);
  const dimensions = useMemo(
    () => bindings.filter((b) => inferPivotRole(b, granularity) === "dimension"),
    [bindings, granularity]
  );
  const measures = useMemo(
    () => bindings.filter((b) => inferPivotRole(b, granularity) === "measure"),
    [bindings, granularity]
  );

  const fieldOptions = useMemo(
    () =>
      bindings.map((b) => ({
        value: b.outputKey,
        label: `${b.label} (${b.outputKey})`,
      })),
    [bindings]
  );

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const removeFromAllShelves = (slotId: string) => {
    onChange({
      ...value,
      rows: value.rows.filter((r) => r.slotId !== slotId),
      columns: value.columns.filter((r) => r.slotId !== slotId),
      values: value.values.filter((r) => r.slotId !== slotId),
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const aid = String(active.id);
    const oid = String(over.id);

    if (aid.startsWith("pal-")) {
      const bindingId = aid.slice(4);
      const targetDrop =
        oid === DROP_FILTERS || oid === DROP_ROWS || oid === DROP_COLS || oid === DROP_VALS
          ? oid
          : oid.startsWith("fr-")
            ? DROP_FILTERS
            : oid.startsWith("sr-")
              ? DROP_ROWS
              : oid.startsWith("sc-")
                ? DROP_COLS
                : oid.startsWith("sv-")
                  ? DROP_VALS
                  : null;
      if (!targetDrop) return;

      if (targetDrop === DROP_FILTERS) {
        const meta = getTripBindingById(bindingId);
        if (!meta || inferPivotRole(meta, granularity) !== "dimension") return;
        onChange({
          ...value,
          filterRows: [
            ...value.filterRows,
            { rowId: newId(), field: meta.outputKey, op: "eq", valuesText: "" },
          ],
        });
        return;
      }
      if (targetDrop === DROP_ROWS) {
        const it = axisItemFromBinding(bindingId, granularity);
        if (!it) return;
        onChange({ ...value, rows: [...value.rows, it] });
        return;
      }
      if (targetDrop === DROP_COLS) {
        const it = axisItemFromBinding(bindingId, granularity);
        if (!it) return;
        onChange({ ...value, columns: [...value.columns, it] });
        return;
      }
      if (targetDrop === DROP_VALS) {
        const it = shelfItemFromBinding(bindingId, granularity, "values");
        if (!it) return;
        onChange({ ...value, values: [...value.values, it] });
      }
      return;
    }

    if (aid.startsWith("sr-") && oid.startsWith("sr-")) {
      const oldIndex = value.rows.findIndex((r) => `sr-${r.slotId}` === aid);
      const newIndex = value.rows.findIndex((r) => `sr-${r.slotId}` === oid);
      if (oldIndex < 0 || newIndex < 0) return;
      onChange({ ...value, rows: arrayMove(value.rows, oldIndex, newIndex) });
      return;
    }
    if (aid.startsWith("sc-") && oid.startsWith("sc-")) {
      const oldIndex = value.columns.findIndex((r) => `sc-${r.slotId}` === aid);
      const newIndex = value.columns.findIndex((r) => `sc-${r.slotId}` === oid);
      if (oldIndex < 0 || newIndex < 0) return;
      onChange({ ...value, columns: arrayMove(value.columns, oldIndex, newIndex) });
      return;
    }
    if (aid.startsWith("sv-") && oid.startsWith("sv-")) {
      const oldIndex = value.values.findIndex((r) => `sv-${r.slotId}` === aid);
      const newIndex = value.values.findIndex((r) => `sv-${r.slotId}` === oid);
      if (oldIndex < 0 || newIndex < 0) return;
      onChange({ ...value, values: arrayMove(value.values, oldIndex, newIndex) });
    }
  };

  const filtersOnly = variant === "filtersOnly";

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <div className="flex flex-col gap-4">
        <p className="text-xs text-slate-600 dark:text-slate-400">
          {filtersOnly ? (
            <>
              <strong>Filtros opcionales</strong> sobre las filas ya materializadas (mismos campos que en modo
              resumen). Arrastrá solo <strong>dimensiones</strong> al estante de abajo.
            </>
          ) : (
            <>
              Arrastrá campos hacia los estantes. Las <strong>dimensiones</strong> agrupan filas y columnas; las{" "}
              <strong>medidas</strong> se agregan en Valores. Podés reordenar dentro de cada estante con la manija ⋮⋮.
            </>
          )}
        </p>

        <div className="grid gap-3 lg:grid-cols-[minmax(14rem,1fr)_2fr]">
          <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-600 dark:bg-slate-900/40">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Campos (origen viajes)</p>
            <div>
              <p className="mb-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">Dimensiones</p>
              <div className="flex flex-wrap gap-1.5">
                {dimensions.map((b) => (
                  <PaletteChip key={b.id} bindingId={b.id} role="dimension" />
                ))}
              </div>
            </div>
            {!filtersOnly ? (
              <div>
                <p className="mb-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">Medidas</p>
                <div className="flex flex-wrap gap-1.5">
                  {measures.map((b) => (
                    <PaletteChip key={b.id} bindingId={b.id} role="measure" />
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-3">
            <DroppableShelf
              id={DROP_FILTERS}
              title="Filtros (sobre filas del reporte)"
              hint="Solo dimensiones. Luego definí operador y valores."
            >
              <div className="flex flex-col gap-2">
                {value.filterRows.map((fr) => (
                  <div
                    key={fr.rowId}
                    className="flex flex-wrap items-end gap-2 rounded border border-slate-200 bg-white p-2 dark:border-slate-600 dark:bg-slate-900"
                  >
                    <DpInput
                      type="select"
                      label="Campo"
                      className="min-w-[11rem]"
                      value={fr.field}
                      onChange={(v) =>
                        onChange({
                          ...value,
                          filterRows: value.filterRows.map((x) =>
                            x.rowId === fr.rowId ? { ...x, field: String(v) } : x
                          ),
                        })
                      }
                      options={fieldOptions}
                      filter
                    />
                    <DpInput
                      type="select"
                      label="Operador"
                      className="min-w-[9rem]"
                      value={fr.op}
                      onChange={(v) =>
                        onChange({
                          ...value,
                          filterRows: value.filterRows.map((x) =>
                            x.rowId === fr.rowId ? { ...x, op: v as PivotFilterOp } : x
                          ),
                        })
                      }
                      options={PIVOT_FILTER_OPS}
                    />
                    <DpInput
                      type="input"
                      label="Valores (coma)"
                      className="min-w-[12rem] flex-1"
                      value={fr.valuesText}
                      onChange={(v) =>
                        onChange({
                          ...value,
                          filterRows: value.filterRows.map((x) =>
                            x.rowId === fr.rowId ? { ...x, valuesText: String(v) } : x
                          ),
                        })
                      }
                    />
                    <button
                      type="button"
                      className="mb-0.5 rounded p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      aria-label="Quitar filtro"
                      onClick={() =>
                        onChange({
                          ...value,
                          filterRows: value.filterRows.filter((x) => x.rowId !== fr.rowId),
                        })
                      }
                    >
                      <i className="pi pi-times" />
                    </button>
                  </div>
                ))}
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Arrastrá una dimensión aquí para añadir un filtro, o editá los existentes.
                </p>
              </div>
            </DroppableShelf>

            {!filtersOnly ? (
              <>
                <DroppableShelf id={DROP_ROWS} title="Filas" hint="Dimensiones que forman las filas del resultado.">
                  <SortableContext
                    items={value.rows.map((r) => `sr-${r.slotId}`)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="flex flex-col gap-2">
                      {value.rows.map((r) => (
                        <SortableAxisCard
                          key={r.slotId}
                          id={`sr-${r.slotId}`}
                          item={r}
                          onLabel={(label) =>
                            onChange({
                              ...value,
                              rows: value.rows.map((x) => (x.slotId === r.slotId ? { ...x, label } : x)),
                            })
                          }
                          onRemove={() => removeFromAllShelves(r.slotId)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DroppableShelf>

                <DroppableShelf
                  id={DROP_COLS}
                  title="Columnas"
                  hint="Tabla cruzada: cada combinación distinta genera una columna."
                >
                  <SortableContext
                    items={value.columns.map((r) => `sc-${r.slotId}`)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="flex flex-col gap-2">
                      {value.columns.map((r) => (
                        <SortableAxisCard
                          key={r.slotId}
                          id={`sc-${r.slotId}`}
                          item={r}
                          onLabel={(label) =>
                            onChange({
                              ...value,
                              columns: value.columns.map((x) => (x.slotId === r.slotId ? { ...x, label } : x)),
                            })
                          }
                          onRemove={() => removeFromAllShelves(r.slotId)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DroppableShelf>

                <DroppableShelf id={DROP_VALS} title="Valores" hint="Al menos una medida agregada.">
                  <SortableContext
                    items={value.values.map((r) => `sv-${r.slotId}`)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="flex flex-col gap-2">
                      {value.values.map((r) => (
                        <SortableValueCard
                          key={r.slotId}
                          id={`sv-${r.slotId}`}
                          item={r}
                          gran={granularity}
                          onLabel={(label) =>
                            onChange({
                              ...value,
                              values: value.values.map((x) => (x.slotId === r.slotId ? { ...x, label } : x)),
                            })
                          }
                          onAgg={(agg) => {
                            const meta = getTripBindingById(r.bindingId);
                            if (meta && !pivotAggAllowed(agg, meta, granularity)) return;
                            onChange({
                              ...value,
                              values: value.values.map((x) => (x.slotId === r.slotId ? { ...x, agg } : x)),
                            });
                          }}
                          onRemove={() => removeFromAllShelves(r.slotId)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DroppableShelf>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </DndContext>
  );
}
