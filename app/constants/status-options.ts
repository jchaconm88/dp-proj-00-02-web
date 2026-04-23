/**
 * Opciones de estado centralizadas para:
 * - DpTable type="status" (chip con label + color/severity)
 * - Selects en pantallas Set (options con label + value)
 */

/** Severidades que PrimeReact `Tag` pinta con la prop `severity`. */
export const PRIME_STATUS_SEVERITIES = [
  "success",
  "info",
  "warning",
  "danger",
  "secondary",
  "contrast",
] as const;

export type PrimeStatusSeverity = (typeof PRIME_STATUS_SEVERITIES)[number];

/**
 * Severidades con color propio (no vienen del tema Prime): clases `dp-status-tag--accent` / `dp-status-tag--teal` en `app.css`.
 */
export type CustomStatusSeverity = "accent" | "teal";

/** Valores permitidos en `StatusOption.severity` (mínimo 8 variantes visuales). */
export type StatusSeverity = PrimeStatusSeverity | CustomStatusSeverity;

export function isPrimeStatusSeverity(s: string): s is PrimeStatusSeverity {
  return (PRIME_STATUS_SEVERITIES as readonly string[]).includes(s);
}

export interface StatusOption {
  label: string;
  severity: StatusSeverity;
}

/** Convierte un objeto de opciones (valor â†’ { label, severity }) en array para DpInput type="select". */
export function statusToSelectOptions(
  obj: Record<string, StatusOption>
): { label: string; value: string }[] {
  return Object.entries(obj).map(([value, { label }]) => ({ label, value }));
}

/**
 * Primera clave declarada en `options` (p. ej. valor inicial de selects).
 * Solo usar con mapas no vacíos.
 */
export function statusDefaultKey<O extends Record<string, StatusOption>>(options: O): keyof O & string {
  return Object.keys(options)[0] as keyof O & string;
}

/**
 * Normaliza un valor persistido a una clave de `options` (mismo esquema que `statusToSelectOptions`).
 * Acepta clave exacta o igual ignorando mayúsculas/minúsculas. Si no coincide, `defaultKey` o la primera clave.
 */
export function parseStatus<O extends Record<string, StatusOption>>(
  value: unknown,
  options: O,
  defaultKey?: keyof O & string
): keyof O & string {
  type K = keyof O & string;
  const keys = Object.keys(options) as K[];
  const fallback = (defaultKey ?? keys[0]) as K;
  const raw = String(value ?? "").trim();
  if (raw && (keys as string[]).includes(raw)) {
    return raw as K;
  }
  const lower = raw.toLowerCase();
  const found = keys.find((k) => k.toLowerCase() === lower);
  if (found !== undefined) return found;
  return fallback;
}

/** Periodo de reinicio de secuencias. */
export const RESET_PERIOD: Record<string, StatusOption> = {
  never: { label: "Nunca", severity: "secondary" },
  yearly: { label: "Anual", severity: "info" },
  monthly: { label: "Mensual", severity: "info" },
  daily: { label: "Diario", severity: "info" },
};

/** Estado de empleados. */
export const EMPLOYEE_STATUS: Record<string, StatusOption> = {
  active: { label: "Activo", severity: "success" },
  inactive: { label: "Inactivo", severity: "secondary" },
  suspended: { label: "Suspendido", severity: "warning" },
};

/** Tipo de salario. */
export const SALARY_TYPE: Record<string, StatusOption> = {
  monthly: { label: "Mensual", severity: "info" },
  weekly: { label: "Semanal", severity: "info" },
  daily: { label: "Diario", severity: "info" },
};

/** Estado de recursos externos. */
export const RESOURCE_STATUS: Record<string, StatusOption> = {
  active: { label: "Activo", severity: "success" },
  inactive: { label: "Inactivo", severity: "secondary" },
  suspended: { label: "Suspendido", severity: "warning" },
};

/** Tipo de vinculación remota. */
export const RESOURCE_ENGAGEMENT_TYPE: Record<string, StatusOption> = {
  sporadic: { label: "Esporádico", severity: "info" },
  permanent: { label: "Permanente", severity: "info" },
  contract: { label: "Contrato", severity: "info" },
};

/** Tipo de costo de recurso. */
export const RESOURCE_COST_TYPE: Record<string, StatusOption> = {
  per_trip: { label: "Por viaje", severity: "info" },
  per_hour: { label: "Por hora", severity: "info" },
  per_day: { label: "Por día", severity: "info" },
  fixed: { label: "Fijo", severity: "info" },
};

