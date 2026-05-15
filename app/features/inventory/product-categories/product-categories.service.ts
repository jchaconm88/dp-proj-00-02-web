import { webFetch } from "~/lib/backend-client";
import { requireActiveCompanyId, resolveActiveAccountId } from "~/lib/tenant";
import type {
  ProductCategoryRecord,
  ProductCategoryAddInput,
  ProductCategoryEditInput,
} from "./product-categories.types";

function queryParams(companyId: string): string {
  return `?companyId=${encodeURIComponent(companyId)}`;
}

function toProductCategoryRecord(doc: Record<string, unknown>): ProductCategoryRecord {
  return {
    id: String(doc.id ?? ""),
    code: String(doc.code ?? ""),
    name: String(doc.name ?? ""),
    description: doc.description ? String(doc.description) : undefined,
    parentCategoryId: doc.parentCategoryId ? String(doc.parentCategoryId) : undefined,
    active: doc.active !== false,
    companyId: String(doc.companyId ?? ""),
    accountId: String(doc.accountId ?? ""),
    createAt: doc.createAt ?? undefined,
    createBy: doc.createBy ? String(doc.createBy) : undefined,
    updateAt: doc.updateAt ?? undefined,
    updateBy: doc.updateBy ? String(doc.updateBy) : undefined,
  };
}

export async function getProductCategories(): Promise<{ items: ProductCategoryRecord[] }> {
  const companyId = requireActiveCompanyId();
  const data = await webFetch<{ items: Record<string, unknown>[] }>(
    `/inventory/product-categories${queryParams(companyId)}`
  );
  return { items: (data.items ?? []).map(toProductCategoryRecord) };
}

export async function addProductCategory(data: ProductCategoryAddInput): Promise<string> {
  const companyId = requireActiveCompanyId();
  const accountId = await resolveActiveAccountId();
  const result = await webFetch<{ id: string }>("/inventory/product-categories", {
    method: "POST",
    body: JSON.stringify({
      companyId,
      accountId,
      code: data.code.trim(),
      name: data.name.trim(),
      description: data.description?.trim() || undefined,
      parentCategoryId: data.parentCategoryId?.trim() || undefined,
      active: data.active !== false,
    }),
  });
  return result.id;
}

export async function updateProductCategory(id: string, data: ProductCategoryEditInput): Promise<void> {
  const companyId = requireActiveCompanyId();
  const payload: Record<string, unknown> = { companyId };
  if (data.code !== undefined) payload.code = data.code.trim();
  if (data.name !== undefined) payload.name = data.name.trim();
  if (data.description !== undefined) payload.description = data.description?.trim() || undefined;
  if (data.parentCategoryId !== undefined) payload.parentCategoryId = data.parentCategoryId?.trim() || undefined;
  if (data.active !== undefined) payload.active = data.active;
  await webFetch(`/inventory/product-categories/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteProductCategory(id: string): Promise<void> {
  const companyId = requireActiveCompanyId();
  await webFetch(`/inventory/product-categories/${encodeURIComponent(id)}${queryParams(companyId)}`, {
    method: "DELETE",
  });
}

export async function deleteProductCategories(ids: string[]): Promise<void> {
  const companyId = requireActiveCompanyId();
  await Promise.all(
    ids.map((id) =>
      webFetch(`/inventory/product-categories/${encodeURIComponent(id)}${queryParams(companyId)}`, {
        method: "DELETE",
      })
    )
  );
}
