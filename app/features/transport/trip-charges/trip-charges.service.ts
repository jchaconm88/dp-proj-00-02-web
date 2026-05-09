import { webFetch } from "~/lib/backend-client";
import { requireActiveCompanyId, resolveActiveAccountId } from "~/lib/tenant";
import {
  parseStatus,
  TRIP_CHARGE_ENTITY_TYPE,
  TRIP_CHARGE_SOURCE,
  TRIP_CHARGE_STATUS,
  TRIP_CHARGE_TYPE,
} from "~/constants/status-options";
import type {
  TripChargeRecord,
  TripChargeAddInput,
  TripChargeEditInput,
  TripChargeType,
  TripChargeSource,
  TripChargeStatus,
  TripChargeEntityType,
} from "./trip-charges.types";

function toSyncMeta(raw: unknown): TripChargeRecord["sync"] {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const source = String(o.source ?? "").trim();
  const sourceId = String(o.sourceId ?? "").trim();
  const process = String(o.process ?? "").trim();
  if (!source || !sourceId || !process) return null;
  return { source, sourceId, process };
}

function toRecord(doc: Record<string, unknown>): TripChargeRecord {
  const chargeType = parseStatus(doc.type ?? "freight", TRIP_CHARGE_TYPE) as TripChargeType;
  const legacyTransportServiceId = String(doc.transportServiceId ?? "").trim();
  let entityType = parseStatus(doc.entityType, TRIP_CHARGE_ENTITY_TYPE) as TripChargeEntityType;
  let entityId = String(doc.entityId ?? "").trim();
  if (chargeType === "freight") {
    if (legacyTransportServiceId && !entityId) entityId = legacyTransportServiceId;
    if (entityId && !entityType) entityType = "transportService";
  }
  return {
    id: String(doc.id ?? ""),
    code: String(doc.code ?? ""),
    tripId: String(doc.tripId ?? ""),
    name: String(doc.name ?? ""),
    chargeTypeId: String(doc.chargeTypeId ?? "").trim(),
    chargeType: String(doc.chargeType ?? "").trim(),
    type: chargeType,
    source: parseStatus(doc.source ?? "manual", TRIP_CHARGE_SOURCE, "manual") as TripChargeSource,
    entityType,
    entityId,
    amount: Number(doc.amount) ?? 0,
    currency: String(doc.currency ?? "PEN"),
    status: parseStatus(doc.status ?? "open", TRIP_CHARGE_STATUS) as TripChargeStatus,
    settlementId: doc.settlementId != null ? String(doc.settlementId) : null,
    settlement: String(doc.settlement ?? ""),
    sync: toSyncMeta(doc.sync),
  };
}

function queryParams(companyId: string): string {
  return `?companyId=${encodeURIComponent(companyId)}`;
}

export async function getTripCharges(tripId: string): Promise<{ items: TripChargeRecord[] }> {
  const companyId = requireActiveCompanyId();
  const data = await webFetch<{ items: Record<string, unknown>[] }>(
    `/transport/trip-charges?companyId=${encodeURIComponent(companyId)}&tripId=${encodeURIComponent(tripId)}`
  );
  return { items: (data.items ?? []).map((doc: Record<string, unknown>) => toRecord({ ...doc, id: doc.id })) };
}

export async function getTripChargeById(id: string): Promise<TripChargeRecord | null> {
  const companyId = requireActiveCompanyId();
  const data = await webFetch<Record<string, unknown> | null>(
    `/transport/trip-charges/${encodeURIComponent(id)}${queryParams(companyId)}`
  );
  return data ? toRecord(data) : null;
}

export async function addTripCharge(data: TripChargeAddInput): Promise<string> {
  const companyId = requireActiveCompanyId();
  const accountId = await resolveActiveAccountId();
  const result = await webFetch<{ id: string }>("/transport/trip-charges", {
    method: "POST",
    body: JSON.stringify({
      companyId,
      accountId,
      code: data.code.trim(),
      tripId: data.tripId.trim(),
      name: data.name.trim(),
      chargeTypeId: data.chargeTypeId.trim(),
      chargeType: data.chargeType.trim(),
      type: data.type,
      source: data.source,
      entityType: (data.entityType ?? "") as TripChargeEntityType,
      entityId: (data.entityId ?? "").trim(),
      amount: Number(data.amount) ?? 0,
      currency: (data.currency ?? "PEN").trim(),
      status: data.status,
      settlementId: data.settlementId ?? null,
    }),
  });
  return result.id;
}

export async function updateTripCharge(id: string, data: TripChargeEditInput): Promise<void> {
  const companyId = requireActiveCompanyId();
  const patch: Record<string, unknown> = { companyId };
  if (data.code !== undefined) patch.code = data.code.trim();
  if (data.tripId !== undefined) patch.tripId = data.tripId.trim();
  if (data.name !== undefined) patch.name = data.name.trim();
  if (data.chargeTypeId !== undefined) patch.chargeTypeId = data.chargeTypeId.trim();
  if (data.chargeType !== undefined) patch.chargeType = data.chargeType.trim();
  if (data.type !== undefined) patch.type = data.type;
  if (data.source !== undefined) patch.source = data.source;
  if (data.entityType !== undefined) patch.entityType = data.entityType;
  if (data.entityId !== undefined) patch.entityId = data.entityId.trim();
  if (data.amount !== undefined) patch.amount = Number(data.amount) ?? 0;
  if (data.currency !== undefined) patch.currency = data.currency.trim();
  if (data.status !== undefined) patch.status = data.status;
  if (data.settlementId !== undefined) patch.settlementId = data.settlementId ?? null;
  await webFetch(`/transport/trip-charges/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(patch) });
}

export async function deleteTripCharge(id: string): Promise<void> {
  const companyId = requireActiveCompanyId();
  await webFetch(`/transport/trip-charges/${encodeURIComponent(id)}${queryParams(companyId)}`, { method: "DELETE" });
}

export async function deleteTripCharges(ids: string[]): Promise<void> {
  await Promise.all(ids.map((id) => deleteTripCharge(id)));
}