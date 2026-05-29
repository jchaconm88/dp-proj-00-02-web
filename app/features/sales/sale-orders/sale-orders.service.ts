import { webFetch } from "~/lib/backend-client";
import { requireActiveCompanyId, resolveActiveAccountId, getLocationFilterId } from "~/lib/tenant";
import { denormalizedUnitFromApi } from "~/features/system/units-of-measure";
import type {
  SaleOrderRecord,
  SaleOrderAddInput,
  SaleOrderEditInput,
  SaleOrderItemRecord,
  SaleOrderItemAddInput,
  SaleOrderItemEditInput,
  GenerateInvoiceFromSaleOrderInput,
} from "./sale-orders.types";

function queryParams(companyId: string, locationId?: string | null): string {
  let qs = `?companyId=${encodeURIComponent(companyId)}`;
  if (locationId) qs += `&locationId=${encodeURIComponent(locationId)}`;
  return qs;
}

function toSaleOrderRecord(doc: Record<string, unknown>): SaleOrderRecord {
  return {
    id: String(doc.id ?? ""),
    code: String(doc.code ?? ""),
    clientId: String(doc.clientId ?? ""),
    clientName: String(doc.clientName ?? ""),
    quotationId: doc.quotationId ? String(doc.quotationId) : undefined,
    issueDate: String(doc.issueDate ?? ""),
    expectedDeliveryDate: doc.expectedDeliveryDate ? String(doc.expectedDeliveryDate) : undefined,
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
    channel: doc.channel ? String(doc.channel) : undefined,
    externalId: doc.externalId ? String(doc.externalId) : undefined,
    paymentStatus: doc.paymentStatus ? String(doc.paymentStatus) : undefined,
    integrationSyncStatus: doc.integrationSyncStatus ? String(doc.integrationSyncStatus) : undefined,
    integrationLastError: doc.integrationLastError ? String(doc.integrationLastError) : undefined,
  } as SaleOrderRecord;
}

function toSaleOrderItemRecord(doc: Record<string, unknown>): SaleOrderItemRecord {
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
    dispatchedQuantity: Number(doc.dispatchedQuantity) || 0,
  } as SaleOrderItemRecord;
}

// ─── Sale Orders CRUD ────────────────────────────────────────────────────────

export async function getSaleOrders(): Promise<{ items: SaleOrderRecord[] }> {
  const companyId = requireActiveCompanyId();
  const locationId = getLocationFilterId();
  const data = await webFetch<{ items: Record<string, unknown>[] }>(
    `/sales/sale-orders${queryParams(companyId, locationId)}`
  );
  return { items: (data.items ?? []).map(toSaleOrderRecord) };
}

export async function getSaleOrderById(id: string): Promise<SaleOrderRecord | null> {
  const companyId = requireActiveCompanyId();
  try {
    const data = await webFetch<Record<string, unknown>>(
      `/sales/sale-orders/${encodeURIComponent(id)}?companyId=${encodeURIComponent(companyId)}`
    );
    return data ? toSaleOrderRecord(data) : null;
  } catch {
    return null;
  }
}

export async function addSaleOrder(data: SaleOrderAddInput): Promise<string> {
  const companyId = requireActiveCompanyId();
  const accountId = await resolveActiveAccountId();
  const result = await webFetch<{ id: string }>("/sales/sale-orders", {
    method: "POST",
    body: JSON.stringify({
      companyId,
      accountId,
      ...data,
    }),
  });
  return result.id;
}