/** Moneda. */
export const CURRENCY: Record<string, StatusOption> = {
  PEN: { label: "Soles (PEN)", severity: "success" },
  USD: { label: "Dólares (USD)", severity: "success" },
};

/** Estado de cliente. */
export const CLIENT_STATUS: Record<string, StatusOption> = {
  active: { label: 'Activo', severity: 'success' },
  inactive: { label: 'Inactivo', severity: 'secondary' },
  suspended: { label: 'Suspendido', severity: 'warning' },
};

/** Tipo de ubicación de cliente (`clients/{id}/locations`). */
export const CLIENT_LOCATION_TYPE: Record<string, StatusOption> = {
  warehouse: { label: "Almacén", severity: "info" },
  store: { label: "Tienda", severity: "info" },
  office: { label: "Oficina", severity: "info" },
  plant: { label: "Planta", severity: "info" },
};

/** Tipos de cobro/costo (catálogo `charge-types`). */
export const CHARGE_TYPE_KIND: Record<string, StatusOption> = {
  charge: { label: "Cobro", severity: "info" },
  cost: { label: "Costo", severity: "warning" },
};

/** Origen del cobro/costo (catálogo `charge-types`). */
export const CHARGE_TYPE_SOURCE: Record<string, StatusOption> = {
  "": { label: "(Sin origen)", severity: "secondary" },
  service: { label: "Servicio", severity: "info" },
  employee: { label: "Empleado", severity: "info" },
  resource: { label: "Recurso", severity: "info" },
  employee_resource: { label: "Empleado/Recurso", severity: "info" },
};

/** Subconjunto de `CHARGE_TYPE_SOURCE` para asignaciones de viaje (mismas claves, sin duplicar labels). */
export const CHARGE_TYPE_SOURCE_TRIP_ASSIGNMENT: Record<string, StatusOption> = {
  employee: CHARGE_TYPE_SOURCE.employee,
  resource: CHARGE_TYPE_SOURCE.resource,
  employee_resource: CHARGE_TYPE_SOURCE.employee_resource,
};

/** Categoría del cobro/costo (catálogo `charge-types`). */
export const CHARGE_TYPE_CATEGORY: Record<string, StatusOption> = {
  base: { label: "Base", severity: "secondary" },
  extra: { label: "Extra", severity: "info" },
  variable: { label: "Variable", severity: "warning" },
};

/** Condición de pago. */
export const PAYMENT_CONDITION: Record<string, StatusOption> = {
  transfer: { label: 'Transferencia', severity: 'info' },
  cash: { label: 'Efectivo', severity: 'success' },
  credit: { label: 'Crédito', severity: 'warning' },
  check: { label: 'Cheque', severity: 'info' },
};

/** Estado de conductor. */
export const DRIVER_STATUS: Record<string, StatusOption> = {
  available: { label: "Disponible", severity: "success" },
  assigned: { label: "Asignado", severity: "info" },
  inactive: { label: "Inactivo", severity: "secondary" },
};

/** Vínculo de conductor. */
export const DRIVER_RELATIONSHIP: Record<string, StatusOption> = {
  employee: { label: "Empleado", severity: "info" },
  resource: { label: "Recurso", severity: "warning" },
};

/** Categoría de servicio de transporte. */
export const SERVICE_TYPE_CATEGORY: Record<string, StatusOption> = {
  distribution: { label: "Distribución", severity: "info" },
  express: { label: "Express", severity: "warning" },
  dedicated: { label: "Dedicado", severity: "success" },
};

/** Tipo de cálculo de servicio. */
export const CALCULATION_TYPE: Record<string, StatusOption> = {
  fixed: { label: "Fijo", severity: "info" },
  zone: { label: "Por Zona", severity: "info" },
  per_km: { label: "Por Km", severity: "info" },
  per_weight: { label: "Por Peso", severity: "info" },
  per_volume: { label: "Por Volumen", severity: "info" },
  percentage: { label: "Porcentaje del valor", severity: "secondary" },
  formula: { label: "Fórmula compleja", severity: "secondary" },
};

/** Estado de contrato de transporte. */
export const CONTRACT_STATUS: Record<string, StatusOption> = {
  draft:     { label: "Borrador",  severity: "secondary" },
  active:    { label: "Activo",    severity: "success" },
  expired:   { label: "Expirado",  severity: "warning" },
  cancelled: { label: "Cancelado", severity: "danger" },
};

/** Ciclo de facturación. */
export const BILLING_CYCLE: Record<string, StatusOption> = {
  monthly:  { label: "Mensual",   severity: "info" },
  weekly:   { label: "Semanal",   severity: "info" },
  per_trip: { label: "Por viaje", severity: "info" },
};

