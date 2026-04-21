import { callHttpsFunction } from "~/lib/functions.service";
import {
  getDocument,
  addDocument,
  updateDocument,
  deleteDocument,
  deleteManyDocuments,
  getCollectionWithMultiFilter,
  getSubcollection,
  getDocumentFromSubcollection,
  addDocumentToSubcollection,
  updateDocumentInSubcollection,
  deleteDocumentFromSubcollection,
} from "~/lib/firestore.service";
import { where, type QueryConstraint } from "firebase/firestore";
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
import { requireActiveCompanyId, resolveActiveAccountId } from "~/lib/tenant";
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

const COLLECTION = "invoices";
const ITEMS_SUB = "invoiceItems";
const CREDITS_SUB = "invoiceCredits";

// --- Mappers ---

function toInvoiceRecord(doc: { id: string } & Record<string, unknown>): InvoiceRecord {
  const client = (doc.client && typeof doc.client === "object" ? doc.client : {}) as Record<string, unknown>;
  const company = (doc.company && typeof doc.company === "object" ? doc.company : {}) as Record<string, unknown>;
  const companyLocation = (doc.companyLocation && typeof doc.companyLocation === "object" ? doc.companyLocation : {}) as Record<string, unknown>;

  return {
    id: doc.id,
    documentNo: String(doc.documentNo ?? ""),
    type: parseStatus(doc.type, INVOICE_TYPE),
    payTerm: String(doc.payTerm ?? ""),
    settlementId: String(doc.settlementId ?? ""),
    settlement: String(doc.settlement ?? ""),
    client: {
      id: String(client.id ?? ""),
      name: String(client.name ?? ""),
      businessName: String(client.businessName ?? ""),
      identityDocumentNo: String(client.identityDocumentNo ?? ""),
      phoneNumber: String(client.phoneNumber ?? ""),
      emailAddress: String(client.emailAddress ?? ""),
      homeAddress: String(client.homeAddress ?? ""),
    },
    company: {
      id: String(company.id ?? ""),
      name: String(company.name ?? ""),
      businessName: String(company.businessName ?? ""),
      identityDocumentNo: String(company.identityDocumentNo ?? ""),
      emailAddress: String(company.emailAddress ?? ""),
      logoUrl: String(company.logoUrl ?? ""),
    },
    companyLocation: {
      name: String(companyLocation.name ?? ""),
      description: String(companyLocation.description ?? ""),
      ubigeo: String(companyLocation.ubigeo ?? ""),
      city: String(companyLocation.city ?? ""),
      country: String(companyLocation.country ?? ""),
      district: String(companyLocation.district ?? ""),
      address: String(companyLocation.address ?? ""),
    },
    issueDate: String(doc.issueDate ?? ""),
    currency: String(doc.currency ?? ""),
    status: parseStatus(doc.status, INVOICE_STATUS),
    totalPrice: Number(doc.totalPrice) || 0,
    totalTax: Number(doc.totalTax) || 0,
    totalAmount: Number(doc.totalAmount) || 0,
    comment: String(doc.comment ?? ""),
    zipUrl: String(doc.zipUrl ?? ""),
    cdrUrl: String(doc.cdrUrl ?? ""),
    pdfUrl: String(doc.pdfUrl ?? ""),
    operationTypeCode: String(doc.operationTypeCode ?? "0101"),
    dueDate: doc.dueDate ? String(doc.dueDate) : undefined,
  };
}