export async function updateSaleOrder(id: string, data: SaleOrderEditInput): Promise<void> {
  const companyId = requireActiveCompanyId();
  await webFetch(`/sales/sale-orders/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({ companyId, ...data }),
  });
}

export async function deleteSaleOrder(id: string): Promise<void> {
  const companyId = requireActiveCompanyId();
  await webFetch(
    `/sales/sale-orders/${encodeURIComponent(id)}?companyId=${encodeURIComponent(companyId)}`,
    { method: "DELETE" }
  );
}

export async function deleteSaleOrders(ids: string[]): Promise<void> {
  const companyId = requireActiveCompanyId();
  await Promise.all(
    ids.map((id) =>
      webFetch(
        `/sales/sale-orders/${encodeURIComponent(id)}?companyId=${encodeURIComponent(companyId)}`,
        { method: "DELETE" }
      )
    )
  );
}

// ─── Sale Order Items (subcollection) ────────────────────────────────────────

export async function getSaleOrderItems(orderId: string): Promise<{ items: SaleOrderItemRecord[] }> {
  const companyId = requireActiveCompanyId();
  const data = await webFetch<{ items: Record<string, unknown>[] }>(
    `/sales/sale-orders/${encodeURIComponent(orderId)}/items?companyId=${encodeURIComponent(companyId)}`
  );
  return { items: (data.items ?? []).map(toSaleOrderItemRecord) };
}

export async function getSaleOrderItemById(
  orderId: string,
  itemId: string
): Promise<SaleOrderItemRecord | null> {
  const companyId = requireActiveCompanyId();
  try {
    const data = await webFetch<Record<string, unknown>>(
      `/sales/sale-orders/${encodeURIComponent(orderId)}/items/${encodeURIComponent(itemId)}?companyId=${encodeURIComponent(companyId)}`
    );
    return data ? toSaleOrderItemRecord(data) : null;
  } catch {
    return null;
  }
}

export async function addSaleOrderItem(orderId: string, data: SaleOrderItemAddInput): Promise<string> {
  const companyId = requireActiveCompanyId();
  const result = await webFetch<{ id: string }>(
    `/sales/sale-orders/${encodeURIComponent(orderId)}/items`,
    {
      method: "POST",
      body: JSON.stringify({
        companyId,
        productId: data.productId,
        productName: data.productName.trim(),
        productCode: (data.productCode ?? "").trim(),
        quantity: data.quantity,
        unitOfMeasureCode: data.unitOfMeasureCode.trim(),
        unitPrice: data.unitPrice,
        discount: data.discount,
        taxAffectation: data.taxAffectation,
        subtotal: data.subtotal,
        taxAmount: data.taxAmount,
        total: data.total,
      }),
    }
  );
  await recalculateSaleOrderTotals(orderId);
  return result.id;
}

export async function updateSaleOrderItem(
  orderId: string,
  itemId: string,
  data: SaleOrderItemEditInput
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
  if (data.dispatchedQuantity !== undefined) payload.dispatchedQuantity = data.dispatchedQuantity;
  await webFetch(
    `/sales/sale-orders/${encodeURIComponent(orderId)}/items/${encodeURIComponent(itemId)}`,
    { method: "PUT", body: JSON.stringify(payload) }
  );
  await recalculateSaleOrderTotals(orderId);
}

export async function deleteSaleOrderItem(orderId: string, itemId: string): Promise<void> {
  const companyId = requireActiveCompanyId();
  await webFetch(
    `/sales/sale-orders/${encodeURIComponent(orderId)}/items/${encodeURIComponent(itemId)}?companyId=${encodeURIComponent(companyId)}`,
    { method: "DELETE" }
  );
  await recalculateSaleOrderTotals(orderId);
}

// ─── Totals Recalculation ────────────────────────────────────────────────────

/**
 * Recalcula los totales del documento padre (sale-order) sumando
 * subtotal, taxAmount y total de todos los ítems de la subcolección.
 */
export async function recalculateSaleOrderTotals(orderId: string): Promise<void> {
  const { items } = await getSaleOrderItems(orderId);

  const subtotal = items.reduce((sum, item) => sum + (item.subtotal ?? 0), 0);
  const taxAmount = items.reduce((sum, item) => sum + (item.taxAmount ?? 0), 0);
  const total = items.reduce((sum, item) => sum + (item.total ?? 0), 0);

  const companyId = requireActiveCompanyId();
  await webFetch(`/sales/sale-orders/${encodeURIComponent(orderId)}`, {
    method: "PUT",
    body: JSON.stringify({ companyId, subtotal, taxAmount, total }),
  });
}

// ─── Item Calculation Helpers ────────────────────────────────────────────────

/**
 * Calcula los campos derivados de un ítem de orden de venta.
 * subtotal = quantity × unitPrice × (1 - discount/100)
 * taxAmount = subtotal × taxRate (0.18 para código "10", 0 en otro caso)
 * total = subtotal + taxAmount
 */
export function calculateSaleOrderItemFields(
  quantity: number,
  unitPrice: number,
  discount: number,
  taxAffectation: string
): { subtotal: number; taxAmount: number; total: number } {
  const subtotal = quantity * unitPrice * (1 - discount / 100);
  const taxRate = taxAffectation === "10" ? 0.18 : 0;
  const taxAmount = subtotal * taxRate;
  const total = subtotal + taxAmount;
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

// ─── Invoice Generation from Sale Order ──────────────────────────────────────

/** Mapeo de código de afectación al IGV a InvoiceTaxType. */
function taxAffectationToInvoiceTaxType(taxAffectation: string): {
  id: string;
  name: string;
  refCode: string;
  taxPer: number;
} {
  if (taxAffectation === "10") {
    return { id: "", name: "IGV", refCode: "1000", taxPer: 18 };
  }
  if (taxAffectation === "20") {
    return { id: "", name: "Exonerado", refCode: "9997", taxPer: 0 };
  }
  // Inafecto (30, 31, etc.)
  return { id: "", name: "Inafecto", refCode: "9998", taxPer: 0 };
}

export async function updateSaleOrdersStatus(ids: string[], status: string): Promise<void> {
  const companyId = requireActiveCompanyId();
  await Promise.all(
    ids.map((id) =>
      webFetch(`/sales/sale-orders/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify({ companyId, status }),
      })
    )
  );
}

