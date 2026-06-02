import { webFetch } from "~/lib/backend-client";
import { requireActiveCompanyId, resolveActiveAccountId } from "~/lib/tenant";
import { denormalizedUnitFromApi } from "~/features/system/units-of-measure";
import { getAuthUser } from "~/lib/get-auth-user";
import { auth } from "~/lib/firebase";
import type { ProductRecord, ProductAddInput, ProductEditInput } from "./products.types";

const PRODUCT_TYPES = new Set([
  "good",
  "service",
  "raw_material",
  "finished_good",
  "semi_finished",
  "by_product",
  "supply",
]);

function queryParams(companyId: string): string {
  return `?companyId=${encodeURIComponent(companyId)}`;
}

function toProductRecord(doc: Record<string, unknown>): ProductRecord {
  const u = denormalizedUnitFromApi(doc);
  const rawType = String(doc.type ?? "").trim();
  const rawStatus = String(doc.ecommerceStatus ?? "").trim();
  return {
    id: String(doc.id ?? ""),
    code: String(doc.code ?? ""),
    name: String(doc.name ?? ""),
    description: doc.description ? String(doc.description) : undefined,
    categoryId: doc.categoryId ? String(doc.categoryId) : undefined,
    categoryName: doc.categoryName ? String(doc.categoryName) : undefined,
    type: PRODUCT_TYPES.has(rawType) ? (rawType as ProductRecord["type"]) : "good",
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
    sku: doc.sku ? String(doc.sku) : undefined,
    ecommerceStatus: rawStatus === "inactive" || rawStatus === "discontinued" ? rawStatus as ProductRecord["ecommerceStatus"] : "active",
    imageUrls: Array.isArray(doc.imageUrls) ? doc.imageUrls.map(String) : [],
    categoryPath: Array.isArray(doc.categoryPath) ? doc.categoryPath.map(String) : [],
    variantAttributeTypeCodes: Array.isArray(doc.variantAttributeTypeCodes)
      ? doc.variantAttributeTypeCodes.map(String)
      : [],
    variantAttributeLabels:
      doc.variantAttributeLabels && typeof doc.variantAttributeLabels === "object" && !Array.isArray(doc.variantAttributeLabels)
        ? Object.fromEntries(
            Object.entries(doc.variantAttributeLabels as Record<string, unknown>).map(([k, v]) => [
              String(k),
              String(v ?? ""),
            ])
          )
        : {},
    attributeDefinitions:
      doc.attributeDefinitions && typeof doc.attributeDefinitions === "object" && !Array.isArray(doc.attributeDefinitions)
        ? Object.fromEntries(
            Object.entries(doc.attributeDefinitions as Record<string, unknown>).map(([k, v]) => [
              k,
              Array.isArray(v) ? v.map(String) : [],
            ])
          )
        : undefined,
    woocommerceType: ["simple", "variable", "grouped"].includes(String(doc.woocommerceType))
      ? String(doc.woocommerceType) as ProductRecord["woocommerceType"]
      : "simple",
    visibleInStore: doc.visibleInStore === true,
    tags: Array.isArray(doc.tags) ? doc.tags.map(String) : [],
    categoryIds: Array.isArray(doc.categoryIds) ? doc.categoryIds.map(String) : [],
    groupedProductIds: Array.isArray(doc.groupedProductIds) ? doc.groupedProductIds.map(String) : [],
    filterableAttributes:
      doc.filterableAttributes && typeof doc.filterableAttributes === "object" && !Array.isArray(doc.filterableAttributes)
        ? Object.fromEntries(
            Object.entries(doc.filterableAttributes as Record<string, unknown>).map(([k, v]) => [
              k,
              Array.isArray(v) ? v.map(String) : [],
            ])
          )
        : undefined,
    filterableAttributeLabels:
      doc.filterableAttributeLabels && typeof doc.filterableAttributeLabels === "object" && !Array.isArray(doc.filterableAttributeLabels)
        ? Object.fromEntries(
            Object.entries(doc.filterableAttributeLabels as Record<string, unknown>).map(([k, v]) => [
              String(k),
              String(v ?? ""),
            ])
          )
        : undefined,
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
      sku: data.sku?.trim() ?? "",
      ecommerceStatus: data.ecommerceStatus ?? "active",
      woocommerceType: data.woocommerceType ?? "simple",
      visibleInStore: data.visibleInStore === true,
      tags: Array.isArray(data.tags) ? data.tags : [],
      categoryIds: Array.isArray(data.categoryIds) ? data.categoryIds : [],
      groupedProductIds: Array.isArray(data.groupedProductIds) ? data.groupedProductIds : [],
      imageUrls: Array.isArray(data.imageUrls) ? data.imageUrls : [],
      categoryPath: Array.isArray(data.categoryPath) ? data.categoryPath : [],
      variantAttributeTypeCodes: Array.isArray(data.variantAttributeTypeCodes)
        ? data.variantAttributeTypeCodes
        : [],
      filterableAttributes: data.filterableAttributes ?? {},
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
  if (data.sku !== undefined) payload.sku = data.sku;
  if (data.ecommerceStatus !== undefined) payload.ecommerceStatus = data.ecommerceStatus;
  if (data.woocommerceType !== undefined) payload.woocommerceType = data.woocommerceType;
  if (data.visibleInStore !== undefined) payload.visibleInStore = data.visibleInStore;
  if (data.tags !== undefined) payload.tags = data.tags;
  if (data.categoryIds !== undefined) payload.categoryIds = data.categoryIds;
  if (data.groupedProductIds !== undefined) payload.groupedProductIds = data.groupedProductIds;
  if (data.imageUrls !== undefined) payload.imageUrls = data.imageUrls;
  if (data.categoryPath !== undefined) payload.categoryPath = data.categoryPath;
  if (data.variantAttributeTypeCodes !== undefined) {
    payload.variantAttributeTypeCodes = data.variantAttributeTypeCodes;
  }
  if (data.filterableAttributes !== undefined) {
    payload.filterableAttributes = data.filterableAttributes;
  }
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

export interface ImageUploadResult {
  url: string;
  path: string;
  filename: string;
}

function resolveUploadBaseUrl(): string {
  const configured = String(import.meta.env.VITE_WEB_BACKEND_BASE_URL ?? "").trim().replace(/\/$/, "");
  if (configured) return `${configured}/web`;
  return import.meta.env.DEV ? "/web-backend" : "";
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser ?? (await getAuthUser());
  const token = user ? await user.getIdToken(true) : "";
  return { Authorization: `Bearer ${token}` };
}

export async function uploadProductImage(
  companyId: string,
  productId: string,
  file: File
): Promise<ImageUploadResult> {
  const base = resolveUploadBaseUrl();
  const headers = await getAuthHeaders();
  const formData = new FormData();
  formData.append("file", file);
  formData.append("companyId", companyId);
  const res = await fetch(`${base}/inventory/products/${encodeURIComponent(productId)}/images`, {
    method: "POST",
    headers,
    body: formData,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<ImageUploadResult>;
}

export async function uploadVariantImage(
  companyId: string,
  productId: string,
  variantId: string,
  file: File
): Promise<ImageUploadResult> {
  const base = resolveUploadBaseUrl();
  const headers = await getAuthHeaders();
  const formData = new FormData();
  formData.append("file", file);
  formData.append("companyId", companyId);
  const res = await fetch(
    `${base}/inventory/products/${encodeURIComponent(productId)}/variants/${encodeURIComponent(variantId)}/images`,
    { method: "POST", headers, body: formData }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<ImageUploadResult>;
}

export async function deleteProductImage(storagePath: string): Promise<void> {
  const base = resolveUploadBaseUrl();
  const headers = await getAuthHeaders();
  const res = await fetch(`${base}/inventory/products/__delete__/images`, {
    method: "DELETE",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ storagePath }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
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
