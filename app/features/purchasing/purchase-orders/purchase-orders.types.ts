import type { DenormalizedUnitFields } from "~/features/system/units-of-measure";

export type PurchaseOrderStatus = "draft" | "confirmed" | "partial_received" | "received" | "cancelled";

export interface PurchaseOrderRecord {
  id: string;
  code: string;
  supplierId: string;
  supplierName: string;
  issueDate: string;
  expectedDeliveryDate?: string;
  currency: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  notes?: string;
  status: PurchaseOrderStatus;
  locationId: string;
  locationName: string;
  companyId: string;
  accountId: string;
  createAt?: any;
  createBy?: string;
  updateAt?: any;
  updateBy?: string;
}

export interface PurchaseOrderAddInput {
  code: string;
  supplierId: string;
  supplierName: string;
  issueDate: string;
  expectedDeliveryDate?: string;
  currency: string;
  notes?: string;
  status: PurchaseOrderStatus;
  locationId: string;
  locationName: string;
}

export type PurchaseOrderEditInput = Partial<
  Omit<PurchaseOrderRecord, "id" | "companyId" | "accountId" | "createAt" | "createBy">
>;

export interface PurchaseOrderItemRecord extends DenormalizedUnitFields {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  taxAffectation: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  receivedQuantity?: number;
}

export interface PurchaseOrderItemAddInput {
  productId: string;
  productName: string;
  quantity: number;
  unitOfMeasureCode: string;
  unitPrice: number;
  taxAffectation: string;
}

export type PurchaseOrderItemEditInput = Partial<
  Omit<PurchaseOrderItemRecord, "id">
>;
