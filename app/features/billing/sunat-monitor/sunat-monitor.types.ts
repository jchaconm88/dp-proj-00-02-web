export type SunatJobStatus =
  | "queued"
  | "processing"
  | "accepted"
  | "rejected"
  | "error"
  | "failed";

export type SunatJobType =
  | "sendBill"
  | "sendPack"
  | "sendSummary"
  | string;

export type SunatDocumentType = "invoice" | "credit_note" | "debit_note" | string;

export type SunatMonitorRow = {
  id: string; // jobId
  companyId: string;
  jobType: SunatJobType;
  status: SunatJobStatus | string;
  createdAtMs: number | null;
  createdAtLabel: string;
  updatedAtMs: number | null;
  invoiceId?: string;

  // Invoice snapshot (si aplica)
  documentNo?: string;
  docType?: SunatDocumentType;
  issueDate?: string;
  zipUrl?: string;
  xmlUrl?: string;
  cdrUrl?: string;
  pdfUrl?: string;
  sunatResponse?: string;

  // Job result
  errorMessage?: string;
  cdrMessages?: string[];
};

export type SunatMonitorFilters = {
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
  status?: string[];
  jobType?: string[];
  docType?: string[];
  documentNo?: string;
};

