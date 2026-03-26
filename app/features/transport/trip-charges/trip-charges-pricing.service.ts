import { callHttpsFunction } from "~/lib/functions.service";
import type {
  GetTripChargeFreightPricingRequest,
  GetTripChargeFreightPricingResponse,
} from "./trip-charges-callables.types";

const FN_NAME = "getTripChargeFreightPricing";

export async function getTripChargeFreightPricing(
  params: GetTripChargeFreightPricingRequest
): Promise<GetTripChargeFreightPricingResponse> {
  const body: Record<string, unknown> =
    params.mode === "additional_support"
      ? {
          mode: "additional_support",
          entityType: params.entityType,
          entityId: params.entityId.trim(),
        }
      : {
          mode: "freight",
          clientId: params.clientId.trim(),
          transportServiceId: params.transportServiceId.trim(),
        };

  return callHttpsFunction<Record<string, unknown>, GetTripChargeFreightPricingResponse>(
    FN_NAME,
    body,
    { errorFallback: "No se pudo calcular el precio del cargo." }
  );
}
