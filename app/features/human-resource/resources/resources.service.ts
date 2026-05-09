import { webFetch } from "~/lib/backend-client";
import { requireActiveCompanyId } from "~/lib/tenant";
import { parseStatus, RESOURCE_COST_TYPE, RESOURCE_ENGAGEMENT_TYPE, RESOURCE_STATUS } from "~/constants/status-options";
import type {
  ResourceRecord,
  ResourceAddInput,
  ResourceEditInput,
  ResourceEngagementType,
  ResourceStatus,
  ResourceCostRecord,
  ResourceCostAddInput,
  ResourceCostEditInput,
  ResourceCostType,
} from "./resources.types";

function toResourceRecord(data: Record<string, unknown> & { id?: string }): ResourceRecord {
  const engagementType = parseStatus(data.engagementType, RESOURCE_ENGAGEMENT_TYPE) as ResourceEngagementType;
  const status = parseStatus(data.status, RESOURCE_STATUS) as ResourceStatus;
  return {
    id: String(data.id ?? ""),
    code: String(data.code ?? ""),
    firstName: String(data.firstName ?? ""),
    lastName: String(data.lastName ?? ""),
    documentNo: String(data.documentNo ?? ""),
    documentTypeId: String(data.documentTypeId ?? ""),
    documentType: String(data.documentType ?? ""),
    phone: String(data.phone ?? ""),
    email: String(data.email ?? ""),
    positionId: String(data.positionId ?? ""),
    position: String(data.position ?? ""),
    hireDate: String(data.hireDate ?? ""),
    engagementType,
    status,
  };
}

function toResourceCostRecord(data: Record<string, unknown> & { id?: string }): ResourceCostRecord {
  const type = parseStatus(data.type, RESOURCE_COST_TYPE) as ResourceCostType;
  return {
    id: String(data.id ?? ""),
    code: String(data.code ?? ""),
    type,
    amount: Number(data.amount) ?? 0,
    currency: String(data.currency ?? "PEN"),
    effectiveFrom: String(data.effectiveFrom ?? ""),
    active: data.active !== false,
  };
}

export async function getResource(id: string): Promise<ResourceRecord | null> {
  const companyId = requireActiveCompanyId();
  const data = await webFetch<Record<string, unknown> | null>(
    `/human-resource/resources/${encodeURIComponent(id)}?companyId=${encodeURIComponent(companyId)}`
  );
  return data ? toResourceRecord(data) : null;
}

export async function getResources(): Promise<{ items: ResourceRecord[] }> {
  const companyId = requireActiveCompanyId();
  const res = await webFetch<{ items: Record<string, unknown>[] }>(
    `/human-resource/resources?companyId=${encodeURIComponent(companyId)}`
  );
  return { items: (res.items ?? []).map(toResourceRecord) };
}

export async function addResource(data: ResourceAddInput): Promise<string> {
  const companyId = requireActiveCompanyId();
  const res = await webFetch<{ id: string }>("/human-resource/resources", {
    method: "POST",
    body: JSON.stringify({
      companyId,
      code: data.code.trim(),
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      documentNo: data.documentNo.trim(),
      documentTypeId: data.documentTypeId.trim(),
      documentType: data.documentType.trim(),
      phone: data.phone.trim(),
      email: data.email.trim(),
      positionId: data.positionId.trim(),
      position: data.position.trim(),
      hireDate: data.hireDate.trim() || null,
      engagementType: data.engagementType,
      status: data.status,
    }),
  });
  return res.id;
}

export async function updateResource(id: string, data: ResourceEditInput): Promise<void> {
  const companyId = requireActiveCompanyId();
  const payload: Record<string, unknown> = {};
  if (data.code !== undefined) payload.code = data.code;
  if (data.firstName !== undefined) payload.firstName = data.firstName;
  if (data.lastName !== undefined) payload.lastName = data.lastName;
  if (data.documentNo !== undefined) payload.documentNo = data.documentNo;
  if (data.documentTypeId !== undefined) payload.documentTypeId = data.documentTypeId;
  if (data.documentType !== undefined) payload.documentType = data.documentType;
  if (data.phone !== undefined) payload.phone = data.phone;
  if (data.email !== undefined) payload.email = data.email;
  if (data.positionId !== undefined) payload.positionId = data.positionId;
  if (data.position !== undefined) payload.position = data.position;
  if (data.hireDate !== undefined) payload.hireDate = data.hireDate || null;
  if (data.engagementType !== undefined) payload.engagementType = data.engagementType;
  if (data.status !== undefined) payload.status = data.status;
  await webFetch(`/human-resource/resources/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({ companyId, ...payload }),
  });
}

export async function deleteResource(id: string): Promise<void> {
  const companyId = requireActiveCompanyId();
  await webFetch(`/human-resource/resources/${encodeURIComponent(id)}?companyId=${encodeURIComponent(companyId)}`, {
    method: "DELETE",
  });
}

export async function getResourceCosts(resourceId: string): Promise<{ items: ResourceCostRecord[] }> {
  const companyId = requireActiveCompanyId();
  const res = await webFetch<{ items: Record<string, unknown>[] }>(
    `/human-resource/resources/${encodeURIComponent(resourceId)}/costs?companyId=${encodeURIComponent(companyId)}`
  );
  return { items: (res.items ?? []).map(toResourceCostRecord) };
}

export async function getResourceCost(resourceId: string, costId: string): Promise<ResourceCostRecord | null> {
  const companyId = requireActiveCompanyId();
  const data = await webFetch<Record<string, unknown> | null>(
    `/human-resource/resources/${encodeURIComponent(resourceId)}/costs/${encodeURIComponent(costId)}?companyId=${encodeURIComponent(companyId)}`
  );
  return data ? toResourceCostRecord(data) : null;
}

export async function addResourceCost(resourceId: string, data: ResourceCostAddInput): Promise<string> {
  const companyId = requireActiveCompanyId();
  const res = await webFetch<{ id: string }>(
    `/human-resource/resources/${encodeURIComponent(resourceId)}/costs`,
    {
      method: "POST",
      body: JSON.stringify({
        companyId,
        code: data.code.trim(),
        type: data.type,
        amount: Number(data.amount) ?? 0,
        currency: (data.currency ?? "PEN").trim(),
        effectiveFrom: (data.effectiveFrom ?? "").trim(),
        active: data.active !== false,
      }),
    }
  );
  return res.id;
}

export async function updateResourceCost(resourceId: string, costId: string, data: ResourceCostEditInput): Promise<void> {
  const companyId = requireActiveCompanyId();
  const payload: Record<string, unknown> = {};
  if (data.code !== undefined) payload.code = data.code;
  if (data.type !== undefined) payload.type = data.type;
  if (data.amount !== undefined) payload.amount = Number(data.amount) ?? 0;
  if (data.currency !== undefined) payload.currency = data.currency;
  if (data.effectiveFrom !== undefined) payload.effectiveFrom = data.effectiveFrom;
  if (data.active !== undefined) payload.active = data.active;
  await webFetch(
    `/human-resource/resources/${encodeURIComponent(resourceId)}/costs/${encodeURIComponent(costId)}`,
    {
      method: "PUT",
      body: JSON.stringify({ companyId, ...payload }),
    }
  );
}

export async function deleteResourceCost(resourceId: string, costId: string): Promise<void> {
  const companyId = requireActiveCompanyId();
  await webFetch(
    `/human-resource/resources/${encodeURIComponent(resourceId)}/costs/${encodeURIComponent(costId)}?companyId=${encodeURIComponent(companyId)}`,
    { method: "DELETE" }
  );
}