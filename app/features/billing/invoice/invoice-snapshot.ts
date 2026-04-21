import type { ClientRecord, ClientLocationRecord } from "~/features/master/clients";
import type { CompanyRecord } from "~/features/system/companies";
import type { CompanyLocationRecord } from "~/features/system/company-locations";
import type { InvoiceClient, InvoiceCompany, InvoiceCompanyLocation } from "./invoice.types";

export function clientRecordToInvoiceClient(
  c: ClientRecord,
  homeAddressFallback?: string
): InvoiceClient {
  const fiscal = c.fiscal;
  const home =
    (homeAddressFallback ?? "").trim() ||
    (fiscal
      ? [fiscal.address, fiscal.district, fiscal.city, fiscal.country].filter(Boolean).join(", ")
      : "");
  return {
    id: c.id,
    name: (c.commercialName || c.businessName).trim(),
    businessName: c.businessName.trim(),
    identityDocumentNo: c.documentNumber.trim(),
    phoneNumber: c.contact.phone.trim(),
    emailAddress: c.contact.email.trim(),
    homeAddress: home,
  };
}

export function clientLocationToHomeAddress(loc: ClientLocationRecord): string {
  return [loc.address, loc.district, loc.city, loc.country].filter(Boolean).join(", ");
}

export function companyRecordToInvoiceCompany(c: CompanyRecord): InvoiceCompany {
  const logo = c.logoLightUrl || c.logoUrl || "";
  return {
    id: c.id,
    name: c.name.trim(),
    businessName: c.name.trim(),
    identityDocumentNo: (c.taxId ?? "").trim(),
    emailAddress: "",
    logoUrl: logo,
  };
}

export function companyLocationRecordToInvoiceLocation(loc: CompanyLocationRecord): InvoiceCompanyLocation {
  return {
    name: loc.name.trim(),
    description: loc.description.trim(),
    ubigeo: loc.ubigeo.trim(),
    city: loc.city.trim(),
    country: loc.country.trim() || "PE",
    district: loc.district.trim(),
    address: loc.address.trim(),
  };
}

/** Intenta encontrar la sede maestra equivalente al snapshot guardado en la factura. */
export function matchCompanyLocationId(
  snapshot: InvoiceCompanyLocation,
  locations: CompanyLocationRecord[]
): string {
  const found = locations.find(
    (l) =>
      l.name.trim() === snapshot.name.trim() &&
      l.address.trim() === snapshot.address.trim() &&
      l.district.trim() === snapshot.district.trim()
  );
  return found?.id ?? "";
}
