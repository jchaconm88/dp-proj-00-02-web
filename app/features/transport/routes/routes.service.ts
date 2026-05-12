import { webFetch } from "~/lib/backend-client";
import { requireActiveCompanyId } from "~/lib/tenant";
import { STOP_STATUS, STOP_TYPE } from "~/constants/status-options";
import type {
  RouteRecord,
  RouteAddInput,
  RouteEditInput,
  StopRecord,
  StopAddInput,
  StopEditInput,
  StopType,
  StopStatus,
} from "./routes.types";

function toRouteRecord(data: Record<string, unknown> & { id?: string }): RouteRecord {
  return {
    id: String(data.id ?? ""),
    name: String(data.name ?? ""),
    code: String(data.code ?? ""),
    planId: String(data.planId ?? ""),
    planCode: String(data.planCode ?? ""),
    totalEstimatedKm: Number(data.totalEstimatedKm) || 0,
    totalEstimatedHours: Number(data.totalEstimatedHours) || 0,
    active: data.active === true,
  };
}

function toStopRecord(data: Record<string, unknown> & { id?: string }): StopRecord {
  const sequence = Number(data.sequence ?? data.order) || 0;
  const status = String(data.status) in STOP_STATUS
    ? (data.status as StopStatus)
    : "pending";
  const type = String(data.type) in STOP_TYPE
    ? (data.type as StopType)
    : "checkpoint";
  return {
    id: String(data.id ?? ""),
    orderId: String(data.orderId ?? ""),
    sequence,
    eta: String(data.eta ?? ""),
    arrivalWindowStart: String(data.arrivalWindowStart ?? ""),
    arrivalWindowEnd: String(data.arrivalWindowEnd ?? ""),
    status,
    order: Number(data.order ?? sequence) || 0,
    type,
    name: String(data.name ?? ""),
    address: String(data.address ?? ""),
    lat: Number(data.lat) || 0,
    lng: Number(data.lng) || 0,
    estimatedArrivalOffsetMinutes: Number(data.estimatedArrivalOffsetMinutes) || 0,
  };
}

export async function getRoutes(): Promise<{ items: RouteRecord[] }> {
  const companyId = requireActiveCompanyId();
  const res = await webFetch<{ items: Record<string, unknown>[] }>(
    `/transport/routes?companyId=${encodeURIComponent(companyId)}`
  );
  return { items: (res.items ?? []).map(toRouteRecord) };
}

export async function getRouteById(id: string): Promise<RouteRecord | null> {
  const companyId = requireActiveCompanyId();
  const data = await webFetch<Record<string, unknown> | null>(
    `/transport/routes/${encodeURIComponent(id)}?companyId=${encodeURIComponent(companyId)}`
  );
  return data ? toRouteRecord(data) : null;
}

export async function addRoute(data: RouteAddInput): Promise<string> {
  const companyId = requireActiveCompanyId();
  const res = await webFetch<{ id: string }>("/transport/routes", {
    method: "POST",
    body: JSON.stringify({
      companyId,
      name: data.name.trim(),
      code: data.code.trim(),
      planId: data.planId.trim(),
      planCode: data.planCode.trim(),
      totalEstimatedKm: Number(data.totalEstimatedKm) || 0,
      totalEstimatedHours: Number(data.totalEstimatedHours) || 0,
      active: data.active,
    }),
  });
  return res.id;
}

