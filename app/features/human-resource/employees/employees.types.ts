export type EmployeeStatus = "active" | "inactive" | "suspended";
export type SalaryType = "monthly" | "weekly" | "daily";

export interface EmployeePayroll {
  salaryType: SalaryType;
  baseSalary: number;
  currency: string;
}

export interface EmployeeBenefits {
  cts: boolean;
  gratification: boolean;
  vacationDays: number;
}

export interface EmployeeRecord {
  id: string;
  code: string;
  firstName: string;
  lastName: string;
  documentNo: string;
  documentTypeId: string;
  documentType: string;
  phone: string;
  email: string;
  positionId: string;
  position: string;
  hireDate: string;
  status: EmployeeStatus;
  payroll: EmployeePayroll;
  benefits: EmployeeBenefits;
}

export interface EmployeeAddInput {
  code: string;
  firstName: string;
  lastName: string;
  documentNo: string;
  documentTypeId: string;
  documentType: string;
  phone: string;
  email: string;
  positionId: string;
  position: string;
  hireDate: string;
  status: EmployeeStatus;
  payroll: EmployeePayroll;
  benefits: EmployeeBenefits;
}

export type EmployeeEditInput = Partial<Omit<EmployeeRecord, "id">>;
