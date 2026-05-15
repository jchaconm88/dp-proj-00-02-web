import type { DenormalizedUnitFields } from "~/features/system/units-of-measure";

export type SaleOrderStatus = "draft" | "confirmed" | "in_progress" | "delivered" | "invoiced" | "cancelled";

export interface SaleOrderRecord {
  id: string;
  code: string;
  clientId: string;
  clientName: string;
  quotationId?: string;
  issueDate: string;
  expectedDeliveryDate?: string;
  currency: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  notes?: string;
  status: SaleOrderStatus;
  locationId: string;
  locationName: string;
  companyId: string;
  accountId: string;
  createAt?: any;
  createBy?: string;
  updateAt?: any;
  updateBy?: string;
}

export interface SaleOrderAddInput {
  code: string;
  clientId: string;
  clientName: string;
  quotationId?: string;
  issueDate: string;
  expectedDeliveryDate?: string;
  currency: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  notes?: string;
  status: SaleOrderStatus;
  locationId: string;
  locationName: string;
}

export type SaleOrderEditInput = Partial<
  Omit<SaleOrderRecord, "id" | "companyId" | "accountId" | "createAt" | "createBy">
>;

export interface SaleOrderItemRecord extends DenormalizedUnitFields {
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxAffectation: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  dispatchedQuantity?: number;
}

export interface SaleOrderItemAddInput {
  productId: string;
  productName: string;
  productCode?: string;
  quantity: number;
  unitOfMeasureCode: string;
  unitPrice: number;
  discount: number;
  taxAffectation: string;
  subtotal: number;
  taxAmount: number;
  total: number;
}

export type SaleOrderItemEditInput = Partial<
  Omit<SaleOrderItemRecord, "id">
>;

export interface GenerateInvoiceFromSaleOrderInput {
  type: string;
  sequenceId: string;
  companyLocationId: string;
  payTerm: string;
  currency: string;
  issueDate: string;
}
