import { webFetch } from "~/lib/backend-client";
import type { ProductVariantRecord, ProductVariantInput } from "./product-variants.types";

const BASE = "/inventory/products";

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
  };
}

export async function getVariants(productId: string, companyId: string): Promise<ProductVariantRecord[]> {
  const res = await webFetch<{ items: Record<string, unknown>[] }>(
    `${BASE}/${productId}/variants?companyId=${encodeURIComponent(companyId)}`
  );
  return (res.items ?? []).map(toVariantRecord);
}

export async function createVariant(productId: string, data: ProductVariantInput, companyId: string): Promise<{ id: string }> {
  return webFetch<{ ok: boolean; id: string }>(`${BASE}/${productId}/variants`, {
    method: "POST",
    body: JSON.stringify({ ...data, companyId }),
  });
}

export async function updateVariant(productId: string, variantId: string, data: Partial<ProductVariantInput>, companyId: string): Promise<void> {
  await webFetch<void>(`${BASE}/${productId}/variants/${variantId}`, {
    method: "PUT",
    body: JSON.stringify({ ...data, companyId }),
  });
}

export async function deleteVariant(productId: string, variantId: string, companyId: string): Promise<void> {
  await webFetch<void>(`${BASE}/${productId}/variants/${variantId}?companyId=${encodeURIComponent(companyId)}`, {
    method: "DELETE",
  });
}
