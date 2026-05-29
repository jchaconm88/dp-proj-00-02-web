export interface VariantAttributeTypeRecord {
  id: string;
  code: string;
  label: string;
  values: string[];
  sortOrder: number;
  active: boolean;
  companyId: string;
  accountId: string;
  createAt?: unknown;
  createBy?: string;
  updateAt?: unknown;
  updateBy?: string;
}

export interface VariantAttributeTypeAddInput {
  code: string;
  label: string;
  values: string[];
  sortOrder: number;
  active: boolean;
}

export type VariantAttributeTypeEditInput = Partial<
  Omit<VariantAttributeTypeRecord, "id" | "companyId" | "accountId" | "createAt" | "createBy" | "updateAt" | "updateBy">
>;
