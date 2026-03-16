export type AssignmentEntityType = "employee" | "resource";

export interface TripAssignmentRecord {
  id: string;
  code: string;
  tripId: string;
  entityType: AssignmentEntityType;
  entityId: string;
  position: string;
  displayName: string;
  resourceCostId: string;
}

export interface TripAssignmentAddInput {
  code: string;
  tripId: string;
  entityType: AssignmentEntityType;
  entityId: string;
  position: string;
  displayName: string;
  resourceCostId?: string;
}

export type TripAssignmentEditInput = Partial<Omit<TripAssignmentRecord, "id">>;
