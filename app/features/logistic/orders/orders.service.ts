import { webFetch } from "~/lib/backend-client";
import { requireActiveCompanyId } from "~/lib/tenant";
import { parseStatus, ORDER_STATUS } from "~/constants/status-options";
import type {
  OrderRecord,
  OrderAddInput,
  OrderEditInput,
  OrderStatus,
  OrderLocation,
} from "./orders.types";

function toLocation(v: unknown): OrderLocation {
  if (v && typeof v === "object" && "latitude" in v && "longitude" in v) {
    const o = v as { latitude: unknown; longitude: unknown };
    return { latitude: Number(o.latitude) || 0, longitude: Number(o.longitude) || 0 };
  }
  return { latitude: 0, longitude: 0 };
}

function toOrderRecord(data: Record<string, unknown> & { id?: string }): OrderRecord {
  return {
    id: String(data.id ?? ""),
    code: String(data.code ?? ""),
    clientId: String(data.clientId ?? ""),
    client: String(data.client ?? ""),
    deliveryAddress: String(data.deliveryAddress ?? ""),
    location: toLocation(data.location),
    deliveryWindowStart: String(data.deliveryWindowStart ?? "08:00"),
    deliveryWindowEnd: String(data.deliveryWindowEnd ?? "12:00"),
    weight: Number(data.weight) || 0,
    volume: Number(data.volume) || 0,
    status: parseStatus(data.status, ORDER_STATUS) as OrderStatus,
  };
}

export async function getOrders(): Promise<{ items: OrderRecord[] }> {
  const companyId = requireActiveCompanyId();
  const res = await webFetch<{ items: Record<string, unknown>[] }>(
    `/logistic/orders?companyId=${encodeURIComponent(companyId)}`
  );
  return { items: (res.items ?? []).map(toOrderRecord) };
}

export async function getOrderById(id: string): Promise<OrderRecord | null> {
  const companyId = requireActiveCompanyId();
  const data = await webFetch<Record<string, unknown> | null>(
    `/logistic/orders/${encodeURIComponent(id)}?companyId=${encodeURIComponent(companyId)}`
  );
  return data ? toOrderRecord(data) : null;
}

export async function addOrder(data: OrderAddInput): Promise<string> {
  const companyId = requireActiveCompanyId();
  const res = await webFetch<{ id: string }>("/logistic/orders", {
    method: "POST",
    body: JSON.stringify({
      companyId,
      code: data.code.trim(),
      clientId: data.clientId.trim(),
      client: data.client.trim(),
      deliveryAddress: data.deliveryAddress.trim(),
      location: { latitude: Number(data.location.latitude) || 0, longitude: Number(data.location.longitude) || 0 },
      deliveryWindowStart: data.deliveryWindowStart.trim() || "08:00",
      deliveryWindowEnd: data.deliveryWindowEnd.trim() || "12:00",
      weight: Number(data.weight) || 0,
      volume: Number(data.volume) || 0,
      status: data.status,
    }),
  });
  return res.id;
}

export async function updateOrder(id: string, data: OrderEditInput): Promise<void> {
  const companyId = requireActiveCompanyId();
  const payload: Record<string, unknown> = {};
  if (data.code !== undefined) payload.code = data.code.trim();
  if (data.clientId !== undefined) payload.clientId = data.clientId.trim();
  if (data.client !== undefined) payload.client = data.client.trim();
  if (data.deliveryAddress !== undefined) payload.deliveryAddress = data.deliveryAddress.trim();
  if (data.location !== undefined) payload.location = { latitude: Number(data.location.latitude) || 0, longitude: Number(data.location.longitude) || 0 };
  if (data.deliveryWindowStart !== undefined) payload.deliveryWindowStart = data.deliveryWindowStart;
  if (data.deliveryWindowEnd !== undefined) payload.deliveryWindowEnd = data.deliveryWindowEnd;
  if (data.weight !== undefined) payload.weight = Number(data.weight) || 0;
  if (data.volume !== undefined) payload.volume = Number(data.volume) || 0;
  if (data.status !== undefined) payload.status = data.status;
  await webFetch(`/logistic/orders/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({ companyId, ...payload }),
  });
}

export async function deleteOrder(id: string): Promise<void> {
  const companyId = requireActiveCompanyId();
  await webFetch(`/logistic/orders/${encodeURIComponent(id)}?companyId=${encodeURIComponent(companyId)}`, { method: "DELETE" });
}