function toInvoiceItemRecord(doc: { id: string } & Record<string, unknown>): InvoiceItemRecord {
  const measure = (doc.measure && typeof doc.measure === "object" ? doc.measure : {}) as Record<string, unknown>;
  const taxType = (doc.taxType && typeof doc.taxType === "object" ? doc.taxType : {}) as Record<string, unknown>;

  return {
    id: doc.id,
    itemId: String(doc.itemId ?? ""),
    itemName: String(doc.itemName ?? ""),
    description: String(doc.description ?? ""),
    itemType: parseStatus(doc.itemType, INVOICE_ITEM_TYPE),
    measure: {
      id: String(measure.id ?? ""),
      name: String(measure.name ?? ""),
      code: String(measure.code ?? ""),
    },
    taxType: {
      id: String(taxType.id ?? ""),
      name: String(taxType.name ?? ""),
      refCode: String(taxType.refCode ?? ""),
      taxPer: Number(taxType.taxPer) || 0,
    },
    quantity: Number(doc.quantity) || 0,
    unitPrice: Number(doc.unitPrice) || 0,
    price: Number(doc.price) || 0,
    tax: Number(doc.tax) || 0,
    amount: Number(doc.amount) || 0,
    currency: String(doc.currency ?? ""),
    taxAffectationCode: String(doc.taxAffectationCode ?? "10"),
    taxSchemeCode: String(doc.taxSchemeCode ?? "1000"),
    taxSchemeName: String(doc.taxSchemeName ?? "IGV"),
    taxTypeCode: String(doc.taxTypeCode ?? "VAT"),
    unitCode: String(doc.unitCode ?? "NIU"),
    itemCode: doc.itemCode ? String(doc.itemCode) : undefined,
    iscAmount: doc.iscAmount ? Number(doc.iscAmount) : undefined,
    icbperUnitAmount: doc.icbperUnitAmount ? Number(doc.icbperUnitAmount) : undefined,
  };
}

function toInvoiceCreditRecord(doc: { id: string } & Record<string, unknown>): InvoiceCreditRecord {
  return {
    id: doc.id,
    correlative: Number(doc.correlative) || 0,
    dueDate: String(doc.dueDate ?? ""),
    creditVal: Number(doc.creditVal) || 0,
  };
}

// --- Invoice CRUD ---

export async function getInvoices(): Promise<{ items: InvoiceRecord[] }> {
  const companyId = requireActiveCompanyId();
  const accountId = await resolveActiveAccountId();
  const list = await getCollectionWithMultiFilter<Record<string, unknown>>(COLLECTION, [
    where("companyId", "==", companyId),
    where("accountId", "==", accountId),
  ]);
  return { items: list.map(toInvoiceRecord) };
}

export async function getInvoicesByFilters(filters: InvoiceQueryFilters): Promise<{ items: InvoiceRecord[] }> {
  const companyId = requireActiveCompanyId();
  const accountId = await resolveActiveAccountId();

  const statuses = (filters.status ?? []).map((x) => String(x).trim()).filter(Boolean) as InvoiceStatus[];
  const clientIds = (filters.clientIds ?? []).map((x) => String(x).trim()).filter(Boolean);
  const issueDateFrom = String(filters.issueDateFrom ?? "").trim();
  const issueDateTo = String(filters.issueDateTo ?? "").trim();

  const baseConstraints: QueryConstraint[] = [
    where("companyId", "==", companyId),
    where("accountId", "==", accountId),
  ];
  if (issueDateFrom) baseConstraints.push(where("issueDate", ">=", issueDateFrom));
  if (issueDateTo) baseConstraints.push(where("issueDate", "<=", issueDateTo));

  const fetchBy = async (extra: QueryConstraint[] = []) => {
    const list = await getCollectionWithMultiFilter<Record<string, unknown>>(COLLECTION, [
      ...baseConstraints,
      ...extra,
    ]);
    return list.map(toInvoiceRecord);
  };

  let current = await fetchBy();

  const applyDimension = async (
    values: string[],
    buildConstraint: (value: string) => QueryConstraint
  ) => {
    if (!values.length) return;
    const allowedIds = new Set<string>();
    for (const value of values) {
      const rows = await fetchBy([buildConstraint(value)]);
      for (const row of rows) allowedIds.add(row.id);
    }
    current = current.filter((row) => allowedIds.has(row.id));
  };

  await applyDimension(statuses, (value) => where("status", "==", value));
  await applyDimension(clientIds, (value) => where("client.id", "==", value));

  return { items: current };
}

export async function getInvoiceById(id: string): Promise<InvoiceRecord | null> {
  const d = await getDocument<Record<string, unknown>>(COLLECTION, id);
  return d ? toInvoiceRecord(d) : null;
}

