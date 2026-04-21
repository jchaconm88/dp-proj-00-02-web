/** Sede de empresa (subcolección bajo `companies/{companyId}/companyLocations`). */
export interface CompanyLocationRecord {
  id: string;
  name: string;
  description: string;
  ubigeo: string;
  city: string;
  country: string;
  district: string;
  address: string;
  active: boolean;
}

export interface CompanyLocationAddInput {
  name: string;
  description: string;
  ubigeo: string;
  city: string;
  country: string;
  district: string;
  address: string;
  active: boolean;
}

export type CompanyLocationEditInput = Partial<Omit<CompanyLocationRecord, "id">>;
