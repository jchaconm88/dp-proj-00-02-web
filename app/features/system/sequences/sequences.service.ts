import { parseStatus, RESET_PERIOD } from "~/constants/status-options";
import { webFetch } from "~/lib/backend-client";
import { requireActiveCompanyId } from "~/lib/tenant";
import type {
  ResetPeriod,
  SequenceRecord,
  SequenceAddInput,
  SequenceEditInput,
  GenerateSequenceCodeResponse,
} from "./sequences.types";

const BASE = "/system/web-sequences";

type SequenceDoc = Record<string, unknown>;

function withCompany(path: string, companyId: string): string {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}companyId=${encodeURIComponent(companyId)}`;
}

function toSequenceRecord(data: SequenceDoc): SequenceRecord {
  const resetPeriod = parseStatus(data.resetPeriod, RESET_PERIOD) as ResetPeriod;
  return {
    id: String(data.id ?? ""),
    accountId: String(data.accountId ?? "").trim() || undefined,
    companyId: String(data.companyId ?? "").trim() || undefined,
    entity: String(data.entity ?? ""),
    prefix: String(data.prefix ?? ""),
    digits: Number(data.digits) || 6,
    format: String(data.format ?? "{prefix}-{number}"),
    resetPeriod,
    allowManualOverride: data.allowManualOverride === true,
    preventGaps: data.preventGaps === true,
    active: data.active !== false,
    source: data.source === "custom" ? "custom" : "default",
    readonly: data.readonly === true,
  };
}

export async function getSequenceById(id: string): Promise<SequenceRecord | null> {
  const companyId = requireActiveCompanyId();
  try {
    const row = await webFetch<SequenceDoc>(withCompany(`${BASE}/${encodeURIComponent(id)}`, companyId));
    return toSequenceRecord(row);
  } catch {
    return null;
  }
}

export async function getSequences(): Promise<{ items: SequenceRecord[]; last: null }> {
  const companyId = requireActiveCompanyId();
  const rows = await webFetch<SequenceDoc[]>(withCompany(BASE, companyId));
  const items = rows.map(toSequenceRecord).sort((a, b) => a.entity.localeCompare(b.entity));
  return { items, last: null };
}

export async function getActiveSequenceByEntity(entity: string): Promise<SequenceRecord | null> {
  const { items } = await getSequences();
  return items.find((s) => s.entity === entity && s.active !== false) ?? null;
}

export async function addSequence(data: SequenceAddInput): Promise<string> {
  const companyId = requireActiveCompanyId();
  const res = await webFetch<{ ok: boolean; id: string }>(BASE, {
    method: "POST",
    body: JSON.stringify({
      companyId,
      entity: data.entity.trim(),
      prefix: (data.prefix ?? "").trim(),
      digits: Number(data.digits) || 6,
      format: (data.format ?? "{prefix}-{number}").trim(),
      resetPeriod: data.resetPeriod ?? "yearly",
      allowManualOverride: !!data.allowManualOverride,
      preventGaps: !!data.preventGaps,
      active: data.active !== false,
    }),
  });
  return res.id;
}

export async function updateSequence(id: string, data: SequenceEditInput): Promise<void> {
  const companyId = requireActiveCompanyId();
  await webFetch(withCompany(`${BASE}/${encodeURIComponent(id)}`, companyId), {
    method: "PUT",
    body: JSON.stringify({ ...data, companyId }),
  });
}

export async function deleteSequence(id: string): Promise<void> {
  const companyId = requireActiveCompanyId();
  await webFetch(withCompany(`${BASE}/${encodeURIComponent(id)}`, companyId), { method: "DELETE" });
}

export function makeCounterId(sequenceId: string, period: string): string {
  const safe = String(period ?? "").replace(/\//g, "-").trim() || "all";
  return `${sequenceId}_${safe}`;
}

export async function generateSequenceCode(currentCode: string, entity: string): Promise<string> {
  const companyId = requireActiveCompanyId();
  const res = await webFetch<GenerateSequenceCodeResponse>(`${BASE}/generate-code`, {
    method: "POST",
    body: JSON.stringify({ currentCode: String(currentCode ?? ""), entity: String(entity ?? "").trim(), companyId }),
  });
  if (typeof res.code !== "string" || !res.code.trim()) {
    throw new Error("No se recibió un código válido del servidor.");
  }
  return res.code.trim();
}
