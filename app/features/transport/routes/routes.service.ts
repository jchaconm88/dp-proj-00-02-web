import {
  getCollection,
  getDocument,
  addDocument,
  updateDocument,
  deleteDocument,
  deleteManyDocuments,
  getSubcollection,
  getDocumentFromSubcollection,
  setDocumentWithIdInSubcollection,
  updateDocumentInSubcollection,
  deleteDocumentFromSubcollection,
  getCollectionWithFilter,
} from "~/lib/firestore.service";
import { parseStatus, STOP_STATUS, STOP_TYPE } from "~/constants/status-options";
import { requireActiveCompanyId } from "~/lib/tenant";
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

const COLLECTION = "routes";
const STOPS_SUBCOLLECTION = "stops";

function toRouteRecord(doc: { id: string } & Record<string, unknown>): RouteRecord {
  return {
    id: doc.id,
    name: String(doc.name ?? ""),
    code: String(doc.code ?? ""),
    planId: String(doc.planId ?? ""),
    planCode: String(doc.planCode ?? ""),
    totalEstimatedKm: Number(doc.totalEstimatedKm) || 0,
    totalEstimatedHours: Number(doc.totalEstimatedHours) || 0,
    active: doc.active === true,
  };
}

export async function getRoutes(): Promise<{ items: RouteRecord[] }> {
  const companyId = requireActiveCompanyId();
  const list = await getCollectionWithFilter<Record<string, unknown>>(COLLECTION, "companyId", companyId);
  return { items: list.map(toRouteRecord) };
}

export async function getRouteById(id: string): Promise<RouteRecord | null> {
  const d = await getDocument<Record<string, unknown>>(COLLECTION, id);
  return d ? toRouteRecord(d) : null;
}

export async function addRoute(data: RouteAddInput): Promise<string> {
  const companyId = requireActiveCompanyId();
  return addDocument(COLLECTION, {
    companyId,
    name: data.name.trim(),
    code: data.code.trim(),
    planId: data.planId.trim(),
    planCode: data.planCode.trim(),
    totalEstimatedKm: Number(data.totalEstimatedKm) || 0,
    totalEstimatedHours: Number(data.totalEstimatedHours) || 0,
    active: data.active,
  });
}

export async function updateRoute(id: string, data: RouteEditInput): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (data.name !== undefined) payload.name = data.name.trim();
  if (data.code !== undefined) payload.code = data.code.trim();
  if (data.planId !== undefined) payload.planId = data.planId.trim();
  if (data.planCode !== undefined) payload.planCode = data.planCode.trim();
  if (data.totalEstimatedKm !== undefined)
    payload.totalEstimatedKm = Number(data.totalEstimatedKm) || 0;
  if (data.totalEstimatedHours !== undefined)
    payload.totalEstimatedHours = Number(data.totalEstimatedHours) || 0;
  if (data.active !== undefined) payload.active = data.active;
  await updateDocument(COLLECTION, id, payload);
}

export async function deleteRoute(id: string): Promise<void> {
  return deleteDocument(COLLECTION, id);
}

export async function deleteRoutes(ids: string[]): Promise<void> {
  return deleteManyDocuments(COLLECTION, ids);
}

// --- Stops (subcollection routes/{routeId}/stops) ---

function toStopRecord(doc: { id: string } & Record<string, unknown>): StopRecord {
  const sequence = Number(doc.sequence ?? doc.order) || 0;
  return {
    id: doc.id,
    orderId: String(doc.orderId ?? ""),
    sequence,
    eta: String(doc.eta ?? ""),
    arrivalWindowStart: String(doc.arrivalWindowStart ?? ""),
    arrivalWindowEnd: String(doc.arrivalWindowEnd ?? ""),
    status: parseStatus(doc.status, STOP_STATUS) as StopStatus,
    order: Number(doc.order ?? sequence) || 0,
    type: parseStatus(doc.type, STOP_TYPE, "checkpoint") as StopType,
    name: String(doc.name ?? ""),
    address: String(doc.address ?? ""),
    lat: Number(doc.lat) || 0,
    lng: Number(doc.lng) || 0,
    estimatedArrivalOffsetMinutes: Number(doc.estimatedArrivalOffsetMinutes) || 0,
  };
}

export async function getRouteStops(routeId: string): Promise<{ items: StopRecord[] }> {
  const list = await getSubcollection<Record<string, unknown>>(
    COLLECTION,
    routeId,
    STOPS_SUBCOLLECTION
  );
  const items = list.map(toStopRecord).sort((a, b) => a.sequence - b.sequence);
  return { items };
}

export async function getRouteStop(
  routeId: string,
  stopId: string
): Promise<StopRecord | null> {
  const d = await getDocumentFromSubcollection<Record<string, unknown>>(
    COLLECTION,
    routeId,
    STOPS_SUBCOLLECTION,
    stopId
  );
  return d ? toStopRecord(d) : null;
}

export async function addRouteStop(routeId: string, data: StopAddInput): Promise<void> {
  const stopId = data.id.trim().toLowerCase().replace(/\s+/g, "-");
  const sequence = Number(data.sequence ?? data.order) || 0;
  const companyId = requireActiveCompanyId();
  await setDocumentWithIdInSubcollection(
    COLLECTION,
    routeId,
    STOPS_SUBCOLLECTION,
    stopId,
    {
      companyId,
      orderId: data.orderId.trim(),
      sequence,
      eta: data.eta.trim() || "",
      arrivalWindowStart: data.arrivalWindowStart.trim() || "",
      arrivalWindowEnd: data.arrivalWindowEnd.trim() || "",
      status: data.status,
      order: sequence,
      type: data.type,
      name: data.name.trim(),
      address: data.address.trim(),
      lat: Number(data.lat) || 0,
      lng: Number(data.lng) || 0,
      estimatedArrivalOffsetMinutes: Number(data.estimatedArrivalOffsetMinutes) || 0,
    }
  );
}

export async function updateRouteStop(
  routeId: string,
  stopId: string,
  data: StopEditInput
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (data.orderId !== undefined) payload.orderId = data.orderId.trim();
  if (data.sequence !== undefined) {
    const seq = Number(data.sequence) || 0;
    payload.sequence = seq;
    payload.order = seq;
  }
  if (data.eta !== undefined) payload.eta = data.eta || "";
  if (data.arrivalWindowStart !== undefined)
    payload.arrivalWindowStart = data.arrivalWindowStart || "";
  if (data.arrivalWindowEnd !== undefined)
    payload.arrivalWindowEnd = data.arrivalWindowEnd || "";
  if (data.status !== undefined) payload.status = data.status;
  if (data.type !== undefined) payload.type = data.type;
  if (data.name !== undefined) payload.name = data.name.trim();
  if (data.address !== undefined) payload.address = data.address.trim();
  if (data.lat !== undefined) payload.lat = Number(data.lat) || 0;
  if (data.lng !== undefined) payload.lng = Number(data.lng) || 0;
  if (data.estimatedArrivalOffsetMinutes !== undefined)
    payload.estimatedArrivalOffsetMinutes = Number(data.estimatedArrivalOffsetMinutes) || 0;
  await updateDocumentInSubcollection(
    COLLECTION,
    routeId,
    STOPS_SUBCOLLECTION,
    stopId,
    payload
  );
}

export async function deleteRouteStop(routeId: string, stopId: string): Promise<void> {
  return deleteDocumentFromSubcollection(
    COLLECTION,
    routeId,
    STOPS_SUBCOLLECTION,
    stopId
  );
}
