export type ClientStatus = "active" | "inactive" | "suspended";
export type PaymentCondition = "transfer" | "cash" | "credit" | "check";

export interface ClientContact {
    contactName: string;
    email: string;
    phone: string;
}

export interface ClientBilling {
    creditDays: number;
    creditLimit: number;
    currency: string;
    paymentCondition: PaymentCondition;
}

export interface ClientLogistics {
    priority: number;
    requiresAppointment: boolean;
    defaultServiceTimeMin: number;
}

export interface ClientRecord {
    id: string;
    code: string;
    businessName: string;
    commercialName: string;
    documentTypeId: string;
    documentType: string;
    documentNumber: string;
    contact: ClientContact;
    billing: ClientBilling;
    logistics: ClientLogistics;
    status: ClientStatus;
}

export interface ClientAddInput {
    code: string;
    businessName: string;
    commercialName: string;
    documentTypeId: string;
    documentType: string;
    documentNumber: string;
    contact: ClientContact;
    billing: ClientBilling;
    logistics: ClientLogistics;
    status: ClientStatus;
}

export type ClientEditInput = Partial<Omit<ClientRecord, "id">>;

export type LocationType = 'warehouse' | 'store' | 'office' | 'plant';

export interface ClientLocationGeo {
  latitude: number;
  longitude: number;
}

export interface ClientLocationDeliveryWindow {
  start: string;
  end: string;
}

export interface ClientLocationRecord {
  id: string;
  name: string;
  type: LocationType;
  address: string;
  district: string;
  city: string;
  country: string;
  geo: ClientLocationGeo;
  deliveryWindow: ClientLocationDeliveryWindow;
  serviceTimeMin: number;
  active: boolean;
}

export interface ClientLocationAddInput {
  name: string;
  type: LocationType;
  address: string;
  district: string;
  city: string;
  country: string;
  geo: ClientLocationGeo;
  deliveryWindow: ClientLocationDeliveryWindow;
  serviceTimeMin: number;
  active: boolean;
}

export type ClientLocationEditInput = Partial<Omit<ClientLocationRecord, 'id'>>;
