export type WarehouseType = "principal" | "secondary" | "transit";

export interface WarehouseRecord {
  id: string;
  code: string;
  name: string;
  address?: string;
  ubigeo?: string;
  district?: string;
  city?: string;
  country?: string;
  type: WarehouseType;
  active: boolean;
  locationId: string;
  locationName: string;
  companyId: string;
  accountId: string;
  createAt?: any;
  createBy?: string;
  updateAt?: any;
  updateBy?: string;
}

export interface WarehouseAddInput {
  code: string;
  name: string;
  address?: string;
  ubigeo?: string;
  district?: string;
  city?: string;
  country?: string;
  type: WarehouseType;
  active: boolean;
  locationId: string;
  locationName: string;
}

export type WarehouseEditInput = Partial<Omit<WarehouseRecord, "id" | "companyId" | "accountId" | "createAt" | "createBy" | "updateAt" | "updateBy">>;
