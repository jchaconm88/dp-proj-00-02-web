import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Button } from "primereact/button";
import DpInput, { type DpInputType } from "~/components/DpInput/DpInput";

export interface DpContentFilterRef {
  show: () => void;
  hide: () => void;
  toggle: () => void;
  isVisible: () => boolean;
}

export type DpFilterRule = (
  value: unknown,
  values: Record<string, unknown>,
  filterDef: DpFilterDef
) => string | null | undefined;

export interface DpFilterDef {
  name: string;
  label: string;
  type: DpInputType;
  required?: boolean;
  colSpan?: 1 | 2 | 3 | 4;
  disabled?: boolean;
  placeholder?: string;
  summary?: (value: unknown, values: Record<string, unknown>) => string;
  initialValue?: unknown;
  validators?: DpFilterRule | DpFilterRule[];
  options?: Array<{ label: string; value: string | number }> | Record<string, unknown>[];
  optionLabel?: string;
  optionValue?: string;
  filter?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  refreshAriaLabel?: string;
  inputType?: "text" | "password" | "time";
  rows?: number;
}

export interface DpContentFilterProps {
  filterDefs: DpFilterDef[];
  values: Record<string, unknown>;
  onValuesChange: (next: Record<string, unknown>) => void;
  onSearch: (filters: Record<string, unknown>) => void;
  /**
   * Valores iniciales del formulario de filtros.
   * También se usan al limpiar cuando `resetToInitialOnClear` está activo.
   */
  initialValues?: Record<string, unknown>;
  /** Aplica automáticamente `initialValues` al montar el componente. */
  applyInitialOnMount?: boolean;
  /** Ejecuta búsqueda automática luego de aplicar `initialValues` al montar. */
  searchOnMount?: boolean;
  /** Reestablece al estado inicial al limpiar. Si no, limpia a `{}`. */
  resetToInitialOnClear?: boolean;
  /** Ejecuta `onSearch` luego de limpiar. */
  searchOnClear?: boolean;
  onClear?: (nextValues: Record<string, unknown>) => void;
  /** Control externo de visibilidad. Si no se envía, usa estado interno. */
  show?: boolean;
  /** Estado inicial cuando `show` no está controlado. */
  defaultShow?: boolean;
  searchLabel?: string;
  clearLabel?: string;
}

function cloneValues(values: Record<string, unknown>): Record<string, unknown> {
  if (typeof structuredClone === "function") return structuredClone(values);
  return JSON.parse(JSON.stringify(values)) as Record<string, unknown>;
}

function getDefaultValueByType(type: DpInputType): unknown {
  if (type === "date-range") return { from: "", to: "" };
  if (type === "multiselect") return [];
  if (type === "check") return false;
  if (type === "select") return "";
  return "";
}

function resolveInitialValues(
  filterDefs: DpFilterDef[],
  initialValues?: Record<string, unknown>
): Record<string, unknown> {
  const base: Record<string, unknown> = {};
  for (const def of filterDefs) {
    base[def.name] =
      def.initialValue !== undefined
        ? def.initialValue
        : getDefaultValueByType(def.type);
  }
  return { ...base, ...(initialValues ?? {}) };
}

function isFilterEmpty(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).every((v) => isFilterEmpty(v));
  }
  return false;
}

function defaultSummary(value: unknown): string {
  if (isFilterEmpty(value)) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) return value.map((v) => String(v)).join(", ");
  if (typeof value === "object") {
    const o = value as Record<string, unknown>;
    if ("from" in o || "to" in o) {
      const from = String(o.from ?? "").trim();
      const to = String(o.to ?? "").trim();
      if (from && to) return `${from} a ${to}`;
      return from || to;
    }
  }
  return "";
}