export async function updateRoute(id: string, data: RouteEditInput): Promise<void> {
  const companyId = requireActiveCompanyId();
  const payload: Record<string, unknown> = {};
  if (data.name !== undefined) payload.name = data.name.trim();
  if (data.code !== undefined) payload.code = data.code.trim();
  if (data.planId !== undefined) payload.planId = data.planId.trim();
  if (data.planCode !== undefined) payload.planCode = data.planCode.trim();
  if (data.totalEstimatedKm !== undefined) payload.totalEstimatedKm = Number(data.totalEstimatedKm) || 0;
  if (data.totalEstimatedHours !== undefined) payload.totalEstimatedHours = Number(data.totalEstimatedHours) || 0;
  if (data.active !== undefined) payload.active = data.active;
  await webFetch(`/transport/routes/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({ companyId, ...payload }),
  });
}

export async function deleteRoute(id: string): Promise<void> {
  const companyId = requireActiveCompanyId();
  await webFetch(`/transport/routes/${encodeURIComponent(id)}?companyId=${encodeURIComponent(companyId)}`, {
    method: "DELETE",
  });
}

export async function getRouteStops(routeId: string): Promise<{ items: StopRecord[] }> {
  const companyId = requireActiveCompanyId();
  const res = await webFetch<{ items: Record<string, unknown>[] }>(
    `/transport/routes/${encodeURIComponent(routeId)}/stops?companyId=${encodeURIComponent(companyId)}`
  );
  const items = (res.items ?? []).map(toStopRecord).sort((a, b) => a.sequence - b.sequence);
  return { items };
}

export async function getRouteStop(routeId: string, stopId: string): Promise<StopRecord | null> {
  const companyId = requireActiveCompanyId();
  const data = await webFetch<Record<string, unknown> | null>(
    `/transport/routes/${encodeURIComponent(routeId)}/stops/${encodeURIComponent(stopId)}?companyId=${encodeURIComponent(companyId)}`
  );
  return data ? toStopRecord(data) : null;
}

export async function addRouteStop(routeId: string, data: StopAddInput): Promise<void> {
  const companyId = requireActiveCompanyId();
  const seq = Number(data.sequence ?? data.order) || 0;
  await webFetch(
    `/transport/routes/${encodeURIComponent(routeId)}/stops?companyId=${encodeURIComponent(companyId)}`,
    {
      method: "POST",
      body: JSON.stringify({
        id: data.id.trim().toLowerCase().replace(/\s+/g, "-"),
        orderId: data.orderId.trim(),
        sequence: seq,
        eta: data.eta.trim() || "",
        arrivalWindowStart: data.arrivalWindowStart.trim() || "",
        arrivalWindowEnd: data.arrivalWindowEnd.trim() || "",
        status: data.status,
        order: seq,
        type: data.type,
        name: data.name.trim(),
        address: data.address.trim(),
        lat: Number(data.lat) || 0,
        lng: Number(data.lng) || 0,
        estimatedArrivalOffsetMinutes: Number(data.estimatedArrivalOffsetMinutes) || 0,
      }),
    }
  );
}

export async function updateRouteStop(routeId: string, stopId: string, data: StopEditInput): Promise<void> {
  const companyId = requireActiveCompanyId();
  const payload: Record<string, unknown> = {};
  if (data.orderId !== undefined) payload.orderId = data.orderId.trim();
  if (data.sequence !== undefined) {
    const seq = Number(data.sequence) || 0;
    payload.sequence = seq;
    payload.order = seq;
  }
  if (data.eta !== undefined) payload.eta = data.eta || "";
  if (data.arrivalWindowStart !== undefined) payload.arrivalWindowStart = data.arrivalWindowStart || "";
  if (data.arrivalWindowEnd !== undefined) payload.arrivalWindowEnd = data.arrivalWindowEnd || "";
  if (data.status !== undefined) payload.status = data.status;
  if (data.type !== undefined) payload.type = data.type;
  if (data.name !== undefined) payload.name = data.name.trim();
  if (data.address !== undefined) payload.address = data.address.trim();
  if (data.lat !== undefined) payload.lat = Number(data.lat) || 0;
  if (data.lng !== undefined) payload.lng = Number(data.lng) || 0;
  if (data.estimatedArrivalOffsetMinutes !== undefined) payload.estimatedArrivalOffsetMinutes = Number(data.estimatedArrivalOffsetMinutes) || 0;
  await webFetch(
    `/transport/routes/${encodeURIComponent(routeId)}/stops/${encodeURIComponent(stopId)}`,
    {
      method: "PUT",
      body: JSON.stringify({ companyId, ...payload }),
    }
  );
}

export async function deleteRouteStop(routeId: string, stopId: string): Promise<void> {
  const companyId = requireActiveCompanyId();
  await webFetch(
    `/transport/routes/${encodeURIComponent(routeId)}/stops/${encodeURIComponent(stopId)}?companyId=${encodeURIComponent(companyId)}`,
    { method: "DELETE" }
  );
}