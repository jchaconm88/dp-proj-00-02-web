import {
    getDocument,
    getCollection,
    addDocument,
    updateDocument,
    deleteDocument,
    deleteManyDocuments,
} from "~/lib/firestore.service";
import type {
    DriverRecord,
    DriverRelationshipType,
    DriverStatus,
    DriverAddInput,
    DriverEditInput,
} from "./drivers.types";

const COLLECTION = "drivers";

function toRecord(doc: { id: string } & Record<string, unknown>): DriverRecord {
    const relStr = doc.relationshipType as string;
    const relationshipType: DriverRelationshipType =
        relStr === "employee" ? "employee" : "contractor";

    const stStr = doc.status as string;
    const status: DriverStatus =
        stStr === "assigned" ? "assigned" :
            stStr === "inactive" ? "inactive" : "available";

    return {
        id: doc.id,
        firstName: String(doc.firstName ?? ""),
        lastName: String(doc.lastName ?? ""),
        documentNo: String(doc.documentNo ?? ""),
        documentId: String(doc.documentId ?? ""),
        phoneNo: String(doc.phoneNo ?? ""),
        licenseNo: String(doc.licenseNo ?? ""),
        licenseCategory: String(doc.licenseCategory ?? ""),
        licenseExpiration: String(doc.licenseExpiration ?? ""),
        relationshipType,
        employeeId: doc.employeeId != null && String(doc.employeeId).trim() !== "" ? String(doc.employeeId) : null,
        status,
        currentTripId: String(doc.currentTripId ?? ""),
    };
}

export async function getDriver(id: string): Promise<DriverRecord | null> {
    const doc = await getDocument<Record<string, unknown>>(COLLECTION, id);
    return doc ? toRecord(doc) : null;
}

export async function getDrivers(): Promise<{ items: DriverRecord[]; total: number }> {
    const list = await getCollection<Record<string, unknown>>(COLLECTION);
    const items = list.map(toRecord);
    return { items, total: items.length };
}

export async function addDriver(data: DriverAddInput): Promise<string> {
    return addDocument(COLLECTION, {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        documentNo: data.documentNo.trim(),
        documentId: data.documentId.trim(),
        phoneNo: data.phoneNo.trim(),
        licenseNo: data.licenseNo.trim(),
        licenseCategory: data.licenseCategory.trim(),
        licenseExpiration: data.licenseExpiration.trim() || null,
        relationshipType: data.relationshipType,
        employeeId: data.employeeId?.trim() || null,
        status: data.status,
        currentTripId: data.currentTripId.trim() || null,
    });
}

export async function updateDriver(id: string, data: DriverEditInput): Promise<void> {
    const payload: Record<string, unknown> = {};
    if (data.firstName !== undefined) payload.firstName = data.firstName;
    if (data.lastName !== undefined) payload.lastName = data.lastName;
    if (data.documentNo !== undefined) payload.documentNo = data.documentNo;
    if (data.documentId !== undefined) payload.documentId = data.documentId;
    if (data.phoneNo !== undefined) payload.phoneNo = data.phoneNo;
    if (data.licenseNo !== undefined) payload.licenseNo = data.licenseNo;
    if (data.licenseCategory !== undefined) payload.licenseCategory = data.licenseCategory;
    if (data.licenseExpiration !== undefined) payload.licenseExpiration = data.licenseExpiration || null;
    if (data.relationshipType !== undefined) payload.relationshipType = data.relationshipType;
    if (data.employeeId !== undefined) payload.employeeId = data.employeeId?.trim() || null;
    if (data.status !== undefined) payload.status = data.status;
    if (data.currentTripId !== undefined) payload.currentTripId = data.currentTripId?.trim() || null;
    await updateDocument(COLLECTION, id, payload);
}

export async function deleteDriver(id: string): Promise<void> {
    return deleteDocument(COLLECTION, id);
}

export async function deleteDrivers(ids: string[]): Promise<void> {
    return deleteManyDocuments(COLLECTION, ids);
}
