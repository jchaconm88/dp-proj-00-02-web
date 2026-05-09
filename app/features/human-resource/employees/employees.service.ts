import { webFetch } from "~/lib/backend-client";
import { requireActiveCompanyId } from "~/lib/tenant";
import { EMPLOYEE_STATUS, parseStatus, SALARY_TYPE, statusDefaultKey } from "~/constants/status-options";
import type {
  EmployeeRecord,
  EmployeeAddInput,
  EmployeeEditInput,
  EmployeePayroll,
  EmployeeBenefits,
  EmployeeStatus,
  SalaryType,
} from "./employees.types";

function toPayroll(v: unknown): EmployeePayroll {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    const o = v as Record<string, unknown>;
    const salaryType: SalaryType = parseStatus(o.salaryType, SALARY_TYPE) as SalaryType;
    return {
      salaryType,
      baseSalary: Number(o.baseSalary) || 0,
      workingDays: Math.max(1, Number(o.workingDays) || 26),
      currency: String(o.currency ?? "PEN"),
    };
  }
  return {
    salaryType: statusDefaultKey(SALARY_TYPE) as SalaryType,
    baseSalary: 0,
    workingDays: 26,
    currency: "PEN",
  };
}

function toBenefits(v: unknown): EmployeeBenefits {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    const o = v as Record<string, unknown>;
    return {
      cts: o.cts === true,
      gratification: o.gratification === true,
      vacationDays: Number(o.vacationDays) || 0,
    };
  }
  return { cts: true, gratification: true, vacationDays: 30 };
}

function toEmployeeRecord(data: Record<string, unknown> & { id?: string }): EmployeeRecord {
  return {
    id: String(data.id ?? ""),
    code: String(data.code ?? ""),
    firstName: String(data.firstName ?? ""),
    lastName: String(data.lastName ?? ""),
    documentNo: String(data.documentNo ?? ""),
    documentTypeId: String(data.documentTypeId ?? ""),
    documentType: String(data.documentType ?? ""),
    phone: String(data.phone ?? ""),
    email: String(data.email ?? ""),
    positionId: String(data.positionId ?? ""),
    position: String(data.position ?? ""),
    hireDate: String(data.hireDate ?? ""),
    status: parseStatus(data.status, EMPLOYEE_STATUS) as EmployeeStatus,
    payroll: toPayroll(data.payroll),
    benefits: toBenefits(data.benefits),
  };
}

export async function getEmployeeById(id: string): Promise<EmployeeRecord | null> {
  const companyId = requireActiveCompanyId();
  const data = await webFetch<Record<string, unknown> | null>(
    `/human-resource/employees/${encodeURIComponent(id)}?companyId=${encodeURIComponent(companyId)}`
  );
  return data ? toEmployeeRecord(data) : null;
}

export async function getEmployees(): Promise<{ items: EmployeeRecord[]; last: null }> {
  const companyId = requireActiveCompanyId();
  const res = await webFetch<{ items: Record<string, unknown>[] }>(
    `/human-resource/employees?companyId=${encodeURIComponent(companyId)}`
  );
  const items = (res.items ?? []).map(toEmployeeRecord);
  items.sort((a, b) =>
    `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`)
  );
  return { items, last: null };
}

export async function addEmployee(data: EmployeeAddInput): Promise<string> {
  const companyId = requireActiveCompanyId();
  const res = await webFetch<{ id: string }>("/human-resource/employees", {
    method: "POST",
    body: JSON.stringify({
      companyId,
      code: data.code.trim(),
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      documentNo: data.documentNo.trim(),
      documentTypeId: data.documentTypeId.trim(),
      documentType: data.documentType.trim(),
      phone: data.phone.trim(),
      email: data.email.trim(),
      positionId: data.positionId.trim(),
      position: data.position.trim(),
      hireDate: data.hireDate.trim() || null,
      status: data.status,
      payroll: {
        salaryType: data.payroll.salaryType,
        baseSalary: Number(data.payroll.baseSalary) || 0,
        workingDays: Math.max(1, Number(data.payroll.workingDays) || 26),
        currency: (data.payroll.currency ?? "PEN").trim(),
      },
      benefits: {
        cts: data.benefits.cts === true,
        gratification: data.benefits.gratification === true,
        vacationDays: Number(data.benefits.vacationDays) || 0,
      },
    }),
  });
  return res.id;
}

export async function updateEmployee(id: string, data: EmployeeEditInput): Promise<void> {
  const companyId = requireActiveCompanyId();
  const payload: Record<string, unknown> = {};
  if (data.code !== undefined) payload.code = data.code;
  if (data.firstName !== undefined) payload.firstName = data.firstName;
  if (data.lastName !== undefined) payload.lastName = data.lastName;
  if (data.documentNo !== undefined) payload.documentNo = data.documentNo;
  if (data.documentTypeId !== undefined) payload.documentTypeId = data.documentTypeId;
  if (data.documentType !== undefined) payload.documentType = data.documentType;
  if (data.phone !== undefined) payload.phone = data.phone;
  if (data.email !== undefined) payload.email = data.email;
  if (data.positionId !== undefined) payload.positionId = data.positionId;
  if (data.position !== undefined) payload.position = data.position;
  if (data.hireDate !== undefined) payload.hireDate = data.hireDate || null;
  if (data.status !== undefined) payload.status = data.status;
  if (data.payroll !== undefined) {
    payload.payroll = {
      salaryType: data.payroll.salaryType,
      baseSalary: Number(data.payroll.baseSalary) || 0,
      workingDays: Math.max(1, Number(data.payroll.workingDays) || 26),
      currency: (data.payroll.currency ?? "PEN").trim(),
    };
  }
  if (data.benefits !== undefined) {
    payload.benefits = {
      cts: data.benefits.cts === true,
      gratification: data.benefits.gratification === true,
      vacationDays: Number(data.benefits.vacationDays) || 0,
    };
  }
  await webFetch(`/human-resource/employees/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({ companyId, ...payload }),
  });
}

export async function deleteEmployee(id: string): Promise<void> {
  const companyId = requireActiveCompanyId();
  await webFetch(`/human-resource/employees/${encodeURIComponent(id)}?companyId=${encodeURIComponent(companyId)}`, {
    method: "DELETE",
  });
}