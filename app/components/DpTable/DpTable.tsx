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
import type { DpTableDefColumn, DpTableRef, DpTableRow } from "./types";
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
  pageSizes?: number[];
  emptyMessage?: string;
  emptyFilterMessage?: string;
  onSelectionChange?: (selectedRows: T[]) => void;
  children?: React.ReactNode;
}

function getCellValue(row: Record<string, unknown>, columnKey: string): unknown {
  const value = row[columnKey];
  if (Array.isArray(value)) return value.join(", ");
  return value ?? "â€”";
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
  if (!d) return value != null && value !== "" ? String(value) : "â€”";
  return format(d, "dd/MM/yyyy");
}

function formatDateTimeValue(value: unknown): string {
  const d = parseDate(value);
  if (!d) return value != null && value !== "" ? String(value) : "â€”";
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
    filterPlaceholder = "Filtrarâ€¦",
    showFilterInHeader = true,
    pageSizes = DEFAULT_PAGE_SIZES,
    emptyMessage = "No hay datos.",
    emptyFilterMessage = "No hay resultados para el filtro.",
    onSelectionChange,
    children,
  }: DpTableProps<T>,
  ref: React.ForwardedRef<DpTableRef<T>>
) {
  // Estado interno de filas â€” se alimenta por prop `data` o por la API imperativa ref.setDatasource()
  const [rows, setRows] = useState<T[]>(dataProp ?? []);
  // Estado interno de loading â€” se alimenta por prop `loading` o por ref.setLoading()
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

  // Loading efectivo: la prop externa tiene precedencia â€” permite control desde useNavigation/useRevalidator
  const effectiveLoading = loadingProp !== undefined ? loadingProp : internalLoading;

  const columns = useMemo(
    () =>
      [...tableDef]
        .filter((c) => c.display)
        .sort((a, b) => a.order - b.order),
    [tableDef]
  );

  const filterColumns = useMemo(() => columns.filter((c) => c.filter !== false), [columns]);
  const globalFilterFields = useMemo(() => filterColumns.map((c) => c.column), [filterColumns]);

  // API imperativa â€” sigue funcionando para compatibilidad y casos de uso avanzados
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

  return (
    <div className="space-y-4">
      <DataTable
        value={rows}
        dataKey="id"
        loading={effectiveLoading}
        selection={selection}
        onSelectionChange={(e) => setSelection(e.value ?? [])}
        selectionMode="multiple"
        metaKeySelection={false}
        paginator
        rows={pageSizes[0] ?? 5}
        rowsPerPageOptions={pageSizes}
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport"
        currentPageReportTemplate="{first} a {last} de {totalRecords}"
        emptyMessage={globalFilter.trim() ? emptyFilterMessage : emptyMessage}
        header={header}
        filters={filters}
        globalFilterFields={globalFilterFields}
        tableStyle={{ minWidth: "50rem" }}
        size="small"
      >
        <Column selectionMode="multiple" headerStyle={{ width: "3rem" }} />
        {onEdit && <Column headerStyle={{ width: "3rem" }} body={bodyEdit} />}
        {columns.map((col) => {
          const hasCustomBody = !!columnRenderers[col.column];
          const isLinkCol = !hasCustomBody && linkColumn === col.column && onDetail;
          return (
            <Column
              key={col.column}
              field={hasCustomBody || isLinkCol ? undefined : col.column}
              sortField={col.column}
              header={col.header}
              body={(arg: T | { rowData: T }) => {
                const rowData =
                  arg != null && typeof arg === "object" && "rowData" in arg
                    ? (arg as { rowData: T }).rowData
                    : (arg as T);
                return bodyCell(rowData, col);
              }}
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
