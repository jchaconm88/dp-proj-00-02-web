import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./auth-context";
import { useCompany } from "./company-context";
import {
  getActiveCompanyLocations,
  type CompanyLocationRecord,
} from "~/features/system/company-locations";

interface LocationContextValue {
  activeLocationId: string | null;
  locations: CompanyLocationRecord[];
  loading: boolean;
  setActiveLocationId: (locationId: string) => void;
  refresh: () => void;
  /** When true, the location filter is disabled (user sees all locations). */
  viewAllLocations: boolean;
  /** Toggle the "view all locations" mode. Only effective if user has the permission. */
  setViewAllLocations: (value: boolean) => void;
}

const LocationContext = createContext<LocationContextValue | null>(null);

function storageKey(uid: string, companyId: string) {
  return `active-location:${uid}:${companyId}`;
}

function readStoredLocationId(uid: string, companyId: string): string | null {
  try {
    const v = window.localStorage.getItem(storageKey(uid, companyId));
    return v && v.trim() ? v : null;
  } catch {
    return null;
  }
}

function storeLocationId(uid: string, companyId: string, locationId: string) {
  try {
    window.localStorage.setItem(storageKey(uid, companyId), locationId);
  } catch {
    // ignore
  }
}

function viewAllStorageKey(uid: string, companyId: string) {
  return `view-all-locations:${uid}:${companyId}`;
}

function readViewAllFlag(uid: string, companyId: string): boolean {
  try {
    return window.localStorage.getItem(viewAllStorageKey(uid, companyId)) === "true";
  } catch {
    return false;
  }
}

function storeViewAllFlag(uid: string, companyId: string, value: boolean) {
  try {
    window.localStorage.setItem(viewAllStorageKey(uid, companyId), String(value));
  } catch {
    // ignore
  }
}

export function LocationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { activeCompanyId, loading: companyLoading } = useCompany();
  const [activeLocationId, setActiveLocationIdState] = useState<string | null>(null);
  const [locations, setLocations] = useState<CompanyLocationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewAllLocations, setViewAllLocationsState] = useState(false);

  const refresh = useCallback(async () => {
    if (companyLoading) return;
    if (!user?.uid || !activeCompanyId) {
      setLocations([]);
      setActiveLocationIdState(null);
      setViewAllLocationsState(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { items } = await getActiveCompanyLocations();
      const active = items.filter((loc) => loc.active);
      active.sort((a, b) => a.name.localeCompare(b.name));
      setLocations(active);

      const stored = readStoredLocationId(user.uid, activeCompanyId);
      const storedValid = stored && active.some((l) => l.id === stored) ? stored : null;
      const next = storedValid ?? active[0]?.id ?? null;
      setActiveLocationIdState(next);
      if (next) storeLocationId(user.uid, activeCompanyId, next);

      // Restore viewAll flag from localStorage
      const storedViewAll = readViewAllFlag(user.uid, activeCompanyId);
      setViewAllLocationsState(storedViewAll);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[location] refresh failed", {
        uid: user.uid,
        companyId: activeCompanyId,
        error: e instanceof Error ? e.message : e,
      });
    } finally {
      setLoading(false);
    }
  }, [companyLoading, user?.uid, activeCompanyId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setActiveLocationId = useCallback(
    (locationId: string) => {
      if (!user?.uid || !activeCompanyId) return;
      setActiveLocationIdState(locationId);
      storeLocationId(user.uid, activeCompanyId, locationId);
    },
    [user?.uid, activeCompanyId]
  );

  const setViewAllLocations = useCallback(
    (value: boolean) => {
      if (!user?.uid || !activeCompanyId) return;
      setViewAllLocationsState(value);
      storeViewAllFlag(user.uid, activeCompanyId, value);
    },
    [user?.uid, activeCompanyId]
  );

  const value = useMemo<LocationContextValue>(
    () => ({ activeLocationId, locations, loading, setActiveLocationId, refresh, viewAllLocations, setViewAllLocations }),
    [activeLocationId, locations, loading, setActiveLocationId, refresh, viewAllLocations, setViewAllLocations]
  );

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useLocationContext() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error("useLocationContext must be used within LocationProvider");
  return ctx;
}
