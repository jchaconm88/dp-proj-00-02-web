import {
  getCollection,
  getDocument,
  addDocument,
  updateDocument,
  deleteDocument,
  deleteManyDocuments,
  getCollectionWithMultiFilter,
  getSubcollection,
  getDocumentFromSubcollection,
  setDocumentWithIdInSubcollection,
  updateDocumentInSubcollection,
  deleteDocumentFromSubcollection,
} from "~/lib/firestore.service";
import { deleteField } from "firebase/firestore";
import { where } from "firebase/firestore";
import { parseStatus, STOP_STATUS, STOP_TYPE, TRIP_STATUS } from "~/constants/status-options";
import { requireActiveCompanyId, resolveActiveAccountId } from "~/lib/tenant";
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
  TripCascadeDeleteCounts,
} from "./trips.types";

const COLLECTION = "trips";
const TRIP_STOPS_SUB = "tripStops";

/**
 * Parte el valor guardado en `scheduledStart` (fecha sola, `YYYY-MM-DDTHH:mm` o ISO) para el formulario.
 */
export function splitTripScheduledStart(raw: unknown): { date: string; time: string } {
  if (raw != null && typeof raw === "object" && "toDate" in raw && typeof (raw as { toDate: () => Date }).toDate === "function") {
    try {
      const d = (raw as { toDate: () => Date }).toDate();
      if (d instanceof Date && !Number.isNaN(d.getTime())) {
        return splitDateIntoDateAndTime(d);
      }
    } catch {
      /* continuar */
    }
  }
  const s = String(raw ?? "").trim();
  if (!s) return { date: "", time: "" };
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return { date: s, time: "" };
  const m = s.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{1,2}):(\d{2})/);
  if (m) {
    const h = m[2].padStart(2, "0");
    const min = m[3].padStart(2, "0");
    return { date: m[1], time: `${h}:${min}` };
  }
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return splitDateIntoDateAndTime(d);
  return { date: "", time: "" };
}

function splitDateIntoDateAndTime(d: Date): { date: string; time: string } {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  const sec = d.getSeconds() + d.getMilliseconds() / 1000;
  const time = h === "00" && min === "00" && sec === 0 ? "" : `${h}:${min}`;
  return { date: `${y}-${mo}-${day}`, time };
}

/**
 * Combina fecha obligatoria y hora opcional en el string persistido (`YYYY-MM-DD` o `YYYY-MM-DDTHH:mm`).
 */
export function joinTripScheduledStart(date: string, time: string): string {
  const d = date.trim();
  const t = time.trim();
  if (!d) return "";
  if (!t) return d;
  const m = t.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return d;
  const h = m[1].padStart(2, "0");
  const min = m[2].padStart(2, "0");
  return `${d}T${h}:${min}`;
}

function scheduledStartFromDoc(v: unknown): string {
  if (v == null || v === "") return "";
  if (typeof v === "object" && v !== null && "toDate" in v && typeof (v as { toDate: () => Date }).toDate === "function") {
    try {
      const d = (v as { toDate: () => Date }).toDate();
      if (d instanceof Date && !Number.isNaN(d.getTime())) {
        const { date, time } = splitDateIntoDateAndTime(d);
        return joinTripScheduledStart(date, time);
      }
    } catch {
      /* fall through */
    }
  }
  return String(v);
}

function toTripRecord(doc: { id: string } & Record<string, unknown>): TripRecord {
  const scheduledStart = scheduledStartFromDoc(doc.scheduledStart);
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
    vehicleId: String(doc.vehicleId ?? ""),
    vehicle: String(doc.vehicle ?? ""),
    transportGuide: String(doc.transportGuide ?? ""),
    status: parseStatus(doc.status, TRIP_STATUS),
    scheduledStart,
  };
}

function toTripStopRecord(doc: { id: string } & Record<string, unknown>): TripStopRecord {
  const toStr = (x: unknown): string => (x != null && x !== "" ? String(x) : "");
  return {
    id: doc.id,
    code: String(doc.code ?? "").trim(),
    order: Number(doc.order) || 0,
    type: parseStatus(doc.type, STOP_TYPE, "checkpoint") as TripStopType,
    name: String(doc.name ?? ""),
    externalDocument: String(doc.externalDocument ?? "").trim(),
    districtId: String(doc.districtId ?? "").trim(),
    districtName: String(doc.districtName ?? "").trim(),
    observations: String(doc.observations ?? ""),
    lat: Number(doc.lat) || 0,
    lng: Number(doc.lng) || 0,
    status: parseStatus(doc.status, STOP_STATUS) as TripStopStatus,
    plannedArrival: toStr(doc.plannedArrival),
    actualArrival: doc.actualArrival != null && doc.actualArrival !== "" ? toStr(doc.actualArrival) : null,
    actualDeparture: doc.actualDeparture != null && doc.actualDeparture !== "" ? toStr(doc.actualDeparture) : null,
  };
}

// --- Trips ---

export async function getTrips(): Promise<{ items: TripRecord[] }> {
  const companyId = requireActiveCompanyId();
  const accountId = await resolveActiveAccountId();
  const list = await getCollectionWithMultiFilter<Record<string, unknown>>(COLLECTION, [
    where("companyId", "==", companyId),
    where("accountId", "==", accountId),
  ]);
  return { items: list.map(toTripRecord) };
}

