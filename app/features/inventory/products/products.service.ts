import { webFetch } from "~/lib/backend-client";
import { requireActiveCompanyId, resolveActiveAccountId } from "~/lib/tenant";
import { denormalizedUnitFromApi } from "~/features/system/units-of-measure";
import type { ProductRecord, ProductAddInput, ProductEditInput } from "./products.types";

function queryParams(companyId: string): string {
  return `?companyId=${encodeURIComponent(companyId)}`;
}

function toProductRecord(doc: Record<string, unknown>): ProductRecord {
  const u = denormalizedUnitFromApi(doc);
  return {
    id: String(doc.id ?? ""),
    code: String(doc.code ?? ""),
    name: String(doc.name ?? ""),
    description: doc.description ? String(doc.description) : undefined,
    categoryId: doc.categoryId ? String(doc.categoryId) : undefined,
    categoryName: doc.categoryName ? String(doc.categoryName) : undefined,
    type: doc.type === "service" ? "service" : "good",
    ...u,
    purchasePrice: Number(doc.purchasePrice) || 0,
    salePrice: Number(doc.salePrice) || 0,
    currency: String(doc.currency ?? "PEN"),
    taxAffectation: String(doc.taxAffectation ?? "10"),
    minStock: doc.minStock != null ? Number(doc.minStock) : undefined,
    maxStock: doc.maxStock != null ? Number(doc.maxStock) : undefined,
    active: doc.active !== false,
    companyId: String(doc.companyId ?? ""),
    accountId: String(doc.accountId ?? ""),
    createAt: doc.createAt ?? undefined,
    createBy: doc.createBy ? String(doc.createBy) : undefined,
    updateAt: doc.updateAt ?? undefined,
    updateBy: doc.updateBy ? String(doc.updateBy) : undefined,
  };
}

export async function getProducts(): Promise<{ items: ProductRecord[] }> {
  const companyId = requireActiveCompanyId();
  const data = await webFetch<{ items: Record<string, unknown>[] }>(
    `/inventory/products${queryParams(companyId)}`
  );
  return { items: (data.items ?? []).map(toProductRecord) };
}

export async function getProduct(id: string): Promise<ProductRecord | null> {
  const companyId = requireActiveCompanyId();
  try {
    const data = await webFetch<Record<string, unknown>>(
      `/inventory/products/${encodeURIComponent(id)}${queryParams(companyId)}`
    );
    return data ? toProductRecord(data) : null;
  } catch {
    return null;
  }
}

export async function addProduct(data: ProductAddInput): Promise<string> {
  const companyId = requireActiveCompanyId();
  const accountId = await resolveActiveAccountId();
  const result = await webFetch<{ id: string }>("/inventory/products", {
    method: "POST",
    body: JSON.stringify({
      companyId,
      accountId,
      code: data.code?.trim() ?? "",
      name: data.name.trim(),
      description: data.description?.trim() ?? "",
      categoryId: data.categoryId ?? "",
      categoryName: data.categoryName ?? "",
      type: data.type,
      unitOfMeasureCode: data.unitOfMeasureCode.trim(),
      purchasePrice: Number(data.purchasePrice) || 0,
      salePrice: Number(data.salePrice) || 0,
      currency: data.currency?.trim() || "PEN",
      taxAffectation: data.taxAffectation?.trim() || "10",
      minStock: data.minStock != null ? Number(data.minStock) : null,
      maxStock: data.maxStock != null ? Number(data.maxStock) : null,
      active: data.active !== false,
    }),
  });
  return result.id;
}

export async function updateProduct(id: string, data: ProductEditInput): Promise<void> {
  const companyId = requireActiveCompanyId();
  const payload: Record<string, unknown> = { companyId };
  if (data.code !== undefined) payload.code = data.code;
  if (data.name !== undefined) payload.name = data.name;
  if (data.description !== undefined) payload.description = data.description;
  if (data.categoryId !== undefined) payload.categoryId = data.categoryId;
  if (data.categoryName !== undefined) payload.categoryName = data.categoryName;
  if (data.type !== undefined) payload.type = data.type;
  if (data.unitOfMeasureCode !== undefined) payload.unitOfMeasureCode = data.unitOfMeasureCode;
  if (data.purchasePrice !== undefined) payload.purchasePrice = Number(data.purchasePrice) || 0;
  if (data.salePrice !== undefined) payload.salePrice = Number(data.salePrice) || 0;
  if (data.currency !== undefined) payload.currency = data.currency;
  if (data.taxAffectation !== undefined) payload.taxAffectation = data.taxAffectation;
  if (data.minStock !== undefined) payload.minStock = data.minStock;
  if (data.maxStock !== undefined) payload.maxStock = data.maxStock;
  if (data.active !== undefined) payload.active = data.active;
  await webFetch(`/inventory/products/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteProduct(id: string): Promise<void> {
  const companyId = requireActiveCompanyId();
  await webFetch(`/inventory/products/${encodeURIComponent(id)}${queryParams(companyId)}`, {
    method: "DELETE",
  });
}

export async function deleteProducts(ids: string[]): Promise<void> {
  const companyId = requireActiveCompanyId();
  await Promise.all(
    ids.map((id) =>
      webFetch(`/inventory/products/${encodeURIComponent(id)}${queryParams(companyId)}`, {
        method: "DELETE",
      })
    )
  );
}