/** Tipo de regla de tarifa. */
export const RATE_RULE_TYPE: Record<string, StatusOption> = {
  base:         { label: "Tarifa Base",  severity: "success" },
  extra_charge: { label: "Recargo",      severity: "warning" },
  penalty:      { label: "Penalidad",    severity: "danger" },
  discount:     { label: "Descuento",    severity: "info" },
};

/** Estado de vehículo. */
export const VEHICLE_STATUS: Record<string, StatusOption> = {
  available: { label: "Disponible", severity: "success" },
  assigned: { label: "Asignado", severity: "info" },
  inactive: { label: "Inactivo", severity: "secondary" },
};

/** Tipo de vehículo. */
export const VEHICLE_TYPE: Record<string, StatusOption> = {
  truck: { label: "Camión", severity: "info" },
  van: { label: "Camioneta", severity: "info" },
  van_box: { label: "Furgón", severity: "info" },
  trailer: { label: "Tráiler", severity: "info" },
  other: { label: "Otro", severity: "secondary" },
};

/** Categoría de Tipo de Documento. */
export const DOCUMENT_TYPE_CATEGORY: Record<string, StatusOption> = {
  identity: { label: "Identidad", severity: "info" },
  transport: { label: "Transporte", severity: "warning" },
  vehicle: { label: "Vehículo", severity: "success" },
};

/** Estado de plan de transporte. */
export const PLAN_STATUS: Record<string, StatusOption> = {
  draft: { label: "Borrador", severity: "secondary" },
  confirmed: { label: "Confirmado", severity: "info" },
  in_progress: { label: "En progreso", severity: "warning" },
  completed: { label: "Completado", severity: "success" },
  cancelled: { label: "Cancelado", severity: "danger" },
};

/** Estado de pedido logístico. */
export const ORDER_STATUS: Record<string, StatusOption> = {
  pending: { label: "Pendiente", severity: "secondary" },
  confirmed: { label: "Confirmado", severity: "info" },
  in_progress: { label: "En progreso", severity: "warning" },
  delivered: { label: "Entregado", severity: "success" },
  cancelled: { label: "Cancelado", severity: "danger" },
};

/** Tipo de parada de ruta. */
export const STOP_TYPE: Record<string, StatusOption> = {
  origin: { label: "Origen", severity: "success" },
  pickup: { label: "Recojo", severity: "info" },
  delivery: { label: "Entrega", severity: "warning" },
  checkpoint: { label: "Punto de control", severity: "secondary" },
  rest: { label: "Descanso", severity: "info" },
};

/** Estado de parada de ruta. */
export const STOP_STATUS: Record<string, StatusOption> = {
  pending: { label: "Pendiente", severity: "secondary" },
  arrived: { label: "Llegado", severity: "info" },
  completed: { label: "Completado", severity: "success" },
  skipped: { label: "Omitido", severity: "danger" },
};

/** Tipo de liquidación (por pagar / por cobrar). */
export const SETTLEMENT_TYPE: Record<string, StatusOption> = {
  payable: { label: "Por pagar", severity: "warning" },
  receivable: { label: "Por cobrar", severity: "success" },
};

/** Categoría de liquidación. */
export const SETTLEMENT_CATEGORY: Record<string, StatusOption> = {
  customer: { label: "Cliente", severity: "info" },
  carrier: { label: "Transportista", severity: "secondary" },
  provider: { label: "Proveedor", severity: "warning" },
  resource: { label: "Recurso", severity: "info" },
};

/** Estado del documento de liquidación. */
export const SETTLEMENT_STATUS: Record<string, StatusOption> = {
  draft: { label: "Borrador", severity: "secondary" },
  closed: { label: "Cerrado", severity: "success" },
};

/** Estado de pago de la liquidación. */
export const SETTLEMENT_PAYMENT_STATUS: Record<string, StatusOption> = {
  pending: { label: "Pendiente", severity: "warning" },
  partial: { label: "Parcial", severity: "info" },
  paid: { label: "Pagado", severity: "success" },
};

/** Tipo de movimiento en ítem de liquidación. */
export const SETTLEMENT_MOVEMENT_TYPE: Record<string, StatusOption> = {
  tripCost: { label: "Costo de viaje", severity: "info" },
  tripCharge: { label: "Cargo de viaje", severity: "warning" },
  adjustment: { label: "Ajuste", severity: "secondary" },
};

