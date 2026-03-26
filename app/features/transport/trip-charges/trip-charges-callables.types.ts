/** Alineado con Cloud Function `getTripChargeFreightPricing`. */
export type GetTripChargeFreightPricingRequest =
  | {
      mode?: "freight";
      clientId: string;
      transportServiceId: string;
    }
  | {
      mode: "additional_support";
      entityType: "employee" | "resource";
      entityId: string;
    };

export interface GetTripChargeFreightPricingResponse {
  amount: number;
  currency: string;
  /** Flete: nombre del servicio; apoyo adicional: nombre del empleado/recurso. */
  serviceName: string;
  contractId: string;
  ruleId: string;
  basePriceSource: string;
}
