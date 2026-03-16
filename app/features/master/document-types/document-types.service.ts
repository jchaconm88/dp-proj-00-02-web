import {
  getCollection,
  getDocument,
  addDocument,
  updateDocument,
  deleteDocument,
  deleteManyDocuments,
} from "~/lib/firestore.service";
import type { DocumentTypeRecord, DocumentTypeAddInput, DocumentTypeEditInput, DocumentTypeCategory } from "./document-types.types";

const COLLECTION = "document-types";

function toDocumentTypeCategory(v: unknown): DocumentTypeCategory {
  if (v === "identity" || v === "transport" || v === "vehicle") return v as DocumentTypeCategory;
  return "identity";
}

function toDocumentTypeRecord(doc: { id: string } & Record<string, unknown>): DocumentTypeRecord {
  return {
    id: doc.id,
    name: String(doc.name ?? ""),
    description: String(doc.description ?? ""),
    type: toDocumentTypeCategory(doc.type),
    createdAt: doc.createdAt as string | undefined,
    updatedAt: doc.updatedAt as string | undefined,
  };
}

export async function getDocumentTypes(): Promise<{ items: DocumentTypeRecord[] }> {
  const list = await getCollection<Record<string, unknown>>(COLLECTION);
  return { items: list.map(toDocumentTypeRecord) };
}

export async function getDocumentTypeById(id: string): Promise<DocumentTypeRecord | null> {
  const d = await getDocument<Record<string, unknown>>(COLLECTION, id);
  return d ? toDocumentTypeRecord(d) : null;
}

export async function addDocumentType(data: DocumentTypeAddInput): Promise<string> {
  return addDocument(COLLECTION, {
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
