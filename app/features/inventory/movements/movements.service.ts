import { webFetch } from "~/lib/backend-client";
import { requireActiveCompanyId, resolveActiveAccountId, getLocationFilterId } from "~/lib/tenant";
import { denormalizedUnitFromApi } from "~/features/system/units-of-measure";
import type { InventoryMovementRecord, MovementAddInput } from "./movements.types";

function toMovementRecord(doc: Record<string, unknown>): InventoryMovementRecord {
  const u = denormalizedUnitFromApi(doc);
  return {
    id: String(doc.id ?? ""),
    code: String(doc.code ?? ""),
    type: String(doc.type ?? ""),
    productId: String(doc.productId ?? ""),
    productName: String(doc.productName ?? ""),
    warehouseId: String(doc.warehouseId ?? ""),
    warehouseName: String(doc.warehouseName ?? ""),
    warehouseDestinationId: doc.warehouseDestinationId ? String(doc.warehouseDestinationId) : undefined,
    warehouseDestinationName: doc.warehouseDestinationName ? String(doc.warehouseDestinationName) : undefined,
    quantity: Number(doc.quantity) || 0,
    ...u,
    reason: doc.reason ? String(doc.reason) : undefined,
    referenceType: doc.referenceType ? String(doc.referenceType) : undefined,
    referenceId: doc.referenceId ? String(doc.referenceId) : undefined,
    date: String(doc.date ?? ""),
    notes: doc.notes ? String(doc.notes) : undefined,
    locationId: String(doc.locationId ?? ""),
    locationName: String(doc.locationName ?? ""),
    companyId: String(doc.companyId ?? ""),
    accountId: String(doc.accountId ?? ""),
    createAt: doc.createAt ?? undefined,
    createBy: doc.createBy ? String(doc.createBy) : undefined,
  } as InventoryMovementRecord;
}

/**
 * Reads movements from the backend filtered by companyId + locationId.
 */
export async function getMovements(): Promise<{ items: InventoryMovementRecord[] }> {
  const companyId = requireActiveCompanyId();
  const locationId = getLocationFilterId();
  let qs = `?companyId=${encodeURIComponent(companyId)}`;
  if (locationId) qs += `&locationId=${encodeURIComponent(locationId)}`;
  const data = await webFetch<{ items: Record<string, unknown>[] }>(
    `/inventory/movements${qs}`
  );
  return { items: (data.items ?? []).map(toMovementRecord) };
}

/**
 * Calls the backend POST /inventory/movements endpoint.
 * The backend handles the atomic transaction: create movement + update stock-levels.
 */
export async function addMovement(data: MovementAddInput): Promise<string> {
  const companyId = requireActiveCompanyId();
  const accountId = await resolveActiveAccountId();
  const res = await webFetch<{ id: string }>("/inventory/movements", {
    method: "POST",
    body: JSON.stringify({
      code: data.code.trim(),
      type: data.type,
      warehouseId: data.warehouseId.trim(),
      warehouseName: data.warehouseName.trim(),
      warehouseDestinationId: data.warehouseDestinationId?.trim() ?? undefined,
      warehouseDestinationName: data.warehouseDestinationName?.trim() ?? undefined,
      productId: data.productId.trim(),
      productName: data.productName.trim(),
      variantId: data.variantId?.trim() || undefined,
      unitCostApplied: data.unitCostApplied,
      quantity: data.quantity,
      unitOfMeasureCode: data.unitOfMeasure.trim(),
      reason: data.reason?.trim() ?? undefined,
      referenceType: data.referenceType ?? undefined,
      referenceId: data.referenceId?.trim() ?? undefined,
      date: data.date,
      notes: data.notes?.trim() ?? undefined,
      locationId: data.locationId,
      locationName: data.locationName.trim(),
      companyId,
      accountId,
    }),
  });
  return res.id;
}
