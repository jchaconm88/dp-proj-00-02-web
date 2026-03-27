export type TripChargeType =
  | "freight"
  | "additional_support"
  | "extra_waiting_time"
  | "extra_distance"
  | "extra_weight"
  | "extra_volume";
export type TripChargeSource = "contract" | "salary_rule" | "manual";
export type TripChargeStatus = "open" | "paid" | "cancelled";

/** Entidad vinculada al cargo: servicio (flete), empleado o recurso (apoyo adicional). */
export type TripChargeEntityType = "transportService" | "employee" | "resource" | "";

/** Metadatos escritos por Cloud Functions (`trips-sync`, etc.). */
export interface TripChargeSyncMeta {
  source: string;
  sourceId: string;
  process: string;
}

export interface TripChargeRecord {
  id: string;
  code: string;
  tripId: string;
  /** Nombre descriptivo (p. ej. servicio de transporte en flete). */
  name: string;
  /** Catálogo `charge-types` (tipo de cargo). */
  chargeTypeId: string;
  /** Nombre denormalizado del tipo de cargo. */
  chargeType: string;
  type: TripChargeType;
  source: TripChargeSource;
  /** En flete: `transportService` + `entityId` = id del servicio; apoyo adicional: `employee`/`resource`. */
  entityType: TripChargeEntityType;
  /** ID del documento según `entityType` (p. ej. transportServices, employees, resources). */
  entityId: string;
  amount: number;
  currency: string;
  status: TripChargeStatus;
  settlementId: string | null;
  settlement: string | null;
  /** Si existe, documento gestionado por sync (p. ej. flete automático). */
  sync?: TripChargeSyncMeta | null;
}

export interface TripChargeAddInput {
  code: string;
  tripId: string;
  name: string;
  chargeTypeId: string;
  chargeType: string;
  type: TripChargeType;
  source: TripChargeSource;
  entityType: TripChargeEntityType;
  entityId: string;
  amount: number;
  currency: string;
  status: TripChargeStatus;
  settlementId?: string | null;
}

export type TripChargeEditInput = Partial<Omit<TripChargeRecord, "id">>;
