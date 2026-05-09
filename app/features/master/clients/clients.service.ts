import { webFetch } from "~/lib/backend-client";
import {
    CLIENT_LOCATION_TYPE,
    CLIENT_STATUS,
    parseStatus,
    PAYMENT_CONDITION,
    statusDefaultKey,
} from "~/constants/status-options";
import { requireActiveCompanyId } from "~/lib/tenant";
import type {
    ClientRecord,
    ClientStatus,
    ClientContact,
    ClientBilling,
    ClientLogistics,
    PaymentCondition,
    ClientAddInput,
    ClientLocationRecord,
    ClientLocationAddInput,
    ClientLocationEditInput,
    LocationType,
    ClientLocationGeo,
    ClientLocationDeliveryWindow,
} from "./clients.types";

function toRecord(d: Record<string, unknown>): ClientRecord {
    const status = parseStatus(d.status, CLIENT_STATUS) as ClientStatus;
    const contact = d.contact && typeof d.contact === "object" ? (d.contact as Record<string, unknown>) : {};
    const billing = d.billing && typeof d.billing === "object" ? (d.billing as Record<string, unknown>) : {};
    const logistics = d.logistics && typeof d.logistics === "object" ? (d.logistics as Record<string, unknown>) : {};
    const fiscal = d.fiscal && typeof d.fiscal === "object" ? (d.fiscal as Record<string, unknown>) : null;
    const paymentCondition = parseStatus(billing.paymentCondition, PAYMENT_CONDITION) as PaymentCondition;
    return {
        id: String(d.id ?? ""),
        code: String(d.code ?? ""),
        businessName: String(d.businessName ?? ""),
        commercialName: String(d.commercialName ?? ""),
        documentTypeId: String(d.documentTypeId ?? ""),
        documentType: String(d.documentType ?? ""),
        documentNumber: String(d.documentNumber ?? ""),
        contact: {
            contactName: String(contact.contactName ?? ""),
            email: String(contact.email ?? ""),
            phone: String(contact.phone ?? ""),
        },
        billing: {
            creditDays: Number(billing.creditDays) || 0,
            creditLimit: Number(billing.creditLimit) || 0,
            currency: String(billing.currency ?? "PEN"),
            paymentCondition,
        },
        logistics: {
            priority: Number(logistics.priority) || 0,
            requiresAppointment: logistics.requiresAppointment === true,
            defaultServiceTimeMin: Number(logistics.defaultServiceTimeMin) || 0,
        },
        status,
        fiscal: fiscal ? {
            address: String(fiscal.address ?? "").trim(),
            district: String(fiscal.district ?? "").trim(),
            city: String(fiscal.city ?? "").trim(),
            country: String(fiscal.country ?? "PE").trim(),
            ubigeo: String(fiscal.ubigeo ?? "").trim(),
        } : undefined,
    };
}

export async function getClients(): Promise<{ items: ClientRecord[]; total: number }> {
    const companyId = requireActiveCompanyId();
    const raw = await webFetch<{ items: Record<string, unknown>[]; total: number }>(
        `/master/clients?companyId=${encodeURIComponent(companyId)}`
    );
    return {
        items: raw.items.map(toRecord),
        total: raw.total ?? raw.items.length,
    };
}

export async function getClient(id: string): Promise<ClientRecord | null> {
    const companyId = requireActiveCompanyId();
    const raw = await webFetch<Record<string, unknown> | null>(
        `/master/clients/${encodeURIComponent(id)}?companyId=${encodeURIComponent(companyId)}`
    );
    if (!raw) return null;
    return toRecord(raw);
}

export async function addClient(data: ClientAddInput): Promise<string> {
    const companyId = requireActiveCompanyId();
    const res = await webFetch<{ id?: string }>("/master/clients", {
        method: "POST",
        body: JSON.stringify({
            companyId,
            code: data.code?.trim(),
            businessName: data.businessName.trim(),
            commercialName: data.commercialName.trim(),
            documentTypeId: data.documentTypeId.trim(),
            documentType: data.documentType.trim(),
            documentNumber: data.documentNumber.trim(),
            contact: {
                contactName: data.contact.contactName.trim(),
                email: data.contact.email.trim(),
                phone: data.contact.phone.trim(),
            },
            billing: {
                creditDays: Number(data.billing.creditDays) || 0,
                creditLimit: Number(data.billing.creditLimit) || 0,
                currency: data.billing.currency.trim() || "PEN",
                paymentCondition: data.billing.paymentCondition,
            },
            logistics: {
                priority: Number(data.logistics.priority) || 0,
                requiresAppointment: data.logistics.requiresAppointment,
                defaultServiceTimeMin: Number(data.logistics.defaultServiceTimeMin) || 0,
            },
            status: data.status,
            fiscal: data.fiscal ? {
                address: data.fiscal.address.trim(),
                district: data.fiscal.district.trim(),
                city: data.fiscal.city.trim(),
                country: data.fiscal.country.trim() || "PE",
                ubigeo: data.fiscal.ubigeo.trim(),
            } : undefined,
        }),
    });
    return String(res?.id ?? "");
}