export async function addInvoice(data: InvoiceAddInput): Promise<string> {
  const companyId = requireActiveCompanyId();
  const accountId = await resolveActiveAccountId();
  const payload = {
    companyId,
    accountId,
    documentNo: data.documentNo.trim(),
    type: data.type,
    payTerm: data.payTerm,
    settlementId: data.settlementId ?? "",
    settlement: data.settlement ?? "",
    client: data.client,
    company: data.company,
    companyLocation: data.companyLocation,
    issueDate: data.issueDate,
    currency: data.currency,
    status: data.status,
    totalPrice: Number(data.totalPrice) || 0,
    totalTax: Number(data.totalTax) || 0,
    totalAmount: Number(data.totalAmount) || 0,
    comment: data.comment ?? "",
    zipUrl: data.zipUrl ?? "",
    cdrUrl: data.cdrUrl ?? "",
    pdfUrl: data.pdfUrl ?? "",
    operationTypeCode: data.operationTypeCode ?? "0101",
    ...(data.dueDate !== undefined && { dueDate: data.dueDate }),
  };
  return addDocument(COLLECTION, payload);
}

export async function updateInvoice(id: string, data: InvoiceEditInput): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (data.documentNo !== undefined) payload.documentNo = data.documentNo.trim();
  if (data.type !== undefined) payload.type = data.type;
  if (data.payTerm !== undefined) payload.payTerm = data.payTerm;
  if (data.settlementId !== undefined) payload.settlementId = data.settlementId;
  if (data.settlement !== undefined) payload.settlement = data.settlement;
  if (data.client !== undefined) payload.client = data.client;
  if (data.company !== undefined) payload.company = data.company;
  if (data.companyLocation !== undefined) payload.companyLocation = data.companyLocation;
  if (data.issueDate !== undefined) payload.issueDate = data.issueDate;
  if (data.currency !== undefined) payload.currency = data.currency;
  if (data.status !== undefined) payload.status = data.status;
  if (data.totalPrice !== undefined) payload.totalPrice = Number(data.totalPrice) || 0;
  if (data.totalTax !== undefined) payload.totalTax = Number(data.totalTax) || 0;
  if (data.totalAmount !== undefined) payload.totalAmount = Number(data.totalAmount) || 0;
  if (data.comment !== undefined) payload.comment = data.comment;
  if (data.zipUrl !== undefined) payload.zipUrl = data.zipUrl;
  if (data.cdrUrl !== undefined) payload.cdrUrl = data.cdrUrl;
  if (data.pdfUrl !== undefined) payload.pdfUrl = data.pdfUrl;
  if (data.operationTypeCode !== undefined) payload.operationTypeCode = data.operationTypeCode;
  if (data.dueDate !== undefined) payload.dueDate = data.dueDate;
  await updateDocument(COLLECTION, id, payload);
}

export async function deleteInvoice(id: string): Promise<void> {
  const [items, credits] = await Promise.all([
    getSubcollection<Record<string, unknown>>(COLLECTION, id, ITEMS_SUB),
    getSubcollection<Record<string, unknown>>(COLLECTION, id, CREDITS_SUB),
  ]);
  await Promise.all([
    ...items.map((item) =>
      deleteDocumentFromSubcollection(COLLECTION, id, ITEMS_SUB, item.id)
    ),
    ...credits.map((credit) =>
      deleteDocumentFromSubcollection(COLLECTION, id, CREDITS_SUB, credit.id)
    ),
  ]);
  await deleteDocument(COLLECTION, id);
}

export async function deleteInvoices(ids: string[]): Promise<void> {
  await Promise.all(ids.map((id) => deleteInvoice(id)));
}

// --- InvoiceItem CRUD ---

export async function getInvoiceItems(invoiceId: string): Promise<{ items: InvoiceItemRecord[] }> {
  const list = await getSubcollection<Record<string, unknown>>(COLLECTION, invoiceId, ITEMS_SUB);
  return { items: list.map(toInvoiceItemRecord) };
}

export async function getInvoiceItemById(
  invoiceId: string,
  itemId: string
): Promise<InvoiceItemRecord | null> {
  const d = await getDocumentFromSubcollection<Record<string, unknown>>(
    COLLECTION,
    invoiceId,
    ITEMS_SUB,
    itemId
  );
  return d ? toInvoiceItemRecord(d) : null;
}

