import type { DenormalizedUnitFields } from "~/features/system/units-of-measure";

export interface StockLevelRecord extends DenormalizedUnitFields {
  id: string;
  stockLevelKey: string;
  productId: string;
  productName: string;
  variantId?: string;
  variantSku?: string;
  warehouseId: string;
  warehouseName: string;
  quantity: number;
  averageUnitCost: number;
  inventoryValue: number;
  currencyCode: string;
  lastMovementDate: string;
  locationId: string;
  companyId: string;
  accountId: string;
}
