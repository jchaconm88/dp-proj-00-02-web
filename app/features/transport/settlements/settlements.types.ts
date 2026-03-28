/** Tipo de liquidación. */
export type SettlementType = "payable" | "receivable";

/** Categoría de liquidación. */
export type SettlementCategory = "customer" | "carrier" | "provider" | "resource";

/** Estado del documento. */
export type SettlementDocStatus = "draft" | "closed";

/** Estado de pago. */
export type SettlementPaymentStatus = "pending" | "partial" | "paid";

export interface SettlementEntity {
  type: string;
  id: string;
  name: string;
}

export interface SettlementPeriod {
  start: string;
  end: string;
  label: string;
}

export interface SettlementTotals {
  grossAmount: number;
  settledAmount: number;
  pendingAmount: number;
  currency: string;
}

/** Documento en colección `settlements`. */
export interface Settlement {
  id: string;
  code: string;
  type: SettlementType;
  category: SettlementCategory;
  entity: SettlementEntity;
  period: SettlementPeriod;
  totals: SettlementTotals;
  status: SettlementDocStatus;
  paymentStatus: SettlementPaymentStatus;
}

export type SettlementMovementType = "tripCost" | "tripCharge" | "adjustment" | string;

export interface SettlementItemMovement {
  type: SettlementMovementType;
  id: string;
}

export interface SettlementItemTrip {
  id: string;
  code: string;
  /** Denormalizado desde el viaje (ruta legible). */
  route: string;
  /** Solo fecha `YYYY-MM-DD` (inicio programado del viaje). */
  scheduledStart: string;
}

/** Documento en subcolección `settlements/{id}/items`. */
export interface SettlementItem {
  id: string;
  movement: SettlementItemMovement;
  trip: SettlementItemTrip;
  /** Etiqueta o código de tipo de cargo/costo (catálogo). */
  chargeType: string;
  /** Id del documento en `charge-types` cuando aplica. */
  chargeTypeId: string;
  concept: string;
  amount: number;
  settledAmount: number;
  pendingAmount: number;
  currency: string;
}

/** Valores editables en formulario (totales y etiqueta de periodo se derivan en servidor/servicio). */
export interface SettlementFormValues {
  code: string;
  type: SettlementType;
  category: SettlementCategory;
  entityType: string;
  entityId: string;
  entityName: string;
  periodStart: string;
  periodEnd: string;
  currency: string;
  status: SettlementDocStatus;
  paymentStatus: SettlementPaymentStatus;
}

export interface SettlementItemFormValues {
  movementType: string;
  movementId: string;
  tripId: string;
  tripCode: string;
  tripRoute: string;
  /** `YYYY-MM-DD` */
  tripScheduledStart: string;
  chargeType: string;
  chargeTypeId: string;
  concept: string;
  amount: number;
  settledAmount: number;
  pendingAmount: number;
  currency: string;
}
