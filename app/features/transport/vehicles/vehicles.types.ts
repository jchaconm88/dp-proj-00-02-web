export type VehicleStatus = "available" | "assigned" | "inactive";

export interface VehicleRecord {
  id: string;
  plate: string;
  type: string;
  brand: string;
  model: string;
  capacityKg: number;
  status: VehicleStatus;
  currentTripId: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type VehicleAddInput = Omit<VehicleRecord, "id" | "createdAt" | "updatedAt">;
export type VehicleEditInput = Partial<VehicleAddInput>;
