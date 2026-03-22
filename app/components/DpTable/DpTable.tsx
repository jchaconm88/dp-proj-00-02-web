import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
  useRef,
} from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { Tag } from "primereact/tag";
import { Checkbox } from "primereact/checkbox";
import { format, isValid } from "date-fns";
import type { DpTableDefColumn, DpTableFooterTotals, DpTableRef, DpTableRow } from "./types";
import DpTColumn from "./DpTColumn";

type TagSeverity = "success" | "info" | "warning" | "danger" | "secondary";

const DEFAULT_PAGE_SIZES = [5, 10, 25];

export interface DpTableProps<T extends DpTableRow> {
  tableDef: DpTableDefColumn[];
  /**
   * Datos controlados externamente. Cuando se provee, la tabla se actualiza
   * automáticamente al cambiar (compatible con `clientLoader` + `loaderData`).
   * Si no se provee, usa la API imperativa via `ref.setDatasource()`.
   */
  data?: T[];
  /**
   * Estado de carga controlado externamente.
   * Ej: `navigation.state !== "idle" || revalidator.state === "loading"`.
   * Si no se provee, usa la API imperativa via `ref.setLoading()`.
   */
  loading?: boolean;
  linkColumn?: string;
  onDetail?: (row: T) => void;
  onEdit?: (row: T) => void;
  filterPlaceholder?: string;
  showFilterInHeader?: boolean;
  /**
   * Muestra el paginador de PrimeReact. Si es `false`, se listan todas las filas sin paginar.
   * @default true
   */
  paginator?: boolean;
  pageSizes?: number[];
  emptyMessage?: string;
  emptyFilterMessage?: string;
  onSelectionChange?: (selectedRows: T[]) => void;
  /** Fila inferior con totales (etiqueta + sumas por columna). */
  footerTotals?: DpTableFooterTotals;
  children?: React.ReactNode;
}

function applyGlobalFilterRows<T extends DpTableRow>(
  rows: T[],
  filter: string,
  fields: string[]
): T[] {
  const q = filter.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((row) =>
    fields.some((f) => {
      const v = (row as Record<string, unknown>)[f];
      return String(v ?? "").toLowerCase().includes(q);
    })
  );
}

function defaultFormatFooterSum(sum: number): string {
  if (!Number.isFinite(sum)) return "—";
  return sum.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getCellValue(row: Record<string, unknown>, columnKey: string): unknown {
  const value = row[columnKey];
  if (Array.isArray(value)) return value.join(", ");
  return value ?? "-";
}

function parseDate(value: unknown): Date | null {
  if (value == null || value === "") return null;
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    return isValid(d) ? d : null;
  }
  return null;
}

function formatDateValue(value: unknown): string {
  const d = parseDate(value);
  if (!d) return value != null && value !== "" ? String(value) : "-";
  return format(d, "dd/MM/yyyy");
}

function formatDateTimeValue(value: unknown): string {
  const d = parseDate(value);
  if (!d) return value != null && value !== "" ? String(value) : "-";
  return format(d, "dd/MM/yyyy HH:mm:ss");
}

function getStatusLabelAndSeverity(
  typeOptions: DpTableDefColumn["typeOptions"],
  value: string
): { label: string; severity: TagSeverity } {
  const opt = typeOptions?.[value];
  const label = typeof opt === "string" ? opt : (opt as { label?: string })?.label ?? value;
  const severity: TagSeverity =
    (typeof opt === "object" && opt && "severity" in opt && (opt.severity as TagSeverity)) || "secondary";
  return { label, severity };
}

function renderTypedCell(col: DpTableDefColumn, value: unknown): React.ReactNode {
  if (col.type === "status") {
    const str = value != null ? String(value) : "";
    const { label, severity } = getStatusLabelAndSeverity(col.typeOptions, str);
    return <Tag value={label} severity={severity} />;
  }
  if (col.type === "label") {
    const str = value != null ? String(value) : "";
    const { label } = getStatusLabelAndSeverity(col.typeOptions, str);
    return <span>{label}</span>;
  }
  if (col.type === "bool") {
    const checked =
      value === true ||
      value === "true" ||
      (typeof value === "string" && value.toLowerCase() === "true") ||
      (typeof value === "number" && value !== 0);
    return <Checkbox checked={checked} readOnly className="pointer-events-none" />;
  }
  if (col.type === "date") {
    return <span>{formatDateValue(value)}</span>;
  }
  if (col.type === "datetime") {
    return <span>{formatDateTimeValue(value)}</span>;
  }
  return null;
}

