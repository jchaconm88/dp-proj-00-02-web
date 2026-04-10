import type { DpFilterRule } from "./DpContentFilter";

function isEmptyValue(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).every((x) => isEmptyValue(x));
  }
  return false;
}

function dateOnlyToTime(value: string): number | null {
  const s = String(value ?? "").trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  return new Date(y, mo, d).getTime();
}

function dateOnlyOrDateTimeToTime(value: string): number | null {
  const s = String(value ?? "").trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return dateOnlyToTime(s);
  const t = new Date(s).getTime();
  return Number.isFinite(t) ? t : null;
}

export interface DateRangeMaxDaysRuleOptions {
  fromKey?: string;
  toKey?: string;
  invalidRangeMessage?: string;
  endBeforeStartMessage?: string;
  maxDaysMessage?: (maxDays: number) => string;
}

export function createDateRangeMaxDaysRule(
  maxDays: number,
  options: DateRangeMaxDaysRuleOptions = {}
): DpFilterRule {
  const {
    fromKey = "from",
    toKey = "to",
    invalidRangeMessage = "Rango de fechas inválido.",
    endBeforeStartMessage = "La fecha fin no puede ser menor a la fecha inicio.",
    maxDaysMessage = (days) => `El rango máximo permitido es de ${days} días.`,
  } = options;

  return (value) => {
    const range = (value as Record<string, unknown>) ?? {};
    const from = String(range[fromKey] ?? "").trim();
    const to = String(range[toKey] ?? "").trim();
    if (!from || !to) return null;

    const fromTime = dateOnlyToTime(from);
    const toTime = dateOnlyToTime(to);
    if (fromTime == null || toTime == null) return invalidRangeMessage;
    if (toTime < fromTime) return endBeforeStartMessage;

    const diffDays = Math.floor((toTime - fromTime) / 86400000) + 1;
    if (diffDays > maxDays) return maxDaysMessage(maxDays);
    return null;
  };
}

export interface RequiredIfRuleOptions {
  message?: string;
}

export function createRequiredIfRule(
  predicate: (values: Record<string, unknown>) => boolean,
  options: RequiredIfRuleOptions = {}
): DpFilterRule {
  const { message = "Este campo es obligatorio." } = options;
  return (value, values) => {
    if (!predicate(values)) return null;
    return isEmptyValue(value) ? message : null;
  };
}

export interface StringLengthRuleOptions {
  trim?: boolean;
  message?: (maxOrMin: number) => string;
}

export function createMaxLengthRule(
  maxLength: number,
  options: StringLengthRuleOptions = {}
): DpFilterRule {
  const { trim = true, message = (max) => `Máximo ${max} caracteres.` } = options;
  return (value) => {
    if (value == null) return null;
    const raw = String(value);
    const text = trim ? raw.trim() : raw;
    if (!text) return null;
    return text.length > maxLength ? message(maxLength) : null;
  };
}

export function createMinLengthRule(
  minLength: number,
  options: StringLengthRuleOptions = {}
): DpFilterRule {
  const { trim = true, message = (min) => `Mínimo ${min} caracteres.` } = options;
  return (value) => {
    if (value == null) return null;
    const raw = String(value);
    const text = trim ? raw.trim() : raw;
    if (!text) return null;
    return text.length < minLength ? message(minLength) : null;
  };
}

export interface DateNotFutureRuleOptions {
  message?: string;
}

export function createDateNotFutureRule(
  options: DateNotFutureRuleOptions = {}
): DpFilterRule {
  const { message = "La fecha no puede ser futura." } = options;
  return (value) => {
    const candidate = dateOnlyOrDateTimeToTime(String(value ?? ""));
    if (candidate == null) return null;
    const now = new Date();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
    return candidate > todayEnd ? message : null;
  };
}

export interface AtLeastOneSelectedRuleOptions {
  message?: string;
}

export function createAtLeastOneSelectedRule(
  options: AtLeastOneSelectedRuleOptions = {}
): DpFilterRule {
  const { message = "Debes seleccionar al menos un elemento." } = options;
  return (value) => {
    if (Array.isArray(value)) return value.length > 0 ? null : message;
    return isEmptyValue(value) ? message : null;
  };
}

export interface DateRangeOrderRuleOptions {
  fromKey?: string;
  toKey?: string;
  invalidRangeMessage?: string;
  endBeforeStartMessage?: string;
}

export function createDateRangeOrderRule(
  options: DateRangeOrderRuleOptions = {}
): DpFilterRule {
  const {
    fromKey = "from",
    toKey = "to",
    invalidRangeMessage = "Rango de fechas inválido.",
    endBeforeStartMessage = "La fecha fin no puede ser menor a la fecha inicio.",
  } = options;

  return (value) => {
    const range = (value as Record<string, unknown>) ?? {};
    const from = String(range[fromKey] ?? "").trim();
    const to = String(range[toKey] ?? "").trim();
    if (!from || !to) return null;
    const fromTime = dateOnlyToTime(from);
    const toTime = dateOnlyToTime(to);
    if (fromTime == null || toTime == null) return invalidRangeMessage;
    return toTime < fromTime ? endBeforeStartMessage : null;
  };
}

