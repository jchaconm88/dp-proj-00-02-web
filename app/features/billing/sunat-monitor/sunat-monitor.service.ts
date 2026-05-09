import { webFetch } from "~/lib/backend-client";
import { requireActiveCompanyId } from "~/lib/tenant";
import type { SunatMonitorFilters, SunatMonitorRow } from "./sunat-monitor.types";

function toEpochMs(ts: unknown): number | null {
  if (!ts) return null;
  if (typeof (ts as { toMillis?: () => number }).toMillis === "function") return (ts as { toMillis: () => number }).toMillis();
  if (typeof (ts as { toDate?: () => Date }).toDate === "function") return (ts as { toDate: () => Date }).toDate().getTime();
  const d = new Date(String(ts));
  return Number.isFinite(d.getTime()) ? d.getTime() : null;
}

function formatDateTime(ms: number | null): string {
  if (!ms) return "—";
  try { return new Date(ms).toLocaleString(); } catch { return "—"; }
}

function mapRow(j: Record<string, unknown>): SunatMonitorRow {
  const createdAtMs = toEpochMs(j.createdAt);
  const updatedAtMs = toEpochMs(j.updatedAt);
  const cdrMessages = Array.isArray(j.cdrMessages)
    ? (j.cdrMessages as unknown[]).map((x) => String(x ?? "").trim()).filter(Boolean)
    : undefined;
  return {
    id: String(j.id ?? ""),
    companyId: String(j.companyId ?? ""),
    jobType: String(j.jobType ?? ""),
    status: String(j.status ?? ""),
    createdAtMs,
    createdAtLabel: formatDateTime(createdAtMs),
    updatedAtMs,
    invoiceId: j.invoiceId ? String(j.invoiceId) : undefined,
    documentNo: j.documentNo ? String(j.documentNo).trim() : undefined,
    docType: j.docType ? String(j.docType).trim() : undefined,
    issueDate: j.issueDate ? String(j.issueDate).trim() : undefined,
    zipUrl: j.zipUrl ? String(j.zipUrl).trim() : undefined,
    xmlUrl: j.xmlUrl ? String(j.xmlUrl).trim() : undefined,
    cdrUrl: j.cdrUrl ? String(j.cdrUrl).trim() : undefined,
    pdfUrl: j.pdfUrl ? String(j.pdfUrl).trim() : undefined,
    sunatResponse: j.sunatResponse ? String(j.sunatResponse).trim() : undefined,
    errorMessage: j.errorMessage ? String(j.errorMessage).trim() : undefined,
    cdrMessages,
  };
}

export async function listSunatMonitorRows(filters: SunatMonitorFilters): Promise<{ items: SunatMonitorRow[] }> {
  const companyId = requireActiveCompanyId();
  const params = new URLSearchParams();
  params.set("companyId", companyId);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.status?.length) params.set("status", filters.status.join(","));
  if (filters.jobType?.length) params.set("jobType", filters.jobType.join(","));
  if (filters.docType?.length) params.set("docType", filters.docType.join(","));
  if (filters.documentNo) params.set("documentNo", filters.documentNo);

  const result = await webFetch<{ items: Record<string, unknown>[] }>(
    `/billing/sunat-monitor/jobs?${params.toString()}`
  );
  return { items: result.items.map(mapRow) };
}