function getTypedFilterText(col: DpTableDefColumn, value: unknown): string {
  if (col.type === "status" || col.type === "label") {
    const str = value != null ? String(value) : "";
    const { label } = getStatusLabelAndSeverity(col.typeOptions, str);
    return label;
  }
  return String(value ?? "");
}

function isDpTColumnChild(
  child: React.ReactNode
): child is React.ReactElement<{ name: string; children: (row: unknown) => React.ReactNode }> {
  return React.isValidElement(child) && child.type === DpTColumn;
}

function DpTableInner<T extends DpTableRow>(
  {
    tableDef,
    data: dataProp,
    loading: loadingProp,
    linkColumn,
    onDetail,
    onEdit,
    filterPlaceholder = "Filtrar...",
    showFilterInHeader = true,
    paginator: paginatorEnabled = true,
    pageSizes = DEFAULT_PAGE_SIZES,
    emptyMessage = "No hay datos.",
    emptyFilterMessage = "No hay resultados para el filtro.",
    onSelectionChange,
    footerTotals,
    children,
  }: DpTableProps<T>,
  ref: React.ForwardedRef<DpTableRef<T>>
) {
  // Estado interno de filas - se alimenta por prop `data` o por la API imperativa ref.setDatasource()
  const [rows, setRows] = useState<T[]>(dataProp ?? []);
  // Estado interno de loading - se alimenta por prop `loading` o por ref.setLoading()
  const [internalLoading, setInternalLoading] = useState(false);
  const [globalFilter, setGlobalFilter] = useState("");
  const [selection, setSelection] = useState<T[]>([]);
  const selectionRef = useRef(selection);

  useEffect(() => {
    selectionRef.current = selection;
  }, [selection]);

  // Modo controlado: sincroniza datos externos â†’ estado interno cuando cambia `data` prop
  useEffect(() => {
    if (dataProp !== undefined) setRows(dataProp);
  }, [dataProp]);

  // Loading efectivo: la prop externa tiene precedencia - permite control desde useNavigation/useRevalidator
  const effectiveLoading = loadingProp !== undefined ? loadingProp : internalLoading;

  const columns = useMemo(
    () =>
      [...tableDef]
        .filter((c) => c.display)
        .sort((a, b) => a.order - b.order),
    [tableDef]
  );

  const filterColumns = useMemo(() => columns.filter((c) => c.filter !== false), [columns]);
  const globalFilterFields = useMemo(
    () =>
      filterColumns.map((c) =>
        c.type === "status" || c.type === "label" ? `__dp_filter_${c.column}` : c.column
      ),
    [filterColumns]
  );

  const rowsForTable = useMemo(() => {
    if (!filterColumns.some((c) => c.type === "status" || c.type === "label")) return rows;
    return rows.map((row) => {
      const out = { ...(row as Record<string, unknown>) };
      for (const col of filterColumns) {
        if (col.type === "status" || col.type === "label") {
          out[`__dp_filter_${col.column}`] = getTypedFilterText(col, out[col.column]);
        }
      }
      return out as unknown as T;
    });
  }, [rows, filterColumns]);

  // API imperativa - sigue funcionando para compatibilidad y casos de uso avanzados
  const setDatasource = useCallback((newData: T[]) => setRows(newData), []);
  const clearDatasource = useCallback(() => {
    setRows([]);
    setSelection([]);
  }, []);
  const setLoading = useCallback((value: boolean) => setInternalLoading(value), []);
  const getSelectedRows = useCallback((): T[] => selectionRef.current, []);
  const clearSelectedRows = useCallback(() => setSelection([]), []);
  const filter = useCallback((value: string) => setGlobalFilter(value), []);

  useImperativeHandle(
    ref,
    () => ({
      setDatasource,
      clearDatasource,
      setLoading,
      getSelectedRows,
      clearSelectedRows,
      filter,
    }),
    [setDatasource, clearDatasource, setLoading, getSelectedRows, clearSelectedRows, filter]
  );

  /** PrimeReact: persiste el nuevo orden de filas en el estado interno (también con `data` controlada hasta que el padre envíe nuevos datos). */
  const onRowReorder = useCallback(
    (e: { value: T[] }) => {
      setRows(e.value);
    },
    []
  );

  useEffect(() => {
    onSelectionChange?.(selection);
  }, [selection, onSelectionChange]);

  const filters = useMemo(
    () => ({ global: { value: globalFilter, matchMode: "contains" as const } }),
    [globalFilter]
  );

  const header = useMemo(() => {
    if (filterColumns.length === 0 || !showFilterInHeader) return null;
    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        <span className="p-input-icon-left">
          <i className="pi pi-search" />
          <InputText
            type="search"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder={filterPlaceholder}
            className="w-full sm:w-auto"
          />
        </span>
      </div>
    );
  }, [globalFilter, filterPlaceholder, filterColumns.length, showFilterInHeader]);

  const bodyLink = useCallback(
    (row: T, col: DpTableDefColumn) => {
      const value = getCellValue(row as Record<string, unknown>, col.column);
      const isLinkColumn = linkColumn === col.column && onDetail;
      if (isLinkColumn) {
        return (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDetail(row);
            }}
            className="p-link border-none bg-transparent cursor-pointer font-medium text-primary underline"
          >
            {String(value)}
          </button>
        );
      }
      const typed = col.type ? renderTypedCell(col, value) : null;
      if (typed !== null) return typed;
      return <span>{String(value)}</span>;
    },
    [linkColumn, onDetail]
  );

  const bodyEdit = useCallback(
    (row: T) =>
      onEdit ? (
        <button
          type="button"
          onClick={() => onEdit(row)}
          className="p-button p-button-text p-button-rounded p-button-icon-only"
          aria-label="Editar"
        >
          <i className="pi pi-pencil" />
        </button>
      ) : null,
    [onEdit]
  );

  const columnRenderers = useMemo(() => {
    const map: Record<string, (row: T) => React.ReactNode> = {};
    React.Children.forEach(children, (child) => {
      if (isDpTColumnChild(child)) {
        const { name, children: renderFn } = child.props;
        if (name && typeof renderFn === "function")
          map[name] = renderFn as (row: T) => React.ReactNode;
      }
    });
    return map;
  }, [children]);

  const bodyCell = useCallback(
    (row: T, col: DpTableDefColumn) => {
      const custom = columnRenderers[col.column];
      if (custom) return custom(row);
      return bodyLink(row, col);
    },
    [columnRenderers, bodyLink]
  );

  const rowsForFooterTotals = useMemo(() => {
    if (!footerTotals) return rowsForTable;
    if (footerTotals.respectGlobalFilter === false) return rowsForTable;
    return applyGlobalFilterRows(rowsForTable, globalFilter, globalFilterFields);
  }, [footerTotals, rowsForTable, globalFilter, globalFilterFields]);

  const footerSumsByColumn = useMemo(() => {
    if (!footerTotals?.sumColumns?.length) return {} as Record<string, number>;
    const out: Record<string, number> = {};
    for (const colKey of footerTotals.sumColumns) {
      const valueKey = footerTotals.sumValueKey?.[colKey] ?? colKey;
      let s = 0;
      for (const row of rowsForFooterTotals) {
        const raw = (row as Record<string, unknown>)[valueKey];
        const n = typeof raw === "number" ? raw : Number(raw);
        if (Number.isFinite(n)) s += n;
      }
      out[colKey] = s;
    }
    return out;
  }, [footerTotals, rowsForFooterTotals]);

  const footerLabelColumnKey = useMemo(() => {
    if (!footerTotals) return null as string | null;
    if (footerTotals.labelColumn) return footerTotals.labelColumn;
    const firstNonSum = columns.find((c) => !footerTotals.sumColumns.includes(c.column));
    return firstNonSum?.column ?? columns[0]?.column ?? null;
  }, [footerTotals, columns]);

  /** Sin `text-sm`: el footer hereda la misma escala que el cuerpo del DataTable (`size="small"`). */
  const footerCellClass =
    "border-t border-slate-200 bg-slate-100 py-2 text-inherit dark:border-slate-600 dark:bg-slate-800/80";

  const renderColumnFooter = useCallback(
    (col: DpTableDefColumn): React.ReactNode => {
      if (!footerTotals || !footerTotals.sumColumns.length) return null;
      const { column } = col;
      const isSum = footerTotals.sumColumns.includes(column);
      const isLabel = footerLabelColumnKey === column;
      const sum = footerSumsByColumn[column] ?? 0;
      const labelText = footerTotals.label ?? "Totales:";
      const formatted =
        footerTotals.formatSum != null
          ? footerTotals.formatSum(sum, column)
          : defaultFormatFooterSum(sum);

      if (isLabel && isSum) {
        return (
          <span className="font-semibold">
            {labelText} {formatted}
          </span>
        );
      }
      if (isLabel) {
        return <span className="font-semibold">{labelText}</span>;
      }
      if (isSum) {
        return <span className="font-semibold">{formatted}</span>;
      }
      return null;
    },
    [footerTotals, footerLabelColumnKey, footerSumsByColumn]
  );

  return (
    <div className="space-y-4">
      <DataTable
        value={rowsForTable}
        dataKey="id"
        loading={effectiveLoading}
        selection={selection}
        onSelectionChange={(e) => setSelection(e.value ?? [])}
        selectionMode="multiple"
        metaKeySelection={false}
        reorderableColumns
        reorderableRows
        onRowReorder={onRowReorder}
        paginator={paginatorEnabled}
        {...(paginatorEnabled
          ? {
              rows: pageSizes[0] ?? 5,
              rowsPerPageOptions: pageSizes,
              paginatorTemplate:
                "FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport",
              currentPageReportTemplate: "{first} a {last} de {totalRecords}",
            }
          : {})}
        emptyMessage={globalFilter.trim() ? emptyFilterMessage : emptyMessage}
        header={header}
        filters={filters}
        globalFilterFields={globalFilterFields}
        tableStyle={{ minWidth: "50rem" }}
        size="small"
      >
        <Column
          columnKey="dp-selection"
          reorderable={false}
          selectionMode="multiple"
          headerStyle={{ width: "3rem" }}
          footer={footerTotals?.sumColumns?.length ? <span aria-hidden="true" /> : undefined}
          footerClassName={footerTotals?.sumColumns?.length ? footerCellClass : undefined}
        />
        <Column
          columnKey="dp-row-reorder"
          reorderable={false}
          rowReorder
          headerStyle={{ width: "3rem" }}
          footer={footerTotals?.sumColumns?.length ? <span aria-hidden="true" /> : undefined}
          footerClassName={footerTotals?.sumColumns?.length ? footerCellClass : undefined}
        />
        {onEdit && (
          <Column
            columnKey="dp-edit"
            reorderable={false}
            headerStyle={{ width: "3rem" }}
            body={bodyEdit}
            footer={footerTotals?.sumColumns?.length ? <span aria-hidden="true" /> : undefined}
            footerClassName={footerTotals?.sumColumns?.length ? footerCellClass : undefined}
          />
        )}
        {columns.map((col) => {
          const hasCustomBody = !!columnRenderers[col.column];
          const isLinkCol = !hasCustomBody && linkColumn === col.column && onDetail;
          const footerNode = footerTotals?.sumColumns?.length ? renderColumnFooter(col) : null;
          return (
            <Column
              key={col.column}
              field={hasCustomBody || isLinkCol ? undefined : col.column}
              columnKey={hasCustomBody || isLinkCol ? col.column : undefined}
              sortField={col.column}
              header={col.header}
              body={(arg: T | { rowData: T }) => {
                const rowData =
                  arg != null && typeof arg === "object" && "rowData" in arg
                    ? (arg as { rowData: T }).rowData
                    : (arg as T);
                return bodyCell(rowData, col);
              }}
              footer={
                footerTotals?.sumColumns?.length ? (footerNode ?? <span aria-hidden="true" />) : undefined
              }
              footerClassName={footerTotals?.sumColumns?.length ? footerCellClass : undefined}
            />
          );
        })}
      </DataTable>
    </div>
  );
}

const DpTable = forwardRef(DpTableInner) as <T extends DpTableRow>(
  props: DpTableProps<T> & { ref?: React.ForwardedRef<DpTableRef<T>> }
) => React.ReactElement;

export default DpTable;
