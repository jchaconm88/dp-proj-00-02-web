import { webFetch } from "~/lib/backend-client";
import { requireActiveCompanyId, getLocationFilterId } from "~/lib/tenant";
import { denormalizedUnitFromApi } from "~/features/system/units-of-measure";
import type { StockLevelRecord } from "./stock.types";

function toStockLevelRecord(doc: Record<string, unknown>): StockLevelRecord {
  const u = denormalizedUnitFromApi(doc);
  return {
    id: String(doc.id ?? ""),
    productId: String(doc.productId ?? ""),
    productName: String(doc.productName ?? ""),
    warehouseId: String(doc.warehouseId ?? ""),
    warehouseName: String(doc.warehouseName ?? ""),
    quantity: Number(doc.quantity) || 0,
    ...u,
    lastMovementDate: String(doc.lastMovementDate ?? ""),
    locationId: String(doc.locationId ?? ""),
    companyId: String(doc.companyId ?? ""),
    accountId: String(doc.accountId ?? ""),
  } as StockLevelRecord;
}

export async function getStockLevels(): Promise<{ items: StockLevelRecord[] }> {
  const companyId = requireActiveCompanyId();
  const locationId = getLocationFilterId();
  let qs = `?companyId=${encodeURIComponent(companyId)}`;
  if (locationId) qs += `&locationId=${encodeURIComponent(locationId)}`;
  const data = await webFetch<{ items: Record<string, unknown>[] }>(
    `/inventory/stock${qs}`
  );
  return { items: (data.items ?? []).map(toStockLevelRecord) };
}