/**
 * Genera un comprobante (factura/boleta) a partir de una orden de venta.
 * - Crea el invoice con referencia a la orden de venta
 * - Copia los ítems de sale-order-items a invoice-items con mapeo de campos
 * - Recalcula totales del comprobante
 * - Si la orden está en status "delivered", la actualiza a "invoiced"
 * @returns ID del invoice creado
 */
export async function createInvoiceFromSaleOrder(
  orderId: string,
  input: GenerateInvoiceFromSaleOrderInput
): Promise<string> {
  const { addInvoice, addInvoiceItem } = await import("~/features/billing/invoice");
  const {
    clientRecordToInvoiceClient,
    clientLocationToHomeAddress,
    companyRecordToInvoiceCompany,
    companyLocationRecordToInvoiceLocation,
  } = await import("~/features/billing/invoice/invoice-snapshot");
  const { generateDocumentNo } = await import("~/features/master/document-sequences");
  const { getClient, getClientLocations } = await import("~/features/master/clients");
  const { getCompanyById } = await import("~/features/system/companies");
  const { getCompanyLocation } = await import("~/features/system/company-locations");

  // 1. Load order and items
  const order = await getSaleOrderById(orderId);
  if (!order) throw new Error("Orden de venta no encontrada.");

  const allowedStatuses = ["confirmed", "in_progress", "delivered"];
  if (!allowedStatuses.includes(order.status)) {
    throw new Error("Solo se puede generar comprobante desde una orden confirmada, en progreso o entregada.");
  }

  const { items } = await getSaleOrderItems(orderId);
  if (!items.length) throw new Error("La orden de venta no tiene ítems.");

  const { getUnitsOfMeasureCatalog } = await import("~/features/system/units-of-measure");
  const unitsCatalog = await getUnitsOfMeasureCatalog();
  const unitByCode = new Map(unitsCatalog.map((u) => [u.code, u]));

  // 2. Generate document number
  const { documentNo } = await generateDocumentNo(input.sequenceId);

  // 3. Get company and location snapshots
  const companyId = requireActiveCompanyId();
  const company = await getCompanyById(companyId);
  if (!company) throw new Error("Empresa activa no encontrada.");

  const companyLocation = await getCompanyLocation(companyId, input.companyLocationId);
  if (!companyLocation) throw new Error("Sede emisora no encontrada.");

  // 4. Get client snapshot
  const client = await getClient(order.clientId);
  if (!client) throw new Error("Cliente de la orden no encontrado.");

  const { items: clientLocs } = await getClientLocations(order.clientId);
  const firstLoc = clientLocs.find((l) => l.active) ?? clientLocs[0];
  const homeExtra = firstLoc ? clientLocationToHomeAddress(firstLoc) : undefined;
  const invoiceClient = clientRecordToInvoiceClient(client, homeExtra);

  // 5. Map sale order items to invoice items and calculate totals
  const invoiceItems = items.map((item) => {
    const sunatCode = item.unitOfMeasureSunatCode?.trim();
    const sunatName = item.unitOfMeasureSunatName?.trim();
    const measureInfo =
      sunatCode && sunatName
        ? { code: sunatCode, name: sunatName }
        : (() => {
            const u = unitByCode.get(item.unitOfMeasureCode);
            return u ? { code: u.sunatCode, name: u.sunatName } : { code: "NIU", name: "Unidad" };
          })();
    const taxType = taxAffectationToInvoiceTaxType(item.taxAffectation);
    const price = Math.round(item.quantity * item.unitPrice * 100) / 100;
    const tax = Math.round(price * (taxType.taxPer / 100) * 100) / 100;
    const amount = Math.round((price + tax) * 100) / 100;

    return {
      itemId: item.productId,
      itemName: item.productName,
      description: item.productName,
      itemType: "service" as const,
      measure: { id: "", name: measureInfo.name, code: measureInfo.code },
      taxType,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      price,
      tax,
      amount,
      currency: input.currency,
      taxAffectationCode: item.taxAffectation || "10",
      taxSchemeCode: taxType.refCode,
      taxSchemeName: taxType.name,
      taxTypeCode: item.taxAffectation === "10" ? "VAT" : "VAT",
      unitCode: measureInfo.code,
    };
  });

  const totalPrice = Math.round(invoiceItems.reduce((s, i) => s + i.price, 0) * 100) / 100;
  const totalTax = Math.round(invoiceItems.reduce((s, i) => s + i.tax, 0) * 100) / 100;
  const totalAmount = Math.round((totalPrice + totalTax) * 100) / 100;

  // 6. Create invoice
  const invoiceId = await addInvoice({
    documentNo,
    type: input.type as any,
    payTerm: input.payTerm,
    settlementId: "",
    settlement: "",
    client: invoiceClient,
    company: companyRecordToInvoiceCompany(company),
    companyLocation: companyLocationRecordToInvoiceLocation(companyLocation),
    issueDate: input.issueDate,
    currency: input.currency,
    status: "draft",
    totalPrice,
    totalTax,
    totalAmount,
    comment: "",
    zipUrl: "",
    cdrUrl: "",
    pdfUrl: "",
    operationTypeCode: "0101",
    saleOrderId: orderId,
    saleOrderCode: order.code,
  });

  // 7. Create invoice items
  await Promise.all(
    invoiceItems.map((item) => addInvoiceItem(invoiceId, item))
  );

  // 8. Update sale order status to "invoiced" if currently "delivered"
  if (order.status === "delivered") {
    await updateSaleOrder(orderId, { status: "invoiced" });
  }

  return invoiceId;
}

