/**
 * Formato de montos con símbolo para tablas, footers y listados.
 * Códigos alineados con `CURRENCY` en `~/constants/status-options`.
 */

export const CURRENCY_SYMBOL: Record<string, string> = {
  PEN: "S/.",
  USD: "$",
};

function resolveCurrencyCode(currency: string): string {
  return String(currency ?? "PEN").trim().toUpperCase() || "PEN";
}

/** Monto con símbolo y 2 decimales (locale es-PE). Si el código no está en el mapa, se muestra el código como prefijo. */
export function formatAmountWithSymbol(amount: number, currency: string): string {
  const code = resolveCurrencyCode(currency);
  const sym = CURRENCY_SYMBOL[code] ?? code;
  const n = Number.isFinite(amount) ? amount : 0;
  const formatted = new Intl.NumberFormat("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
  return `${sym} ${formatted}`;
}
