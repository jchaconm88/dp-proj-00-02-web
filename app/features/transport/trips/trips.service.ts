import { auth } from "~/lib/firebase";
import { webFetch } from "~/lib/backend-client";
import { requireActiveCompanyId, resolveActiveAccountId } from "~/lib/tenant";
import { parseStatus, STOP_STATUS, STOP_TYPE, TRIP_STATUS } from "~/constants/status-options";
import type {
  TripRecord,
  TripAddInput,
  TripEditInput,
  TripQueryFilters,
  TripStatus,
  TripStopRecord,
  TripStopAddInput,
  TripStopEditInput,
  TripCascadeDeleteCounts,
} from "./trips.types";

const TRIP_ASSIGNMENTS_COL = "trip-assignments";
const TRIP_CHARGES_COL = "trip-charges";
const TRIP_COSTS_COL = "trip-costs";

function toTripRecord(doc: Record<string, unknown>): TripRecord {
  const scheduledStart = parseScheduledStart(doc.scheduledStart);
  return {
    id: String(doc.id ?? ""),
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

function parseScheduledStart(raw: unknown): string {
  if (raw == null || raw === "") return "";
  if (typeof raw === "object" && raw !== null && "toDate" in raw && typeof (raw as { toDate: () => Date }).toDate === "function") {
    try {
      const d = (raw as { toDate: () => Date }).toDate();
      if (d instanceof Date && !Number.isNaN(d.getTime())) {
        const y = d.getFullYear();
        const mo = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const h = String(d.getHours()).padStart(2, "0");
        const min = String(d.getMinutes()).padStart(2, "0");
        const sec = d.getSeconds() + d.getMilliseconds() / 1000;
        const time = h === "00" && min === "00" && sec === 0 ? "" : `${h}:${min}`;
        return time ? `${y}-${mo}-${day}T${time}` : `${y}-${mo}-${day}`;
      }
    } catch { /* fall through */ }
  }
  return String(raw);
}

function toTripStopRecord(doc: Record<string, unknown>): TripStopRecord {
  const toStr = (x: unknown): string => (x != null && x !== "" ? String(x) : "");
  return {
    id: String(doc.id ?? ""),
    code: String(doc.code ?? "").trim(),
    order: Number(doc.order) || 0,
    type: parseStatus(doc.type, STOP_TYPE, "checkpoint") as import("~/features/transport/trips").TripStopType,
    name: String(doc.name ?? ""),
    externalDocument: String(doc.externalDocument ?? "").trim(),
    districtId: String(doc.districtId ?? "").trim(),
    districtName: String(doc.districtName ?? "").trim(),
    observations: String(doc.observations ?? ""),
    lat: Number(doc.lat) || 0,
    lng: Number(doc.lng) || 0,
    status: parseStatus(doc.status, STOP_STATUS) as import("~/features/transport/trips").TripStopStatus,
    plannedArrival: toStr(doc.plannedArrival),
    actualArrival: doc.actualArrival != null && doc.actualArrival !== "" ? toStr(doc.actualArrival) : null,
    actualDeparture: doc.actualDeparture != null && doc.actualDeparture !== "" ? toStr(doc.actualDeparture) : null,
  };
}

function queryParams(companyId: string): string {
  return `?companyId=${encodeURIComponent(companyId)}`;
}

// --- Public utilities (used by TripDialog, TripStopDialog) ---

export function splitTripScheduledStart(raw: unknown): { date: string; time: string } {
  if (raw != null && typeof raw === "object" && "toDate" in raw && typeof (raw as { toDate: () => Date }).toDate === "function") {
    try {
      const d = (raw as { toDate: () => Date }).toDate();
      if (d instanceof Date && !Number.isNaN(d.getTime())) {
        return splitDateIntoDateAndTime(d);
      }
    } catch { /* continue */ }
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

// --- Trips ---

export async function getTrips(): Promise<{ items: TripRecord[] }> {
  const companyId = requireActiveCompanyId();
  const data = await webFetch<{ items: Record<string, unknown>[] }>(
    `/transport/trips${queryParams(companyId)}`
  );
  return { items: (data.items ?? []).map((doc: Record<string, unknown>) => toTripRecord({ ...doc, id: doc.id })) };
}

export async function getTripsByFilters(filters: TripQueryFilters): Promise<{ items: TripRecord[] }> {
  return getTrips();
}

export async function getTripById(id: string): Promise<TripRecord | null> {
  const companyId = requireActiveCompanyId();
  const data = await webFetch<Record<string, unknown> | null>(
    `/transport/trips/${encodeURIComponent(id)}${queryParams(companyId)}`
  );
  return data ? toTripRecord({ ...data, id: data.id }) : null;
}

export async function addTrip(data: TripAddInput): Promise<string> {
  const companyId = requireActiveCompanyId();
  const accountId = await resolveActiveAccountId();
  const result = await webFetch<{ id: string }>(
    "/transport/trips",
    {
      method: "POST",
      body: JSON.stringify({
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
      }),
    }
  );
  return result.id;
}

export async function updateTrip(id: string, data: TripEditInput): Promise<void> {
  const companyId = requireActiveCompanyId();
  const patch: Record<string, unknown> = { companyId };
  if (data.code !== undefined) patch.code = data.code.trim();
  if (data.routeId !== undefined) patch.routeId = data.routeId.trim();
  if (data.route !== undefined) patch.route = data.route.trim();
  if (data.isExternalRoute !== undefined) patch.isExternalRoute = data.isExternalRoute;
  if (data.transportServiceId !== undefined) patch.transportServiceId = data.transportServiceId.trim();
  if (data.transportService !== undefined) patch.transportService = data.transportService.trim();
  if (data.clientId !== undefined) patch.clientId = data.clientId.trim();
  if (data.client !== undefined) patch.client = data.client.trim();
  if (data.vehicleId !== undefined) patch.vehicleId = data.vehicleId.trim();
  if (data.vehicle !== undefined) patch.vehicle = data.vehicle.trim();
  if (data.transportGuide !== undefined) patch.transportGuide = data.transportGuide.trim();
  if (data.status !== undefined) patch.status = data.status;
  if (data.scheduledStart !== undefined) patch.scheduledStart = data.scheduledStart?.trim() || null;
  await webFetch(`/transport/trips/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(patch) });
}

export async function deleteTrip(id: string): Promise<void> {
  const companyId = requireActiveCompanyId();
  await webFetch(`/transport/trips/${encodeURIComponent(id)}${queryParams(companyId)}`, { method: "DELETE" });
}

export async function getTripCascadeDeleteCounts(tripId: string): Promise<TripCascadeDeleteCounts> {
  const companyId = requireActiveCompanyId();
  const accountId = await resolveActiveAccountId();
  const configured = String(import.meta.env.VITE_WEB_BACKEND_BASE_URL ?? "").trim().replace(/\/$/, "");
  if (configured.endsWith("/web")) {
    throw new Error("VITE_WEB_BACKEND_BASE_URL no debe incluir /web");
  }
  const dbHost = configured ? `${configured}/web` : (import.meta.env.DEV ? "/web-backend" : "");
  if (!dbHost) throw new Error("Falta VITE_WEB_BACKEND_BASE_URL");
  const user = await import("~/lib/firebase").then(m => m.auth.currentUser);
  if (!user) throw new Error("Sesión no lista.");
  const token = await user.getIdToken(true);
  const base = `${dbHost}/transport/trip-cascade-counts/${encodeURIComponent(tripId)}?companyId=${encodeURIComponent(companyId)}&accountId=${encodeURIComponent(accountId)}`;
  const res = await fetch(base, { method: "GET", headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<TripCascadeDeleteCounts>;
}

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

export async function updateTripsStatus(ids: string[], status: TripStatus): Promise<void> {
  const companyId = requireActiveCompanyId();
  await Promise.all(
    ids.map((id) =>
      webFetch(`/transport/trips/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify({ companyId, status }),
      })
    )
  );
}

// --- TripStops ---

export async function getTripStops(tripId: string): Promise<{ items: TripStopRecord[] }> {
  const companyId = requireActiveCompanyId();
  const data = await webFetch<{ items: Record<string, unknown>[] }>(
    `/transport/trips/${encodeURIComponent(tripId)}/trip-stops${queryParams(companyId)}`
  );
  const items = (data.items ?? []).map((doc: Record<string, unknown>) => toTripStopRecord({ ...doc, id: doc.id })).sort((a, b) => a.order - b.order);
  return { items };
}

export async function getTripStop(tripId: string, stopId: string): Promise<TripStopRecord | null> {
  const companyId = requireActiveCompanyId();
  const data = await webFetch<Record<string, unknown> | null>(
    `/transport/trips/${encodeURIComponent(tripId)}/trip-stops/${encodeURIComponent(stopId)}${queryParams(companyId)}`
  );
  return data ? toTripStopRecord({ ...data, id: data.id as string }) : null;
}

export async function addTripStop(tripId: string, data: TripStopAddInput): Promise<void> {
  const companyId = requireActiveCompanyId();
  const accountId = await resolveActiveAccountId();
  const stopId = data.id.trim().toLowerCase().replace(/\s+/g, "-");
  await webFetch(
    `/transport/trips/${encodeURIComponent(tripId)}/trip-stops`,
    {
      method: "POST",
      body: JSON.stringify({
        companyId,
        accountId,
        id: stopId,
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
      }),
    }
  );
}

export async function updateTripStop(tripId: string, stopId: string, data: TripStopEditInput): Promise<void> {
  const companyId = requireActiveCompanyId();
  const patch: Record<string, unknown> = { companyId };
  if (data.order !== undefined) patch.order = Number(data.order) || 0;
  if (data.code !== undefined) patch.code = data.code.trim();
  if (data.type !== undefined) patch.type = data.type;
  if (data.name !== undefined) patch.name = data.name.trim();
  if (data.externalDocument !== undefined) patch.externalDocument = data.externalDocument.trim();
  if (data.districtId !== undefined) patch.districtId = data.districtId.trim();
  if (data.districtName !== undefined) patch.districtName = data.districtName.trim();
  if (data.observations !== undefined) patch.observations = data.observations.trim();
  if (data.lat !== undefined) patch.lat = Number(data.lat) || 0;
  if (data.lng !== undefined) patch.lng = Number(data.lng) || 0;
  if (data.status !== undefined) patch.status = data.status;
  if (data.plannedArrival !== undefined) patch.plannedArrival = data.plannedArrival?.trim() || null;
  if (data.actualArrival !== undefined) patch.actualArrival = data.actualArrival?.trim() || null;
  if (data.actualDeparture !== undefined) patch.actualDeparture = data.actualDeparture?.trim() || null;
  await webFetch(
    `/transport/trips/${encodeURIComponent(tripId)}/trip-stops/${encodeURIComponent(stopId)}`,
    { method: "PUT", body: JSON.stringify(patch) }
  );
}

export async function deleteTripStop(tripId: string, stopId: string): Promise<void> {
  const companyId = requireActiveCompanyId();
  await webFetch(
    `/transport/trips/${encodeURIComponent(tripId)}/trip-stops/${encodeURIComponent(stopId)}${queryParams(companyId)}`,
    { method: "DELETE" }
  );
}