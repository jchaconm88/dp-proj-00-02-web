export interface KardexLineRecord {
  id: string;
  movementGroupId: string;
  stockLevelKey: string;
  type: string;
  code: string;
  date: string;
  productId: string;
  productName: string;
  variantId?: string;
  warehouseId: string;
  warehouseName: string;
  quantityIn: number;
  quantityOut: number;
  balanceBefore: number;
  balanceAfter: number;
  valueIn: number;
  valueOut: number;
  balanceValueBefore: number;
  balanceValueAfter: number;
  unitCostApplied: number;
  averageUnitCostAfter: number;
  currencyCode: string;
  referenceType?: string;
  referenceId?: string;
  reason?: string;
  notes?: string;
}
