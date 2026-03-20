export type TripCostEntity = "assignment" | "company";
export type TripCostType = "employee_payment" | "resource_payment" | "fuel_expense" | "toll_expense" | "parking_expense" | "other_expense";
export type TripCostSource = "salary_rule" | "manual";
export type TripCostStatus = "open" | "paid" | "cancelled";

export interface TripCostRecord {
  id: string;
  code: string;
  /** Nombre legible desde `tripAssignments` (sync salary_rule). Vacío si el costo no viene de esa asignación / es manual. */
  displayName: string;
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
  /** Manual u otros orígenes: dejar vacío. */
  displayName?: string;
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

/** Callable Cloud Function `getResourcePerTripCost` — alinear con `dp-proj-00-02-functions`. */
export interface GetResourcePerTripCostRequest {
  tripAssignmentId: string;
}

export interface GetResourcePerTripCostResponse {
  entityType: "employee" | "resource";
  entityId: string;
  sourceId: string;
  amount: number;
  currency: string;
}
