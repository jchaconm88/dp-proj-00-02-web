import type { InvoiceType } from "~/constants/status-options";

export interface DocumentSequenceRecord {
  id: string;
  sequence: string;
  documentType: InvoiceType;
  currentNumber: number;
  maxNumber: number;
  active: boolean;
}

export interface DocumentSequenceAddInput {
  sequence: string;
  documentType: InvoiceType;
  currentNumber: number;
  maxNumber: number;
  active: boolean;
}

export type DocumentSequenceEditInput = Partial<Omit<DocumentSequenceRecord, "id">>;

export interface GenerateDocumentNoResult {
  documentNo: string;
  assignedNumber: number;
}
