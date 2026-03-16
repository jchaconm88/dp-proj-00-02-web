import {
    getDocument,
    getCollection,
    addDocument,
    updateDocument,
    deleteDocument,
    deleteManyDocuments,
    getSubcollection,
    getDocumentFromSubcollection,
    addDocumentToSubcollection,
    updateDocumentInSubcollection,
    deleteDocumentFromSubcollection,
} from "~/lib/firestore.service";
import type {
    ClientRecord,
    ClientStatus,
    ClientContact,
    ClientBilling,
    ClientLogistics,
    PaymentCondition,
    ClientAddInput,
    ClientEditInput,
    LocationType,
    ClientLocationGeo,
    ClientLocationDeliveryWindow,
    ClientLocationRecord,
    ClientLocationAddInput,
    ClientLocationEditInput,
} from "./clients.types";

const COLLECTION = "clients";

function defaultContact(): ClientContact {
    return { contactName: "", email: "", phone: "" };
}

function defaultBilling(): ClientBilling {
    return { creditDays: 0, creditLimit: 0, currency: "PEN", paymentCondition: "transfer" };
}

function defaultLogistics(): ClientLogistics {
    return { priority: 0, requiresAppointment: false, defaultServiceTimeMin: 0 };
}

function toContact(v: unknown): ClientContact {
    if (v && typeof v === "object" && !Array.isArray(v)) {
        const o = v as Record<string, unknown>;
        return {
            contactName: String(o.contactName ?? ""),
            email: String(o.email ?? ""),
            phone: String(o.phone ?? ""),
        };
    }
    return defaultContact();
}

function toBilling(v: unknown): ClientBilling {
    if (v && typeof v === "object" && !Array.isArray(v)) {
        const o = v as Record<string, unknown>;
        const pay = o.paymentCondition as string;
        const paymentCondition: PaymentCondition =
            pay === "cash" || pay === "credit" || pay === "check" ? pay : "transfer";
        return {
            creditDays: Number(o.creditDays) || 0,
            creditLimit: Number(o.creditLimit) || 0,
            currency: String(o.currency ?? "PEN"),
            paymentCondition,
        };
    }
    return defaultBilling();
}

function toLogistics(v: unknown): ClientLogistics {
    if (v && typeof v === "object" && !Array.isArray(v)) {
        const o = v as Record<string, unknown>;
        return {
            priority: Number(o.priority) || 0,
            requiresAppointment: o.requiresAppointment === true,
            defaultServiceTimeMin: Number(o.defaultServiceTimeMin) || 0,
        };
    }
    return defaultLogistics();
}

function toRecord(doc: { id: string } & Record<string, unknown>): ClientRecord {
    const st = doc.status as string;
    const status: ClientStatus = st === "inactive" || st === "suspended" ? st : "active";
    return {
        id: doc.id,
        code: String(doc.code ?? ""),
        businessName: String(doc.businessName ?? ""),
        commercialName: String(doc.commercialName ?? ""),
        documentTypeId: String(doc.documentTypeId ?? ""),
        documentType: String(doc.documentType ?? ""),
        documentNumber: String(doc.documentNumber ?? ""),
        contact: toContact(doc.contact),
        billing: toBilling(doc.billing),
        logistics: toLogistics(doc.logistics),
        status,
    };
}

export async function getClient(id: string): Promise<ClientRecord | null> {
    const d = await getDocument<Record<string, unknown>>(COLLECTION, id);
    return d ? toRecord(d) : null;
}

export async function getClients(): Promise<{ items: ClientRecord[]; total: number }> {
    const list = await getCollection<Record<string, unknown>>(COLLECTION);
    const items = list.map(toRecord);
    return { items, total: items.length };
}

export async function addClient(data: ClientAddInput): Promise<string> {
    return addDocument(COLLECTION, {
        code: data.code.trim(),
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
    });
}

export async function updateClient(id: string, data: ClientEditInput): Promise<void> {
    const payload: Record<string, unknown> = {};
    if (data.code !== undefined) payload.code = data.code;
    if (data.businessName !== undefined) payload.businessName = data.businessName;
    if (data.commercialName !== undefined) payload.commercialName = data.commercialName;
    if (data.documentTypeId !== undefined) payload.documentTypeId = data.documentTypeId;
    if (data.documentType !== undefined) payload.documentType = data.documentType;
    if (data.documentNumber !== undefined) payload.documentNumber = data.documentNumber;
    if (data.contact !== undefined) payload.contact = data.contact;
    if (data.billing !== undefined) payload.billing = data.billing;
    if (data.logistics !== undefined) payload.logistics = data.logistics;
    if (data.status !== undefined) payload.status = data.status;
    await updateDocument(COLLECTION, id, payload);
}

