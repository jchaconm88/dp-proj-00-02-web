/** Alineado con Cloud Function `getTripChargeFreightPricing`. */
export interface GetTripChargeFreightPricingRequest {
  clientId: string;
  transportServiceId: string;
}

export interface GetTripChargeFreightPricingResponse {
  amount: number;
  currency: string;
  serviceName: string;
  contractId: string;
  ruleId: string;
  basePriceSource: string;
}
