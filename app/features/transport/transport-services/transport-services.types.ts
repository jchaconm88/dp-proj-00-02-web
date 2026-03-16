export type ServiceTypeCategory = "distribution" | "express" | "dedicated";

export type CalculationType =
    | "fixed"
    | "zone"
    | "per_km"
    | "per_weight"
    | "per_volume"
    | "percentage"
    | "formula";

export interface TransportServiceRecord {
    id: string;
    code: string;
    name: string;
    description: string;
    category: ServiceTypeCategory;
    defaultServiceTimeMin: number;
    calculationType: CalculationType;
    requiresAppointment: boolean;
    allowConsolidation: boolean;
    active: boolean;
}

export interface TransportServiceAddInput {
    code: string;
    name: string;
    description: string;
    category: ServiceTypeCategory;
    defaultServiceTimeMin: number;
    calculationType: CalculationType;
    requiresAppointment: boolean;
    allowConsolidation: boolean;
    active: boolean;
}

export type TransportServiceEditInput = Partial<Omit<TransportServiceRecord, "id">>;
