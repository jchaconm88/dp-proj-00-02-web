import { webFetch } from "~/lib/backend-client";
import { requireActiveCompanyId } from "~/lib/tenant";
import { DRIVER_RELATIONSHIP, DRIVER_STATUS } from "~/constants/status-options";
import type {
    DriverRecord,
    DriverRelationshipType,
    DriverStatus,
    DriverAddInput,
    DriverEditInput,
} from "./drivers.types";

function toRecord(data: Record<string, unknown> & { id?: string }): DriverRecord {
    const relationshipType = DRIVER_RELATIONSHIP.includes(String(data.relationshipType))
        ? (data.relationshipType as DriverRelationshipType)
        : "resource";
    const status = DRIVER_STATUS.includes(String(data.status))
        ? (data.status as DriverStatus)
        : "available";

    return {
        id: String(data.id ?? ""),
        firstName: String(data.firstName ?? ""),
        lastName: String(data.lastName ?? ""),
        documentNo: String(data.documentNo ?? ""),
        documentTypeId: String(data.documentTypeId ?? ""),
        documentType: String(data.documentType ?? ""),
        phoneNo: String(data.phoneNo ?? ""),
        licenseNo: String(data.licenseNo ?? ""),
        licenseCategory: String(data.licenseCategory ?? ""),
        licenseExpiration: String(data.licenseExpiration ?? ""),
        relationshipType,
        employeeId: data.employeeId != null && String(data.employeeId).trim() !== "" ? String(data.employeeId) : null,
        resourceId: data.resourceId != null && String(data.resourceId).trim() !== "" ? String(data.resourceId) : null,
        status,
        currentTripId: String(data.currentTripId ?? ""),
    };
}

export async function getDriver(id: string): Promise<DriverRecord | null> {
    const companyId = requireActiveCompanyId();
    const data = await webFetch<Record<string, unknown> | null>(
        `/transport/drivers/${encodeURIComponent(id)}?companyId=${encodeURIComponent(companyId)}`
    );
    return data ? toRecord(data) : null;
}

export async function getDrivers(): Promise<{ items: DriverRecord[]; total: number }> {
    const companyId = requireActiveCompanyId();
    const res = await webFetch<{ items: Record<string, unknown>[]; total: number }>(
        `/transport/drivers?companyId=${encodeURIComponent(companyId)}`
    );
    const items = (res.items ?? []).map(toRecord);
    return { items, total: res.total ?? items.length };
}

export async function addDriver(data: DriverAddInput): Promise<string> {
    const companyId = requireActiveCompanyId();
    const res = await webFetch<{ id: string }>("/transport/drivers", {
        method: "POST",
        body: JSON.stringify({
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
        }),
    });
    return res.id;
}

export async function updateDriver(id: string, data: DriverEditInput): Promise<void> {
    const companyId = requireActiveCompanyId();
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
    await webFetch(`/transport/drivers/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify({ companyId, ...payload }),
    });
}

export async function deleteDriver(id: string): Promise<void> {
    const companyId = requireActiveCompanyId();
    await webFetch(`/transport/drivers/${encodeURIComponent(id)}?companyId=${encodeURIComponent(companyId)}`, {
        method: "DELETE",
    });
}