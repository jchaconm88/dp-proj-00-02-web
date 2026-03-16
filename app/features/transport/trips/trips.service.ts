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
} from "~/lib/firestore.service";
import type {
  TripRecord,
  TripAddInput,
  TripEditInput,
  TripStatus,
  TripStopRecord,
  TripStopAddInput,
  TripStopEditInput,
  TripStopType,
  TripStopStatus,
} from "./trips.types";

const COLLECTION = "trips";
const TRIP_STOPS_SUB = "tripStops";

function toTripStatus(v: unknown): TripStatus {
  const s = String(v ?? "").toLowerCase();
  if (s === "in_progress" || s === "completed" || s === "cancelled") return s;
  return "scheduled";
}

function toTripRecord(doc: { id: string } & Record<string, unknown>): TripRecord {
  const scheduledStart = doc.scheduledStart != null ? String(doc.scheduledStart) : "";
  return {
    id: doc.id,
    code: String(doc.code ?? ""),
    routeId: String(doc.routeId ?? ""),
    route: String(doc.route ?? doc.routeCode ?? ""),
    isExternalRoute: doc.isExternalRoute === true,
    transportServiceId: String(doc.transportServiceId ?? ""),
    transportService: String(doc.transportService ?? ""),
    clientId: String(doc.clientId ?? ""),
    client: String(doc.client ?? ""),
    driverId: String(doc.driverId ?? ""),
    driver: String(doc.driver ?? ""),
    vehicleId: String(doc.vehicleId ?? ""),
    vehicle: String(doc.vehicle ?? ""),
    transportGuide: String(doc.transportGuide ?? ""),
    status: toTripStatus(doc.status),
    scheduledStart,
  };
}

function toTripStopType(v: unknown): TripStopType {
  const t = String(v ?? "").toLowerCase();
  if (t === "origin" || t === "pickup" || t === "delivery" || t === "rest") return t;
  return "checkpoint";
}

function toTripStopStatus(v: unknown): TripStopStatus {
  const s = String(v ?? "").toLowerCase();
  if (s === "arrived" || s === "completed" || s === "skipped") return s;
  return "pending";
}

function toTripStopRecord(doc: { id: string } & Record<string, unknown>): TripStopRecord {
  const toStr = (x: unknown): string => (x != null && x !== "" ? String(x) : "");
  return {
    id: doc.id,
    order: Number(doc.order) || 0,
    type: toTripStopType(doc.type),
    name: String(doc.name ?? ""),
    lat: Number(doc.lat) || 0,
    lng: Number(doc.lng) || 0,
    status: toTripStopStatus(doc.status),
    plannedArrival: toStr(doc.plannedArrival),
    actualArrival: doc.actualArrival != null && doc.actualArrival !== "" ? toStr(doc.actualArrival) : null,
    actualDeparture: doc.actualDeparture != null && doc.actualDeparture !== "" ? toStr(doc.actualDeparture) : null,
  };
}

// --- Trips ---

export async function getTrips(): Promise<{ items: TripRecord[] }> {
  const list = await getCollection<Record<string, unknown>>(COLLECTION);
  return { items: list.map(toTripRecord) };
}

export async function getTripById(id: string): Promise<TripRecord | null> {
  const d = await getDocument<Record<string, unknown>>(COLLECTION, id);
  return d ? toTripRecord(d) : null;
}

export async function addTrip(data: TripAddInput): Promise<string> {
  return addDocument(COLLECTION, {
    code: data.code.trim(),
    routeId: data.routeId.trim(),
    route: data.route.trim(),
    isExternalRoute: data.isExternalRoute,
    transportServiceId: data.transportServiceId.trim(),
    transportService: data.transportService.trim(),
    clientId: data.clientId.trim(),
    client: data.client.trim(),
    driverId: data.driverId.trim(),
    driver: data.driver.trim(),
    vehicleId: data.vehicleId.trim(),
    vehicle: data.vehicle.trim(),
    transportGuide: (data.transportGuide ?? "").trim(),
    status: data.status,
    scheduledStart: (data.scheduledStart ?? "").trim() || null,
  });
}

