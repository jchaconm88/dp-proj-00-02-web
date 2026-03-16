export interface RouteRecord {
  id: string;
  name: string;
  code: string;
  planId: string;
  planCode: string;
  totalEstimatedKm: number;
  totalEstimatedHours: number;
  active: boolean;
}

export interface RouteAddInput {
  name: string;
  code: string;
  planId: string;
  planCode: string;
  totalEstimatedKm: number;
  totalEstimatedHours: number;
  active: boolean;
}

export type RouteEditInput = Partial<Omit<RouteRecord, "id">>;

export type StopType = "origin" | "pickup" | "delivery" | "checkpoint" | "rest";
export type StopStatus = "pending" | "arrived" | "completed" | "skipped";

export interface StopRecord {
  id: string;
  orderId: string;
  sequence: number;
  eta: string;
  arrivalWindowStart: string;
  arrivalWindowEnd: string;
  status: StopStatus;
  order: number;
  type: StopType;
  name: string;
  address: string;
  lat: number;
  lng: number;
  estimatedArrivalOffsetMinutes: number;
}

export interface StopAddInput {
  id: string;
  orderId: string;
  sequence: number;
  eta: string;
  arrivalWindowStart: string;
  arrivalWindowEnd: string;
  status: StopStatus;
  order: number;
  type: StopType;
  name: string;
  address: string;
  lat: number;
  lng: number;
  estimatedArrivalOffsetMinutes: number;
}

export type StopEditInput = Partial<Omit<StopRecord, "id">>;
