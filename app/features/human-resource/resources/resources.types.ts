export type ResourceEngagementType = "sporadic" | "permanent" | "contract";
export type ResourceStatus = "active" | "inactive" | "suspended";

export interface ResourceRecord {
  id: string;
  code: string;
  firstName: string;
  lastName: string;
  documentNo: string;
  documentTypeId: string;
  documentType: string;
  phone: string;
  email: string;
  positionId: string;
  position: string;
  hireDate: string;
  engagementType: ResourceEngagementType;
  status: ResourceStatus;
}

export interface ResourceAddInput {
  code: string;
  firstName: string;
  lastName: string;
  documentNo: string;
  documentTypeId: string;
  documentType: string;
  phone: string;
  email: string;
  positionId: string;
  position: string;
  hireDate: string;
  engagementType: ResourceEngagementType;
  status: ResourceStatus;
}

export type ResourceEditInput = Partial<Omit<ResourceRecord, "id">>;

export type ResourceCostType = "per_trip" | "per_hour" | "per_day" | "fixed";

export interface ResourceCostRecord {
  id: string;
  code: string;
  name: string;
  type: ResourceCostType;
  amount: number;
  currency: string;
  effectiveFrom: string;
  active: boolean;
}

export interface ResourceCostAddInput {
  code: string;
  name: string;
  type: ResourceCostType;
  amount: number;
  currency: string;
  effectiveFrom: string;
  active: boolean;
}

export type ResourceCostEditInput = Partial<Omit<ResourceCostRecord, "id">>;
