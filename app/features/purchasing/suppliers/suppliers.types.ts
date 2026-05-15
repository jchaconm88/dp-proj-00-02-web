export type SupplierStatus = "active" | "inactive";

export interface SupplierContact {
  contactName?: string;
  email?: string;
  phone?: string;
}

export interface SupplierRecord {
  id: string;
  code: string;
  businessName: string;
  commercialName?: string;
  documentTypeId?: string;
  documentNumber?: string;
  contact: SupplierContact;
  paymentCondition?: string;
  currency?: string;
  status: SupplierStatus;
  companyId: string;
  accountId: string;
  createAt?: any;
  createBy?: string;
  updateAt?: any;
  updateBy?: string;
}

export interface SupplierAddInput {
  code: string;
  businessName: string;
  commercialName?: string;
  documentTypeId?: string;
  documentNumber?: string;
  contact: SupplierContact;
  paymentCondition?: string;
  currency?: string;
  status: SupplierStatus;
}

export type SupplierEditInput = Partial<Omit<SupplierRecord, "id" | "companyId" | "accountId" | "createAt" | "createBy">>;
