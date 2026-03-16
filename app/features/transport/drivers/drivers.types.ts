export type DriverRelationshipType = "employee" | "contractor";
export type DriverStatus = "available" | "assigned" | "inactive";

export interface DriverRecord {
    id: string;
    firstName: string;
    lastName: string;
    documentNo: string;
    documentId: string;
    phoneNo: string;
    licenseNo: string;
    licenseCategory: string;
    licenseExpiration: string;
    relationshipType: DriverRelationshipType;
    employeeId: string | null;
    status: DriverStatus;
    currentTripId: string;
}

export interface DriverAddInput {
    firstName: string;
    lastName: string;
    documentNo: string;
    documentId: string;
    phoneNo: string;
    licenseNo: string;
    licenseCategory: string;
    licenseExpiration: string;
    relationshipType: DriverRelationshipType;
    employeeId: string | null;
    status: DriverStatus;
    currentTripId: string;
}

export type DriverEditInput = Partial<Omit<DriverRecord, "id">>;
