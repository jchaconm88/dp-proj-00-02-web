import { webFetch } from "~/lib/backend-client";
import { requireActiveCompanyId } from "~/lib/tenant";
import type { KardexLineRecord } from "./kardex.types";

function toKardexLine(doc: Record<string, unknown>): KardexLineRecord {
  return {
    id: String(doc.id ?? ""),
    movementGroupId: String(doc.movementGroupId ?? ""),
    stockLevelKey: String(doc.stockLevelKey ?? ""),
    type: String(doc.type ?? ""),
    code: String(doc.code ?? ""),
    date: String(doc.date ?? ""),
    productId: String(doc.productId ?? ""),
    productName: String(doc.productName ?? ""),
    variantId: doc.variantId ? String(doc.variantId) : undefined,
    warehouseId: String(doc.warehouseId ?? ""),
    warehouseName: String(doc.warehouseName ?? ""),
    quantityIn: Number(doc.quantityIn) || 0,
    quantityOut: Number(doc.quantityOut) || 0,
    balanceBefore: Number(doc.balanceBefore) || 0,
    balanceAfter: Number(doc.balanceAfter) || 0,
    valueIn: Number(doc.valueIn) || 0,
    valueOut: Number(doc.valueOut) || 0,
    balanceValueBefore: Number(doc.balanceValueBefore) || 0,
    balanceValueAfter: Number(doc.balanceValueAfter) || 0,
    unitCostApplied: Number(doc.unitCostApplied) || 0,
    averageUnitCostAfter: Number(doc.averageUnitCostAfter) || 0,
    currencyCode: String(doc.currencyCode ?? ""),
    referenceType: doc.referenceType ? String(doc.referenceType) : undefined,
    referenceId: doc.referenceId ? String(doc.referenceId) : undefined,
    reason: doc.reason ? String(doc.reason) : undefined,
    notes: doc.notes ? String(doc.notes) : undefined,
  };
}

export function buildStockLevelKey(parts: {
  productId: string;
  variantId?: string;
  warehouseId: string;
}): string {
  const warehouseId = parts.warehouseId.trim();
  const itemId = (parts.variantId?.trim() || parts.productId.trim());
  return `${itemId}_${warehouseId}`;
}

export async function getKardex(stockLevelKey: string): Promise<{
  items: KardexLineRecord[];
  stockLevelKey: string;
}> {
  const companyId = requireActiveCompanyId();
  const qs = new URLSearchParams({ companyId, stockLevelKey });
  const data = await webFetch<{ items: Record<string, unknown>[]; stockLevelKey: string }>(
    `/inventory/kardex?${qs.toString()}`
  );
  return {
    stockLevelKey: data.stockLevelKey ?? stockLevelKey,
    items: (data.items ?? []).map(toKardexLine),
  };
}
