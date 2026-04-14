import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Dropdown } from "primereact/dropdown";
import { MultiSelect } from "primereact/multiselect";
import { Checkbox } from "primereact/checkbox";
import { Calendar } from "primereact/calendar";
import { Button } from "primereact/button";
import type { DropdownChangeEvent } from "primereact/dropdown";
import type { MultiSelectChangeEvent } from "primereact/multiselect";
import type { ChangeEvent } from "react";

/** Convierte string YYYY-MM-DD a Date (mediodía local para evitar problemas de zona). */
function parseDateString(s: string): Date | null {
  if (!s?.trim()) return null;
  return new Date(s.trim() + "T12:00:00");
}

/** Convierte Date a string YYYY-MM-DD. */
function formatDateToValue(d: Date | null): string {
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDateRangeValue(value: DpInputDateRangeValue): Date[] | null {
  const from = parseDateString(value.from);
  const to = parseDateString(value.to);
  if (from && to) return [from, to];
  if (from) return [from];
  return null;
}

function formatDateRangeToValue(range: unknown): DpInputDateRangeValue {
  if (range == null) return { from: "", to: "" };
  if (range instanceof Date) {
    return { from: formatDateToValue(range), to: "" };
  }
  if (!Array.isArray(range)) return { from: "", to: "" };
  return {
    from: formatDateToValue((range[0] as Date | null | undefined) ?? null),
    to: formatDateToValue((range[1] as Date | null | undefined) ?? null),
  };
}

/** Convierte string YYYY-MM-DDTHH:mm o YYYY-MM-DDTHH:mm:ss a Date (local). */
function parseDateTimeString(s: string): Date | null {
  if (!s?.trim()) return null;
  return new Date(s.trim());
}

/** Convierte Date a string YYYY-MM-DDTHH:mm. */
function formatDateTimeToValue(d: Date | null): string {
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${h}:${min}`;
}

const labelClass = "font-medium text-[var(--dp-menu-text)]";
const controlClass = "w-full";

export type DpInputType =
  | "input"
  | "input-decimal"
  | "number"
  | "select"
  | "multiselect"
  | "check"
  | "date"
  | "date-range"
  | "datetime"
  | "textarea";

export interface DpInputOption {
  label: string;
  value: string | number;
}

export interface DpInputPropsBase {
  label: string;
  name?: string;
  className?: string;
  disabled?: boolean;
}

export interface DpInputInputProps extends DpInputPropsBase {
  type: "input" | "number" | "textarea";
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputType?: "text" | "password" | "time";
  rows?: number;
}

export interface DpInputInputDecimalProps extends DpInputPropsBase {
  type: "input-decimal";
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export interface DpInputSelectProps extends DpInputPropsBase {
  type: "select";
  value: string | number;
  onChange: (value: string | number) => void;
  options: DpInputOption[] | Record<string, unknown>[];
  optionLabel?: string;
  optionValue?: string;
  placeholder?: string;
  filter?: boolean;
  /** Texto del campo de filtro cuando `filter` es true (PrimeReact Dropdown). */
  filterPlaceholder?: string;
  onRefresh?: () => void;
  refreshing?: boolean;
  refreshAriaLabel?: string;
}

export interface DpInputMultiSelectProps extends DpInputPropsBase {
  type: "multiselect";
  value: Array<string | number>;
  onChange: (value: Array<string | number>) => void;
  options: DpInputOption[] | Record<string, unknown>[];
  optionLabel?: string;
  optionValue?: string;
  placeholder?: string;
  filter?: boolean;
}

export interface DpInputCheckProps extends DpInputPropsBase {
  type: "check";
  value: boolean;
  onChange: (value: boolean) => void;
}

export interface DpInputDateProps extends DpInputPropsBase {
  type: "date";
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export interface DpInputDateRangeValue {
  from: string;
  to: string;
}

export interface DpInputDateRangeProps extends DpInputPropsBase {
  type: "date-range";
  value: DpInputDateRangeValue;
  onChange: (value: DpInputDateRangeValue) => void;
  placeholder?: string;
}

export interface DpInputDatetimeProps extends DpInputPropsBase {
  type: "datetime";
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export type DpInputProps =
  | DpInputInputProps
  | DpInputInputDecimalProps
  | DpInputSelectProps
  | DpInputMultiSelectProps
  | DpInputCheckProps
  | DpInputDateProps
  | DpInputDateRangeProps
  | DpInputDatetimeProps;

function getInputId(name: string | undefined, label: string): string {
  return name ?? label.replace(/\s+/g, "-").toLowerCase();
}

export default function DpInput(props: DpInputProps) {
  const { label, name, className = "", disabled } = props;
  const id = getInputId(name, label);
  const wrapperClass =
    props.type === "check" ? "flex items-center gap-2" : "flex flex-col gap-2";

  if (props.type === "select") {
    const {
      value,
      onChange,
      options,
      optionLabel = "label",
      optionValue = "value",
      placeholder,
      filter,
      filterPlaceholder,
      onRefresh,
      refreshing = false,
      refreshAriaLabel = "Refrescar opciones",
    } = props;
    return (
      <div className={`${wrapperClass} ${className}`.trim()}>
        <label htmlFor={id} className={labelClass}>
          {label}
        </label>
        <div className="flex items-stretch gap-2">
          <Dropdown
            id={id}
            value={value}
            options={options}
            optionLabel={optionLabel}
            optionValue={optionValue}
            onChange={(e: DropdownChangeEvent) => onChange(e.value ?? "")}
            placeholder={placeholder}
            filter={filter}
            filterPlaceholder={filterPlaceholder}
            disabled={disabled}
            className="w-full"
          />
          {onRefresh && (
            <Button
              type="button"
              icon="pi pi-refresh"
              outlined
              onClick={onRefresh}
              loading={refreshing}
              disabled={disabled || refreshing}
              aria-label={refreshAriaLabel}
              title={refreshAriaLabel}
            />
          )}
        </div>
      </div>
    );
  }

  if (props.type === "multiselect") {
    const {
      value,
      onChange,
      options,
      optionLabel = "label",
      optionValue = "value",
      placeholder,
      filter,
    } = props;
    return (
      <div className={`${wrapperClass} ${className}`.trim()}>
        <label htmlFor={id} className={labelClass}>
          {label}
        </label>
        <MultiSelect
          inputId={id}
          value={value}
          options={options}
          optionLabel={optionLabel}
          optionValue={optionValue}
          onChange={(e: MultiSelectChangeEvent) => onChange((e.value as Array<string | number>) ?? [])}
          placeholder={placeholder}
          filter={filter}
          disabled={disabled}
          className="w-full"
          display="chip"
        />
      </div>
    );
  }

  if (props.type === "date") {
    const { value, onChange, placeholder } = props;
    const dateValue = parseDateString(value);
    return (
      <div className={`${wrapperClass} ${className}`.trim()}>
        <label htmlFor={id} className={labelClass}>
          {label}
        </label>
        <Calendar
          id={id}
          value={dateValue}
          onChange={(e) => onChange(formatDateToValue(e.value as Date | null))}
          dateFormat="dd/mm/yy"
          locale="es"
          placeholder={placeholder}
          disabled={disabled}
          showIcon
          className={controlClass}
        />
      </div>
    );
  }

  if (props.type === "date-range") {
    const { value, onChange, placeholder } = props;
    const rangeValue = parseDateRangeValue(value);
    return (
      <div className={`${wrapperClass} ${className}`.trim()}>
        <label htmlFor={id} className={labelClass}>
          {label}
        </label>
        <Calendar
          id={id}
          value={rangeValue}
          onChange={(e) => onChange(formatDateRangeToValue(e.value))}
          dateFormat="dd/mm/yy"
          selectionMode="range"
          hideOnRangeSelection
          locale="es"
          placeholder={placeholder}
          disabled={disabled}
          showIcon
          className={controlClass}
        />
      </div>
    );
  }

  if (props.type === "datetime") {
    const { value, onChange, placeholder } = props;
    const dateValue = parseDateTimeString(value);
    return (
      <div className={`${wrapperClass} ${className}`.trim()}>
        <label htmlFor={id} className={labelClass}>
          {label}
        </label>
        <Calendar
          id={id}
          value={dateValue}
          onChange={(e) => onChange(formatDateTimeToValue(e.value as Date | null))}
          dateFormat="dd/mm/yy"
          showTime
          hourFormat="24"
          locale="es"
          placeholder={placeholder}
          disabled={disabled}
          showIcon
          className={controlClass}
        />
      </div>
    );
  }

  if (props.type === "check") {
    const { value, onChange } = props;
    return (
      <div className={`${wrapperClass} ${className}`.trim()}>
        <Checkbox
          inputId={id}
          checked={value}
          onChange={(e) => onChange(e.checked ?? false)}
          disabled={disabled}
        />
        <label htmlFor={id} className={labelClass}>
          {label}
        </label>
      </div>
    );
  }

  if (props.type === "input-decimal") {
    const { value, onChange, placeholder } = props;
    return (
      <div className={`${wrapperClass} ${className}`.trim()}>
        <label htmlFor={id} className={labelClass}>
          {label}
        </label>
        <InputText
          id={id}
          value={value}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          type="text"
          inputMode="decimal"
          placeholder={placeholder}
          disabled={disabled}
          className={controlClass}
        />
      </div>
    );
  }

  // input | number | textarea
  const { value, onChange, placeholder, inputType = "text", rows } = props;
  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => onChange(e.target.value);

  if (props.type === "textarea") {
    return (
      <div className={`${wrapperClass} ${className}`.trim()}>
        <label htmlFor={id} className={labelClass}>
          {label}
        </label>
        <InputTextarea
          id={id}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          className={controlClass}
          rows={rows ?? 3}
        />
      </div>
    );
  }

  const inputTypeMap: Record<string, string> = {
    input: inputType,
    number: "number",
  };

  return (
    <div className={`${wrapperClass} ${className}`.trim()}>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <InputText
        id={id}
        value={value}
        onChange={handleChange}
        type={inputTypeMap[props.type] ?? "text"}
        placeholder={placeholder}
        disabled={disabled}
        className={controlClass}
      />
    </div>
  );
}
