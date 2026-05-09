import { webFetch } from "~/lib/backend-client";
import { requireActiveCompanyId } from "~/lib/tenant";
import {
  CHARGE_TYPE_CATEGORY,
  CHARGE_TYPE_KIND,
  CHARGE_TYPE_SOURCE,
  CHARGE_TYPE_SOURCE_TRIP_ASSIGNMENT,
  parseStatus,
} from "~/constants/status-options";
import type {
  ChargeTypeRecord,
  ChargeTypeAddInput,
  ChargeTypeEditInput,
  ChargeTypeKind,
  ChargeTypeSource,
  ChargeTypeCategory,
} from "./charge-types.types";

function toRecord(data: Record<string, unknown> & { id?: string }): ChargeTypeRecord {
  return {
    id: String(data.id ?? ""),
    code: String(data.code ?? ""),
    type: parseStatus(data.type, CHARGE_TYPE_KIND) as ChargeTypeKind,
    source: parseStatus(data.source, CHARGE_TYPE_SOURCE) as ChargeTypeSource,
    name: String(data.name ?? ""),
    category: parseStatus(data.category, CHARGE_TYPE_CATEGORY, "extra") as ChargeTypeCategory,
    active: data.active !== false,
  };
}

export async function getChargeType(id: string): Promise<ChargeTypeRecord | null> {
  const companyId = requireActiveCompanyId();
  const data = await webFetch<Record<string, unknown> | null>(
    `/transport/charge-types/${encodeURIComponent(id)}?companyId=${encodeURIComponent(companyId)}`
  );
  return data ? toRecord(data) : null;
}

export async function getChargeTypes(): Promise<{ items: ChargeTypeRecord[]; total: number }> {
  const companyId = requireActiveCompanyId();
  const res = await webFetch<{ items: ChargeTypeRecord[]; total: number }>(
    `/transport/charge-types?companyId=${encodeURIComponent(companyId)}`
  );
  return { items: res.items ?? [], total: res.total ?? 0 };
}

const TRIP_ASSIGNMENT_CHARGE_SOURCE_KEYS = Object.keys(
  CHARGE_TYPE_SOURCE_TRIP_ASSIGNMENT
) as ChargeTypeSource[];

export async function getChargeTypesForTripAssignments(): Promise<ChargeTypeRecord[]> {
  const { items } = await getChargeTypes();
  return items.filter(
    (ct) => ct.active !== false && TRIP_ASSIGNMENT_CHARGE_SOURCE_KEYS.includes(ct.source)
  );
}

export async function getChargeTypesForTripCosts(): Promise<ChargeTypeRecord[]> {
  const { items } = await getChargeTypes();
  return items.filter((ct) => ct.active !== false && ct.type === "cost");
}

const CHARGE_TYPE_SOURCE_KEYS_NON_EMPTY = Object.keys(CHARGE_TYPE_SOURCE).filter(Boolean) as ChargeTypeSource[];

export async function getChargeTypesForTripCharges(): Promise<ChargeTypeRecord[]> {
  const { items } = await getChargeTypes();
  return items.filter(
    (ct) =>
      ct.active !== false &&
      ct.type === "charge" &&
      CHARGE_TYPE_SOURCE_KEYS_NON_EMPTY.includes(ct.source)
  );
}

export async function addChargeType(data: ChargeTypeAddInput): Promise<string> {
  const companyId = requireActiveCompanyId();
  const res = await webFetch<{ id: string }>("/transport/charge-types", {
    method: "POST",
    body: JSON.stringify({
      companyId,
      code: data.code.trim(),
      type: data.type,
      source: data.source,
      name: data.name.trim(),
      category: data.category,
      active: data.active !== false,
    }),
  });
  return res.id;
}

export async function updateChargeType(id: string, data: ChargeTypeEditInput): Promise<void> {
  const companyId = requireActiveCompanyId();
  const payload: Record<string, unknown> = {};
  if (data.code !== undefined) payload.code = String(data.code).trim();
  if (data.type !== undefined) payload.type = data.type;
  if (data.source !== undefined) payload.source = data.source;
  if (data.name !== undefined) payload.name = String(data.name).trim();
  if (data.category !== undefined) payload.category = data.category;
  if (data.active !== undefined) payload.active = !!data.active;
  await webFetch(`/transport/charge-types/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({ companyId, ...payload }),
  });
}

export async function deleteChargeType(id: string): Promise<void> {
  const companyId = requireActiveCompanyId();
  await webFetch(`/transport/charge-types/${encodeURIComponent(id)}?companyId=${encodeURIComponent(companyId)}`, {
    method: "DELETE",
  });
}