import { where } from "firebase/firestore";
import {
  getDocument,
  addDocument,
  updateDocument,
  deleteDocument,
  deleteManyDocuments,
  getCollectionWithMultiFilter,
} from "~/lib/firestore.service";
import { parseStatus, ORDER_STATUS } from "~/constants/status-options";
import { requireActiveCompanyId, resolveActiveAccountId } from "~/lib/tenant";
import type {
  OrderRecord,
  OrderAddInput,
  OrderEditInput,
  OrderStatus,
  OrderLocation,
} from "./orders.types";

const COLLECTION = "orders";

function toLocation(v: unknown): OrderLocation {
  if (v && typeof v === "object" && "latitude" in v && "longitude" in v) {
    const o = v as { latitude: unknown; longitude: unknown };
    return {
      latitude: Number(o.latitude) || 0,
      longitude: Number(o.longitude) || 0,
    };
  }
  return { latitude: 0, longitude: 0 };
}

function toOrderRecord(doc: { id: string } & Record<string, unknown>): OrderRecord {
  return {
    id: doc.id,
    code: String(doc.code ?? ""),
    clientId: String(doc.clientId ?? ""),
    client: String(doc.client ?? ""),
    deliveryAddress: String(doc.deliveryAddress ?? ""),
    location: toLocation(doc.location ?? doc.geoPoint),
    deliveryWindowStart: String(doc.deliveryWindowStart ?? "08:00"),
    deliveryWindowEnd: String(doc.deliveryWindowEnd ?? "12:00"),
    weight: Number(doc.weight) || 0,
    volume: Number(doc.volume) || 0,
    status: parseStatus(doc.status, ORDER_STATUS) as OrderStatus,
  };
}

export async function getOrders(): Promise<{ items: OrderRecord[] }> {
  const companyId = requireActiveCompanyId();
  const accountId = await resolveActiveAccountId();
  const list = await getCollectionWithMultiFilter<Record<string, unknown>>(COLLECTION, [
    where("companyId", "==", companyId),
    where("accountId", "==", accountId),
  ]);
  return { items: list.map(toOrderRecord) };
}

export async function getOrderById(id: string): Promise<OrderRecord | null> {
  const d = await getDocument<Record<string, unknown>>(COLLECTION, id);
  return d ? toOrderRecord(d) : null;
}

export async function addOrder(data: OrderAddInput): Promise<string> {
  const companyId = requireActiveCompanyId();
  const accountId = await resolveActiveAccountId();
  return addDocument(COLLECTION, {
    companyId,
    accountId,
    code: data.code.trim(),
    clientId: data.clientId.trim(),
    client: data.client.trim(),
    deliveryAddress: data.deliveryAddress.trim(),
    location: {
      latitude: Number(data.location.latitude) || 0,
      longitude: Number(data.location.longitude) || 0,
    },
    deliveryWindowStart: data.deliveryWindowStart.trim() || "08:00",
    deliveryWindowEnd: data.deliveryWindowEnd.trim() || "12:00",
    weight: Number(data.weight) || 0,
    volume: Number(data.volume) || 0,
    status: data.status,
  });
}

export async function updateOrder(id: string, data: OrderEditInput): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (data.code !== undefined) payload.code = data.code.trim();
  if (data.clientId !== undefined) payload.clientId = data.clientId.trim();
  if (data.client !== undefined) payload.client = data.client.trim();
  if (data.deliveryAddress !== undefined)
    payload.deliveryAddress = data.deliveryAddress.trim();
  if (data.location !== undefined)
    payload.location = {
      latitude: Number(data.location.latitude) || 0,
      longitude: Number(data.location.longitude) || 0,
    };
  if (data.deliveryWindowStart !== undefined)
    payload.deliveryWindowStart = data.deliveryWindowStart;
  if (data.deliveryWindowEnd !== undefined)
    payload.deliveryWindowEnd = data.deliveryWindowEnd;
  if (data.weight !== undefined) payload.weight = Number(data.weight) || 0;
  if (data.volume !== undefined) payload.volume = Number(data.volume) || 0;
  if (data.status !== undefined) payload.status = data.status;
  await updateDocument(COLLECTION, id, payload);
}

export async function deleteOrder(id: string): Promise<void> {
  return deleteDocument(COLLECTION, id);
}

export async function deleteOrders(ids: string[]): Promise<void> {
  return deleteManyDocuments(COLLECTION, ids);
}
