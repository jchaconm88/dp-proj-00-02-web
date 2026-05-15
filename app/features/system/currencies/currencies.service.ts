import { webFetch } from "~/lib/backend-client";
import type { CurrencyRecord } from "./currencies.types";

export async function getCurrenciesCatalog(): Promise<CurrencyRecord[]> {
  const result = await webFetch<{ items: CurrencyRecord[] }>("/system/currencies");
  return Array.isArray(result.items) ? result.items : [];
}
