import { webFetch } from "~/lib/backend-client";
import { requireActiveCompanyId, resolveActiveAccountId, getLocationFilterId } from "~/lib/tenant";
import { denormalizedUnitFromApi } from "~/features/system/units-of-measure";
import type {
  PurchaseOrderRecord,
  PurchaseOrderAddInput,
  PurchaseOrderEditInput,
  PurchaseOrderItemRecord,
  PurchaseOrderItemAddInput,
  PurchaseOrderItemEditInput,
} from "./purchase-orders.types";

function queryParams(companyId: string, locationId?: string | null): string {
  let qs = `?companyId=${encodeURIComponent(companyId)}`;
  if (locationId) qs += `&locationId=${encodeURIComponent(locationId)}`;
  return qs;
}

function toPurchaseOrderRecord(doc: Record<string, unknown>): PurchaseOrderRecord {
  return {
    id: String(doc.id ?? ""),
    code: String(doc.code ?? ""),
    supplierId: String(doc.supplierId ?? ""),
    supplierName: String(doc.supplierName ?? ""),
    issueDate: String(doc.issueDate ?? ""),
    expectedDeliveryDate: String(doc.expectedDeliveryDate ?? ""),
    currency: String(doc.currency ?? "PEN"),
    subtotal: Number(doc.subtotal) || 0,
    taxAmount: Number(doc.taxAmount) || 0,
    total: Number(doc.total) || 0,
    notes: String(doc.notes ?? ""),
    status: String(doc.status ?? "draft"),
    locationId: String(doc.locationId ?? ""),
    locationName: String(doc.locationName ?? ""),
    companyId: String(doc.companyId ?? ""),
    accountId: String(doc.accountId ?? ""),
    createAt: doc.createAt ?? undefined,
    createBy: doc.createBy ? String(doc.createBy) : undefined,
    updateAt: doc.updateAt ?? undefined,
    updateBy: doc.updateBy ? String(doc.updateBy) : undefined,
  } as PurchaseOrderRecord;
}

function toPurchaseOrderItemRecord(doc: Record<string, unknown>): PurchaseOrderItemRecord {
  const u = denormalizedUnitFromApi(doc);
  return {
    id: String(doc.id ?? ""),
    productId: String(doc.productId ?? ""),
    productName: String(doc.productName ?? ""),
    quantity: Number(doc.quantity) || 0,
    ...u,
    unitPrice: Number(doc.unitPrice) || 0,
    taxAffectation: String(doc.taxAffectation ?? "10"),
    subtotal: Number(doc.subtotal) || 0,
    taxAmount: Number(doc.taxAmount) || 0,
    total: Number(doc.total) || 0,
    receivedQuantity: Number(doc.receivedQuantity) || 0,
  } as PurchaseOrderItemRecord;
}

// ─── Tax calculation helpers ────────────────────────────────────────────────

/** Returns the tax rate for a given taxAffectation code. Code "10" = 18% (IGV), otherwise 0%. */
function getTaxRate(taxAffectation: string): number {
  return taxAffectation === "10" ? 0.18 : 0;
}

/** Calculates item line totals from quantity, unitPrice, and taxAffectation. */
export function calculateItemTotals(quantity: number, unitPrice: number, taxAffectation: string) {
  const subtotal = Math.round(quantity * unitPrice * 100) / 100;
  const taxRate = getTaxRate(taxAffectation);
  const taxAmount = Math.round(subtotal * taxRate * 100) / 100;
  const total = Math.round((subtotal + taxAmount) * 100) / 100;
  return { subtotal, taxAmount, total };
}

// ─── Purchase Orders CRUD ───────────────────────────────────────────────────

export async function getPurchaseOrders(): Promise<{ items: PurchaseOrderRecord[] }> {
  const companyId = requireActiveCompanyId();
  const locationId = getLocationFilterId();
  const data = await webFetch<{ items: Record<string, unknown>[] }>(
    `/purchasing/purchase-orders${queryParams(companyId, locationId)}`
  );
  return { items: (data.items ?? []).map(toPurchaseOrderRecord) };
}

