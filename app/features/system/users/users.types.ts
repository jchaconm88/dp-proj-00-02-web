export type ProfileRecord = {
  id: string;
  email: string;
  displayName: string;
  /** Cuenta SaaS (tenant); alineado con claims y empresas. */
  accountId?: string;
};
