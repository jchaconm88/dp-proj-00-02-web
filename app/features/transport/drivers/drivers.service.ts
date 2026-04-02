import {
    getDocument,
    getCollection,
    addDocument,
    updateDocument,
    deleteDocument,
    deleteManyDocuments,
    getCollectionWithFilter,
} from "~/lib/firestore.service";
import { DRIVER_RELATIONSHIP, DRIVER_STATUS, parseStatus } from "~/constants/status-options";
import { requireActiveCompanyId } from "~/lib/tenant";
import type {
    DriverRecord,
    DriverRelationshipType,
    DriverStatus,
    DriverAddInput,
    DriverEditInput,
} from "./drivers.types";

const COLLECTION = "drivers";

function toRecord(doc: { id: string } & Record<string, unknown>): DriverRecord {
    const relationshipType = parseStatus(
      doc.relationshipType,
      DRIVER_RELATIONSHIP,
      "resource"
    ) as DriverRelationshipType;
    const status = parseStatus(doc.status, DRIVER_STATUS) as DriverStatus;

    return {
        id: doc.id,
        firstName: String(doc.firstName ?? ""),
        lastName: String(doc.lastName ?? ""),
        documentNo: String(doc.documentNo ?? ""),
        documentTypeId: String(doc.documentTypeId ?? doc.documentId ?? ""),
        documentType: String(doc.documentType ?? doc.documentTypeId ?? doc.documentId ?? ""),
        phoneNo: String(doc.phoneNo ?? ""),
        licenseNo: String(doc.licenseNo ?? ""),
        licenseCategory: String(doc.licenseCategory ?? ""),
        licenseExpiration: String(doc.licenseExpiration ?? ""),
        relationshipType,
        employeeId: doc.employeeId != null && String(doc.employeeId).trim() !== "" ? String(doc.employeeId) : null,
        resourceId: doc.resourceId != null && String(doc.resourceId).trim() !== "" ? String(doc.resourceId) : null,
        status,
        currentTripId: String(doc.currentTripId ?? ""),
    };
}

export async function getDriver(id: string): Promise<DriverRecord | null> {
    const doc = await getDocument<Record<string, unknown>>(COLLECTION, id);
    return doc ? toRecord(doc) : null;
}

export async function getDrivers(): Promise<{ items: DriverRecord[]; total: number }> {
    const companyId = requireActiveCompanyId();
    const list = await getCollectionWithFilter<Record<string, unknown>>(COLLECTION, "companyId", companyId);
    const items = list.map(toRecord);
    return { items, total: items.length };
}

export async function addDriver(data: DriverAddInput): Promise<string> {
    const companyId = requireActiveCompanyId();
    return addDocument(COLLECTION, {
        companyId,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        documentNo: data.documentNo.trim(),
        documentTypeId: data.documentTypeId.trim(),
        documentType: data.documentType.trim(),
        phoneNo: data.phoneNo.trim(),
        licenseNo: data.licenseNo.trim(),
        licenseCategory: data.licenseCategory.trim(),
        licenseExpiration: data.licenseExpiration.trim() || null,
        relationshipType: data.relationshipType,
        employeeId: data.employeeId?.trim() || null,
        resourceId: data.resourceId?.trim() || null,
        status: data.status,
        currentTripId: data.currentTripId.trim() || null,
    });
}

export async function updateDriver(id: string, data: DriverEditInput): Promise<void> {
    const payload: Record<string, unknown> = {};
    if (data.firstName !== undefined) payload.firstName = data.firstName;
    if (data.lastName !== undefined) payload.lastName = data.lastName;
    if (data.documentNo !== undefined) payload.documentNo = data.documentNo;
    if (data.documentTypeId !== undefined) payload.documentTypeId = data.documentTypeId;
    if (data.documentType !== undefined) payload.documentType = data.documentType;
    if (data.phoneNo !== undefined) payload.phoneNo = data.phoneNo;
    if (data.licenseNo !== undefined) payload.licenseNo = data.licenseNo;
    if (data.licenseCategory !== undefined) payload.licenseCategory = data.licenseCategory;
    if (data.licenseExpiration !== undefined) payload.licenseExpiration = data.licenseExpiration || null;
    if (data.relationshipType !== undefined) payload.relationshipType = data.relationshipType;
    if (data.employeeId !== undefined) payload.employeeId = data.employeeId?.trim() || null;
    if (data.resourceId !== undefined) payload.resourceId = data.resourceId?.trim() || null;
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