export async function getPurchaseOrderById(id: string): Promise<PurchaseOrderRecord | null> {
  const companyId = requireActiveCompanyId();
  try {
    const data = await webFetch<Record<string, unknown>>(
      `/purchasing/purchase-orders/${encodeURIComponent(id)}?companyId=${encodeURIComponent(companyId)}`
    );
    return data ? toPurchaseOrderRecord(data) : null;
  } catch {
    return null;
  }
}

export async function addPurchaseOrder(data: PurchaseOrderAddInput): Promise<string> {
  const companyId = requireActiveCompanyId();
  const accountId = await resolveActiveAccountId();
  const result = await webFetch<{ id: string }>("/purchasing/purchase-orders", {
    method: "POST",
    body: JSON.stringify({
      companyId,
      accountId,
      code: data.code.trim(),
      supplierId: data.supplierId.trim(),
      supplierName: data.supplierName.trim(),
      issueDate: data.issueDate,
      expectedDeliveryDate: data.expectedDeliveryDate ?? "",
      currency: data.currency.trim(),
      subtotal: 0,
      taxAmount: 0,
      total: 0,
      notes: data.notes?.trim() ?? "",
      status: data.status,
      locationId: data.locationId,
      locationName: data.locationName.trim(),
    }),
  });
  return result.id;
}

export async function updatePurchaseOrder(id: string, data: PurchaseOrderEditInput): Promise<void> {
  const companyId = requireActiveCompanyId();
  const payload: Record<string, unknown> = { companyId };
  if (data.code !== undefined) payload.code = data.code.trim();
  if (data.supplierId !== undefined) payload.supplierId = data.supplierId.trim();
  if (data.supplierName !== undefined) payload.supplierName = data.supplierName.trim();
  if (data.issueDate !== undefined) payload.issueDate = data.issueDate;
  if (data.expectedDeliveryDate !== undefined) payload.expectedDeliveryDate = data.expectedDeliveryDate;
  if (data.currency !== undefined) payload.currency = data.currency.trim();
  if (data.subtotal !== undefined) payload.subtotal = data.subtotal;
  if (data.taxAmount !== undefined) payload.taxAmount = data.taxAmount;
  if (data.total !== undefined) payload.total = data.total;
  if (data.notes !== undefined) payload.notes = data.notes?.trim() ?? "";
  if (data.status !== undefined) payload.status = data.status;
  if (data.locationId !== undefined) payload.locationId = data.locationId;
  if (data.locationName !== undefined) payload.locationName = data.locationName.trim();
  await webFetch(`/purchasing/purchase-orders/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deletePurchaseOrder(id: string): Promise<void> {
  const companyId = requireActiveCompanyId();
  await webFetch(
    `/purchasing/purchase-orders/${encodeURIComponent(id)}?companyId=${encodeURIComponent(companyId)}`,
    { method: "DELETE" }
  );
}

export async function deletePurchaseOrders(ids: string[]): Promise<void> {
  const companyId = requireActiveCompanyId();
  await Promise.all(
    ids.map((id) =>
      webFetch(
        `/purchasing/purchase-orders/${encodeURIComponent(id)}?companyId=${encodeURIComponent(companyId)}`,
        { method: "DELETE" }
      )
    )
  );
}

export async function updatePurchaseOrdersStatus(ids: string[], status: string): Promise<void> {
  const companyId = requireActiveCompanyId();
  await Promise.all(
    ids.map((id) =>
      webFetch(`/purchasing/purchase-orders/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify({ companyId, status }),
      })
    )
  );
}

// ─── Purchase Order Items (subcollection) ───────────────────────────────────

export async function getPurchaseOrderItems(orderId: string): Promise<{ items: PurchaseOrderItemRecord[] }> {
  const companyId = requireActiveCompanyId();
  const data = await webFetch<{ items: Record<string, unknown>[] }>(
    `/purchasing/purchase-orders/${encodeURIComponent(orderId)}/items?companyId=${encodeURIComponent(companyId)}`
  );
  return { items: (data.items ?? []).map(toPurchaseOrderItemRecord) };
}

export async function getPurchaseOrderItemById(
  orderId: string,
  itemId: string
): Promise<PurchaseOrderItemRecord | null> {
  const companyId = requireActiveCompanyId();
  try {
    const data = await webFetch<Record<string, unknown>>(
      `/purchasing/purchase-orders/${encodeURIComponent(orderId)}/items/${encodeURIComponent(itemId)}?companyId=${encodeURIComponent(companyId)}`
    );
    return data ? toPurchaseOrderItemRecord(data) : null;
  } catch {
    return null;
  }
}

