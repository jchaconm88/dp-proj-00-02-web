import { getCurrenciesCatalog, type CurrencyCode } from "~/features/system/currencies";
import { getActiveCompanyId } from "~/lib/tenant";
import { getCompanyById } from "./companies.service";

export type CompanyCurrencyOption = {
  value: CurrencyCode;
  label: string;
  symbol: string;
  abbreviation: string;
};

export async function getActiveCompanyCurrencyOptions(): Promise<{
  options: CompanyCurrencyOption[];
  defaultCurrency: CurrencyCode;
}> {
  const companyId = getActiveCompanyId();
  if (!companyId) {
    throw new Error("No hay empresa activa.");
  }

  const [company, currencies] = await Promise.all([
    getCompanyById(companyId),
    getCurrenciesCatalog(),
  ]);

  if (!company) {
    throw new Error("Empresa activa no encontrada.");
  }

  const allowed = company.allowedCurrencies ?? [];
  const defaultCurrency = company.defaultCurrency;
  if (!allowed.length || !defaultCurrency) {
    throw new Error("Configuración monetaria de empresa incompleta. Configure monedas en Admin.");
  }
  if (!allowed.includes(defaultCurrency)) {
    throw new Error("La moneda por defecto no pertenece a las monedas permitidas de la empresa.");
  }

  const byCode = new Map(currencies.map((c) => [c.code, c]));
  const options = allowed
    .map((code) => {
      const row = byCode.get(code);
      if (!row) return null;
      return {
        value: row.code,
        label: `${row.name} (${row.code} · ${row.symbol})`,
        symbol: row.symbol,
        abbreviation: row.abbreviation,
      };
    })
    .filter((x): x is CompanyCurrencyOption => x !== null);

  if (!options.length) {
    throw new Error("No existen metadatos de monedas para la empresa activa.");
  }

  return { options, defaultCurrency };
}
