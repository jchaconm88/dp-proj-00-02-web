import { webFetch } from "~/lib/backend-client";
import type { ProductVariantRecord, ProductVariantInput } from "./product-variants.types";

const BASE = "/inventory/product-variants";

function toVariantRecord(doc: Record<string, unknown>): ProductVariantRecord {
  const attrs =
    doc.attributes && typeof doc.attributes === "object" && !Array.isArray(doc.attributes)
      ? Object.fromEntries(
          Object.entries(doc.attributes as Record<string, unknown>)
            .map(([k, v]) => [k, String(v ?? "").trim()])
            .filter(([, v]) => v)
        )
      : {};
  return {
    id: String(doc.id ?? ""),
    productId: String(doc.productId ?? ""),
    sku: String(doc.sku ?? ""),
    attributes: attrs,
    salePrice: Number(doc.salePrice) || 0,
    salePricePromo: doc.salePricePromo != null ? Number(doc.salePricePromo) : null,
    saleStart: doc.saleStart ? String(doc.saleStart) : undefined,
    saleEnd: doc.saleEnd ? String(doc.saleEnd) : undefined,
    weightKg: doc.weightKg != null ? Number(doc.weightKg) : undefined,
    imageUrls: Array.isArray(doc.imageUrls) ? doc.imageUrls.map(String) : [],
    active: doc.active !== false,
    updatedAt: doc.updatedAt != null ? String(doc.updatedAt) : null,
    standardUnitCost: doc.standardUnitCost != null ? Number(doc.standardUnitCost) : null,
    productName: doc.productName ? String(doc.productName) : undefined,
    productSku: doc.productSku ? String(doc.productSku) : undefined,
  };
}

export async function listProductVariants(params?: {
  productId?: string;
  sku?: string;
  companyId?: string;
}): Promise<ProductVariantRecord[]> {
  const companyId = params?.companyId;
  const qs = new URLSearchParams();
  if (companyId) qs.set("companyId", companyId);
  if (params?.productId) qs.set("productId", params.productId);
  if (params?.sku) qs.set("sku", params.sku);
  const res = await webFetch<{ items: Record<string, unknown>[] }>(
    `${BASE}?${qs.toString()}`
  );
  return (res.items ?? []).map(toVariantRecord);
}

export async function getVariants(productId: string, companyId: string): Promise<ProductVariantRecord[]> {
  return listProductVariants({ productId, companyId });
}

export async function getProductVariant(variantId: string, companyId: string): Promise<ProductVariantRecord> {
  const res = await webFetch<Record<string, unknown>>(
    `${BASE}/${encodeURIComponent(variantId)}?companyId=${encodeURIComponent(companyId)}`
  );
  return toVariantRecord(res);
}

export async function createVariant(
  productId: string,
  data: ProductVariantInput,
  companyId: string
): Promise<{ id: string }> {
  return webFetch<{ ok: boolean; id: string }>(BASE, {
    method: "POST",
    body: JSON.stringify({ ...data, productId, companyId }),
  });
}

export async function updateVariant(
  _productId: string,
  variantId: string,
  data: Partial<ProductVariantInput>,
  companyId: string
): Promise<void> {
  await webFetch<void>(`${BASE}/${encodeURIComponent(variantId)}`, {
    method: "PUT",
    body: JSON.stringify({ ...data, companyId }),
  });
}

export async function deleteVariant(
  _productId: string,
  variantId: string,
  companyId: string
): Promise<void> {
  await webFetch<void>(`${BASE}/${encodeURIComponent(variantId)}?companyId=${encodeURIComponent(companyId)}`, {
    method: "DELETE",
  });
}
