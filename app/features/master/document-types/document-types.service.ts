import {
  getCollection,
  getDocument,
  addDocument,
  updateDocument,
  deleteDocument,
  deleteManyDocuments,
  getCollectionWithFilter,
} from "~/lib/firestore.service";
import { DOCUMENT_TYPE_CATEGORY, parseStatus } from "~/constants/status-options";
import { requireActiveCompanyId } from "~/lib/tenant";
import type { DocumentTypeRecord, DocumentTypeAddInput, DocumentTypeEditInput, DocumentTypeCategory } from "./document-types.types";

const COLLECTION = "document-types";

function toDocumentTypeRecord(doc: { id: string } & Record<string, unknown>): DocumentTypeRecord {
  return {
    id: doc.id,
    name: String(doc.name ?? ""),
    description: String(doc.description ?? ""),
    type: parseStatus(doc.type, DOCUMENT_TYPE_CATEGORY) as DocumentTypeCategory,
    createdAt: doc.createdAt as string | undefined,
    updatedAt: doc.updatedAt as string | undefined,
  };
}

export async function getDocumentTypes(): Promise<{ items: DocumentTypeRecord[] }> {
  const companyId = requireActiveCompanyId();
  const list = await getCollectionWithFilter<Record<string, unknown>>(COLLECTION, "companyId", companyId);
  return { items: list.map(toDocumentTypeRecord) };
}

export async function getDocumentTypeById(id: string): Promise<DocumentTypeRecord | null> {
  const d = await getDocument<Record<string, unknown>>(COLLECTION, id);
  return d ? toDocumentTypeRecord(d) : null;
}

export async function addDocumentType(data: DocumentTypeAddInput): Promise<string> {
  const companyId = requireActiveCompanyId();
  return addDocument(COLLECTION, {
    companyId,
    name: data.name?.trim(),
    description: data.description?.trim(),
    type: data.type,
  });
}

export async function updateDocumentType(id: string, data: DocumentTypeEditInput): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (data.name !== undefined) payload.name = data.name?.trim();
  if (data.description !== undefined) payload.description = data.description?.trim();
  if (data.type !== undefined) payload.type = data.type;
  return updateDocument(COLLECTION, id, payload);
}

export async function deleteDocumentType(id: string): Promise<void> {
  return deleteDocument(COLLECTION, id);
}

export async function deleteDocumentTypes(ids: string[]): Promise<void> {
  return deleteManyDocuments(COLLECTION, ids);
}
