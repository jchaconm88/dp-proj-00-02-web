import { callHttpsFunction } from "~/lib/functions.service";
import type {
  GetTripChargeFreightPricingRequest,
  GetTripChargeFreightPricingResponse,
} from "./trip-charges-callables.types";

const FN_NAME = "getTripChargeFreightPricing";

export async function getTripChargeFreightPricing(
  params: GetTripChargeFreightPricingRequest
): Promise<GetTripChargeFreightPricingResponse> {
  return callHttpsFunction<GetTripChargeFreightPricingRequest, GetTripChargeFreightPricingResponse>(
    FN_NAME,
    {
      clientId: params.clientId.trim(),
      transportServiceId: params.transportServiceId.trim(),
    },
    { errorFallback: "No se pudo calcular el precio del flete." }
  );
}
