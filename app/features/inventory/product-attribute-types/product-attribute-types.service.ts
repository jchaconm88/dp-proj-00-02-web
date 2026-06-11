import { webFetch } from "~/lib/backend-client";
import { requireActiveCompanyId, resolveActiveAccountId } from "~/lib/tenant";
import type {
  ProductAttributeTypeRecord,
  ProductAttributeTypeAddInput,
  ProductAttributeTypeEditInput,
} from "./product-attribute-types.types";

function queryParams(companyId: string): string {
  return `?companyId=${encodeURIComponent(companyId)}`;
}

function toRecord(doc: Record<string, unknown>): ProductAttributeTypeRecord {
  const values = Array.isArray(doc.values) ? doc.values.map(String) : [];
  const rawColors = doc.valueColors;
  const valueColors: Record<string, string> = {};
  if (rawColors && typeof rawColors === "object" && !Array.isArray(rawColors)) {
    for (const [k, v] of Object.entries(rawColors as Record<string, unknown>)) {
      valueColors[String(k)] = String(v ?? "");
    }
  }
  return {
    id: String(doc.id ?? ""),
    code: String(doc.code ?? ""),
    label: String(doc.label ?? ""),
    values,
    valueColors,
    isColor: doc.isColor === true,
    useForVariants: doc.useForVariants === true,
    useForFilters: doc.useForFilters === true,
    sortOrder: Number(doc.sortOrder) || 0,
    active: doc.active !== false,
    companyId: String(doc.companyId ?? ""),
    accountId: String(doc.accountId ?? ""),
    createAt: doc.createAt ?? undefined,
    createBy: doc.createBy ? String(doc.createBy) : undefined,
    updateAt: doc.updateAt ?? undefined,
    updateBy: doc.updateBy ? String(doc.updateBy) : undefined,
  };
}

export async function getProductAttributeTypes(): Promise<{ items: ProductAttributeTypeRecord[] }> {
  const companyId = requireActiveCompanyId();
  const data = await webFetch<{ items: Record<string, unknown>[] }>(
    `/inventory/product-attribute-types${queryParams(companyId)}`
  );
  const items = (data.items ?? []).map(toRecord);
  items.sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
  return { items };
}

export async function createProductAttributeType(data: ProductAttributeTypeAddInput): Promise<string> {
  const companyId = requireActiveCompanyId();
  const accountId = await resolveActiveAccountId();
  const result = await webFetch<{ id: string }>("/inventory/product-attribute-types", {
    method: "POST",
    body: JSON.stringify({
      companyId,
      accountId,
      code: data.code.trim().toLowerCase(),
      label: data.label.trim(),
      values: data.values.map((v) => v.trim()).filter(Boolean),
      valueColors: data.valueColors,
      isColor: data.isColor,
      useForVariants: data.useForVariants,
      useForFilters: data.useForFilters,
      sortOrder: Number(data.sortOrder) || 0,
      active: data.active !== false,
    }),
  });
  return result.id;
}

export async function updateProductAttributeType(
  id: string,
  data: ProductAttributeTypeEditInput
): Promise<void> {
  const companyId = requireActiveCompanyId();
  const payload: Record<string, unknown> = { companyId };
  if (data.code !== undefined) payload.code = data.code.trim().toLowerCase();
  if (data.label !== undefined) payload.label = data.label.trim();
  if (data.values !== undefined) payload.values = data.values.map((v) => v.trim()).filter(Boolean);
  if (data.valueColors !== undefined) payload.valueColors = data.valueColors;
  if (data.isColor !== undefined) payload.isColor = data.isColor;
  if (data.useForVariants !== undefined) payload.useForVariants = data.useForVariants;
  if (data.useForFilters !== undefined) payload.useForFilters = data.useForFilters;
  if (data.sortOrder !== undefined) payload.sortOrder = Number(data.sortOrder) || 0;
  if (data.active !== undefined) payload.active = data.active;
  await webFetch(`/inventory/product-attribute-types/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteProductAttributeType(id: string): Promise<void> {
  const companyId = requireActiveCompanyId();
  await webFetch(`/inventory/product-attribute-types/${encodeURIComponent(id)}${queryParams(companyId)}`, {
    method: "DELETE",
  });
}

export function variantAttributeTypes(items: ProductAttributeTypeRecord[]): ProductAttributeTypeRecord[] {
  return items.filter((t) => t.useForVariants && t.active);
}

export function filterableAttributeTypes(items: ProductAttributeTypeRecord[]): ProductAttributeTypeRecord[] {
  return items.filter((t) => t.useForFilters && t.active);
}
