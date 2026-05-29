import type { DenormalizedUnitFields } from "~/features/system/units-of-measure";

export type ProductType =
  | "good"
  | "service"
  | "raw_material"
  | "finished_good"
  | "semi_finished"
  | "by_product"
  | "supply";

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
  sku?: string;
  ecommerceStatus: "active" | "inactive" | "discontinued";
  imageUrls: string[];
  categoryPath: string[];
  variantAttributeTypeCodes: string[];
  variantAttributeLabels: Record<string, string>;
  attributeDefinitions?: Record<string, string[]>;
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
  sku?: string;
  ecommerceStatus?: "active" | "inactive" | "discontinued";
  imageUrls?: string[];
  categoryPath?: string[];
  variantAttributeTypeCodes?: string[];
}

export type ProductEditInput = Partial<Omit<ProductRecord, "id" | "companyId" | "accountId" | "createAt" | "createBy">>;
