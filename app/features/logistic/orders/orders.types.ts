export type OrderStatus =
  | "pending"
  | "confirmed"
  | "in_progress"
  | "delivered"
  | "cancelled";

export interface OrderLocation {
  latitude: number;
  longitude: number;
}

export interface OrderRecord {
  id: string;
  code: string;
  clientId: string;
  client: string;
  deliveryAddress: string;
  location: OrderLocation;
  deliveryWindowStart: string;
  deliveryWindowEnd: string;
  weight: number;
  volume: number;
  status: OrderStatus;
}

export interface OrderAddInput {
  code: string;
  clientId: string;
  client: string;
  deliveryAddress: string;
  location: OrderLocation;
  deliveryWindowStart: string;
  deliveryWindowEnd: string;
  weight: number;
  volume: number;
  status: OrderStatus;
}

export type OrderEditInput = Partial<Omit<OrderRecord, "id">>;