export async function deleteClient(id: string): Promise<void> {
    return deleteDocument(COLLECTION, id);
}

export async function deleteClients(ids: string[]): Promise<void> {
    return deleteManyDocuments(COLLECTION, ids);
}

const SUBCOLLECTION = "locations";

function toGeo(v: unknown): ClientLocationGeo {
    if (v && typeof v === "object" && !Array.isArray(v)) {
        const o = v as Record<string, unknown>;
        const lat = o.latitude ?? (o as { latitude?: number }).latitude;
        const lng = o.longitude ?? (o as { longitude?: number }).longitude;
        if (typeof lat === "number" && typeof lng === "number") return { latitude: lat, longitude: lng };
    }
    if (v && typeof v === "object" && "latitude" in v && "longitude" in v) {
        const gp = v as { latitude: number; longitude: number };
        return { latitude: gp.latitude, longitude: gp.longitude };
    }
    return { latitude: 0, longitude: 0 };
}

function toDeliveryWindow(v: unknown): ClientLocationDeliveryWindow {
    if (v && typeof v === "object" && !Array.isArray(v)) {
        const o = v as Record<string, unknown>;
        return {
            start: String(o.start ?? "08:00"),
            end: String(o.end ?? "16:00"),
        };
    }
    return { start: "08:00", end: "16:00" };
}

function toLocationRecord(doc: { id: string } & Record<string, unknown>): ClientLocationRecord {
    const t = doc.type as string;
    const type: LocationType = t === "store" || t === "office" || t === "plant" ? t as LocationType : "warehouse";
    const geo = toGeo(doc.geo ?? doc.geoPoint);
    return {
        id: doc.id,
        name: String(doc.name ?? ""),
        type,
        address: String(doc.address ?? ""),
        district: String(doc.district ?? ""),
        city: String(doc.city ?? ""),
        country: String(doc.country ?? ""),
        geo,
        deliveryWindow: toDeliveryWindow(doc.deliveryWindow),
        serviceTimeMin: Number(doc.serviceTimeMin) || 0,
        active: doc.active === true,
    };
}

export async function getClientLocations(clientId: string): Promise<{ items: ClientLocationRecord[]; total: number }> {
    const list = await getSubcollection<Record<string, unknown>>(COLLECTION, clientId, SUBCOLLECTION);
    const items = list.map(toLocationRecord);
    return { items, total: items.length };
}

export async function getClientLocation(clientId: string, locationId: string): Promise<ClientLocationRecord | null> {
    const d = await getDocumentFromSubcollection<Record<string, unknown>>(COLLECTION, clientId, SUBCOLLECTION, locationId);
    return d ? toLocationRecord(d) : null;
}

export async function addClientLocation(clientId: string, data: ClientLocationAddInput): Promise<string> {
    const lat = Number(data.geo.latitude) || 0;
    const lng = Number(data.geo.longitude) || 0;
    return addDocumentToSubcollection(COLLECTION, clientId, SUBCOLLECTION, {
        name: data.name.trim(),
        type: data.type,
        address: data.address.trim(),
        district: data.district.trim(),
        city: data.city.trim(),
        country: data.country.trim(),
        geo: { latitude: lat, longitude: lng },
        deliveryWindow: {
            start: data.deliveryWindow.start.trim() || "08:00",
            end: data.deliveryWindow.end.trim() || "16:00",
        },
        serviceTimeMin: Number(data.serviceTimeMin) || 0,
        active: data.active,
    });
}

export async function updateClientLocation(clientId: string, locationId: string, data: ClientLocationEditInput): Promise<void> {
    const payload: Record<string, unknown> = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.type !== undefined) payload.type = data.type;
    if (data.address !== undefined) payload.address = data.address;
    if (data.district !== undefined) payload.district = data.district;
    if (data.city !== undefined) payload.city = data.city;
    if (data.country !== undefined) payload.country = data.country;
    if (data.geo !== undefined) {
        const lat = Number(data.geo.latitude) || 0;
        const lng = Number(data.geo.longitude) || 0;
        payload.geo = { latitude: lat, longitude: lng };
    }
    if (data.deliveryWindow !== undefined) payload.deliveryWindow = data.deliveryWindow;
    if (data.serviceTimeMin !== undefined) payload.serviceTimeMin = Number(data.serviceTimeMin) || 0;
    if (data.active !== undefined) payload.active = data.active;
    await updateDocumentInSubcollection(COLLECTION, clientId, SUBCOLLECTION, locationId, payload);
}

export async function deleteClientLocations(clientId: string, locationIds: string[]): Promise<void> {
    for (const id of locationIds) {
        await deleteDocumentFromSubcollection(COLLECTION, clientId, SUBCOLLECTION, id);
    }
}
