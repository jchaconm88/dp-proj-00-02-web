export type TripChargeType = "freight" | "extra_waiting_time" | "extra_distance" | "extra_weight" | "extra_volume";
export type TripChargeSource = "contract" | "manual";
export type TripChargeStatus = "open" | "paid" | "cancelled";

export interface TripChargeRecord {
  id: string;
  code: string;
  tripId: string;
  type: TripChargeType;
  source: TripChargeSource;
  amount: number;
  currency: string;
  status: TripChargeStatus;
  settlementId: string | null;
}

export interface TripChargeAddInput {
  code: string;
  tripId: string;
  type: TripChargeType;
  source: TripChargeSource;
  amount: number;
  currency: string;
  status: TripChargeStatus;
  settlementId?: string | null;
}

export type TripChargeEditInput = Partial<Omit<TripChargeRecord, "id">>;
