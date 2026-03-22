export type DriverRelationshipType = "employee" | "resource";
export type DriverStatus = "available" | "assigned" | "inactive";

export interface DriverRecord {
    id: string;
    firstName: string;
    lastName: string;
    documentNo: string;
    documentTypeId: string;
    documentType: string;
    phoneNo: string;
    licenseNo: string;
    licenseCategory: string;
    licenseExpiration: string;
    relationshipType: DriverRelationshipType;
    employeeId: string | null;
    resourceId: string | null;
    status: DriverStatus;
    currentTripId: string;
}

export interface DriverAddInput {
    firstName: string;
    lastName: string;
    documentNo: string;
    documentTypeId: string;
    documentType: string;
    phoneNo: string;
    licenseNo: string;
    licenseCategory: string;
    licenseExpiration: string;
    relationshipType: DriverRelationshipType;
    employeeId: string | null;
    resourceId: string | null;
    status: DriverStatus;
    currentTripId: string;
}

export type DriverEditInput = Partial<Omit<DriverRecord, "id">>;
