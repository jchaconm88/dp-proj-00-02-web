import type { DenormalizedUnitFields } from "~/features/system/units-of-measure";

export type ProductType = "good" | "service";

export interface ProductRecord extends DenormalizedUnitFields {
  id: string;
  code: string;
  name: string;
  description?: string;
  categoryId?: string;
  categoryName?: string;
  type: ProductType;
  purchasePrice: number;
  salePrice: number;
  currency: string;
  taxAffectation: string;
  minStock?: number;
  maxStock?: number;
  active: boolean;
  companyId: string;
  accountId: string;
  createAt?: any;
  createBy?: string;
  updateAt?: any;
  updateBy?: string;
}

export interface ProductAddInput {
  code: string;
  name: string;
  description?: string;
  categoryId?: string;
  categoryName?: string;
  type: ProductType;
  /** Código de unidad del catálogo (ej. `unit`, `kg`). */
  unitOfMeasureCode: string;
  purchasePrice: number;
  salePrice: number;
  currency: string;
  taxAffectation: string;
  minStock?: number;
  maxStock?: number;
  active: boolean;
}

export type ProductEditInput = Partial<Omit<ProductRecord, "id" | "companyId" | "accountId" | "createAt" | "createBy">>;
