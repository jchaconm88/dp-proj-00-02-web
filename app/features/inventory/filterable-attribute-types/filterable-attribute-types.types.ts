export interface FilterableAttributeTypeRecord {
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

export interface FilterableAttributeTypeAddInput {
  code: string;
  label: string;
  values: string[];
  sortOrder: number;
  active: boolean;
}

export type FilterableAttributeTypeEditInput = Partial<
  Omit<FilterableAttributeTypeRecord, "id" | "companyId" | "accountId" | "createAt" | "createBy" | "updateAt" | "updateBy">
>;
