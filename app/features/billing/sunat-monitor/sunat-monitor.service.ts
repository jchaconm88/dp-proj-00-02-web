import { collection, getDocs, orderBy, query, where, Timestamp, type QueryConstraint } from "firebase/firestore";
import { db } from "~/lib/firebase";
import { requireActiveCompanyId } from "~/lib/tenant";
import type { SunatMonitorFilters, SunatMonitorRow } from "./sunat-monitor.types";

type SunatJobDoc = Record<string, unknown> & {
  companyId?: string;
  jobType?: string;
  status?: string;
  invoiceId?: string;
  documentNo?: string;
  docType?: string;
  issueDate?: string;
  zipUrl?: string;
  xmlUrl?: string;
  cdrUrl?: string;
  pdfUrl?: string;
  sunatResponse?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
  errorMessage?: string;
  cdrMessages?: unknown;
};

function toEpochMs(ts: unknown): number | null {
  if (!ts) return null;
  // Firestore Timestamp
  if (ts instanceof Timestamp) return ts.toMillis();
  // Admin Timestamp-like
  if (typeof (ts as { toMillis?: () => number }).toMillis === "function") return (ts as { toMillis: () => number }).toMillis();
  if (typeof (ts as { toDate?: () => Date }).toDate === "function") return (ts as { toDate: () => Date }).toDate().getTime();
  const d = new Date(String(ts));
  return Number.isFinite(d.getTime()) ? d.getTime() : null;
}

function formatDateTime(ms: number | null): string {
  if (!ms) return "—";
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return "—";
  }
}

function parseDateToStartOfDay(dateStr: string): Date | null {
  const s = String(dateStr ?? "").trim();
  if (!s) return null;
  // YYYY-MM-DD
  const d = new Date(`${s}T00:00:00`);
  return Number.isFinite(d.getTime()) ? d : null;
}

function parseDateToEndOfDay(dateStr: string): Date | null {
  const s = String(dateStr ?? "").trim();
  if (!s) return null;
  const d = new Date(`${s}T23:59:59.999`);
  return Number.isFinite(d.getTime()) ? d : null;
}

async function fetchJobs(companyId: string, filters: SunatMonitorFilters) {
  const constraints: QueryConstraint[] = [where("companyId", "==", companyId)];

  const from = filters.from ? parseDateToStartOfDay(filters.from) : null;
  const to = filters.to ? parseDateToEndOfDay(filters.to) : null;
  if (from) constraints.push(where("createdAt", ">=", Timestamp.fromDate(from)));
  if (to) constraints.push(where("createdAt", "<=", Timestamp.fromDate(to)));

  // Nota: filtros status/jobType se aplican en cliente para evitar límites de `in` y falta de índices.
  const q = query(collection(db, "sunat-jobs"), ...constraints, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })) as Array<{ id: string } & SunatJobDoc>;
}

export async function listSunatMonitorRows(filters: SunatMonitorFilters): Promise<{ items: SunatMonitorRow[] }> {
  const companyId = requireActiveCompanyId();
  const jobs = await fetchJobs(companyId, filters);

  const statusFilter = new Set((filters.status ?? []).map((x) => String(x).trim()).filter(Boolean));
  const jobTypeFilter = new Set((filters.jobType ?? []).map((x) => String(x).trim()).filter(Boolean));
  const docTypeFilter = new Set((filters.docType ?? []).map((x) => String(x).trim()).filter(Boolean));
  const documentNoNeedle = String(filters.documentNo ?? "").trim().toLowerCase();

  const filteredJobs = jobs.filter((j) => {
    if (statusFilter.size && !statusFilter.has(String(j.status ?? "").trim())) return false;
    if (jobTypeFilter.size && !jobTypeFilter.has(String(j.jobType ?? "").trim())) return false;
    if (docTypeFilter.size && !docTypeFilter.has(String(j.docType ?? "").trim())) return false;
    if (documentNoNeedle && !String(j.documentNo ?? "").toLowerCase().includes(documentNoNeedle)) return false;
    return true;
  });

  const items: SunatMonitorRow[] = filteredJobs.map((j) => {
    const createdAtMs = toEpochMs(j.createdAt);
    const updatedAtMs = toEpochMs(j.updatedAt);
    const invoiceId = String(j.invoiceId ?? "").trim() || undefined;

    const cdrMessages = Array.isArray(j.cdrMessages)
      ? (j.cdrMessages as unknown[]).map((x) => String(x ?? "").trim()).filter(Boolean)
      : undefined;

    const row: SunatMonitorRow = {
      id: String(j.id),
      companyId: String(j.companyId ?? ""),
      jobType: String(j.jobType ?? ""),
      status: String(j.status ?? ""),
      createdAtMs,
      createdAtLabel: formatDateTime(createdAtMs),
      updatedAtMs,
      invoiceId,
      documentNo: String(j.documentNo ?? "").trim() || undefined,
      docType: String(j.docType ?? "").trim() || undefined,
      issueDate: String(j.issueDate ?? "").trim() || undefined,
      zipUrl: String(j.zipUrl ?? "").trim() || undefined,
      xmlUrl: String(j.xmlUrl ?? "").trim() || undefined,
      cdrUrl: String(j.cdrUrl ?? "").trim() || undefined,
      pdfUrl: String(j.pdfUrl ?? "").trim() || undefined,
      sunatResponse: String(j.sunatResponse ?? "").trim() || undefined,
      errorMessage: String(j.errorMessage ?? "").trim() || undefined,
      cdrMessages,
    };
    return row;
  });
  return { items };
}

