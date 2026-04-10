import type { TripStatus } from "~/constants/status-options";

export type { TripStatus };

export interface TripRecord {
  id: string;
  code: string;
  routeId: string;
  route: string;
  isExternalRoute: boolean;
  transportServiceId: string;
  transportService: string;
  clientId: string;
  client: string;
  vehicleId: string;
  vehicle: string;
  transportGuide: string;
  status: TripStatus;
  scheduledStart: string;
}

export interface TripAddInput {
  code: string;
  routeId: string;
  route: string;
  isExternalRoute: boolean;
  transportServiceId: string;
  transportService: string;
  clientId: string;
  client: string;
  vehicleId: string;
  vehicle: string;
  transportGuide: string;
  status: TripStatus;
  scheduledStart: string;
}

export type TripEditInput = Partial<Omit<TripRecord, "id">>;

export interface TripQueryFilters {
  scheduledStartFrom?: string;
  scheduledStartTo?: string;
  status?: TripStatus[];
  vehicleIds?: string[];
  transportServiceIds?: string[];
}

export type TripStopType = "origin" | "pickup" | "delivery" | "checkpoint" | "rest";
export type TripStopStatus = "pending" | "arrived" | "completed" | "skipped";

export interface TripStopRecord {
  id: string;
  /** Código legible (p. ej. STOP-003); usado en asignaciones / alcance. */
  code: string;
  order: number;
  type: TripStopType;
  name: string;
  externalDocument: string;
  /** UBIGEO (6 dígitos) según catálogo en `app/data/peru-districts.json`. */
  districtId: string;
  /** Nombre legible del distrito (denormalizado para listados / reportes). */
  districtName: string;
  observations: string;
  lat: number;
  lng: number;
  status: TripStopStatus;
  plannedArrival: string;
  actualArrival: string | null;
  actualDeparture: string | null;
}

export interface TripStopAddInput {
  id: string;
  code?: string;
  order: number;
  type: TripStopType;
  name: string;
  externalDocument: string;
  districtId: string;
  districtName: string;
  observations: string;
  lat: number;
  lng: number;
  status: TripStopStatus;
  plannedArrival: string;
  actualArrival: string | null;
  actualDeparture: string | null;
}

export type TripStopEditInput = Partial<Omit<TripStopRecord, "id">>;

/** Conteos de registros que el servidor elimina en cascada al borrar viaje(s). */
export interface TripCascadeDeleteCounts {
  /** Documentos en `trips/{id}/tripStops`. */
  tripStops: number;
  tripAssignments: number;
  tripCharges: number;
  tripCosts: number;
}
