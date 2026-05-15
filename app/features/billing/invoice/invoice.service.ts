import { callHttpsFunction } from "~/lib/functions.service";
import { webFetch } from "~/lib/backend-client";
import { requireActiveCompanyId, resolveActiveAccountId } from "~/lib/tenant";
import {
  parseStatus,
  INVOICE_STATUS,
  INVOICE_TYPE,
  INVOICE_ITEM_TYPE,
  statusDefaultKey,
} from "~/constants/status-options";
import { getSettlementById, getSettlementItems } from "~/features/transport/settlements";
import { getCompanyById } from "~/features/system/companies";
import { getCompanyLocations } from "~/features/system/company-locations";
import { getClient, getClientLocations } from "~/features/master/clients";
import {
  clientRecordToInvoiceClient,
  clientLocationToHomeAddress,
  companyRecordToInvoiceCompany,
  companyLocationRecordToInvoiceLocation,
} from "./invoice-snapshot";
import type {
  InvoiceRecord,
  InvoiceClient,
  InvoiceAddInput,
  InvoiceEditInput,
  InvoiceItemRecord,
  InvoiceItemAddInput,
  InvoiceItemEditInput,
  InvoiceCreditRecord,
  InvoiceCreditAddInput,
  InvoiceCreditEditInput,
  InvoiceQueryFilters,
  InvoiceStatus,
} from "./invoice.types";

function toInvoiceRecord(data: Record<string, unknown>): InvoiceRecord {
  const client = (data.client && typeof data.client === "object" ? data.client : {}) as Record<string, unknown>;
  const company = (data.company && typeof data.company === "object" ? data.company : {}) as Record<string, unknown>;
  const companyLocation = (data.companyLocation && typeof data.companyLocation === "object" ? data.companyLocation : {}) as Record<string, unknown>;
  return {
    id: String(data.id ?? ""),
    documentNo: String(data.documentNo ?? ""),
    type: parseStatus(data.type, INVOICE_TYPE),
    payTerm: String(data.payTerm ?? ""),
    settlementId: String(data.settlementId ?? ""),
    settlement: String(data.settlement ?? ""),
    client: { id: String(client.id ?? ""), name: String(client.name ?? ""), businessName: String(client.businessName ?? ""), identityDocumentNo: String(client.identityDocumentNo ?? ""), phoneNumber: String(client.phoneNumber ?? ""), emailAddress: String(client.emailAddress ?? ""), homeAddress: String(client.homeAddress ?? "") },
    company: { id: String(company.id ?? ""), name: String(company.name ?? ""), businessName: String(company.businessName ?? ""), identityDocumentNo: String(company.identityDocumentNo ?? ""), emailAddress: String(company.emailAddress ?? ""), logoUrl: String(company.logoUrl ?? "") },
    companyLocation: { name: String(companyLocation.name ?? ""), description: String(companyLocation.description ?? ""), ubigeo: String(companyLocation.ubigeo ?? ""), city: String(companyLocation.city ?? ""), country: String(companyLocation.country ?? ""), district: String(companyLocation.district ?? ""), address: String(companyLocation.address ?? "") },
    issueDate: String(data.issueDate ?? ""),
    currency: String(data.currency ?? ""),
    status: parseStatus(data.status, INVOICE_STATUS),
    totalPrice: Number(data.totalPrice) || 0,
    totalTax: Number(data.totalTax) || 0,
    totalAmount: Number(data.totalAmount) || 0,
    comment: String(data.comment ?? ""),
    zipUrl: String(data.zipUrl ?? ""),
    cdrUrl: String(data.cdrUrl ?? ""),
    pdfUrl: String(data.pdfUrl ?? ""),
    operationTypeCode: String(data.operationTypeCode ?? "0101"),
    dueDate: data.dueDate != null ? String(data.dueDate) : undefined,
    issueBlockReason: data.issueBlockReason != null ? String(data.issueBlockReason).trim() : undefined,
    saleOrderId: data.saleOrderId != null ? String(data.saleOrderId) : undefined,
    saleOrderCode: data.saleOrderCode != null ? String(data.saleOrderCode) : undefined,
  };
}

