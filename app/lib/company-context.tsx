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
  getCompanyUsersForSession,
  type CompanyUserRecord,
} from "~/features/system/company-users";
import { getCompanyById, type CompanyRecord } from "~/features/system/companies";

type CompanyContextValue = {
  activeCompanyId: string | null;
  companies: CompanyRecord[];
  companyUsers: CompanyUserRecord[];
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
  const [companyUsers, setCompanyUsers] = useState<CompanyUserRecord[]>([]);
  const [companies, setCompanies] = useState<CompanyRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (authLoading) {
      return;
    }
    if (!user?.uid) {
      setCompanyUsers([]);
      setCompanies([]);
      setActiveCompanyIdState(null);
      setLoading(false);
      return;
    }

    // eslint-disable-next-line no-console
    console.info("[company] refresh start", { uid: user.uid });
    setLoading(true);
    try {
      const m = (await getCompanyUsersForSession(user.uid)).filter((x) => x.status === "active");
      // eslint-disable-next-line no-console
      console.info("[company] company-users loaded", { count: m.length, companyIds: m.map(x => x.companyId) });
      setCompanyUsers(m);

      const uniqueCompanyIds = Array.from(new Set(m.map((x) => x.companyId).filter(Boolean)));
      // eslint-disable-next-line no-console
      console.info("[company] fetching companies", { uniqueCompanyIds });
      const fetched = await Promise.all(uniqueCompanyIds.map((id) => getCompanyById(id)));
      const cs = fetched.filter((c): c is CompanyRecord => Boolean(c)).filter((c) => c.status === "active");
      cs.sort((a, b) => a.name.localeCompare(b.name));
      // eslint-disable-next-line no-console
      console.info("[company] companies loaded", { count: cs.length, names: cs.map(c => c.name) });
      setCompanies(cs);

      const stored = readStoredCompanyId(user.uid);
      const storedValid = stored && uniqueCompanyIds.includes(stored) ? stored : null;
      const next = storedValid ?? uniqueCompanyIds[0] ?? null;
      // eslint-disable-next-line no-console
      console.info("[company] active company selected", { stored, storedValid, next });
      setActiveCompanyIdState(next);
      if (next) storeCompanyId(user.uid, next);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[company] refresh failed", {
        uid: user.uid,
        error: e instanceof Error ? e.message : e,
      });
    } finally {
      setLoading(false);
      // eslint-disable-next-line no-console
      console.info("[company] refresh complete");
    }
  }, [authLoading, user?.uid]);

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
    () => ({ activeCompanyId, companies, companyUsers, loading, setActiveCompanyId, refresh }),
    [activeCompanyId, companies, companyUsers, loading, setActiveCompanyId, refresh]
  );

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
}

export function useCompany() {
  const ctx = useContext(CompanyContext);
  if (!ctx) throw new Error("useCompany must be used within CompanyProvider");
  return ctx;
}

