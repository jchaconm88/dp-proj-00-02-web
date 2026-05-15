import { webFetch } from "~/lib/backend-client";
import {
  requireActiveCompanyId,
  resolveActiveAccountId,
  getLocationFilterId,
} from "~/lib/tenant";
import { generateSequenceCode } from "~/features/system/sequences";
import { denormalizedUnitFromApi } from "~/features/system/units-of-measure";
import { addSaleOrder, addSaleOrderItem } from "~/features/sales/sale-orders";
import type {
  QuotationRecord,
  QuotationAddInput,
  QuotationEditInput,
  QuotationItemRecord,
  QuotationItemAddInput,
  QuotationItemEditInput,
} from "./quotations.types";

function queryParams(companyId: string, locationId?: string | null): string {
  let qs = `?companyId=${encodeURIComponent(companyId)}`;
  if (locationId) qs += `&locationId=${encodeURIComponent(locationId)}`;
  return qs;
}

function toQuotationRecord(doc: Record<string, unknown>): QuotationRecord {
  return {
    id: String(doc.id ?? ""),
    code: String(doc.code ?? ""),
    clientId: String(doc.clientId ?? ""),
    clientName: String(doc.clientName ?? ""),
    issueDate: String(doc.issueDate ?? ""),
    validUntil: String(doc.validUntil ?? ""),
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
    saleOrderId: doc.saleOrderId ? String(doc.saleOrderId) : undefined,
    saleOrder: doc.saleOrder ? String(doc.saleOrder) : undefined,
    createAt: doc.createAt ?? undefined,
    createBy: doc.createBy ? String(doc.createBy) : undefined,
    updateAt: doc.updateAt ?? undefined,
    updateBy: doc.updateBy ? String(doc.updateBy) : undefined,
  } as QuotationRecord;
}

function toQuotationItemRecord(doc: Record<string, unknown>): QuotationItemRecord {
  const u = denormalizedUnitFromApi(doc);
  return {
    id: String(doc.id ?? ""),
    productId: String(doc.productId ?? ""),
    productName: String(doc.productName ?? ""),
    productCode: String(doc.productCode ?? ""),
    quantity: Number(doc.quantity) || 0,
    ...u,
    unitPrice: Number(doc.unitPrice) || 0,
    discount: Number(doc.discount) || 0,
    taxAffectation: String(doc.taxAffectation ?? "10"),
    subtotal: Number(doc.subtotal) || 0,
    taxAmount: Number(doc.taxAmount) || 0,
    total: Number(doc.total) || 0,
  } as QuotationItemRecord;
}

// ─── Quotations CRUD ────────────────────────────────────────────────────────

export async function getQuotations(): Promise<{ items: QuotationRecord[] }> {
  const companyId = requireActiveCompanyId();
  const locationId = getLocationFilterId();
  const data = await webFetch<{ items: Record<string, unknown>[] }>(
    `/sales/quotations${queryParams(companyId, locationId)}`
  );
  return { items: (data.items ?? []).map(toQuotationRecord) };
}

export async function getQuotationById(id: string): Promise<QuotationRecord | null> {
  const companyId = requireActiveCompanyId();
  try {
    const data = await webFetch<Record<string, unknown>>(
      `/sales/quotations/${encodeURIComponent(id)}?companyId=${encodeURIComponent(companyId)}`
    );
    return data ? toQuotationRecord(data) : null;
  } catch {
    return null;
  }
}

export async function addQuotation(data: QuotationAddInput): Promise<string> {
  const companyId = requireActiveCompanyId();
  const accountId = await resolveActiveAccountId();
  const result = await webFetch<{ id: string }>("/sales/quotations", {
    method: "POST",
    body: JSON.stringify({
      companyId,
      accountId,
      code: data.code.trim(),
      clientId: data.clientId,
      clientName: data.clientName.trim(),
      issueDate: data.issueDate,
      validUntil: data.validUntil ?? "",
      currency: data.currency,
      subtotal: data.subtotal,
      taxAmount: data.taxAmount,
      total: data.total,
      notes: data.notes ?? "",
      status: data.status,
      locationId: data.locationId,
      locationName: data.locationName.trim(),
    }),
  });
  return result.id;
}

