export interface ProductVariantRecord {
  id: string;
  productId: string;
  sku: string;
  attributes: Record<string, string>;
  salePrice: number;
  salePricePromo: number | null;
  saleStart?: string;
  saleEnd?: string;
  weightKg?: number;
  imageUrls: string[];
  active: boolean;
  updatedAt: string | null;
  standardUnitCost?: number | null;
  productName?: string;
  productSku?: string;
}

export interface ProductVariantInput {
  sku: string;
  attributes?: Record<string, string>;
  salePrice: number;
  salePricePromo?: number | null;
  saleStart?: string;
  saleEnd?: string;
  weightKg?: number;
  imageUrls?: string[];
  active?: boolean;
  standardUnitCost?: number | null;
}
