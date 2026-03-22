export type TripChargeType = "freight" | "extra_waiting_time" | "extra_distance" | "extra_weight" | "extra_volume";
export type TripChargeSource = "contract" | "manual";
export type TripChargeStatus = "open" | "paid" | "cancelled";

export interface TripChargeRecord {
  id: string;
  code: string;
  tripId: string;
  /** Nombre descriptivo (p. ej. servicio de transporte en flete). */
  name: string;
  type: TripChargeType;
  source: TripChargeSource;
  /** Servicio de transporte cuando tipo = freight (contrato). */
  transportServiceId: string;
  amount: number;
  currency: string;
  status: TripChargeStatus;
  settlementId: string | null;
}

export interface TripChargeAddInput {
  code: string;
  tripId: string;
  name: string;
  type: TripChargeType;
  source: TripChargeSource;
  transportServiceId: string;
  amount: number;
  currency: string;
  status: TripChargeStatus;
  settlementId?: string | null;
}

export type TripChargeEditInput = Partial<Omit<TripChargeRecord, "id">>;