function toInvoiceItemRecord(data: Record<string, unknown>): InvoiceItemRecord {
  const measure = (data.measure && typeof data.measure === "object" ? data.measure : {}) as Record<string, unknown>;
  const taxType = (data.taxType && typeof data.taxType === "object" ? data.taxType : {}) as Record<string, unknown>;
  return {
    id: String(data.id ?? ""),
    itemId: String(data.itemId ?? ""),
    itemName: String(data.itemName ?? ""),
    description: String(data.description ?? ""),
    itemType: parseStatus(data.itemType, INVOICE_ITEM_TYPE),
    measure: { id: String(measure.id ?? ""), name: String(measure.name ?? ""), code: String(measure.code ?? "") },
    taxType: { id: String(taxType.id ?? ""), name: String(taxType.name ?? ""), refCode: String(taxType.refCode ?? ""), taxPer: Number(taxType.taxPer) || 0 },
    quantity: Number(data.quantity) || 0,
    unitPrice: Number(data.unitPrice) || 0,
    price: Number(data.price) || 0,
    tax: Number(data.tax) || 0,
    amount: Number(data.amount) || 0,
    currency: String(data.currency ?? ""),
    taxAffectationCode: String(data.taxAffectationCode ?? "10"),
    taxSchemeCode: String(data.taxSchemeCode ?? "1000"),
    taxSchemeName: String(data.taxSchemeName ?? "IGV"),
    taxTypeCode: String(data.taxTypeCode ?? "VAT"),
    unitCode: String(data.unitCode ?? "NIU"),
    itemCode: data.itemCode != null ? String(data.itemCode) : undefined,
    iscAmount: data.iscAmount != null ? Number(data.iscAmount) : undefined,
    icbperUnitAmount: data.icbperUnitAmount != null ? Number(data.icbperUnitAmount) : undefined,
  };
}

function toInvoiceCreditRecord(data: Record<string, unknown>): InvoiceCreditRecord {
  return { id: String(data.id ?? ""), correlative: Number(data.correlative) || 0, dueDate: String(data.dueDate ?? ""), creditVal: Number(data.creditVal) || 0 };
}

export async function getInvoices(): Promise<{ items: InvoiceRecord[] }> {
  const companyId = requireActiveCompanyId();
  const result = await webFetch<{ items: Record<string, unknown>[] }>(
    `/billing/invoices?companyId=${companyId}`
  );
  return { items: result.items.map(toInvoiceRecord) };
}

export async function getInvoicesByFilters(filters: InvoiceQueryFilters): Promise<{ items: InvoiceRecord[] }> {
  const companyId = requireActiveCompanyId();
  const params = new URLSearchParams();
  params.set("companyId", companyId);
  const issueDateFromRaw = String(filters.issueDateFrom ?? "").trim();
  const issueDateToRaw = String(filters.issueDateTo ?? "").trim();
  if (issueDateFromRaw) params.set("issueDateFrom", issueDateFromRaw);
  if (issueDateToRaw) params.set("issueDateTo", issueDateToRaw);
  if (filters.status?.length) params.set("status", filters.status.join(","));
  if (filters.clientIds?.length) params.set("clientIds", filters.clientIds.join(","));
  const result = await webFetch<{ items: Record<string, unknown>[] }>(`/billing/invoices?${params.toString()}`);
  return { items: result.items.map(toInvoiceRecord) };
}

export async function getInvoiceById(id: string): Promise<InvoiceRecord | null> {
  const result = await webFetch<Record<string, unknown> | null>(
    `/billing/invoices/${id}?companyId=${requireActiveCompanyId()}`
  );
  return result ? toInvoiceRecord(result) : null;
}

export async function addInvoice(data: InvoiceAddInput): Promise<string> {
  const companyId = requireActiveCompanyId();
  const accountId = await resolveActiveAccountId();
  const body = { companyId, accountId, documentNo: data.documentNo.trim(), type: data.type, payTerm: data.payTerm, settlementId: data.settlementId ?? "", settlement: data.settlement ?? "", client: data.client, company: data.company, companyLocation: data.companyLocation, issueDate: data.issueDate, currency: data.currency, status: data.status, totalPrice: Number(data.totalPrice) || 0, totalTax: Number(data.totalTax) || 0, totalAmount: Number(data.totalAmount) || 0, comment: data.comment ?? "", zipUrl: data.zipUrl ?? "", cdrUrl: data.cdrUrl ?? "", pdfUrl: data.pdfUrl ?? "", operationTypeCode: data.operationTypeCode ?? "0101", ...(data.dueDate !== undefined && { dueDate: data.dueDate }), ...(data.saleOrderId && { saleOrderId: data.saleOrderId }), ...(data.saleOrderCode && { saleOrderCode: data.saleOrderCode }) };
  const result = await webFetch<{ ok: boolean; id: string }>("/billing/invoices", { method: "POST", body: JSON.stringify(body) });
  return result.id;
}

