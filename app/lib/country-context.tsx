import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type AppCountryCode = "PE";

type CountryOption = { name: string; code: AppCountryCode };

const STORAGE_KEY = "active-country";
const DEFAULT_COUNTRY: AppCountryCode = "PE";

const COUNTRY_OPTIONS: CountryOption[] = [{ name: "Perú", code: "PE" }];

type CountryContextValue = {
  activeCountry: AppCountryCode;
  countryOptions: CountryOption[];
  setActiveCountry: (code: AppCountryCode) => void;
};

const CountryContext = createContext<CountryContextValue | null>(null);

export function getStoredCountryCode(): AppCountryCode {
  try {
    if (typeof window === "undefined") return DEFAULT_COUNTRY;
    const raw = String(window.localStorage.getItem(STORAGE_KEY) ?? "").trim().toUpperCase();
    return raw === "PE" ? "PE" : DEFAULT_COUNTRY;
  } catch {
    return DEFAULT_COUNTRY;
  }
}

function storeCountryCode(code: AppCountryCode): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // ignore storage errors
  }
}

export function CountryProvider({ children }: { children: ReactNode }) {
  const [activeCountry, setActiveCountryState] = useState<AppCountryCode>(getStoredCountryCode());

  const setActiveCountry = (code: AppCountryCode) => {
    setActiveCountryState(code);
    storeCountryCode(code);
  };

  const value = useMemo<CountryContextValue>(
    () => ({
      activeCountry,
      countryOptions: COUNTRY_OPTIONS,
      setActiveCountry,
    }),
    [activeCountry]
  );

  return <CountryContext.Provider value={value}>{children}</CountryContext.Provider>;
}

export function useCountry() {
  const ctx = useContext(CountryContext);
  if (!ctx) throw new Error("useCountry must be used within CountryProvider");
  return ctx;
}
