export type CompanyRecord = {
  id: string;
  name: string;
  status: "active" | "inactive";
  code?: string;
  taxId?: string;
};

