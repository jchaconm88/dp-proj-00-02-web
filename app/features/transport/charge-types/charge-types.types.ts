export type ChargeTypeKind = "charge" | "cost";

export type ChargeTypeSource =
  | ""
  | "service"
  | "employee"
  | "resource"
  | "employee_resource";

export type ChargeTypeCategory = "base" | "extra" | "variable";

export interface ChargeTypeRecord {
  id: string;
  code: string;
  type: ChargeTypeKind;
  source: ChargeTypeSource;
  name: string;
  category: ChargeTypeCategory;
  active: boolean;
}

export interface ChargeTypeAddInput {
  code: string;
  type: ChargeTypeKind;
  source: ChargeTypeSource;
  name: string;
  category: ChargeTypeCategory;
  active: boolean;
}

export type ChargeTypeEditInput = Partial<Omit<ChargeTypeRecord, "id">>;

