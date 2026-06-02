import { webFetch } from "~/lib/backend-client";
import { requireActiveCompanyId, resolveActiveAccountId } from "~/lib/tenant";
import type {
  FilterableAttributeTypeRecord,
  FilterableAttributeTypeAddInput,
  FilterableAttributeTypeEditInput,
} from "./filterable-attribute-types.types";

function queryParams(companyId: string): string {
  return `?companyId=${encodeURIComponent(companyId)}`;
}

function toRecord(doc: Record<string, unknown>): FilterableAttributeTypeRecord {
  return {
    id: String(doc.id ?? ""),
    code: String(doc.code ?? ""),
    label: String(doc.label ?? ""),
    values: Array.isArray(doc.values) ? doc.values.map(String) : [],
    sortOrder: Number(doc.sortOrder) || 0,
    active: doc.active !== false,
    companyId: String(doc.companyId ?? ""),
    accountId: String(doc.accountId ?? ""),
    createAt: doc.createAt ?? undefined,
    createBy: doc.createBy ? String(doc.createBy) : undefined,
    updateAt: doc.updateAt ?? undefined,
    updateBy: doc.updateBy ? String(doc.updateBy) : undefined,
  };
}

export async function getFilterableAttributeTypes(): Promise<{ items: FilterableAttributeTypeRecord[] }> {
  const companyId = requireActiveCompanyId();
  const data = await webFetch<{ items: Record<string, unknown>[] }>(
    `/inventory/filterable-attribute-types${queryParams(companyId)}`
  );
  const items = (data.items ?? []).map(toRecord);
  items.sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
  return { items };
}

export async function getFilterableAttributeType(id: string): Promise<FilterableAttributeTypeRecord> {
  const companyId = requireActiveCompanyId();
  const data = await webFetch<Record<string, unknown>>(
    `/inventory/filterable-attribute-types/${encodeURIComponent(id)}${queryParams(companyId)}`
  );
  return toRecord(data);
}

export async function createFilterableAttributeType(data: FilterableAttributeTypeAddInput): Promise<string> {
  const companyId = requireActiveCompanyId();
  const accountId = await resolveActiveAccountId();
  const result = await webFetch<{ id: string }>("/inventory/filterable-attribute-types", {
    method: "POST",
    body: JSON.stringify({
      companyId,
      accountId,
      code: data.code.trim().toLowerCase(),
      label: data.label.trim(),
      values: data.values.map((v) => v.trim()).filter(Boolean),
      sortOrder: Number(data.sortOrder) || 0,
      active: data.active !== false,
    }),
  });
  return result.id;
}

export async function updateFilterableAttributeType(
  id: string,
  data: FilterableAttributeTypeEditInput
): Promise<void> {
  const companyId = requireActiveCompanyId();
  const payload: Record<string, unknown> = { companyId };
  if (data.code !== undefined) payload.code = data.code.trim().toLowerCase();
  if (data.label !== undefined) payload.label = data.label.trim();
  if (data.values !== undefined) payload.values = data.values.map((v) => v.trim()).filter(Boolean);
  if (data.sortOrder !== undefined) payload.sortOrder = Number(data.sortOrder) || 0;
  if (data.active !== undefined) payload.active = data.active;
  await webFetch(`/inventory/filterable-attribute-types/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteFilterableAttributeType(id: string): Promise<void> {
  const companyId = requireActiveCompanyId();
  await webFetch(`/inventory/filterable-attribute-types/${encodeURIComponent(id)}${queryParams(companyId)}`, {
    method: "DELETE",
  });
}