/** Estado de viaje (única fuente de claves válidas en cliente). */
export const TRIP_STATUS = {
  scheduled: { label: "Programado", severity: "info" },
  in_progress: { label: "En curso", severity: "warning" },
  completed: { label: "Completado", severity: "success" },
  cancelled: { label: "Cancelado", severity: "danger" },
  pre_settled: { label: "Preliquidado", severity: "secondary" },
  settled: { label: "Liquidado", severity: "teal" },
} as const satisfies Record<string, StatusOption>;

export type TripStatus = keyof typeof TRIP_STATUS;

/** Primera clave de `TRIP_STATUS` (p. ej. select / valores por defecto en formularios). */
export const TRIP_STATUS_DEFAULT: TripStatus = statusDefaultKey(TRIP_STATUS);

/** Tipo de asignación de viaje (operativa / facturable). Campo `type` en trip-assignments. */
export const TRIP_ASSIGNMENT_TYPE: Record<string, StatusOption> = {
  operational: { label: "Operativa", severity: "info" },
  billable: { label: "Facturable", severity: "warning" },
};

/** Alcance de la asignación respecto al viaje / paradas. */
export const TRIP_ASSIGNMENT_SCOPE_TYPE: Record<string, StatusOption> = {
  trip: { label: "Todo el viaje", severity: "info" },
  stop: { label: "Parada", severity: "info" },
  segment: { label: "Tramo (inicio — fin)", severity: "info" },
};

export const TRIP_ASSIGNMENT_ENTITY_TYPE: Record<string, StatusOption> = {
  employee: { label: "Empleado", severity: "info" },
  resource: { label: "Recurso", severity: "warning" },
};

/** Entidad vinculada en cargo de viaje (`entityType`). */
export const TRIP_CHARGE_ENTITY_TYPE: Record<string, StatusOption> = {
  "": { label: "(Sin entidad)", severity: "secondary" },
  transportService: { label: "Servicio de transporte", severity: "info" },
  employee: { label: "Empleado", severity: "info" },
  resource: { label: "Recurso", severity: "warning" },
};

/** Tipo de cargo de viaje. */
export const TRIP_CHARGE_TYPE: Record<string, StatusOption> = {
  freight: { label: "Flete", severity: "info" },
  additional_support: { label: "Apoyo adicional", severity: "info" },
  extra_waiting_time: { label: "Tiempo de espera extra", severity: "secondary" },
  extra_distance: { label: "Distancia extra", severity: "warning" },
  extra_weight: { label: "Peso extra", severity: "success" },
  extra_volume: { label: "Volumen extra", severity: "danger" },
};

/** Origen del cargo de viaje. */
export const TRIP_CHARGE_SOURCE: Record<string, StatusOption> = {
  contract: { label: "Contrato", severity: "info" },
  salary_rule: { label: "Regla salarial", severity: "info" },
  manual: { label: "Manual", severity: "secondary" },
};

/** Estado del cargo de viaje. */
export const TRIP_CHARGE_STATUS: Record<string, StatusOption> = {
  open: { label: "Abierto", severity: "warning" },
  paid: { label: "Pagado", severity: "success" },
  cancelled: { label: "Anulado", severity: "danger" },
};

/** Entidad vinculada en costo de viaje (`entityType`). */
export const TRIP_COST_ENTITY_TYPE: Record<string, StatusOption> = {
  "": { label: "(Sin entidad)", severity: "secondary" },
  employee: { label: "Empleado", severity: "info" },
  resource: { label: "Recurso", severity: "warning" },
};

/** Tipo de costo de viaje. */
export const TRIP_COST_TYPE: Record<string, StatusOption> = {
  employee_payment: { label: "Pago a empleado", severity: "info" },
  resource_payment: { label: "Pago a recurso", severity: "secondary" },
  fuel_expense: { label: "Combustible", severity: "warning" },
  toll_expense: { label: "Peaje", severity: "success" },
  parking_expense: { label: "Estacionamiento", severity: "danger" },
  other_expense: { label: "Otro", severity: "secondary" },
};

/** Origen del costo de viaje. */
export const TRIP_COST_SOURCE: Record<string, StatusOption> = {
  salary_rule: { label: "Regla salarial", severity: "info" },
  manual: { label: "Manual", severity: "secondary" },
};

/** Estado del costo de viaje. */
export const TRIP_COST_STATUS: Record<string, StatusOption> = {
  open: { label: "Abierto", severity: "warning" },
  paid: { label: "Pagado", severity: "success" },
  cancelled: { label: "Anulado", severity: "danger" },
};

