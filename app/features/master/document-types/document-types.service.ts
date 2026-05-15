import { webFetch } from "~/lib/backend-client";
import { DOCUMENT_TYPE_CATEGORY, parseStatus } from "~/constants/status-options";
import { requireActiveCompanyId } from "~/lib/tenant";
import { getStoredCountryCode } from "~/lib/country-context";
import type { DocumentTypeRecord, DocumentTypeCategory } from "./document-types.types";

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

export async function getDocumentTypes(type: DocumentTypeCategory = "identity"): Promise<{ items: DocumentTypeRecord[] }> {
  const companyId = requireActiveCompanyId();
  const country = getStoredCountryCode();
  const res = await webFetch<{ items: Record<string, unknown>[] }>(
    `/master/document-types?companyId=${encodeURIComponent(companyId)}&country=${encodeURIComponent(country)}&type=${encodeURIComponent(type)}`
  );
  return { items: res.items.map(toDocumentTypeRecord) };
}