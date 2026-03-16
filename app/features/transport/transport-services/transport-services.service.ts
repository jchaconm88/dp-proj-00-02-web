import {
    getDocument,
    getCollection,
    addDocument,
    updateDocument,
    deleteDocument,
    deleteManyDocuments,
} from "~/lib/firestore.service";
import type {
    TransportServiceRecord,
    TransportServiceAddInput,
    TransportServiceEditInput,
    ServiceTypeCategory,
    CalculationType,
} from "./transport-services.types";

const COLLECTION = "transport-services";

function toCalculationType(v: unknown): CalculationType {
    const s = String(v ?? "").toLowerCase();
    if (
        s === "zone" ||
        s === "per_km" ||
        s === "per_weight" ||
        s === "per_volume" ||
        s === "percentage" ||
        s === "formula"
    )
        return s as CalculationType;
    return "fixed";
}

function toServiceTypeCategory(v: unknown): ServiceTypeCategory {
    const s = String(v ?? "").toLowerCase();
    if (s === "express" || s === "dedicated") return s as ServiceTypeCategory;
    return "distribution";
}

function toRecord(doc: { id: string } & Record<string, unknown>): TransportServiceRecord {
    return {
        id: doc.id,
        code: String(doc.code ?? ""),
        name: String(doc.name ?? ""),
        description: String(doc.description ?? ""),
        category: toServiceTypeCategory(doc.category),
        defaultServiceTimeMin: Number(doc.defaultServiceTimeMin) || 0,
        calculationType: toCalculationType(doc.calculationType),
        requiresAppointment: !!doc.requiresAppointment,
        allowConsolidation: doc.allowConsolidation !== false, // Defaults to true in old system if undefined? Actually, we'll just cast boolean
        active: doc.active !== false,
    };
}

export async function getTransportService(id: string): Promise<TransportServiceRecord | null> {
    const doc = await getDocument<Record<string, unknown>>(COLLECTION, id);
    return doc ? toRecord(doc) : null;
}

export async function getTransportServices(): Promise<{ items: TransportServiceRecord[]; total: number }> {
    const list = await getCollection<Record<string, unknown>>(COLLECTION);
    const items = list.map(toRecord);
    return { items, total: items.length };
}

export async function addTransportService(data: TransportServiceAddInput): Promise<string> {
    return addDocument(COLLECTION, {
        code: data.code.trim(),
        name: data.name.trim(),
        description: (data.description ?? "").trim(),
        category: data.category,
        defaultServiceTimeMin: Number(data.defaultServiceTimeMin) || 0,
        calculationType: data.calculationType,
        requiresAppointment: !!data.requiresAppointment,
        allowConsolidation: data.allowConsolidation !== false,
        active: data.active !== false,
    });
}

export async function updateTransportService(id: string, data: TransportServiceEditInput): Promise<void> {
    const payload: Record<string, unknown> = {};
    if (data.code !== undefined) payload.code = String(data.code).trim();
    if (data.name !== undefined) payload.name = String(data.name).trim();
    if (data.description !== undefined) payload.description = String(data.description).trim();
    if (data.category !== undefined) payload.category = data.category;
    if (data.defaultServiceTimeMin !== undefined) payload.defaultServiceTimeMin = Number(data.defaultServiceTimeMin) || 0;
    if (data.calculationType !== undefined) payload.calculationType = data.calculationType;
    if (data.requiresAppointment !== undefined) payload.requiresAppointment = !!data.requiresAppointment;
    if (data.allowConsolidation !== undefined) payload.allowConsolidation = !!data.allowConsolidation;
    if (data.active !== undefined) payload.active = !!data.active;
    await updateDocument(COLLECTION, id, payload);
}

export async function deleteTransportService(id: string): Promise<void> {
    return deleteDocument(COLLECTION, id);
}

export async function deleteTransportServices(ids: string[]): Promise<void> {
    return deleteManyDocuments(COLLECTION, ids);
}