// ─── Dispatch (atomic backend operation) ─────────────────────────────────────

export interface DispatchSaleOrderInput {
  companyId: string;
  warehouseId: string;
  warehouseName: string;
  items: Array<{ itemId: string; dispatchedQuantity: number }>;
}

/**
 * Despacha mercadería de una orden de venta.
 * Llama al endpoint POST /sales/sale-orders/:id/dispatch del backend.
 * Crea movimientos de inventario tipo "exit" y decrementa stock atómicamente.
 */
export async function dispatchSaleOrder(orderId: string, data: DispatchSaleOrderInput): Promise<void> {
  await webFetch<{ ok: boolean }>(`/sales/sale-orders/${encodeURIComponent(orderId)}/dispatch`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ─── E-commerce (WooCommerce) ────────────────────────────────────────────────

export async function getEcommerceSaleOrders(): Promise<{ items: SaleOrderRecord[] }> {
  const companyId = requireActiveCompanyId();
  const locationId = getLocationFilterId();
  let qs = `${queryParams(companyId, locationId)}&channel=woocommerce`;
  const data = await webFetch<{ items: Record<string, unknown>[] }>(`/sales/sale-orders${qs}`);
  return { items: (data.items ?? []).map(toSaleOrderRecord) };
}

export async function retrySaleOrderIntegrationWebhook(orderId: string): Promise<void> {
  const companyId = requireActiveCompanyId();
  await webFetch<{ ok: boolean }>(
    `/sales/sale-orders/${encodeURIComponent(orderId)}/integration/retry-webhook?companyId=${encodeURIComponent(companyId)}`,
    { method: "POST" }
  );
}
