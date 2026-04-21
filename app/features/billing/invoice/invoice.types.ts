import type { InvoiceStatus, InvoiceType, InvoiceItemType } from "~/constants/status-options";

export type { InvoiceStatus, InvoiceType, InvoiceItemType };

/** Datos de la empresa emisora denormalizados en la factura (snapshot al momento de emisión). */
export interface InvoiceCompany {
  id: string;
  name: string;
  businessName: string;
  identityDocumentNo: string;
  emailAddress: string;
  logoUrl: string;
}

/** Sede/ubicación de la empresa emisora denormalizada en la factura. */
export interface InvoiceCompanyLocation {
  name: string;
  description: string;
  ubigeo: string;
  city: string;
  country: string;
  district: string;
  address: string;
}

/** Datos del cliente denormalizados en la factura (snapshot al momento de emisión). */
export interface InvoiceClient {
  id: string;
  name: string;
  businessName: string;
  identityDocumentNo: string;
  phoneNumber: string;
  emailAddress: string;
  homeAddress: string;
}

/** Tipo de impuesto aplicado al ítem (IGV, exonerado, inafecto, etc.). */
export interface InvoiceTaxType {
  id: string;
  name: string;
  /** Código de referencia SUNAT (ej. "1000" para IGV). */
  refCode: string;
  /** Porcentaje del impuesto (ej. 18 para IGV 18%). */
  taxPer: number;
}

/** Unidad de medida del ítem (ej. "UND", "KG", "SRV"). */
export interface InvoiceMeasure {
  id: string;
  name: string;
  /** Código de unidad de medida SUNAT. */
  code: string;
}

export interface InvoiceRecord {
  id: string;
  /** Número de documento SUNAT (ej. "F001-00123"). */
  documentNo: string;
  type: InvoiceType;
  /** Condición de pago. Usa claves de PAYMENT_CONDITION. */
  payTerm: string;
  /** ID de la liquidación de origen. Vacío si se crea manualmente. */
  settlementId: string;
  /** Código de liquidación (mismo valor que `Settlement.code`). Vacío si no aplica. */
  settlement: string;
  client: InvoiceClient;
  company: InvoiceCompany;
  companyLocation: InvoiceCompanyLocation;
  issueDate: string;
  currency: string;
  status: InvoiceStatus;
  /** Suma de precios sin impuesto (Σ item.price). */
  totalPrice: number;
  /** Suma de impuestos (Σ item.tax). */
  totalTax: number;
  /** Total final con impuesto: totalPrice + totalTax. */
  totalAmount: number;
  comment: string;
  zipUrl: string;
  cdrUrl: string;
  pdfUrl: string;
  /** Código de tipo de operación SUNAT (ej. "0101"). */
  operationTypeCode: string;
  /**
   * Fecha de vencimiento de cabecera (YYYY-MM-DD). En UBL 2.1 corresponde a `cbc:DueDate`
   * (cardinalidad 0..1 según guía SUNAT de XML electrónico; no está definida en el WSDL de
   * `billService`, que solo describe las operaciones SOAP del envío del ZIP).
   * Para venta a crédito con cuotas, los vencimientos detallados van en `InvoiceCredit` / `cac:PaymentTerms`.
   */
  dueDate?: string;
}

export interface InvoiceAddInput {
  documentNo: string;
  type: InvoiceType;
  payTerm: string;
  settlementId: string;
  settlement: string;
  client: InvoiceClient;
  company: InvoiceCompany;
  companyLocation: InvoiceCompanyLocation;
  issueDate: string;
  currency: string;
  status: InvoiceStatus;
  totalPrice: number;
  totalTax: number;
  totalAmount: number;
  comment: string;
  zipUrl: string;
  cdrUrl: string;
  pdfUrl: string;
  operationTypeCode: string;
  /** Igual que `InvoiceRecord.dueDate` (opcional en UBL; ver comentario allí). */
  dueDate?: string;
}

export type InvoiceEditInput = Partial<Omit<InvoiceRecord, "id">>;

export interface InvoiceQueryFilters {
  issueDateFrom?: string;
  issueDateTo?: string;
  status?: InvoiceStatus[];
  clientIds?: string[];
}

export interface InvoiceItemRecord {
  id: string;
  itemId: string;
  itemName: string;
  description: string;
  itemType: InvoiceItemType;
  measure: InvoiceMeasure;
  taxType: InvoiceTaxType;
  quantity: number;
  unitPrice: number;
  /** Subtotal sin impuesto: quantity * unitPrice. */
  price: number;
  /** Monto de impuesto: price * taxType.taxPer / 100. */
  tax: number;
  /** Total con impuesto: price + tax. */
  amount: number;
  currency: string;
  /** Código de afectación al IGV (ej. "10" = gravado). */
  taxAffectationCode: string;
  /** Código del esquema de impuesto SUNAT (ej. "1000" para IGV). */
  taxSchemeCode: string;
  /** Nombre del esquema de impuesto (ej. "IGV"). */
  taxSchemeName: string;
  /** Código de tipo de impuesto (ej. "VAT"). */
  taxTypeCode: string;
  /** Código de unidad de medida SUNAT (ej. "NIU"). */
  unitCode: string;
  /** Código interno del ítem. */
  itemCode?: string;
  /** Monto de ISC. */
  iscAmount?: number;
  /** Monto de ICBPER por unidad. */
  icbperUnitAmount?: number;
}

export interface InvoiceItemAddInput {
  itemId: string;
  itemName: string;
  description: string;
  itemType: InvoiceItemType;
  measure: InvoiceMeasure;
  taxType: InvoiceTaxType;
  quantity: number;
  unitPrice: number;
  price: number;
  tax: number;
  amount: number;
  currency: string;
  taxAffectationCode: string;
  taxSchemeCode: string;
  taxSchemeName: string;
  taxTypeCode: string;
  unitCode: string;
  itemCode?: string;
  iscAmount?: number;
  icbperUnitAmount?: number;
}

export type InvoiceItemEditInput = Partial<Omit<InvoiceItemRecord, "id">>;

export interface InvoiceCreditRecord {
  id: string;
  /** Número de cuota (1, 2, 3…). */
  correlative: number;
  /** Fecha de vencimiento de la cuota. YYYY-MM-DD. */
  dueDate: string;
  /** Monto de la cuota. */
  creditVal: number;
}

export interface InvoiceCreditAddInput {
  correlative: number;
  dueDate: string;
  creditVal: number;
}

export type InvoiceCreditEditInput = Partial<Omit<InvoiceCreditRecord, "id">>;
