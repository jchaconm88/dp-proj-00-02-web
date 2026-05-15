import type { DenormalizedUnitFields } from "~/features/system/units-of-measure";

export type QuotationStatus = "draft" | "sent" | "confirmed" | "rejected" | "expired";

export interface QuotationRecord {
  id: string;
  code: string;
  clientId: string;
  clientName: string;
  issueDate: string;
  validUntil?: string;
  currency: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  notes?: string;
  status: QuotationStatus;
  locationId: string;
  locationName: string;
  companyId: string;
  accountId: string;
  saleOrderId?: string;
  saleOrder?: string;
  createAt?: any;
  createBy?: string;
  updateAt?: any;
  updateBy?: string;
}

export interface QuotationAddInput {
  code: string;
  clientId: string;
  clientName: string;
  issueDate: string;
  validUntil?: string;
  currency: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  notes?: string;
  status: QuotationStatus;
  locationId: string;
  locationName: string;
}

export type QuotationEditInput = Partial<
  Omit<QuotationRecord, "id" | "companyId" | "accountId" | "createAt" | "createBy">
>;

export interface QuotationItemRecord extends DenormalizedUnitFields {
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
}

export interface QuotationItemAddInput {
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

export type QuotationItemEditInput = Partial<Omit<QuotationItemRecord, "id">>;
