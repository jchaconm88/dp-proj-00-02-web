import { where } from "firebase/firestore";
import {
  getCollectionWithMultiFilter,
  getDocument,
  addDocument,
  updateDocument,
  deleteDocument,
  runTransaction,
  getDocRef,
} from "~/lib/firestore.service";
import { requireActiveCompanyId, resolveActiveAccountId } from "~/lib/tenant";
import { INVOICE_TYPE } from "~/constants/status-options";
import type {
  DocumentSequenceRecord,
  DocumentSequenceAddInput,
  DocumentSequenceEditInput,
  GenerateDocumentNoResult,
} from "./document-sequence.types";

const COLLECTION = "document-sequences";

function toRecord(doc: { id: string } & Record<string, unknown>): DocumentSequenceRecord {
  return {
    id: doc.id,
    sequence: String(doc.sequence ?? ""),
    documentType: doc.documentType as DocumentSequenceRecord["documentType"],
    currentNumber: Number(doc.currentNumber ?? 0),
    maxNumber: Number(doc.maxNumber ?? 0),
    active: Boolean(doc.active),
  };
}

// ---------------------------------------------------------------------------
// Validations
// ---------------------------------------------------------------------------

function validateSequence(sequence: string): void {
  if (!sequence || !/^[A-Za-z0-9]+$/.test(sequence)) {
    throw new Error("La serie solo puede contener letras y números, sin espacios ni caracteres especiales.");
  }
}

function validateDocumentType(documentType: string): void {
  if (!(documentType in INVOICE_TYPE)) {
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

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function getDocumentSequences(): Promise<{ items: DocumentSequenceRecord[] }> {
  const companyId = requireActiveCompanyId();
  const accountId = await resolveActiveAccountId();
  const list = await getCollectionWithMultiFilter<Record<string, unknown>>(COLLECTION, [
    where("companyId", "==", companyId),
    where("accountId", "==", accountId),
  ]);
  const items = list
    .map(toRecord)
    .sort((a, b) => {
      const typeCompare = a.documentType.localeCompare(b.documentType);
      if (typeCompare !== 0) return typeCompare;
      return a.sequence.localeCompare(b.sequence);
    });
  return { items };
}

export async function getDocumentSequenceById(id: string): Promise<DocumentSequenceRecord | null> {
  const d = await getDocument<Record<string, unknown>>(COLLECTION, id);
  return d ? toRecord(d) : null;
}

export async function getActiveSequencesByDocumentType(
  documentType: string
): Promise<DocumentSequenceRecord[]> {
  const companyId = requireActiveCompanyId();
  const accountId = await resolveActiveAccountId();
  const list = await getCollectionWithMultiFilter<Record<string, unknown>>(COLLECTION, [
    where("companyId", "==", companyId),
    where("accountId", "==", accountId),
    where("documentType", "==", documentType),
    where("active", "==", true),
  ]);
  return list.map(toRecord).sort((a, b) => a.sequence.localeCompare(b.sequence));
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function addDocumentSequence(data: DocumentSequenceAddInput): Promise<string> {
  validateSequence(data.sequence);
  validateDocumentType(data.documentType);
  validateNumbers(data.currentNumber, data.maxNumber);

  const companyId = requireActiveCompanyId();
  const accountId = await resolveActiveAccountId();

  return addDocument(COLLECTION, { ...data, companyId, accountId });
}

export async function updateDocumentSequence(
  id: string,
  data: DocumentSequenceEditInput
): Promise<void> {
  if (data.sequence !== undefined) validateSequence(data.sequence);
  if (data.documentType !== undefined) validateDocumentType(data.documentType);
  if (data.currentNumber !== undefined || data.maxNumber !== undefined) {
    // Need both values to validate the range; fetch current doc if one is missing
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

  // Uniqueness check removed — multiple active sequences per documentType are allowed
  await updateDocument(COLLECTION, id, data);
}

export async function deleteDocumentSequence(id: string): Promise<void> {
  await deleteDocument(COLLECTION, id);
}

// ---------------------------------------------------------------------------
// Sequence number generation
// ---------------------------------------------------------------------------

export async function getNextDocumentNumber(sequenceId: string): Promise<number> {
  return runTransaction(async (transaction) => {
    const ref = getDocRef(COLLECTION, sequenceId);
    const snap = await transaction.get(ref);
    if (!snap.exists()) throw new Error("Secuencia no encontrada.");
    const data = snap.data() as Record<string, unknown>;
    const sequence = String(data.sequence ?? "");
    const current = Number(data.currentNumber) || 0;
    const max = Number(data.maxNumber) || 99999999;
    const next = current + 1;
    if (next > max) {
      throw new Error(
        `La secuencia ${sequence} ha alcanzado el número máximo permitido (${max}).`
      );
    }
    transaction.update(ref, { currentNumber: next });
    return next;
  });
}

export async function generateDocumentNo(
  sequenceId: string
): Promise<GenerateDocumentNoResult> {
  const seq = await getDocumentSequenceById(sequenceId);
  const sequence = seq?.sequence ?? sequenceId;
  const assignedNumber = await getNextDocumentNumber(sequenceId);
  const documentNo = `${sequence}-${String(assignedNumber).padStart(8, "0")}`;
  return { documentNo, assignedNumber };
}