export async function updateClient(id: string, data: Partial<ClientAddInput>): Promise<void> {
    const companyId = requireActiveCompanyId();
    await webFetch(`/master/clients/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify({ companyId, ...data }),
    });
}

export async function deleteClient(id: string): Promise<void> {
    const companyId = requireActiveCompanyId();
    await webFetch(`/master/clients/${encodeURIComponent(id)}?companyId=${encodeURIComponent(companyId)}`, {
        method: "DELETE",
    });
}

// ===== Client Locations =====

function toLocationRecord(d: Record<string, unknown>): ClientLocationRecord {
    const type = parseStatus(d.type, CLIENT_LOCATION_TYPE) as LocationType;
    const geo = (d.geo && typeof d.geo === "object" ? d.geo : { latitude: 0, longitude: 0 }) as { latitude: number; longitude: number };
    const deliveryWindow = (d.deliveryWindow && typeof d.deliveryWindow === "object"
        ? d.deliveryWindow
        : { start: "08:00", end: "16:00" }) as { start: string; end: string };
    return {
        id: String(d.id ?? ""),
        name: String(d.name ?? ""),
        type,
        address: String(d.address ?? ""),
        district: String(d.district ?? ""),
        city: String(d.city ?? ""),
        country: String(d.country ?? ""),
        geo: {
            latitude: Number(geo.latitude) || 0,
            longitude: Number(geo.longitude) || 0,
        },
        deliveryWindow: {
            start: String(deliveryWindow.start || "08:00"),
            end: String(deliveryWindow.end || "16:00"),
        },
        serviceTimeMin: Number(d.serviceTimeMin) || 0,
        active: d.active === true,
    };
}

export async function getClientLocations(clientId: string): Promise<{ items: ClientLocationRecord[]; total: number }> {
    const companyId = requireActiveCompanyId();
    const raw = await webFetch<{ items: Record<string, unknown>[]; total: number }>(
        `/master/clients/${encodeURIComponent(clientId)}/locations?companyId=${encodeURIComponent(companyId)}`
    );
    return {
        items: raw.items.map(toLocationRecord),
        total: raw.total ?? raw.items.length,
    };
}

export async function getClientLocation(clientId: string, locationId: string): Promise<ClientLocationRecord | null> {
    const companyId = requireActiveCompanyId();
    const raw = await webFetch<Record<string, unknown> | null>(
        `/master/clients/${encodeURIComponent(clientId)}/locations/${encodeURIComponent(locationId)}?companyId=${encodeURIComponent(companyId)}`
    );
    if (!raw) return null;
    return toLocationRecord(raw);
}

export async function addClientLocation(clientId: string, data: ClientLocationAddInput): Promise<string> {
    const companyId = requireActiveCompanyId();
    const res = await webFetch<{ id?: string }>(
        `/master/clients/${encodeURIComponent(clientId)}/locations`,
        {
            method: "POST",
            body: JSON.stringify({
                companyId,
                name: data.name.trim(),
                type: data.type,
                address: data.address.trim(),
                district: data.district.trim(),
                city: data.city.trim(),
                country: data.country.trim(),
                geo: {
                    latitude: Number(data.geo.latitude) || 0,
                    longitude: Number(data.geo.longitude) || 0,
                },
                deliveryWindow: {
                    start: data.deliveryWindow.start.trim() || "08:00",
                    end: data.deliveryWindow.end.trim() || "16:00",
                },
                serviceTimeMin: Number(data.serviceTimeMin) || 0,
                active: data.active,
            }),
        }
    );
    return String(res?.id ?? "");
}

export async function updateClientLocation(clientId: string, locationId: string, data: ClientLocationEditInput): Promise<void> {
    const companyId = requireActiveCompanyId();
    await webFetch(
        `/master/clients/${encodeURIComponent(clientId)}/locations/${encodeURIComponent(locationId)}`,
        {
            method: "PUT",
            body: JSON.stringify({ companyId, ...data }),
        }
    );
}

export async function deleteClientLocation(clientId: string, locationId: string): Promise<void> {
    const companyId = requireActiveCompanyId();
    await webFetch(
        `/master/clients/${encodeURIComponent(clientId)}/locations/${encodeURIComponent(locationId)}?companyId=${encodeURIComponent(companyId)}`,
        { method: "DELETE" }
    );
}