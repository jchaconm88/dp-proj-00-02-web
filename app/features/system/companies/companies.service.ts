import { COMPANIES_COLLECTION } from "~/lib/auth-context";
import { webFetch } from "~/lib/backend-client";
import type { CompanyRecord } from "./companies.types";

function normalizeStatus(value: unknown): "active" | "inactive" {
  return String(value ?? "").trim() === "inactive" ? "inactive" : "active";
}

function normalizeText(value: unknown): string | undefined {
  const out = String(value ?? "").trim();
  return out || undefined;
}

function toCompanyRecord(id: string, d: Record<string, unknown>): CompanyRecord {
  return {
    id,
    name: String(d.name ?? ""),
    status: normalizeStatus(d.status),
    accountId: normalizeText(d.accountId),
    code: normalizeText(d.code),
    taxId: normalizeText(d.taxId),
    logoUrl: normalizeText(d.logoUrl),
    logoPath: normalizeText(d.logoPath),
    logoLightUrl: normalizeText(d.logoLightUrl),
    logoLightPath: normalizeText(d.logoLightPath),
    logoDarkUrl: normalizeText(d.logoDarkUrl),
    logoDarkPath: normalizeText(d.logoDarkPath),
    countryCode: String(d.countryCode ?? "").trim().toUpperCase() === "PE" ? "PE" : undefined,
    allowedCurrencies: Array.isArray(d.allowedCurrencies)
      ? d.allowedCurrencies
          .map((x) => String(x).trim().toUpperCase())
          .filter((x): x is "PEN" | "USD" | "EUR" => x === "PEN" || x === "USD" || x === "EUR")
      : undefined,
    defaultCurrency:
      String(d.defaultCurrency ?? "").trim().toUpperCase() === "PEN" ||
      String(d.defaultCurrency ?? "").trim().toUpperCase() === "USD" ||
      String(d.defaultCurrency ?? "").trim().toUpperCase() === "EUR"
        ? (String(d.defaultCurrency ?? "").trim().toUpperCase() as "PEN" | "USD" | "EUR")
        : undefined,
  };
}

export async function getCompanyById(id: string): Promise<CompanyRecord | null> {
  const cid = String(id ?? "").trim();
  if (!cid) return null;
  const raw = await webFetch<Record<string, unknown> | null>(`/system/companies/${encodeURIComponent(cid)}`);
  if (!raw) return null;
  return toCompanyRecord(String(raw.id ?? ""), raw);
}

export async function getCompanies(): Promise<CompanyRecord[]> {
  const result = await webFetch<{ items: Record<string, unknown>[] }>("/system/companies");
  const items = result.items.map((r) => toCompanyRecord(String(r.id ?? ""), r));
  items.sort((a, b) => a.name.localeCompare(b.name));
  return items;
}