export async function addInvoiceItem(
  invoiceId: string,
  data: InvoiceItemAddInput
): Promise<string> {
  const companyId = requireActiveCompanyId();
  const accountId = await resolveActiveAccountId();
  const payload = {
    companyId,
    accountId,
    itemId: data.itemId,
    itemName: data.itemName,
    description: data.description,
    itemType: data.itemType,
    measure: data.measure,
    taxType: data.taxType,
    quantity: Number(data.quantity) || 0,
    unitPrice: Number(data.unitPrice) || 0,
    price: Number(data.price) || 0,
    tax: Number(data.tax) || 0,
    amount: Number(data.amount) || 0,
    currency: data.currency,
    taxAffectationCode: data.taxAffectationCode ?? "10",
    taxSchemeCode: data.taxSchemeCode ?? "1000",
    taxSchemeName: data.taxSchemeName ?? "IGV",
    taxTypeCode: data.taxTypeCode ?? "VAT",
    unitCode: data.unitCode ?? "NIU",
    ...(data.itemCode !== undefined && { itemCode: data.itemCode }),
    ...(data.iscAmount !== undefined && { iscAmount: data.iscAmount }),
    ...(data.icbperUnitAmount !== undefined && { icbperUnitAmount: data.icbperUnitAmount }),
  };
  return addDocumentToSubcollection(COLLECTION, invoiceId, ITEMS_SUB, payload);
}

export async function updateInvoiceItem(
  invoiceId: string,
  itemId: string,
  data: InvoiceItemEditInput
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (data.itemId !== undefined) payload.itemId = data.itemId;
  if (data.itemName !== undefined) payload.itemName = data.itemName;
  if (data.description !== undefined) payload.description = data.description;
  if (data.itemType !== undefined) payload.itemType = data.itemType;
  if (data.measure !== undefined) payload.measure = data.measure;
  if (data.taxType !== undefined) payload.taxType = data.taxType;
  if (data.quantity !== undefined) payload.quantity = Number(data.quantity) || 0;
  if (data.unitPrice !== undefined) payload.unitPrice = Number(data.unitPrice) || 0;
  if (data.price !== undefined) payload.price = Number(data.price) || 0;
  if (data.tax !== undefined) payload.tax = Number(data.tax) || 0;
  if (data.amount !== undefined) payload.amount = Number(data.amount) || 0;
  if (data.currency !== undefined) payload.currency = data.currency;
  if (data.taxAffectationCode !== undefined) payload.taxAffectationCode = data.taxAffectationCode;
  if (data.taxSchemeCode !== undefined) payload.taxSchemeCode = data.taxSchemeCode;
  if (data.taxSchemeName !== undefined) payload.taxSchemeName = data.taxSchemeName;
  if (data.taxTypeCode !== undefined) payload.taxTypeCode = data.taxTypeCode;
  if (data.unitCode !== undefined) payload.unitCode = data.unitCode;
  if (data.itemCode !== undefined) payload.itemCode = data.itemCode;
  if (data.iscAmount !== undefined) payload.iscAmount = data.iscAmount;
  if (data.icbperUnitAmount !== undefined) payload.icbperUnitAmount = data.icbperUnitAmount;
  await updateDocumentInSubcollection(COLLECTION, invoiceId, ITEMS_SUB, itemId, payload);
}

export async function deleteInvoiceItem(invoiceId: string, itemId: string): Promise<void> {
  return deleteDocumentFromSubcollection(COLLECTION, invoiceId, ITEMS_SUB, itemId);
}

export async function deleteInvoiceItems(invoiceId: string, ids: string[]): Promise<void> {
  await Promise.all(ids.map((id) => deleteInvoiceItem(invoiceId, id)));
}

// --- InvoiceCredit CRUD ---

export async function getInvoiceCredits(invoiceId: string): Promise<{ items: InvoiceCreditRecord[] }> {
  const list = await getSubcollection<Record<string, unknown>>(COLLECTION, invoiceId, CREDITS_SUB);
  return { items: list.map(toInvoiceCreditRecord) };
}