export async function updateTrip(id: string, data: TripEditInput): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (data.code !== undefined) payload.code = data.code.trim();
  if (data.routeId !== undefined) payload.routeId = data.routeId.trim();
  if (data.route !== undefined) payload.route = data.route.trim();
  if (data.isExternalRoute !== undefined) payload.isExternalRoute = data.isExternalRoute;
  if (data.transportServiceId !== undefined) payload.transportServiceId = data.transportServiceId.trim();
  if (data.transportService !== undefined) payload.transportService = data.transportService.trim();
  if (data.clientId !== undefined) payload.clientId = data.clientId.trim();
  if (data.client !== undefined) payload.client = data.client.trim();
  if (data.driverId !== undefined) payload.driverId = data.driverId.trim();
  if (data.driver !== undefined) payload.driver = data.driver.trim();
  if (data.vehicleId !== undefined) payload.vehicleId = data.vehicleId.trim();
  if (data.vehicle !== undefined) payload.vehicle = data.vehicle.trim();
  if (data.transportGuide !== undefined) payload.transportGuide = data.transportGuide.trim();
  if (data.status !== undefined) payload.status = data.status;
  if (data.scheduledStart !== undefined) payload.scheduledStart = data.scheduledStart?.trim() || null;
  await updateDocument(COLLECTION, id, payload);
}

export async function deleteTrip(id: string): Promise<void> {
  return deleteDocument(COLLECTION, id);
}

export async function deleteTrips(ids: string[]): Promise<void> {
  return deleteManyDocuments(COLLECTION, ids);
}

// --- TripStops ---

export async function getTripStops(tripId: string): Promise<{ items: TripStopRecord[] }> {
  const list = await getSubcollection<Record<string, unknown>>(
    COLLECTION,
    tripId,
    TRIP_STOPS_SUB
  );
  const items = list.map(toTripStopRecord).sort((a, b) => a.order - b.order);
  return { items };
}

export async function getTripStop(tripId: string, stopId: string): Promise<TripStopRecord | null> {
  const d = await getDocumentFromSubcollection<Record<string, unknown>>(
    COLLECTION,
    tripId,
    TRIP_STOPS_SUB,
    stopId
  );
  return d ? toTripStopRecord(d) : null;
}

export async function addTripStop(tripId: string, data: TripStopAddInput): Promise<void> {
  const stopId = data.id.trim().toLowerCase().replace(/\s+/g, "-");
  await setDocumentWithIdInSubcollection(
    COLLECTION,
    tripId,
    TRIP_STOPS_SUB,
    stopId,
    {
      order: data.order,
      type: data.type,
      name: data.name.trim(),
      lat: Number(data.lat) || 0,
      lng: Number(data.lng) || 0,
      status: data.status,
      plannedArrival: (data.plannedArrival ?? "").trim() || null,
      actualArrival: data.actualArrival?.trim() || null,
      actualDeparture: data.actualDeparture?.trim() || null,
    }
  );
}

export async function updateTripStop(
  tripId: string,
  stopId: string,
  data: TripStopEditInput
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (data.order !== undefined) payload.order = Number(data.order) || 0;
  if (data.type !== undefined) payload.type = data.type;
  if (data.name !== undefined) payload.name = data.name.trim();
  if (data.lat !== undefined) payload.lat = Number(data.lat) || 0;
  if (data.lng !== undefined) payload.lng = Number(data.lng) || 0;
  if (data.status !== undefined) payload.status = data.status;
  if (data.plannedArrival !== undefined) payload.plannedArrival = data.plannedArrival?.trim() || null;
  if (data.actualArrival !== undefined) payload.actualArrival = data.actualArrival?.trim() || null;
  if (data.actualDeparture !== undefined) payload.actualDeparture = data.actualDeparture?.trim() || null;
  await updateDocumentInSubcollection(
    COLLECTION,
    tripId,
    TRIP_STOPS_SUB,
    stopId,
    payload
  );
}

export async function deleteTripStop(tripId: string, stopId: string): Promise<void> {
  return deleteDocumentFromSubcollection(
    COLLECTION,
    tripId,
    TRIP_STOPS_SUB,
    stopId
  );
}
