import { webFetch } from "~/lib/backend-client";
import { DOCUMENT_TYPE_CATEGORY, parseStatus } from "~/constants/status-options";
import { requireActiveCompanyId } from "~/lib/tenant";
import type { DocumentTypeRecord, DocumentTypeAddInput, DocumentTypeEditInput, DocumentTypeCategory } from "./document-types.types";

function toDocumentTypeRecord(d: Record<string, unknown>): DocumentTypeRecord {
  return {
    id: String(d.id ?? ""),
    name: String(d.name ?? ""),
    description: String(d.description ?? ""),
    type: parseStatus(d.type, DOCUMENT_TYPE_CATEGORY) as DocumentTypeCategory,
    createdAt: d.createdAt != null ? String(d.createdAt) : undefined,
    updatedAt: d.updatedAt != null ? String(d.updatedAt) : undefined,
  };
}

export async function getDocumentTypes(): Promise<{ items: DocumentTypeRecord[] }> {
  const companyId = requireActiveCompanyId();
  const res = await webFetch<{ items: Record<string, unknown>[] }>(
    `/master/document-types?companyId=${encodeURIComponent(companyId)}`
  );
  return { items: res.items.map(toDocumentTypeRecord) };
}

export async function getDocumentTypeById(id: string): Promise<DocumentTypeRecord | null> {
  const companyId = requireActiveCompanyId();
  const raw = await webFetch<Record<string, unknown> | null>(
    `/master/document-types/${encodeURIComponent(id)}?companyId=${encodeURIComponent(companyId)}`
  );
  if (!raw) return null;
  return toDocumentTypeRecord(raw);
}

export async function addDocumentType(data: DocumentTypeAddInput): Promise<string> {
  const companyId = requireActiveCompanyId();
  const res = await webFetch<{ id?: string }>("/master/document-types", {
    method: "POST",
    body: JSON.stringify({ companyId, name: data.name?.trim(), description: data.description?.trim(), type: data.type }),
  });
  return String(res?.id ?? "");
}

export async function updateDocumentType(id: string, data: DocumentTypeEditInput): Promise<void> {
  const companyId = requireActiveCompanyId();
  await webFetch(`/master/document-types/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({ companyId, ...data }),
  });
}

export async function deleteDocumentType(id: string): Promise<void> {
  const companyId = requireActiveCompanyId();
  await webFetch(`/master/document-types/${encodeURIComponent(id)}?companyId=${encodeURIComponent(companyId)}`, {
    method: "DELETE",
  });
}