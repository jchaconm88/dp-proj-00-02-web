import { webFetch } from "~/lib/backend-client";
import { requireActiveCompanyId } from "~/lib/tenant";
import type { UbigeoRecord } from "./ubigeos.types";

export async function getUbigeos(country: "PE" = "PE"): Promise<UbigeoRecord[]> {
  const companyId = requireActiveCompanyId();
  const result = await webFetch<{ items: UbigeoRecord[] }>(
    `/master/ubigeos?companyId=${encodeURIComponent(companyId)}&country=${encodeURIComponent(country)}`
  );
  return Array.isArray(result.items) ? result.items : [];
}