/** Ciclo de vida de suscripción SaaS (`subscriptions.status`). */
export const SUBSCRIPTION_STATUS: Record<string, StatusOption> = {
  trial: { label: "Prueba", severity: "info" },
  active: { label: "Activa", severity: "success" },
  past_due: { label: "Pago pendiente", severity: "warning" },
  canceled: { label: "Cancelada", severity: "danger" },
};

export type SubscriptionStatusKey = keyof typeof SUBSCRIPTION_STATUS;

/**
 * Estado de factura (incluye flujo SUNAT asíncrono: cola, aceptada, rechazada, etc.).
 * Debe alinearse con lo que escriben las Cloud Functions en `invoices.status`.
 */
export const INVOICE_STATUS: Record<string, StatusOption> = {
  draft: { label: "Borrador", severity: "secondary" },
  issued: { label: "Emitida", severity: "info" },
  queued: { label: "En cola SUNAT", severity: "info" },
  processing: { label: "Procesando SUNAT", severity: "warning" },
  accepted: { label: "Aceptada SUNAT", severity: "success" },
  rejected: { label: "Rechazada SUNAT", severity: "danger" },
  pending_retry: { label: "Reintentando envío", severity: "warning" },
  failed: { label: "Envío fallido", severity: "danger" },
  not_found_in_sunat: { label: "No encontrada en SUNAT", severity: "secondary" },
  error: { label: "Error SUNAT", severity: "danger" },
  paid: { label: "Pagada", severity: "success" },
  overdue: { label: "Vencida", severity: "warning" },
  cancelled: { label: "Anulada", severity: "danger" },
};

export type InvoiceStatus = keyof typeof INVOICE_STATUS;

/** Tipo de comprobante (factura, nota de crédito, nota de débito). */
export const INVOICE_TYPE: Record<string, StatusOption> = {
  invoice:     { label: "Factura",          severity: "info" },
  credit_note: { label: "Nota de crédito",  severity: "warning" },
  debit_note:  { label: "Nota de débito",   severity: "secondary" },
};

export type InvoiceType = keyof typeof INVOICE_TYPE;

/** Tipo de ítem de factura. */
export const INVOICE_ITEM_TYPE: Record<string, StatusOption> = {
  service:   { label: "Servicio",   severity: "info" },
  freight:   { label: "Flete",      severity: "info" },
  surcharge: { label: "Recargo",    severity: "warning" },
  discount:  { label: "Descuento",  severity: "secondary" },
  other:     { label: "Otro",       severity: "secondary" },
};

export type InvoiceItemType = keyof typeof INVOICE_ITEM_TYPE;

/** Código de afectación al IGV — Catálogo 07 SUNAT. */
export const TAX_AFFECTATION_CODE: Record<string, StatusOption> = {
  "10": { label: "Gravado - Onerosa", severity: "success" },
  "11": { label: "Gravado - Retiro por premio", severity: "success" },
  "20": { label: "Exonerado - Onerosa", severity: "info" },
  "30": { label: "Inafecto - Onerosa", severity: "secondary" },
  "31": { label: "Inafecto - Retiro por bonificación", severity: "secondary" },
  "40": { label: "Exportación", severity: "warning" },
};
export type TaxAffectationCode = keyof typeof TAX_AFFECTATION_CODE;

/** Tipo de operación — Catálogo 51 SUNAT. */
export const OPERATION_TYPE_CODE: Record<string, StatusOption> = {
  "0101": { label: "Venta interna", severity: "success" },
  "0112": { label: "Venta interna - Sustenta traslado", severity: "info" },
  "0200": { label: "Exportación", severity: "warning" },
  "0401": { label: "Ventas no domiciliados", severity: "secondary" },
};
export type OperationTypeCode = keyof typeof OPERATION_TYPE_CODE;

/** Código de unidad de medida — UN/ECE rec 20. */
export const UNIT_CODE: Record<string, StatusOption> = {
  "NIU": { label: "Unidad (NIU)", severity: "secondary" },
  "ZZ":  { label: "Unidad bienes (ZZ)", severity: "secondary" },
  "KGM": { label: "Kilogramo", severity: "secondary" },
  "LTR": { label: "Litro", severity: "secondary" },
  "MTR": { label: "Metro", severity: "secondary" },
  "GLL": { label: "Galón", severity: "secondary" },
  "TNE": { label: "Tonelada", severity: "secondary" },
};
export type UnitCode = keyof typeof UNIT_CODE;

/** @deprecated Usar `INVOICE_STATUS` (mismo conjunto de claves). */
export const INVOICE_SUNAT_STATUS = INVOICE_STATUS;
