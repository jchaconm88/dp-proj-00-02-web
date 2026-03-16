export type TripStatus = "scheduled" | "in_progress" | "completed" | "cancelled";

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
  driverId: string;
  driver: string;
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
  driverId: string;
  driver: string;
  vehicleId: string;
  vehicle: string;
  transportGuide: string;
  status: TripStatus;
  scheduledStart: string;
}

export type TripEditInput = Partial<Omit<TripRecord, "id">>;

export type TripStopType = "origin" | "pickup" | "delivery" | "checkpoint" | "rest";
export type TripStopStatus = "pending" | "arrived" | "completed" | "skipped";

export interface TripStopRecord {
  id: string;
  order: number;
  type: TripStopType;
  name: string;
  lat: number;
  lng: number;
  status: TripStopStatus;
  plannedArrival: string;
  actualArrival: string | null;
  actualDeparture: string | null;
}

export interface TripStopAddInput {
  id: string;
  order: number;
  type: TripStopType;
  name: string;
  lat: number;
  lng: number;
  status: TripStopStatus;
  plannedArrival: string;
  actualArrival: string | null;
  actualDeparture: string | null;
}

export type TripStopEditInput = Partial<Omit<TripStopRecord, "id">>;
