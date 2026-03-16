export type ContractStatus = "draft" | "active" | "expired" | "cancelled";
export type BillingCycle = "monthly" | "weekly" | "per_trip";
export type RateRuleType = "base" | "extra_charge" | "penalty" | "discount";
export type CalculationType =
  | "fixed"
  | "zone"
  | "per_km"
  | "per_weight"
  | "per_volume"
  | "percentage"
  | "formula";

export interface ContractRecord {
  id: string;
  clientId: string;
  client: string;
  contractCode: string;
  description: string;
  currency: string;
  validFrom: string;
  validTo: string;
  billingCycle: BillingCycle;
  paymentTermsDays: number;
  status: ContractStatus;
}

export interface ContractAddInput {
  clientId: string;
  client: string;
  contractCode: string;
  description: string;
  currency: string;
  validFrom: string;
  validTo: string;
  billingCycle: BillingCycle;
  paymentTermsDays: number;
  status: ContractStatus;
}

export type ContractEditInput = Partial<Omit<ContractRecord, "id">>;

// --- Rate rules (Subcollection) ---
export interface RateRuleConditions {
  originZone?: string | null;
  destinationZone?: string | null;
  minWeight?: number | null;
  maxWeight?: number | null;
  minDistanceKm?: number | null;
  maxDistanceKm?: number | null;
  priorityLevel?: string | null;
  dayOfWeek?: string | null;
}

export interface RateRuleCalculation {
  basePrice?: number | null;
  pricePerKm?: number | null;
  pricePerTon?: number | null;
  pricePerM3?: number | null;
  percentage?: number | null;
}

export interface RateRuleRecord {
  id: string;
  code: string;
  name: string;
  active: boolean;
  priority: number;
  ruleType: RateRuleType;
  calculationType: CalculationType;
  transportServiceId: string;
  transportService: string;
  vehicleType: string;
  conditions: RateRuleConditions;
  calculation: RateRuleCalculation;
  stackable: boolean;
  validFrom: string;
  validTo: string;
}

export interface RateRuleAddInput {
  code: string;
  name: string;
  active: boolean;
  priority: number;
  ruleType: RateRuleType;
  calculationType: CalculationType;
  transportServiceId: string;
  transportService: string;
  vehicleType: string;
  conditions: RateRuleConditions;
  calculation: RateRuleCalculation;
  stackable: boolean;
  validFrom: string;
  validTo: string;
}

export type RateRuleEditInput = Partial<Omit<RateRuleRecord, "id">>;
