import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./auth-context";
import { useCompany } from "./company-context";
import { callHttpsFunction } from "~/lib/functions.service";
import { getAccountById } from "~/features/system/accounts";
import { getSubscriptionByAccountId } from "~/features/system/subscriptions";

type AccountContextValue = {
  activeAccountId: string | null;
  accountName: string | null;
  subscriptionSummary: string | null;
  loading: boolean;
};

const AccountContext = createContext<AccountContextValue | null>(null);

export function AccountProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { activeCompanyId, companies } = useCompany();
  const [accountName, setAccountName] = useState<string | null>(null);
  const [subscriptionSummary, setSubscriptionSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const activeAccountId = useMemo(() => {
    if (!activeCompanyId) return null;
    const c = companies.find((x) => x.id === activeCompanyId);
    const aid = c?.accountId?.trim();
    return aid || activeCompanyId;
  }, [activeCompanyId, companies]);

  useEffect(() => {
    if (!user?.uid || !activeCompanyId) return;
    void callHttpsFunction<{ companyId: string }, { ok: boolean; accountId: string }>(
      "refreshTenantClaims",
      { companyId: activeCompanyId }
    ).catch(() => {
      /* claims opcionales hasta despliegue de la función */
    });
  }, [user?.uid, activeCompanyId]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!activeAccountId) {
        setAccountName(null);
        setSubscriptionSummary(null);
        return;
      }
      setLoading(true);
      try {
        const [acc, sub] = await Promise.all([
          getAccountById(activeAccountId),
          getSubscriptionByAccountId(activeAccountId),
        ]);
        if (cancelled) return;
        setAccountName(acc?.name ?? activeAccountId);
        setSubscriptionSummary(
          sub ? `${String(sub.status)} · plan ${sub.planId}` : null
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [activeAccountId]);

  const value = useMemo<AccountContextValue>(
    () => ({
      activeAccountId,
      accountName,
      subscriptionSummary,
      loading,
    }),
    [activeAccountId, accountName, subscriptionSummary, loading]
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount() {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error("useAccount must be used within AccountProvider");
  return ctx;
}