export async function addInvoiceCredit(
  invoiceId: string,
  data: InvoiceCreditAddInput
): Promise<string> {
  const companyId = requireActiveCompanyId();
  const accountId = await resolveActiveAccountId();
  const payload = {
    companyId,
    accountId,
    correlative: Number(data.correlative) || 0,
    dueDate: data.dueDate,
    creditVal: Number(data.creditVal) || 0,
  };
  return addDocumentToSubcollection(COLLECTION, invoiceId, CREDITS_SUB, payload);
}

export async function updateInvoiceCredit(
  invoiceId: string,
  creditId: string,
  data: InvoiceCreditEditInput
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (data.correlative !== undefined) payload.correlative = Number(data.correlative) || 0;
  if (data.dueDate !== undefined) payload.dueDate = data.dueDate;
  if (data.creditVal !== undefined) payload.creditVal = Number(data.creditVal) || 0;
  await updateDocumentInSubcollection(COLLECTION, invoiceId, CREDITS_SUB, creditId, payload);
}

export async function deleteInvoiceCredit(invoiceId: string, creditId: string): Promise<void> {
  return deleteDocumentFromSubcollection(COLLECTION, invoiceId, CREDITS_SUB, creditId);
}

// --- Generación desde liquidación ---

/**
 * Agrupa ítems de liquidación por chargeType+concept, suma cantidades manteniendo
 * el precio unitario del primer ítem del grupo.
 *
 * Reglas:
 * - itemName siempre "-"
 * - description: "CHARGETTYPE-CONCEPT" en MAYÚSCULAS
 *   Excepción: si chargeType contiene "apoyo" → description = "APOYO EXTRA" (todos agrupados)
 * - quantity: suma de ítems del grupo (cada ítem = 1 unidad)
 * - unitPrice: precio del primer ítem del grupo
 * - price = quantity * unitPrice
 * - tax = price * 0.18 (IGV 18%)
 * - amount = price + tax
 */
function groupSettlementItemsForInvoice(
  items: import("~/features/transport/settlements").SettlementItem[]
): Array<{ description: string; quantity: number; unitPrice: number; price: number; tax: number; amount: number; currency: string }> {
  const groups = new Map<string, { description: string; quantity: number; unitPrice: number; currency: string }>();

  for (const item of items) {
    const chargeTypeLower = item.chargeType.toLowerCase();
    const isApoyo = chargeTypeLower.includes("apoyo");

    const groupKey = isApoyo
      ? "__apoyo_extra__"
      : `${item.chargeType}__${item.concept}`.toUpperCase();

    const description = isApoyo
      ? "APOYO EXTRA"
      : `${item.chargeType}-${item.concept}`.toUpperCase();

    const existing = groups.get(groupKey);
    if (existing) {
      existing.quantity += 1;
    } else {
      groups.set(groupKey, {
        description,
        quantity: 1,
        unitPrice: item.amount,
        currency: item.currency,
      });
    }
  }

  return Array.from(groups.values()).map((g) => {
    const price = Math.round(g.quantity * g.unitPrice * 100) / 100;
    const tax = Math.round(price * 0.18 * 100) / 100;
    const amount = Math.round((price + tax) * 100) / 100;
    return { description: g.description, quantity: g.quantity, unitPrice: g.unitPrice, price, tax, amount, currency: g.currency };
  });
}

