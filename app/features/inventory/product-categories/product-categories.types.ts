export interface ProductCategoryRecord {
  id: string;
  code: string;
  name: string;
  description?: string;
  parentCategoryId?: string;
  active: boolean;
  companyId: string;
  accountId: string;
  createAt?: any;
  createBy?: string;
  updateAt?: any;
  updateBy?: string;
}

export interface ProductCategoryAddInput {
  code: string;
  name: string;
  description?: string;
  parentCategoryId?: string;
  active: boolean;
}

export type ProductCategoryEditInput = Partial<Omit<ProductCategoryRecord, "id" | "companyId" | "accountId" | "createAt" | "createBy" | "updateAt" | "updateBy">>;

export interface CategoryTreeNode {
  id: string;
  name: string;
  code: string;
  parentCategoryId?: string;
  children: CategoryTreeNode[];
  depth: number;
  active: boolean;
}