export async function updateQuotation(id: string, data: QuotationEditInput): Promise<void> {
  const companyId = requireActiveCompanyId();
  const payload: Record<string, unknown> = { companyId };
  if (data.code !== undefined) payload.code = data.code.trim();
  if (data.clientId !== undefined) payload.clientId = data.clientId;
  if (data.clientName !== undefined) payload.clientName = data.clientName.trim();
  if (data.issueDate !== undefined) payload.issueDate = data.issueDate;
  if (data.validUntil !== undefined) payload.validUntil = data.validUntil;
  if (data.currency !== undefined) payload.currency = data.currency;
  if (data.subtotal !== undefined) payload.subtotal = data.subtotal;
  if (data.taxAmount !== undefined) payload.taxAmount = data.taxAmount;
  if (data.total !== undefined) payload.total = data.total;
  if (data.notes !== undefined) payload.notes = data.notes;
  if (data.status !== undefined) payload.status = data.status;
  if (data.locationId !== undefined) payload.locationId = data.locationId;
  if (data.locationName !== undefined) payload.locationName = data.locationName.trim();
  await webFetch(`/sales/quotations/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function updateQuotationsStatus(ids: string[], status: string): Promise<void> {
  const companyId = requireActiveCompanyId();
  await Promise.all(
    ids.map((id) =>
      webFetch(`/sales/quotations/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify({ companyId, status }),
      })
    )
  );
}

export async function deleteQuotation(id: string): Promise<void> {
  const companyId = requireActiveCompanyId();
  await webFetch(
    `/sales/quotations/${encodeURIComponent(id)}?companyId=${encodeURIComponent(companyId)}`,
    { method: "DELETE" }
  );
}

export async function deleteQuotations(ids: string[]): Promise<void> {
  const companyId = requireActiveCompanyId();
  await Promise.all(
    ids.map((id) =>
      webFetch(
        `/sales/quotations/${encodeURIComponent(id)}?companyId=${encodeURIComponent(companyId)}`,
        { method: "DELETE" }
      )
    )
  );
}

// ─── Quotation Items (subcollection) ────────────────────────────────────────

export async function getQuotationItems(
  quotationId: string
): Promise<{ items: QuotationItemRecord[] }> {
  const companyId = requireActiveCompanyId();
  const data = await webFetch<{ items: Record<string, unknown>[] }>(
    `/sales/quotations/${encodeURIComponent(quotationId)}/items?companyId=${encodeURIComponent(companyId)}`
  );
  return { items: (data.items ?? []).map(toQuotationItemRecord) };
}

export async function getQuotationItemById(
  quotationId: string,
  itemId: string
): Promise<QuotationItemRecord | null> {
  const companyId = requireActiveCompanyId();
  try {
    const data = await webFetch<Record<string, unknown>>(
      `/sales/quotations/${encodeURIComponent(quotationId)}/items/${encodeURIComponent(itemId)}?companyId=${encodeURIComponent(companyId)}`
    );
    return data ? toQuotationItemRecord(data) : null;
  } catch {
    return null;
  }
}

export async function addQuotationItem(
  quotationId: string,
  data: QuotationItemAddInput
): Promise<string> {
  const companyId = requireActiveCompanyId();
  const result = await webFetch<{ id: string }>(
    `/sales/quotations/${encodeURIComponent(quotationId)}/items`,
    {
      method: "POST",
      body: JSON.stringify({
        companyId,
        productId: data.productId,
        productName: data.productName.trim(),
        productCode: (data.productCode ?? "").trim(),
        quantity: data.quantity,
        unitOfMeasureCode: data.unitOfMeasureCode,
        unitPrice: data.unitPrice,
        discount: data.discount,
        taxAffectation: data.taxAffectation,
        subtotal: data.subtotal,
        taxAmount: data.taxAmount,
        total: data.total,
      }),
    }
  );
  await recalculateQuotationTotals(quotationId);
  return result.id;
}

export async function updateQuotationItem(
  quotationId: string,
  itemId: string,
  data: QuotationItemEditInput
): Promise<void> {
  const companyId = requireActiveCompanyId();
  const payload: Record<string, unknown> = { companyId };
  if (data.productId !== undefined) payload.productId = data.productId;
  if (data.productName !== undefined) payload.productName = data.productName.trim();
  if (data.productCode !== undefined) payload.productCode = data.productCode.trim();
  if (data.quantity !== undefined) payload.quantity = data.quantity;
  if (data.unitOfMeasureCode !== undefined) payload.unitOfMeasureCode = data.unitOfMeasureCode;
  if (data.unitPrice !== undefined) payload.unitPrice = data.unitPrice;
  if (data.discount !== undefined) payload.discount = data.discount;
  if (data.taxAffectation !== undefined) payload.taxAffectation = data.taxAffectation;
  if (data.subtotal !== undefined) payload.subtotal = data.subtotal;
  if (data.taxAmount !== undefined) payload.taxAmount = data.taxAmount;
  if (data.total !== undefined) payload.total = data.total;
  await webFetch(
    `/sales/quotations/${encodeURIComponent(quotationId)}/items/${encodeURIComponent(itemId)}`,
    { method: "PUT", body: JSON.stringify(payload) }
  );
  await recalculateQuotationTotals(quotationId);
}