export async function updateInvoice(id: string, data: InvoiceEditInput): Promise<void> {
  const companyId = requireActiveCompanyId();
  const patch: Record<string, unknown> = { companyId };
  const keys = ["documentNo","type","payTerm","settlementId","settlement","client","company","companyLocation","issueDate","currency","status","totalPrice","totalTax","totalAmount","comment","zipUrl","cdrUrl","pdfUrl","operationTypeCode","dueDate","issueBlockReason","saleOrderId","saleOrderCode"] as const;
  for (const key of keys) {
    if ((data as Record<string, unknown>)[key] !== undefined) patch[key] = (data as Record<string, unknown>)[key];
  }
  await webFetch(`/billing/invoices/${id}`, { method: "PUT", body: JSON.stringify(patch) });
}

export async function deleteInvoice(id: string): Promise<void> {
  await webFetch(`/billing/invoices/${id}?companyId=${requireActiveCompanyId()}`, { method: "DELETE" });
}

export async function deleteInvoices(ids: string[]): Promise<void> {
  await Promise.all(ids.map((id) => deleteInvoice(id)));
}

export async function getInvoiceItems(invoiceId: string): Promise<{ items: InvoiceItemRecord[] }> {
  const result = await webFetch<{ items: Record<string, unknown>[] }>(
    `/billing/invoices/${invoiceId}/items?companyId=${requireActiveCompanyId()}`
  );
  return { items: result.items.map(toInvoiceItemRecord) };
}

export async function getInvoiceItemById(invoiceId: string, itemId: string): Promise<InvoiceItemRecord | null> {
  const result = await webFetch<Record<string, unknown> | null>(
    `/billing/invoices/${invoiceId}/items/${itemId}?companyId=${requireActiveCompanyId()}`
  );
  return result ? toInvoiceItemRecord(result) : null;
}

export async function addInvoiceItem(invoiceId: string, data: InvoiceItemAddInput): Promise<string> {
  const companyId = requireActiveCompanyId();
  const accountId = await resolveActiveAccountId();
  const body = { companyId, accountId, itemId: data.itemId, itemName: data.itemName, description: data.description, itemType: data.itemType, measure: data.measure, taxType: data.taxType, quantity: Number(data.quantity) || 0, unitPrice: Number(data.unitPrice) || 0, price: Number(data.price) || 0, tax: Number(data.tax) || 0, amount: Number(data.amount) || 0, currency: data.currency, taxAffectationCode: data.taxAffectationCode ?? "10", taxSchemeCode: data.taxSchemeCode ?? "1000", taxSchemeName: data.taxSchemeName ?? "IGV", taxTypeCode: data.taxTypeCode ?? "VAT", unitCode: data.unitCode ?? "NIU", ...(data.itemCode !== undefined && { itemCode: data.itemCode }), ...(data.iscAmount !== undefined && { iscAmount: data.iscAmount }), ...(data.icbperUnitAmount !== undefined && { icbperUnitAmount: data.icbperUnitAmount }) };
  const result = await webFetch<{ ok: boolean; id: string }>(`/billing/invoices/${invoiceId}/items`, { method: "POST", body: JSON.stringify(body) });
  return result.id;
}

export async function updateInvoiceItem(invoiceId: string, itemId: string, data: InvoiceItemEditInput): Promise<void> {
  const companyId = requireActiveCompanyId();
  const patch: Record<string, unknown> = { companyId };
  const keys = ["itemId","itemName","description","itemType","measure","taxType","quantity","unitPrice","price","tax","amount","currency","taxAffectationCode","taxSchemeCode","taxSchemeName","taxTypeCode","unitCode","itemCode","iscAmount","icbperUnitAmount"] as const;
  for (const key of keys) {
    if ((data as Record<string, unknown>)[key] !== undefined) patch[key] = (data as Record<string, unknown>)[key];
  }
  await webFetch(`/billing/invoices/${invoiceId}/items/${itemId}`, { method: "PUT", body: JSON.stringify(patch) });
}