export async function getTripById(id: string): Promise<TripRecord | null> {
  const d = await getDocument<Record<string, unknown>>(COLLECTION, id);
  return d ? toTripRecord(d) : null;
}

export async function addTrip(data: TripAddInput): Promise<string> {
  const companyId = requireActiveCompanyId();
  const accountId = await resolveActiveAccountId();
  const payload = {
    companyId,
    accountId,
    code: data.code.trim(),
    routeId: data.routeId.trim(),
    route: data.route.trim(),
    isExternalRoute: data.isExternalRoute,
    transportServiceId: data.transportServiceId.trim(),
    transportService: data.transportService.trim(),
    clientId: data.clientId.trim(),
    client: data.client.trim(),
    vehicleId: data.vehicleId.trim(),
    vehicle: data.vehicle.trim(),
    transportGuide: (data.transportGuide ?? "").trim(),
    status: data.status,
    scheduledStart: (data.scheduledStart ?? "").trim() || null,
  };
  const tripId = await addDocument(COLLECTION, payload);
  return tripId;
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
  if (data.vehicleId !== undefined) payload.vehicleId = data.vehicleId.trim();
  if (data.vehicle !== undefined) payload.vehicle = data.vehicle.trim();
  if (data.transportGuide !== undefined) payload.transportGuide = data.transportGuide.trim();
  if (data.status !== undefined) payload.status = data.status;
  if (data.scheduledStart !== undefined) payload.scheduledStart = data.scheduledStart?.trim() || null;
  await updateDocument(COLLECTION, id, {
    ...payload,
    driver: deleteField(),
    driverId: deleteField(),
  });
}

export async function deleteTrip(id: string): Promise<void> {
  return deleteDocument(COLLECTION, id);
}

export async function deleteTrips(ids: string[]): Promise<void> {
  return deleteManyDocuments(COLLECTION, ids);
}

const TRIP_ASSIGNMENTS_COL = "trip-assignments";
const TRIP_CHARGES_COL = "trip-charges";
const TRIP_COSTS_COL = "trip-costs";

/** Conteos por un viaje (misma lógica que la cascada en Cloud Functions). */
export async function getTripCascadeDeleteCounts(tripId: string): Promise<TripCascadeDeleteCounts> {
  const tid = tripId.trim();
  const companyId = requireActiveCompanyId();
  const accountId = await resolveActiveAccountId();
  const [stops, assignments, charges, costs] = await Promise.all([
    getSubcollection(COLLECTION, tid, TRIP_STOPS_SUB).then((rows) => rows.length),
    getCollectionWithMultiFilter(TRIP_ASSIGNMENTS_COL, [
      where("companyId", "==", companyId),
      where("accountId", "==", accountId),
      where("tripId", "==", tid),
    ]).then((rows) => rows.length),
    getCollectionWithMultiFilter(TRIP_CHARGES_COL, [
      where("companyId", "==", companyId),
      where("accountId", "==", accountId),
      where("tripId", "==", tid),
    ]).then((rows) => rows.length),
    getCollectionWithMultiFilter(TRIP_COSTS_COL, [
      where("companyId", "==", companyId),
      where("accountId", "==", accountId),
      where("tripId", "==", tid),
    ]).then((rows) => rows.length),
  ]);
  return {
    tripStops: stops,
    tripAssignments: assignments,
    tripCharges: charges,
    tripCosts: costs,
  };
}

/** Suma de conteos para varios viajes (ids duplicados se ignoran una vez). */
export async function getTripsCascadeDeleteTotals(tripIds: string[]): Promise<TripCascadeDeleteCounts> {
  const unique = [...new Set(tripIds.map((id) => id.trim()).filter(Boolean))];
  const parts = await Promise.all(unique.map((id) => getTripCascadeDeleteCounts(id)));
  return parts.reduce(
    (acc, c) => ({
      tripStops: acc.tripStops + c.tripStops,
      tripAssignments: acc.tripAssignments + c.tripAssignments,
      tripCharges: acc.tripCharges + c.tripCharges,
      tripCosts: acc.tripCosts + c.tripCosts,
    }),
    { tripStops: 0, tripAssignments: 0, tripCharges: 0, tripCosts: 0 }
  );
}

/** Actualiza el estado de varios viajes en paralelo. */
export async function updateTripsStatus(ids: string[], status: TripStatus): Promise<void> {
  await Promise.all(ids.map((id) => updateTrip(id, { status })));
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
  const companyId = requireActiveCompanyId();
  const accountId = await resolveActiveAccountId();
  await setDocumentWithIdInSubcollection(
    COLLECTION,
    tripId,
    TRIP_STOPS_SUB,
    stopId,
    {
      companyId,
      accountId,
      code: (data.code ?? "").trim(),
      order: data.order,
      type: data.type,
      name: data.name.trim(),
      externalDocument: (data.externalDocument ?? "").trim(),
      districtId: (data.districtId ?? "").trim(),
      districtName: (data.districtName ?? "").trim(),
      observations: (data.observations ?? "").trim(),
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
  if (data.code !== undefined) payload.code = data.code.trim();
  if (data.type !== undefined) payload.type = data.type;
  if (data.name !== undefined) payload.name = data.name.trim();
  if (data.externalDocument !== undefined) payload.externalDocument = data.externalDocument.trim();
  if (data.districtId !== undefined) payload.districtId = data.districtId.trim();
  if (data.districtName !== undefined) payload.districtName = data.districtName.trim();
  if (data.observations !== undefined) payload.observations = data.observations.trim();
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
