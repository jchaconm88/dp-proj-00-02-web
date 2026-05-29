import { webFetch } from "~/lib/backend-client";
import { requireActiveCompanyId, resolveActiveAccountId } from "~/lib/tenant";
import type {
  VariantAttributeTypeRecord,
  VariantAttributeTypeAddInput,
  VariantAttributeTypeEditInput,
} from "./variant-attribute-types.types";

function queryParams(companyId: string): string {
  return `?companyId=${encodeURIComponent(companyId)}`;
}

function toRecord(doc: Record<string, unknown>): VariantAttributeTypeRecord {
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

export async function getVariantAttributeTypes(): Promise<{ items: VariantAttributeTypeRecord[] }> {
  const companyId = requireActiveCompanyId();
  const data = await webFetch<{ items: Record<string, unknown>[] }>(
    `/inventory/variant-attribute-types${queryParams(companyId)}`
  );
  const items = (data.items ?? []).map(toRecord);
  items.sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
  return { items };
}

export async function addVariantAttributeType(data: VariantAttributeTypeAddInput): Promise<string> {
  const companyId = requireActiveCompanyId();
  const accountId = await resolveActiveAccountId();
  const result = await webFetch<{ id: string }>("/inventory/variant-attribute-types", {
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

export async function updateVariantAttributeType(
  id: string,
  data: VariantAttributeTypeEditInput
): Promise<void> {
  const companyId = requireActiveCompanyId();
  const payload: Record<string, unknown> = { companyId };
  if (data.code !== undefined) payload.code = data.code.trim().toLowerCase();
  if (data.label !== undefined) payload.label = data.label.trim();
  if (data.values !== undefined) payload.values = data.values.map((v) => v.trim()).filter(Boolean);
  if (data.sortOrder !== undefined) payload.sortOrder = Number(data.sortOrder) || 0;
  if (data.active !== undefined) payload.active = data.active;
  await webFetch(`/inventory/variant-attribute-types/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteVariantAttributeType(id: string): Promise<void> {
  const companyId = requireActiveCompanyId();
  await webFetch(`/inventory/variant-attribute-types/${encodeURIComponent(id)}${queryParams(companyId)}`, {
    method: "DELETE",
  });
}

export async function deleteVariantAttributeTypes(ids: string[]): Promise<void> {
  const companyId = requireActiveCompanyId();
  await Promise.all(
    ids.map((id) =>
      webFetch(`/inventory/variant-attribute-types/${encodeURIComponent(id)}${queryParams(companyId)}`, {
        method: "DELETE",
      })
    )
  );
}
