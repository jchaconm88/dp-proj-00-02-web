import { webFetch } from "~/lib/backend-client";
import { requireActiveCompanyId } from "~/lib/tenant";
import { PLAN_STATUS } from "~/constants/status-options";
import type {
  PlanRecord,
  PlanAddInput,
  PlanEditInput,
  PlanStatus,
} from "./plans.types";

function toRecord(data: Record<string, unknown> & { id?: string }): PlanRecord {
  const status = String(data.status) in PLAN_STATUS
    ? (data.status as PlanStatus)
    : "draft";
  const orderIds = Array.isArray(data.orderIds) ? data.orderIds.map((x) => String(x)).filter(Boolean) : [];
  return {
    id: String(data.id ?? ""),
    code: String(data.code ?? ""),
    date: String(data.date ?? ""),
    zone: String(data.zone ?? ""),
    vehicleType: String(data.vehicleType ?? ""),
    orderIds,
    status,
  };
}

export async function getPlans(): Promise<{ items: PlanRecord[] }> {
  const companyId = requireActiveCompanyId();
  const res = await webFetch<{ items: Record<string, unknown>[] }>(
    `/transport/plans?companyId=${encodeURIComponent(companyId)}`
  );
  return { items: (res.items ?? []).map(toRecord) };
}

export async function getPlanById(id: string): Promise<PlanRecord | null> {
  const companyId = requireActiveCompanyId();
  const data = await webFetch<Record<string, unknown> | null>(
    `/transport/plans/${encodeURIComponent(id)}?companyId=${encodeURIComponent(companyId)}`
  );
  return data ? toRecord(data) : null;
}

export async function addPlan(data: PlanAddInput): Promise<string> {
  const companyId = requireActiveCompanyId();
  const res = await webFetch<{ id: string }>("/transport/plans", {
    method: "POST",
    body: JSON.stringify({
      companyId,
      code: data.code.trim(),
      date: data.date.trim(),
      zone: data.zone.trim(),
      vehicleType: data.vehicleType.trim(),
      orderIds: Array.isArray(data.orderIds) ? data.orderIds : [],
      status: data.status,
    }),
  });
  return res.id;
}

export async function updatePlan(id: string, data: PlanEditInput): Promise<void> {
  const companyId = requireActiveCompanyId();
  const payload: Record<string, unknown> = {};
  if (data.code !== undefined) payload.code = data.code.trim();
  if (data.date !== undefined) payload.date = data.date.trim();
  if (data.zone !== undefined) payload.zone = data.zone.trim();
  if (data.vehicleType !== undefined) payload.vehicleType = data.vehicleType.trim();
  if (data.orderIds !== undefined) payload.orderIds = data.orderIds;
  if (data.status !== undefined) payload.status = data.status;
  await webFetch(`/transport/plans/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({ companyId, ...payload }),
  });
}

export async function deletePlan(id: string): Promise<void> {
  const companyId = requireActiveCompanyId();
  await webFetch(`/transport/plans/${encodeURIComponent(id)}?companyId=${encodeURIComponent(companyId)}`, {
    method: "DELETE",
  });
}