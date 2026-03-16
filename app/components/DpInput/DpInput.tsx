import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Dropdown } from "primereact/dropdown";
import { Checkbox } from "primereact/checkbox";
import { Calendar } from "primereact/calendar";
import type { DropdownChangeEvent } from "primereact/dropdown";
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

const labelClass = "font-medium text-zinc-700 dark:text-zinc-300";
const controlClass = "w-full";

export type DpInputType =
  | "input"
  | "input-decimal"
  | "number"
  | "select"
  | "check"
  | "date"
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
  | DpInputCheckProps
  | DpInputDateProps
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
    } = props;
    return (
      <div className={`${wrapperClass} ${className}`.trim()}>
        <label htmlFor={id} className={labelClass}>
          {label}
        </label>
        <Dropdown
          id={id}
          value={value}
          options={options}
          optionLabel={optionLabel}
          optionValue={optionValue}
          onChange={(e: DropdownChangeEvent) => onChange(e.value ?? "")}
          placeholder={placeholder}
          filter={filter}
          disabled={disabled}
          className={controlClass}
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