export async function deleteInvoiceItem(invoiceId: string, itemId: string): Promise<void> {
  await webFetch(`/billing/invoices/${invoiceId}/items/${itemId}?companyId=${requireActiveCompanyId()}`, { method: "DELETE" });
}

type GroupedItem = { description: string; quantity: number; unitPrice: number; price: number; tax: number; amount: number; currency: string };

function groupSettlementItemsForInvoice(items: import("~/features/transport/settlements").SettlementItem[]): GroupedItem[] {
  const groups = new Map<string, { description: string; quantity: number; unitPrice: number; currency: string }>();
  for (const item of items) {
    const isApoyo = item.chargeType.toLowerCase().includes("apoyo");
    const groupKey = isApoyo ? "__apoyo_extra__" : `${item.chargeType}__${item.concept}`.toUpperCase();
    const description = isApoyo ? "APOYO EXTRA" : `${item.chargeType}-${item.concept}`.toUpperCase();
    const existing = groups.get(groupKey);
    if (existing) { existing.quantity += 1; } else { groups.set(groupKey, { description, quantity: 1, unitPrice: item.amount, currency: item.currency }); }
  }
  return Array.from(groups.values()).map((g) => {
    const price = Math.round(g.quantity * g.unitPrice * 100) / 100;
    const tax = Math.round(price * 0.18 * 100) / 100;
    const amount = Math.round((price + tax) * 100) / 100;
    return { description: g.description, quantity: g.quantity, unitPrice: g.unitPrice, price, tax, amount, currency: g.currency };
  });
}

export async function deleteInvoiceItems(invoiceId: string, ids: string[]): Promise<void> {
  await Promise.all(ids.map((id) => deleteInvoiceItem(invoiceId, id)));
}

export async function getInvoiceCredits(invoiceId: string): Promise<{ items: InvoiceCreditRecord[] }> {
  const result = await webFetch<{ items: Record<string, unknown>[] }>(
    `/billing/invoices/${invoiceId}/credits?companyId=${requireActiveCompanyId()}`
  );
  return { items: result.items.map(toInvoiceCreditRecord) };
}

export async function addInvoiceCredit(invoiceId: string, data: InvoiceCreditAddInput): Promise<string> {
  const companyId = requireActiveCompanyId();
  const accountId = await resolveActiveAccountId();
  const result = await webFetch<{ ok: boolean; id: string }>(
    `/billing/invoices/${invoiceId}/credits`,
    { method: "POST", body: JSON.stringify({ companyId, accountId, correlative: Number(data.correlative) || 0, dueDate: data.dueDate, creditVal: Number(data.creditVal) || 0 }) }
  );
  return result.id;
}

export async function updateInvoiceCredit(invoiceId: string, creditId: string, data: InvoiceCreditEditInput): Promise<void> {
  const companyId = requireActiveCompanyId();
  const patch: Record<string, unknown> = { companyId };
  if (data.correlative !== undefined) patch.correlative = Number(data.correlative) || 0;
  if (data.dueDate !== undefined) patch.dueDate = data.dueDate;
  if (data.creditVal !== undefined) patch.creditVal = Number(data.creditVal) || 0;
  await webFetch(`/billing/invoices/${invoiceId}/credits/${creditId}`, { method: "PUT", body: JSON.stringify(patch) });
}

export async function deleteInvoiceCredit(invoiceId: string, creditId: string): Promise<void> {
  await webFetch(`/billing/invoices/${invoiceId}/credits/${creditId}?companyId=${requireActiveCompanyId()}`, { method: "DELETE" });
}