export async function createInvoiceFromSettlement(
  settlementId: string,
  sequenceId?: string,
  payTerm = "transfer"
): Promise<string> {
  const settlement = await getSettlementById(settlementId);
  if (!settlement) {
    throw new Error("Liquidación no encontrada.");
  }
  if (settlement.status !== "closed") {
    throw new Error("Solo se puede generar factura desde una liquidación cerrada.");
  }

  const items = await getSettlementItems(settlementId);

  // Generar documentNo desde la serie si se proporcionó
  let documentNo = "";
  if (sequenceId) {
    const { generateDocumentNo } = await import("~/features/master/document-sequences");
    const result = await generateDocumentNo(sequenceId);
    documentNo = result.documentNo;
  }

  // Agrupar ítems con IGV 18%
  const groupedItems = groupSettlementItemsForInvoice(items);

  const totalPrice = Math.round(groupedItems.reduce((s, g) => s + g.price, 0) * 100) / 100;
  const totalTax   = Math.round(groupedItems.reduce((s, g) => s + g.tax,   0) * 100) / 100;
  const totalAmount = Math.round((totalPrice + totalTax) * 100) / 100;

  const today = new Date();
  const issueDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const companyId = requireActiveCompanyId();
  const company = await getCompanyById(companyId);
  if (!company) {
    throw new Error("Empresa activa no encontrada.");
  }
  const { items: companyLocs } = await getCompanyLocations(companyId);
  const issuerLoc = companyLocs.find((l) => l.active) ?? companyLocs[0];
  if (!issuerLoc) {
    throw new Error(
      "Registre al menos una sede de empresa en Sistema → Empresas → Sedes antes de generar la factura."
    );
  }

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
      invoiceClient = {
        id: entId,
        name: String(ent?.name ?? "").trim(),
        businessName: String(ent?.name ?? "").trim(),
        identityDocumentNo: "",
        phoneNumber: "",
        emailAddress: "",
        homeAddress: "",
      };
    }
  } else {
    invoiceClient = {
      id: "",
      name: String(ent?.name ?? "").trim(),
      businessName: String(ent?.name ?? "").trim(),
      identityDocumentNo: "",
      phoneNumber: "",
      emailAddress: "",
      homeAddress: "",
    };
  }

  const invoiceInput: InvoiceAddInput = {
    documentNo,
    type: statusDefaultKey(INVOICE_TYPE),
    payTerm,
    settlementId,
    settlement: settlement.code.trim(),
    client: invoiceClient,
    company: companyRecordToInvoiceCompany(company),
    companyLocation: companyLocationRecordToInvoiceLocation(issuerLoc),
    issueDate,
    currency: settlement.totals.currency,
    status: statusDefaultKey(INVOICE_STATUS),
    totalPrice,
    totalTax,
    totalAmount,
    comment: "",
    zipUrl: "",
    cdrUrl: "",
    pdfUrl: "",
    operationTypeCode: "0101",
  };

  const invoiceId = await addInvoice(invoiceInput);

  await Promise.all(
    groupedItems.map((group) => {
      const itemInput: InvoiceItemAddInput = {
        itemId: "",
        itemName: "-",
        description: group.description,
        itemType: "service",
        measure: { id: "", name: "UND", code: "NIU" },
        taxType: { id: "", name: "IGV", refCode: "1000", taxPer: 18 },
        quantity: group.quantity,
        unitPrice: group.unitPrice,
        price: group.price,
        tax: group.tax,
        amount: group.amount,
        currency: group.currency,
        taxAffectationCode: "10",
        taxSchemeCode: "1000",
        taxSchemeName: "IGV",
        taxTypeCode: "VAT",
        unitCode: "NIU",
      };
      return addInvoiceItem(invoiceId, itemInput);
    })
  );

  return invoiceId;
}

// --- Acciones SUNAT ---

/** Envía una o varias facturas a SUNAT (modo individual). */
export async function sendInvoicesToSunat(ids: string[]): Promise<{ jobId: string }[]> {
  return callHttpsFunction("sendInvoicesToSunat", { ids });
}

/** Consulta el CDR de una o varias facturas en SUNAT. */
export async function queryInvoicesCdr(ids: string[]): Promise<{ invoiceId: string; statusCode: string; statusMessage: string }[]> {
  return callHttpsFunction("queryInvoicesCdr", { ids });
}

/** Envía un lote de facturas a SUNAT (modo pack). */
export async function sendInvoicesPack(ids: string[]): Promise<{ jobId: string }> {
  return callHttpsFunction("sendInvoicesPack", { ids });
}

/** Envía el resumen diario a SUNAT. */
export async function sendDailySummary(date: string, invoiceIds: string[]): Promise<{ jobId: string }> {
  return callHttpsFunction("sendDailySummary", { date, invoiceIds });
}

/** Reintenta el envío de una factura individual a SUNAT. */
export async function retryInvoiceSunat(id: string): Promise<{ jobId: string }> {
  return callHttpsFunction("sendInvoicesToSunat", { ids: [id] });
}