export async function deleteQuotationItem(
  quotationId: string,
  itemId: string
): Promise<void> {
  const companyId = requireActiveCompanyId();
  await webFetch(
    `/sales/quotations/${encodeURIComponent(quotationId)}/items/${encodeURIComponent(itemId)}?companyId=${encodeURIComponent(companyId)}`,
    { method: "DELETE" }
  );
  await recalculateQuotationTotals(quotationId);
}

export async function deleteQuotationItems(
  quotationId: string,
  ids: string[]
): Promise<void> {
  const companyId = requireActiveCompanyId();
  await Promise.all(
    ids.map((id) =>
      webFetch(
        `/sales/quotations/${encodeURIComponent(quotationId)}/items/${encodeURIComponent(id)}?companyId=${encodeURIComponent(companyId)}`,
        { method: "DELETE" }
      )
    )
  );
  await recalculateQuotationTotals(quotationId);
}

// ─── Recalculate parent totals ──────────────────────────────────────────────

export async function recalculateQuotationTotals(quotationId: string): Promise<void> {
  const { items } = await getQuotationItems(quotationId);
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const taxAmount = items.reduce((sum, item) => sum + item.taxAmount, 0);
  const total = items.reduce((sum, item) => sum + item.total, 0);
  const companyId = requireActiveCompanyId();
  await webFetch(`/sales/quotations/${encodeURIComponent(quotationId)}`, {
    method: "PUT",
    body: JSON.stringify({
      companyId,
      subtotal: Math.round(subtotal * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      total: Math.round(total * 100) / 100,
    }),
  });
}

// ─── Item calculation helpers ───────────────────────────────────────────────

/**
 * Calcula los campos de un ítem de cotización con descuento.
 * subtotal = quantity × unitPrice × (1 - discount/100)
 * taxAmount = subtotal × taxRate (0.18 para código "10", 0 en otro caso)
 * total = subtotal + taxAmount
 */
export function calculateQuotationItemFields(input: {
  quantity: number;
  unitPrice: number;
  discount: number;
  taxAffectation: string;
}): { subtotal: number; taxAmount: number; total: number } {
  const { quantity, unitPrice, discount, taxAffectation } = input;
  const subtotal = Math.round(quantity * unitPrice * (1 - discount / 100) * 100) / 100;
  const taxRate = taxAffectation === "10" ? 0.18 : 0;
  const taxAmount = Math.round(subtotal * taxRate * 100) / 100;
  const total = Math.round((subtotal + taxAmount) * 100) / 100;
  return { subtotal, taxAmount, total };
}

// ─── Quotation → Sale Order Conversion ──────────────────────────────────────

/**
 * Convierte una cotización confirmada en una orden de venta.
 * Copia clientId, clientName, currency e ítems a la nueva orden de venta,
 * vinculando el quotationId en la orden generada.
 * @returns El ID de la nueva orden de venta creada.
 */
export async function convertQuotationToSaleOrder(
  quotationId: string,
  locationId: string,
  locationName: string
): Promise<string> {
  const quotation = await getQuotationById(quotationId);
  if (!quotation) throw new Error("Cotización no encontrada.");
  if (quotation.status !== "confirmed") {
    throw new Error("Solo se pueden convertir cotizaciones en estado Confirmada.");
  }

  const { items } = await getQuotationItems(quotationId);

  // Generate code for the new sale order
  const code = await generateSequenceCode("", "sale-order");

  // Create the sale order
  const saleOrderId = await addSaleOrder({
    code,
    clientId: quotation.clientId,
    clientName: quotation.clientName,
    quotationId,
    issueDate: new Date().toISOString().slice(0, 10),
    currency: quotation.currency,
    subtotal: quotation.subtotal,
    taxAmount: quotation.taxAmount,
    total: quotation.total,
    notes: `Generada desde cotización ${quotation.code}`,
    status: "draft",
    locationId,
    locationName,
  });

  // Copy all quotation items to the new sale order
  for (const item of items) {
    await addSaleOrderItem(saleOrderId, {
      productId: item.productId,
      productName: item.productName,
      productCode: item.productCode,
      quantity: item.quantity,
      unitOfMeasureCode: item.unitOfMeasureCode?.trim() || "unit",
      unitPrice: item.unitPrice,
      discount: item.discount,
      taxAffectation: item.taxAffectation,
      subtotal: item.subtotal,
      taxAmount: item.taxAmount,
      total: item.total,
    });
  }

  return saleOrderId;
}