export async function createInvoiceFromSettlement(settlementId: string, sequenceId?: string, payTerm = "transfer"): Promise<string> {
  const settlement = await getSettlementById(settlementId);
  if (!settlement) throw new Error("Liquidación no encontrada.");
  if (settlement.status !== "closed") throw new Error("Solo se puede generar factura desde una liquidación cerrada.");
  const items = await getSettlementItems(settlementId);
  let documentNo = "";
  if (sequenceId) {
    const { generateDocumentNo } = await import("~/features/master/document-sequences");
    const result = await generateDocumentNo(sequenceId);
    documentNo = result.documentNo;
  }
  const groupedItems = groupSettlementItemsForInvoice(items);
  const totalPrice = Math.round(groupedItems.reduce((s, g) => s + g.price, 0) * 100) / 100;
  const totalTax = Math.round(groupedItems.reduce((s, g) => s + g.tax, 0) * 100) / 100;
  const totalAmount = Math.round((totalPrice + totalTax) * 100) / 100;
  const now = new Date();
  const issueDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}T${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
  const companyId = requireActiveCompanyId();
  const company = await getCompanyById(companyId);
  if (!company) throw new Error("Empresa activa no encontrada.");
  const { items: companyLocs } = await getCompanyLocations(companyId);
  const issuerLoc = companyLocs.find((l) => l.active) ?? companyLocs[0];
  if (!issuerLoc) throw new Error("Registre al menos una sede de empresa en Sistema → Empresas → Sedes antes de generar la factura.");
  let invoiceClient: InvoiceClient;
  const ent = settlement.entity;
  const entId = String(ent?.id ?? "").trim();
  if (entId) {
    const cr = await getClient(entId);
    if (cr) {
      const { items: clLocs } = await getClientLocations(entId);
      const firstLoc = clLocs.find((l) => l.active) ?? clLocs[0];
      const homeExtra = firstLoc ? clientLocationToHomeAddress(firstLoc) : undefined;
      invoiceClient = clientRecordToInvoiceClient(cr, homeExtra);
    } else {
      invoiceClient = { id: entId, name: String(ent?.name ?? "").trim(), businessName: String(ent?.name ?? "").trim(), identityDocumentNo: "", phoneNumber: "", emailAddress: "", homeAddress: "" };
    }
  } else {
    invoiceClient = { id: "", name: String(ent?.name ?? "").trim(), businessName: String(ent?.name ?? "").trim(), identityDocumentNo: "", phoneNumber: "", emailAddress: "", homeAddress: "" };
  }
  const invoiceInput: InvoiceAddInput = {
    documentNo, type: statusDefaultKey(INVOICE_TYPE), payTerm, settlementId, settlement: settlement.code.trim(),
    client: invoiceClient, company: companyRecordToInvoiceCompany(company), companyLocation: companyLocationRecordToInvoiceLocation(issuerLoc),
    issueDate, currency: settlement.totals.currency, status: statusDefaultKey(INVOICE_STATUS), totalPrice, totalTax, totalAmount, comment: "", zipUrl: "", cdrUrl: "", pdfUrl: "", operationTypeCode: "0101",
  };
  const invoiceId = await addInvoice(invoiceInput);
  await Promise.all(groupedItems.map((group) => {
    const itemInput: InvoiceItemAddInput = {
      itemId: "", itemName: "-", description: group.description, itemType: "service", measure: { id: "", name: "UND", code: "NIU" },
      taxType: { id: "", name: "IGV", refCode: "1000", taxPer: 18 }, quantity: group.quantity, unitPrice: group.unitPrice, price: group.price, tax: group.tax, amount: group.amount, currency: group.currency,
      taxAffectationCode: "10", taxSchemeCode: "1000", taxSchemeName: "IGV", taxTypeCode: "VAT", unitCode: "NIU",
    };
    return addInvoiceItem(invoiceId, itemInput);
  }));
  return invoiceId;
}

export async function sendInvoicesToSunat(ids: string[]): Promise<{ jobId: string }[]> {
  return callHttpsFunction("sendInvoicesToSunat", { ids });
}

export async function queryInvoicesCdr(ids: string[]): Promise<{ invoiceId: string; statusCode: string; statusMessage: string }[]> {
  return callHttpsFunction("queryInvoicesCdr", { ids });
}

export async function sendInvoicesPack(ids: string[]): Promise<{ jobId: string }> {
  return callHttpsFunction("sendInvoicesPack", { ids });
}

export async function sendDailySummary(date: string, invoiceIds: string[]): Promise<{ jobId: string }> {
  return callHttpsFunction("sendDailySummary", { date, invoiceIds });
}

export async function retryInvoiceSunat(id: string): Promise<{ jobId: string }> {
  return callHttpsFunction("sendInvoicesToSunat", { ids: [id] });
}

export async function changeInvoiceStatusRemote(invoiceId: string, nextStatus: InvoiceStatus): Promise<{ ok: boolean }> {
  const companyId = requireActiveCompanyId();
  return callHttpsFunction("changeInvoiceStatus", { companyId, invoiceId, nextStatus });
}