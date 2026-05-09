import { webFetch } from "~/lib/backend-client";
import { requireActiveCompanyId } from "~/lib/tenant";
import type { PositionRecord, PositionAddInput, PositionEditInput } from "./positions.types";

function toPositionRecord(data: Record<string, unknown> & { id?: string }): PositionRecord {
  return {
    id: String(data.id ?? ""),
    code: String(data.code ?? ""),
    name: String(data.name ?? ""),
    active: data.active !== false,
  };
}

export async function getPosition(id: string): Promise<PositionRecord | null> {
  const companyId = requireActiveCompanyId();
  const data = await webFetch<Record<string, unknown> | null>(
    `/human-resource/positions/${encodeURIComponent(id)}?companyId=${encodeURIComponent(companyId)}`
  );
  return data ? toPositionRecord(data) : null;
}

export async function getPositions(): Promise<{ items: PositionRecord[] }> {
  const companyId = requireActiveCompanyId();
  const res = await webFetch<{ items: Record<string, unknown>[] }>(
    `/human-resource/positions?companyId=${encodeURIComponent(companyId)}`
  );
  const items = (res.items ?? []).map(toPositionRecord).sort((a, b) => a.name.localeCompare(b.name));
  return { items };
}

export async function addPosition(data: PositionAddInput): Promise<string> {
  const companyId = requireActiveCompanyId();
  const res = await webFetch<{ id: string }>("/human-resource/positions", {
    method: "POST",
    body: JSON.stringify({ companyId, ...data }),
  });
  return res.id;
}

export async function updatePosition(id: string, data: PositionEditInput): Promise<void> {
  const companyId = requireActiveCompanyId();
  await webFetch(`/human-resource/positions/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({ companyId, ...data }),
  });
}

export async function deletePosition(id: string): Promise<void> {
  const companyId = requireActiveCompanyId();
  await webFetch(`/human-resource/positions/${encodeURIComponent(id)}?companyId=${encodeURIComponent(companyId)}`, { method: "DELETE" });
}