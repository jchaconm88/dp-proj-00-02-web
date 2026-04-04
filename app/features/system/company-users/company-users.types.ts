export type CompanyUserRecord = {
  id: string;
  companyId: string;
  /** Denormalizado desde `companies.accountId`. */
  accountId?: string;
  uid: string;
  roleIds: string[];
  status: "active" | "inactive";
};

