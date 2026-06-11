import type { DenormalizedUnitFields } from "~/features/system/units-of-measure";

export type MovementType = "entry" | "exit" | "transfer" | "adjustment";
export type MovementReferenceType = "purchase-order" | "sale-order" | "manual";

export interface InventoryMovementRecord extends DenormalizedUnitFields {
  id: string;
  code: string;
  type: MovementType;
  warehouseId: string;
  warehouseName: string;
  warehouseDestinationId?: string;
  warehouseDestinationName?: string;
  productId: string;
  productName: string;
  variantId?: string;
  quantity: number;
  unitCostApplied?: number;
  reason?: string;
  referenceType?: MovementReferenceType;
  referenceId?: string;
  date: string;
  notes?: string;
  locationId: string;
  locationName: string;
  companyId: string;
  accountId: string;
  createAt?: any;
  createBy?: string;
}

export interface MovementAddInput {
  code: string;
  type: MovementType;
  warehouseId: string;
  warehouseName: string;
  warehouseDestinationId?: string;
  warehouseDestinationName?: string;
  productId: string;
  productName: string;
  variantId?: string;
  quantity: number;
  unitCostApplied?: number;
  /** Código de unidad del catálogo (ej. `unit`, `kg`). */
  unitOfMeasure: string;
  reason?: string;
  referenceType?: MovementReferenceType;
  referenceId?: string;
  date: string;
  notes?: string;
  locationId: string;
  locationName: string;
}

export interface MovementEditInput {
  code?: string;
  type?: MovementType;
  warehouseId?: string;
  warehouseName?: string;
  warehouseDestinationId?: string;
  warehouseDestinationName?: string;
  productId?: string;
  productName?: string;
  quantity?: number;
  unitOfMeasure?: string;
  reason?: string;
  referenceType?: MovementReferenceType;
  referenceId?: string;
  date?: string;
  notes?: string;
  locationId?: string;
  locationName?: string;
}
