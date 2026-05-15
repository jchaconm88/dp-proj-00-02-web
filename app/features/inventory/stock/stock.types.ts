import type { DenormalizedUnitFields } from "~/features/system/units-of-measure";

export interface StockLevelRecord extends DenormalizedUnitFields {
  id: string;
  productId: string;
  productName: string;
  warehouseId: string;
  warehouseName: string;
  quantity: number;
  lastMovementDate: string;
  locationId: string;
  companyId: string;
  accountId: string;
}