export async function addPurchaseOrderItem(orderId: string, data: PurchaseOrderItemAddInput): Promise<string> {
  const companyId = requireActiveCompanyId();
  const { subtotal, taxAmount, total } = calculateItemTotals(data.quantity, data.unitPrice, data.taxAffectation);
  const result = await webFetch<{ id: string }>(
    `/purchasing/purchase-orders/${encodeURIComponent(orderId)}/items`,
    {
      method: "POST",
      body: JSON.stringify({
        companyId,
        productId: data.productId.trim(),
        productName: data.productName.trim(),
        quantity: data.quantity,
        unitOfMeasureCode: data.unitOfMeasureCode.trim(),
        unitPrice: data.unitPrice,
        taxAffectation: data.taxAffectation,
        subtotal,
        taxAmount,
        total,
        receivedQuantity: 0,
      }),
    }
  );
  await recalculateOrderTotals(orderId);
  return result.id;
}

export async function updatePurchaseOrderItem(
  orderId: string,
  itemId: string,
  data: PurchaseOrderItemEditInput
): Promise<void> {
  const companyId = requireActiveCompanyId();
  const payload: Record<string, unknown> = { companyId };
  if (data.productId !== undefined) payload.productId = data.productId.trim();
  if (data.productName !== undefined) payload.productName = data.productName.trim();
  if (data.quantity !== undefined) payload.quantity = data.quantity;
  if (data.unitOfMeasureCode !== undefined) payload.unitOfMeasureCode = data.unitOfMeasureCode.trim();
  if (data.unitPrice !== undefined) payload.unitPrice = data.unitPrice;
  if (data.taxAffectation !== undefined) payload.taxAffectation = data.taxAffectation;
  if (data.receivedQuantity !== undefined) payload.receivedQuantity = data.receivedQuantity;

  // Recalculate item totals if quantity, unitPrice, or taxAffectation changed
  const needsRecalc = data.quantity !== undefined || data.unitPrice !== undefined || data.taxAffectation !== undefined;
  if (needsRecalc) {
    const current = await getPurchaseOrderItemById(orderId, itemId);
    if (current) {
      const quantity = data.quantity ?? current.quantity;
      const unitPrice = data.unitPrice ?? current.unitPrice;
      const taxAffectation = data.taxAffectation ?? current.taxAffectation;
      const { subtotal, taxAmount, total } = calculateItemTotals(quantity, unitPrice, taxAffectation);
      payload.subtotal = subtotal;
      payload.taxAmount = taxAmount;
      payload.total = total;
    }
  }

  await webFetch(
    `/purchasing/purchase-orders/${encodeURIComponent(orderId)}/items/${encodeURIComponent(itemId)}`,
    { method: "PUT", body: JSON.stringify(payload) }
  );
  await recalculateOrderTotals(orderId);
}

export async function deletePurchaseOrderItem(orderId: string, itemId: string): Promise<void> {
  const companyId = requireActiveCompanyId();
  await webFetch(
    `/purchasing/purchase-orders/${encodeURIComponent(orderId)}/items/${encodeURIComponent(itemId)}?companyId=${encodeURIComponent(companyId)}`,
    { method: "DELETE" }
  );
  await recalculateOrderTotals(orderId);
}

// ─── Recalculate parent document totals ─────────────────────────────────────

/**
 * Reads all items from the backend and updates the parent purchase order
 * with the sum of subtotals, taxAmounts, and totals.
 */
export async function recalculateOrderTotals(orderId: string): Promise<void> {
  const { items } = await getPurchaseOrderItems(orderId);
  const subtotal = Math.round(items.reduce((sum, item) => sum + item.subtotal, 0) * 100) / 100;
  const taxAmount = Math.round(items.reduce((sum, item) => sum + item.taxAmount, 0) * 100) / 100;
  const total = Math.round((subtotal + taxAmount) * 100) / 100;
  const companyId = requireActiveCompanyId();
  await webFetch(`/purchasing/purchase-orders/${encodeURIComponent(orderId)}`, {
    method: "PUT",
    body: JSON.stringify({ companyId, subtotal, taxAmount, total }),
  });
}
