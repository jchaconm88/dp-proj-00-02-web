import { webFetch } from "~/lib/backend-client";
import { requireActiveCompanyId } from "~/lib/tenant";
import type {
  DocumentSequenceRecord,
  DocumentSequenceAddInput,
  DocumentSequenceEditInput,
  GenerateDocumentNoResult,
} from "./document-sequence.types";

function toRecord(data: Record<string, unknown> & { id?: string }): DocumentSequenceRecord {
  return {
    id: String(data.id ?? ""),
    sequence: String(data.sequence ?? ""),
    documentType: String(data.documentType ?? "") as DocumentSequenceRecord["documentType"],
    currentNumber: Number(data.currentNumber ?? 0),
    maxNumber: Number(data.maxNumber ?? 0),
    active: Boolean(data.active),
  };
}

function validateSequence(sequence: string): void {
  if (!sequence || !/^[A-Za-z0-9]+$/.test(sequence)) {
    throw new Error("La serie solo puede contener letras y números, sin espacios ni caracteres especiales.");
  }
}

function validateDocumentType(documentType: string): void {
  const valid = ["invoice", "packing-list", "dispatch-guide", "credit-note", "debit-note", "receipt"];
  if (!valid.includes(documentType)) {
    throw new Error("El tipo de comprobante no es válido.");
  }
}

function validateNumbers(currentNumber: number, maxNumber: number): void {
  if (!Number.isInteger(currentNumber) || currentNumber < 1) {
    throw new Error("El número actual debe ser un entero mayor o igual a 1.");
  }
  if (!Number.isInteger(maxNumber) || maxNumber <= currentNumber) {
    throw new Error("El número máximo debe ser mayor al número actual.");
  }
}

export async function getDocumentSequences(): Promise<{ items: DocumentSequenceRecord[] }> {
  const companyId = requireActiveCompanyId();
  const res = await webFetch<{ items: Record<string, unknown>[] }>(
    `/master/document-sequences?companyId=${encodeURIComponent(companyId)}`
  );
  const items = (res.items ?? []).map(toRecord).sort((a, b) => {
    const typeCompare = a.documentType.localeCompare(b.documentType);
    if (typeCompare !== 0) return typeCompare;
    return a.sequence.localeCompare(b.sequence);
  });
  return { items };
}

export async function getDocumentSequenceById(id: string): Promise<DocumentSequenceRecord | null> {
  const companyId = requireActiveCompanyId();
  const data = await webFetch<Record<string, unknown> | null>(
    `/master/document-sequences/${encodeURIComponent(id)}?companyId=${encodeURIComponent(companyId)}`
  );
  return data ? toRecord(data) : null;
}

export async function getActiveSequencesByDocumentType(documentType: string): Promise<DocumentSequenceRecord[]> {
  const companyId = requireActiveCompanyId();
  const res = await webFetch<{ items: Record<string, unknown>[] }>(
    `/master/document-sequences?companyId=${encodeURIComponent(companyId)}&documentType=${encodeURIComponent(documentType)}&active=true`
  );
  return (res.items ?? []).map(toRecord).sort((a, b) => a.sequence.localeCompare(b.sequence));
}

export async function addDocumentSequence(data: DocumentSequenceAddInput): Promise<string> {
  validateSequence(data.sequence);
  validateDocumentType(data.documentType);
  validateNumbers(data.currentNumber, data.maxNumber);
  const companyId = requireActiveCompanyId();
  const res = await webFetch<{ id: string }>("/master/document-sequences", {
    method: "POST",
    body: JSON.stringify({ companyId, ...data }),
  });
  return res.id;
}

export async function updateDocumentSequence(
  id: string,
  data: DocumentSequenceEditInput
): Promise<void> {
  if (data.sequence !== undefined) validateSequence(data.sequence);
  if (data.documentType !== undefined) validateDocumentType(data.documentType);
  if (data.currentNumber !== undefined || data.maxNumber !== undefined) {
    if (data.currentNumber !== undefined && data.maxNumber !== undefined) {
      validateNumbers(data.currentNumber, data.maxNumber);
    } else {
      const current = await getDocumentSequenceById(id);
      if (current) {
        const currentNumber = data.currentNumber ?? current.currentNumber;
        const maxNumber = data.maxNumber ?? current.maxNumber;
        validateNumbers(currentNumber, maxNumber);
      }
    }
  }
  const companyId = requireActiveCompanyId();
  await webFetch(`/master/document-sequences/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({ companyId, ...data }),
  });
}

export async function deleteDocumentSequence(id: string): Promise<void> {
  const companyId = requireActiveCompanyId();
  await webFetch(`/master/document-sequences/${encodeURIComponent(id)}?companyId=${encodeURIComponent(companyId)}`, {
    method: "DELETE",
  });
}

export async function getNextDocumentNumber(sequenceId: string): Promise<number> {
  const companyId = requireActiveCompanyId();
  const res = await webFetch<{ currentNumber: number }>(
    `/master/document-sequences/${encodeURIComponent(sequenceId)}/next-number?companyId=${encodeURIComponent(companyId)}`
  );
  return res.currentNumber;
}

export async function generateDocumentNo(sequenceId: string): Promise<GenerateDocumentNoResult> {
  const companyId = requireActiveCompanyId();
  const res = await webFetch<{ documentNo: string; assignedNumber: number }>(
    `/master/document-sequences/${encodeURIComponent(sequenceId)}/generate?companyId=${encodeURIComponent(companyId)}`
  );
  return res;
}