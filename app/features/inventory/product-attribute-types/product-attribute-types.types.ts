export interface ProductAttributeTypeRecord {
  id: string;
  code: string;
  label: string;
  values: string[];
  valueColors: Record<string, string>;
  isColor: boolean;
  useForVariants: boolean;
  useForFilters: boolean;
  sortOrder: number;
  active: boolean;
  companyId: string;
  accountId: string;
  createAt?: unknown;
  createBy?: string;
  updateAt?: unknown;
  updateBy?: string;
}

export interface ProductAttributeTypeAddInput {
  code: string;
  label: string;
  values: string[];
  valueColors: Record<string, string>;
  isColor: boolean;
  useForVariants: boolean;
  useForFilters: boolean;
  sortOrder: number;
  active: boolean;
}

export type ProductAttributeTypeEditInput = Partial<
  Omit<ProductAttributeTypeRecord, "id" | "companyId" | "accountId" | "createAt" | "createBy" | "updateAt" | "updateBy">
>;