const DpContentFilter = forwardRef<DpContentFilterRef, DpContentFilterProps>(function DpContentFilter(
  {
    filterDefs,
    values,
    onValuesChange,
    onSearch,
    initialValues,
    applyInitialOnMount = false,
    searchOnMount = false,
    resetToInitialOnClear = true,
    searchOnClear = true,
    onClear,
    show,
    defaultShow = false,
    searchLabel = "Buscar",
    clearLabel = "Limpiar filtros",
  }: DpContentFilterProps,
  ref
) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [internalShow, setInternalShow] = useState(defaultShow);
  const isVisible = show ?? internalShow;
  const mountedRef = useRef(false);
  const resolvedInitialValues = useMemo(
    () => resolveInitialValues(filterDefs, initialValues),
    [filterDefs, initialValues]
  );

  const handleChange = (name: string, value: unknown) => {
    onValuesChange({ ...values, [name]: value });
    if (errors[name]) {
      const next = { ...errors };
      delete next[name];
      setErrors(next);
    }
  };

  const handleSearch = () => {
    const nextErrors: Record<string, string> = {};
    for (const def of filterDefs) {
      const { name, label, required } = def;
      const fieldValue = values[name] ?? getDefaultValueByType(def.type);
      if (required && isFilterEmpty(fieldValue)) {
        nextErrors[name] = `${label} es obligatorio.`;
        continue;
      }
      const localRules = def.validators;
      const validators = [
        ...(Array.isArray(localRules) ? localRules : localRules ? [localRules] : []),
      ];
      for (const validate of validators) {
        const msg = validate(fieldValue, values, def);
        if (typeof msg === "string" && msg.trim()) {
          nextErrors[name] = msg.trim();
          break;
        }
      }
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    onSearch(values);
  };

  const handleClear = () => {
    const nextValues = resetToInitialOnClear
      ? cloneValues(resolvedInitialValues)
      : resolveInitialValues(filterDefs);
    setErrors({});
    onValuesChange(nextValues);
    if (searchOnClear) onSearch(nextValues);
    onClear?.(nextValues);
  };

  useEffect(() => {
    if (!applyInitialOnMount) return;
    if (mountedRef.current) return;
    mountedRef.current = true;
    const nextValues = cloneValues(resolvedInitialValues);
    onValuesChange(nextValues);
    if (searchOnMount) onSearch(nextValues);
  }, [applyInitialOnMount, onSearch, onValuesChange, resolvedInitialValues, searchOnMount]);

  useImperativeHandle(
    ref,
    () => ({
      show: () => setInternalShow(true),
      hide: () => setInternalShow(false),
      toggle: () => setInternalShow((v) => !v),
      isVisible: () => (show ?? internalShow),
    }),
    [show, internalShow]
  );

  const activeSummaries = useMemo(() => {
    const acc: string[] = [];
    for (const item of filterDefs) {
      const { name, label, summary } = item;
      const value = values[name];
      if (isFilterEmpty(value)) continue;
      const text = (summary ? summary(value, values) : defaultSummary(value)).trim();
      if (!text) continue;
      acc.push(`${label}: ${text}`);
    }
    return acc;
  }, [filterDefs, values]);

  if (!isVisible) {
    if (activeSummaries.length === 0) return null;
    return (
      <section className="dp-content-header-shell">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold text-[var(--dp-menu-text)]">Filtros activos:</span>
          {activeSummaries.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-[var(--dp-outline-soft)] bg-[var(--dp-surface-high)]/70 px-2.5 py-1 text-xs text-[var(--dp-on-surface-soft)]"
            >
              {tag}
            </span>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="dp-content-header-shell">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {filterDefs.map((item) => {
          const { name, colSpan = 1 } = item;
          const className =
            colSpan === 2
              ? "xl:col-span-2"
              : colSpan === 3
                ? "xl:col-span-3"
                : colSpan === 4
                  ? "xl:col-span-4"
                  : "";
          return (
            <div key={name} className={className}>
              {item.type === "select" ? (
                <DpInput
                  type="select"
                  label={item.label}
                  name={item.name}
                  value={(values[name] as string | number | undefined) ?? ""}
                  onChange={(value) => handleChange(name, value)}
                  options={item.options ?? []}
                  optionLabel={item.optionLabel}
                  optionValue={item.optionValue}
                  placeholder={item.placeholder}
                  filter={item.filter}
                  onRefresh={item.onRefresh}
                  refreshing={item.refreshing}
                  refreshAriaLabel={item.refreshAriaLabel}
                  disabled={item.disabled}
                />
              ) : item.type === "multiselect" ? (
                <DpInput
                  type="multiselect"
                  label={item.label}
                  name={item.name}
                  value={(values[name] as Array<string | number> | undefined) ?? []}
                  onChange={(value) => handleChange(name, value)}
                  options={item.options ?? []}
                  optionLabel={item.optionLabel}
                  optionValue={item.optionValue}
                  placeholder={item.placeholder}
                  filter={item.filter}
                  disabled={item.disabled}
                />
              ) : item.type === "date" ? (
                <DpInput
                  type="date"
                  label={item.label}
                  name={item.name}
                  value={(values[name] as string | undefined) ?? ""}
                  onChange={(value) => handleChange(name, value)}
                  placeholder={item.placeholder}
                  disabled={item.disabled}
                />
              ) : item.type === "date-range" ? (
                <DpInput
                  type="date-range"
                  label={item.label}
                  name={item.name}
                  value={
                    (values[name] as { from: string; to: string } | undefined) ?? {
                      from: "",
                      to: "",
                    }
                  }
                  onChange={(value) => handleChange(name, value)}
                  placeholder={item.placeholder}
                  disabled={item.disabled}
                />
              ) : item.type === "datetime" ? (
                <DpInput
                  type="datetime"
                  label={item.label}
                  name={item.name}
                  value={(values[name] as string | undefined) ?? ""}
                  onChange={(value) => handleChange(name, value)}
                  placeholder={item.placeholder}
                  disabled={item.disabled}
                />
              ) : item.type === "check" ? (
                <DpInput
                  type="check"
                  label={item.label}
                  name={item.name}
                  value={Boolean(values[name])}
                  onChange={(value) => handleChange(name, value)}
                  disabled={item.disabled}
                />
              ) : item.type === "input-decimal" ? (
                <DpInput
                  type="input-decimal"
                  label={item.label}
                  name={item.name}
                  value={(values[name] as string | undefined) ?? ""}
                  onChange={(value) => handleChange(name, value)}
                  placeholder={item.placeholder}
                  disabled={item.disabled}
                />
              ) : item.type === "textarea" ? (
                <DpInput
                  type="textarea"
                  label={item.label}
                  name={item.name}
                  value={(values[name] as string | undefined) ?? ""}
                  onChange={(value) => handleChange(name, value)}
                  placeholder={item.placeholder}
                  rows={item.rows}
                  disabled={item.disabled}
                />
              ) : (
                <DpInput
                  type={item.type === "number" ? "number" : "input"}
                  label={item.label}
                  name={item.name}
                  value={(values[name] as string | undefined) ?? ""}
                  onChange={(value: string) => handleChange(name, value)}
                  placeholder={item.placeholder}
                  inputType={item.inputType}
                  disabled={item.disabled}
                />
              )}
              {errors[name] && <p className="mt-1 text-xs text-red-500">{errors[name]}</p>}
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap justify-start gap-2">
        <Button type="button" label={searchLabel} icon="pi pi-search" onClick={handleSearch} className="dp-btn-neon" />
        {onClear && (
          <Button
            type="button"
            label={clearLabel}
            icon="pi pi-filter-slash"
            onClick={handleClear}
            className="dp-btn-soft"
          />
        )}
      </div>
    </section>
  );
});

export default DpContentFilter;

