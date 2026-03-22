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
}

/** Documento en subcolección `settlements/{id}/items`. */
export interface SettlementItem {
  id: string;
  movement: SettlementItemMovement;
  trip: SettlementItemTrip;
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
  concept: string;
  amount: number;
  settledAmount: number;
  pendingAmount: number;
  currency: string;
}
