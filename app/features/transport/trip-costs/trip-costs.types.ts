export type TripCostEntity = "assignment" | "company";
export type TripCostType = "driver_payment" | "fuel_expense" | "toll_expense" | "parking_expense" | "other_expense";
export type TripCostSource = "salary_rule" | "manual";
export type TripCostStatus = "open" | "paid" | "cancelled";

export interface TripCostRecord {
  id: string;
  code: string;
  tripId: string;
  entity: TripCostEntity;
  entityId: string;
  type: TripCostType;
  source: TripCostSource;
  amount: number;
  currency: string;
  status: TripCostStatus;
  settlementId: string | null;
}

export interface TripCostAddInput {
  code: string;
  tripId: string;
  entity: TripCostEntity;
  entityId: string;
  type: TripCostType;
  source: TripCostSource;
  amount: number;
  currency: string;
  status: TripCostStatus;
  settlementId?: string | null;
}

export type TripCostEditInput = Partial<Omit<TripCostRecord, "id">>;
