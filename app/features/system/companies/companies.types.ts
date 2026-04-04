export type CompanyRecord = {
  id: string;
  name: string;
  status: "active" | "inactive";
  /** Tenant de facturación / SaaS (1:1 inicial con frecuencia). */
  accountId?: string;
  code?: string;
  taxId?: string;
};

