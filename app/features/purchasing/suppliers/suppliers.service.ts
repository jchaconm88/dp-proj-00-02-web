import { webFetch } from "~/lib/backend-client";
import { requireActiveCompanyId, resolveActiveAccountId } from "~/lib/tenant";
import type { SupplierRecord, SupplierAddInput, SupplierEditInput } from "./suppliers.types";

function queryParams(companyId: string): string {
  return `?companyId=${encodeURIComponent(companyId)}`;
}

function toSupplierRecord(doc: Record<string, unknown>): SupplierRecord {
  return {
    id: String(doc.id ?? ""),
    code: String(doc.code ?? ""),
    businessName: String(doc.businessName ?? ""),
    commercialName: doc.commercialName ? String(doc.commercialName) : undefined,
    documentTypeId: doc.documentTypeId ? String(doc.documentTypeId) : undefined,
    documentNumber: doc.documentNumber ? String(doc.documentNumber) : undefined,
    contact: doc.contact && typeof doc.contact === "object"
      ? {
          contactName: (doc.contact as any).contactName ? String((doc.contact as any).contactName) : undefined,
          email: (doc.contact as any).email ? String((doc.contact as any).email) : undefined,
          phone: (doc.contact as any).phone ? String((doc.contact as any).phone) : undefined,
        }
      : { contactName: undefined, email: undefined, phone: undefined },
    paymentCondition: doc.paymentCondition ? String(doc.paymentCondition) : undefined,
    currency: doc.currency ? String(doc.currency) : undefined,
    status: String(doc.status ?? "active") === "inactive" ? "inactive" : "active",
    companyId: String(doc.companyId ?? ""),
    accountId: String(doc.accountId ?? ""),
    createAt: doc.createAt ?? undefined,
    createBy: doc.createBy ? String(doc.createBy) : undefined,
    updateAt: doc.updateAt ?? undefined,
    updateBy: doc.updateBy ? String(doc.updateBy) : undefined,
  };
}

export async function getSuppliers(): Promise<{ items: SupplierRecord[] }> {
  const companyId = requireActiveCompanyId();
  const data = await webFetch<{ items: Record<string, unknown>[] }>(
    `/purchasing/suppliers${queryParams(companyId)}`
  );
  return { items: (data.items ?? []).map(toSupplierRecord) };
}

export async function getSupplierById(id: string): Promise<SupplierRecord | null> {
  const companyId = requireActiveCompanyId();
  try {
    const data = await webFetch<Record<string, unknown>>(
      `/purchasing/suppliers/${encodeURIComponent(id)}${queryParams(companyId)}`
    );
    return data ? toSupplierRecord(data) : null;
  } catch {
    return null;
  }
}

export async function addSupplier(data: SupplierAddInput): Promise<string> {
  const companyId = requireActiveCompanyId();
  const accountId = await resolveActiveAccountId();
  const result = await webFetch<{ id: string }>("/purchasing/suppliers", {
    method: "POST",
    body: JSON.stringify({
      companyId,
      accountId,
      code: data.code,
      businessName: data.businessName,
      ...(data.commercialName ? { commercialName: data.commercialName } : {}),
      ...(data.documentTypeId ? { documentTypeId: data.documentTypeId } : {}),
      ...(data.documentNumber ? { documentNumber: data.documentNumber } : {}),
      contact: data.contact,
      ...(data.paymentCondition ? { paymentCondition: data.paymentCondition } : {}),
      ...(data.currency ? { currency: data.currency } : {}),
      status: data.status,
    }),
  });
  return result.id;
}

export async function updateSupplier(id: string, data: SupplierEditInput): Promise<void> {
  const companyId = requireActiveCompanyId();
  await webFetch(`/purchasing/suppliers/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({ companyId, ...data }),
  });
}

export async function deleteSupplier(id: string): Promise<void> {
  const companyId = requireActiveCompanyId();
  await webFetch(`/purchasing/suppliers/${encodeURIComponent(id)}${queryParams(companyId)}`, {
    method: "DELETE",
  });
}

export async function deleteSuppliers(ids: string[]): Promise<void> {
  const companyId = requireActiveCompanyId();
  await Promise.all(
    ids.map((id) =>
      webFetch(`/purchasing/suppliers/${encodeURIComponent(id)}${queryParams(companyId)}`, {
        method: "DELETE",
      })
    )
  );
}
