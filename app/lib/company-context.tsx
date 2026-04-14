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
import {
  getCompanyMembershipsForSession,
  type CompanyUserRecord,
} from "~/features/system/company-users";
import { getCompanyById, type CompanyRecord } from "~/features/system/companies";

type CompanyContextValue = {
  activeCompanyId: string | null;
  companies: CompanyRecord[];
  memberships: CompanyUserRecord[];
  loading: boolean;
  setActiveCompanyId: (companyId: string) => void;
  refresh: () => Promise<void>;
};

const CompanyContext = createContext<CompanyContextValue | null>(null);

function storageKey(uid: string) {
  return `active-company:${uid}`;
}

function readStoredCompanyId(uid: string): string | null {
  try {
    const v = window.localStorage.getItem(storageKey(uid));
    return v && v.trim() ? v : null;
  } catch {
    return null;
  }
}

function storeCompanyId(uid: string, companyId: string) {
  try {
    window.localStorage.setItem(storageKey(uid), companyId);
  } catch {
    // ignore
  }
}

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { user, profile, loading: authLoading } = useAuth();
  const [activeCompanyId, setActiveCompanyIdState] = useState<string | null>(null);
  const [memberships, setMemberships] = useState<CompanyUserRecord[]>([]);
  const [companies, setCompanies] = useState<CompanyRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (authLoading) {
      return;
    }
    if (!user?.uid) {
      setMemberships([]);
      setCompanies([]);
      setActiveCompanyIdState(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const legacyId =
        profile?.usersDocId && profile.usersDocId !== user.uid ? profile.usersDocId : null;
      const m = (
        await getCompanyMembershipsForSession(user.uid, legacyId)
      ).filter((x) => x.status === "active");
      setMemberships(m);

      const uniqueCompanyIds = Array.from(new Set(m.map((x) => x.companyId).filter(Boolean)));
      const fetched = await Promise.all(uniqueCompanyIds.map((id) => getCompanyById(id)));
      const cs = fetched.filter((c): c is CompanyRecord => Boolean(c)).filter((c) => c.status === "active");
      cs.sort((a, b) => a.name.localeCompare(b.name));
      setCompanies(cs);

      const stored = readStoredCompanyId(user.uid);
      const storedValid = stored && uniqueCompanyIds.includes(stored) ? stored : null;
      const next = storedValid ?? uniqueCompanyIds[0] ?? null;
      setActiveCompanyIdState(next);
      if (next) storeCompanyId(user.uid, next);
    } catch {
      // Mantener estado previo; evita dejar la sesión sin empresa activa por errores transitorios.
    } finally {
      setLoading(false);
    }
  }, [authLoading, user?.uid, profile?.usersDocId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setActiveCompanyId = useCallback(
    (companyId: string) => {
      if (!user?.uid) return;
      setActiveCompanyIdState(companyId);
      storeCompanyId(user.uid, companyId);
    },
    [user?.uid]
  );

  const value = useMemo<CompanyContextValue>(
    () => ({ activeCompanyId, companies, memberships, loading, setActiveCompanyId, refresh }),
    [activeCompanyId, companies, memberships, loading, setActiveCompanyId, refresh]
  );

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
}

export function useCompany() {
  const ctx = useContext(CompanyContext);
  if (!ctx) throw new Error("useCompany must be used within CompanyProvider");
  return ctx;
}

