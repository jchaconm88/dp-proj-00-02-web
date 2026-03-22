/**
 * Opciones de estado centralizadas para:
 * - DpTable type="status" (chip con label + color/severity)
 * - Selects en pantallas Set (options con label + value)
 */

export type StatusSeverity = "success" | "info" | "warning" | "danger" | "secondary";

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

/** Estado de viaje. */
export const TRIP_STATUS: Record<string, StatusOption> = {
  scheduled: { label: "Programado", severity: "info" },
  in_progress: { label: "En curso", severity: "warning" },
  completed: { label: "Completado", severity: "success" },
  cancelled: { label: "Cancelado", severity: "danger" },
};

/** Tipo entidad en asignación de viaje. */
export const TRIP_ASSIGNMENT_ENTITY_TYPE: Record<string, StatusOption> = {
  employee: { label: "Empleado", severity: "info" },
  resource: { label: "Recurso", severity: "warning" },
};

/** Tipo de cargo de viaje. */
export const TRIP_CHARGE_TYPE: Record<string, StatusOption> = {
  freight: { label: "Flete", severity: "info" },
  extra_waiting_time: { label: "Tiempo de espera extra", severity: "secondary" },
  extra_distance: { label: "Distancia extra", severity: "warning" },
  extra_weight: { label: "Peso extra", severity: "success" },
  extra_volume: { label: "Volumen extra", severity: "danger" },
};

/** Origen del cargo de viaje. */
export const TRIP_CHARGE_SOURCE: Record<string, StatusOption> = {
  contract: { label: "Contrato", severity: "info" },
  manual: { label: "Manual", severity: "secondary" },
};

/** Estado del cargo de viaje. */
export const TRIP_CHARGE_STATUS: Record<string, StatusOption> = {
  open: { label: "Abierto", severity: "warning" },
  paid: { label: "Pagado", severity: "success" },
  cancelled: { label: "Anulado", severity: "danger" },
};

/** Entidad del costo de viaje. */
export const TRIP_COST_ENTITY: Record<string, StatusOption> = {
  assignment: { label: "Asignación", severity: "info" },
  company: { label: "Empresa", severity: "info" },
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
