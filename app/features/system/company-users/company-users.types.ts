export type CompanyUserRecord = {
  id: string;
  companyId: string;
  uid: string;
  roleIds: string[];
  status: "active" | "inactive";
};

