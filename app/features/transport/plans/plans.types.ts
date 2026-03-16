export type PlanStatus =
  | "draft"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled";

export interface PlanRecord {
  id: string;
  code: string;
  date: string;
  zone: string;
  vehicleType: string;
  orderIds: string[];
  status: PlanStatus;
}

export interface PlanAddInput {
  code: string;
  date: string;
  zone: string;
  vehicleType: string;
  orderIds: string[];
  status: PlanStatus;
}

export type PlanEditInput = Partial<Omit<PlanRecord, "id">>;
