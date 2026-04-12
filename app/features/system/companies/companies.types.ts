export type CompanyRecord = {
  id: string;
  name: string;
  status: "active" | "inactive";
  /** Tenant de facturación / SaaS (1:1 inicial con frecuencia). */
  accountId?: string;
  code?: string;
  taxId?: string;
  /** Logo legacy (fase 1), se conserva para compatibilidad. */
  logoUrl?: string;
  /** Path legacy (fase 1), se conserva para compatibilidad. */
  logoPath?: string;
  logoLightUrl?: string;
  logoLightPath?: string;
  logoDarkUrl?: string;
  logoDarkPath?: string;
};

