export type CurrencyCode = "PEN" | "USD" | "EUR";

export type CurrencyRecord = {
  code: CurrencyCode;
  name: string;
  abbreviation: string;
  symbol: string;
  decimalDigits: number;
  formatLocale: string;
};
