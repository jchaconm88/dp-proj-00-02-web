import { useEffect, useMemo, useState } from "react";
import { useNavigation } from "react-router";
import type { Route } from "./+types/BillingPage";
import { DpContent } from "~/components/DpContent";
import { useAccount } from "~/lib/account-context";
import { useCompany } from "~/lib/company-context";
import { getSubscriptionByAccountId } from "~/features/system/subscriptions";
import { getSaasPlanById } from "~/features/system/saas-plans";
import type { SaasPlanRecord } from "~/features/system/saas-plans";
import type { SubscriptionRecord } from "~/features/system/subscriptions";
import {
  currentUsagePeriod,
  getUsageMonthForAccount,
  type UsageMonthRecord,
} from "~/features/system/usage-months";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Cuenta y facturación" }, { name: "description", content: "Resumen de cuenta SaaS" }];
}

function jsonPreview(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export default function BillingPage(_props: Route.ComponentProps) {
  const navigation = useNavigation();
  const isLoading = navigation.state !== "idle";
  const { activeCompanyId, companies } = useCompany();
  const { activeAccountId, accountName, subscriptionSummary, loading: accountLoading } = useAccount();

  const [subscription, setSubscription] = useState<SubscriptionRecord | null>(null);
  const [plan, setPlan] = useState<SaasPlanRecord | null>(null);
  const [usage, setUsage] = useState<UsageMonthRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const periodLabel = useMemo(() => currentUsagePeriod(), []);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!activeAccountId) {
        setSubscription(null);
        setPlan(null);
        setUsage(null);
        return;
      }
      setDetailLoading(true);
      setDetailError(null);
      try {
        const sub = await getSubscriptionByAccountId(activeAccountId);
        if (cancelled) return;
        setSubscription(sub);
        const [p, u] = await Promise.all([
          sub ? getSaasPlanById(sub.planId) : Promise.resolve(null),
          getUsageMonthForAccount(activeAccountId, periodLabel),
        ]);
        if (cancelled) return;
        setPlan(p);
        setUsage(u);
      } catch (e) {
        if (!cancelled) {
          setDetailError(e instanceof Error ? e.message : "Error al cargar detalle.");
        }
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [activeAccountId, periodLabel]);

  const companyName = useMemo(() => {
    if (!activeCompanyId) return "—";
    return companies.find((c) => c.id === activeCompanyId)?.name ?? activeCompanyId;
  }, [activeCompanyId, companies]);

  return (
    <DpContent title="CUENTA Y FACTURACIÓN">
      <div className="flex flex-col gap-4 text-sm">
        <p className="text-surface-600 dark:text-surface-400">
          Resumen del tenant asociado a la empresa activa. Datos en Firestore:{" "}
          <code className="rounded bg-zinc-100 px-1 dark:bg-navy-700">accounts</code>,{" "}
          <code className="rounded bg-zinc-100 px-1 dark:bg-navy-700">subscriptions</code>, catálogo SaaS{" "}
          <code className="rounded bg-zinc-100 px-1 dark:bg-navy-700">plans</code>, uso{" "}
          <code className="rounded bg-zinc-100 px-1 dark:bg-navy-700">usage-months</code>.
        </p>
        <dl className="grid max-w-lg grid-cols-1 gap-2 rounded border border-surface-200 p-4 dark:border-navy-600">
          <dt className="font-medium text-surface-500 dark:text-surface-400">Empresa activa</dt>
          <dd>{companyName}</dd>
          <dt className="font-medium text-surface-500 dark:text-surface-400">Account ID</dt>
          <dd className="font-mono text-xs">{activeAccountId ?? "—"}</dd>
          <dt className="font-medium text-surface-500 dark:text-surface-400">Nombre de cuenta</dt>
          <dd>{accountLoading || isLoading ? "…" : accountName ?? "—"}</dd>
          <dt className="font-medium text-surface-500 dark:text-surface-400">Suscripción (resumen)</dt>
          <dd>{accountLoading || isLoading ? "…" : subscriptionSummary ?? "Sin datos"}</dd>
        </dl>

        {detailError && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            {detailError}
          </div>
        )}

        <section className="space-y-2 rounded border border-surface-200 p-4 dark:border-navy-600">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-surface-500 dark:text-surface-400">
            Suscripción y plan (lectura)
          </h2>
          {detailLoading ? (
            <p className="text-surface-500">Cargando…</p>
          ) : !activeAccountId ? (
            <p className="text-surface-500">Selecciona una empresa con cuenta asociada.</p>
          ) : (
            <dl className="grid max-w-2xl grid-cols-1 gap-2">
              <dt className="font-medium text-surface-500 dark:text-surface-400">Estado / planId</dt>
              <dd>
                {subscription ?
                  `${subscription.status} · ${subscription.planId}`
                : "Sin documento en subscriptions"}
              </dd>
              <dt className="font-medium text-surface-500 dark:text-surface-400">Plan SaaS</dt>
              <dd>{plan ? `${plan.name}${plan.active === false ? " (inactivo)" : ""}` : "—"}</dd>
              <dt className="font-medium text-surface-500 dark:text-surface-400">Límites (plans.limits)</dt>
              <dd>
                <pre className="max-h-40 overflow-auto rounded bg-zinc-100 p-2 text-xs dark:bg-navy-900">
                  {plan?.limits ? jsonPreview(plan.limits) : "—"}
                </pre>
              </dd>
              <dt className="font-medium text-surface-500 dark:text-surface-400">Features (plans.features)</dt>
              <dd>
                <pre className="max-h-40 overflow-auto rounded bg-zinc-100 p-2 text-xs dark:bg-navy-900">
                  {plan?.features ? jsonPreview(plan.features) : "—"}
                </pre>
              </dd>
            </dl>
          )}
        </section>

        <section className="space-y-2 rounded border border-surface-200 p-4 dark:border-navy-600">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-surface-500 dark:text-surface-400">
            Uso del mes ({periodLabel})
          </h2>
          {detailLoading ? (
            <p className="text-surface-500">Cargando…</p>
          ) : !activeAccountId ? (
            <p className="text-surface-500">—</p>
          ) : usage ? (
            <pre className="max-h-48 overflow-auto rounded bg-zinc-100 p-2 text-xs dark:bg-navy-900">
              {jsonPreview(usage.raw)}
            </pre>
          ) : (
            <p className="text-surface-500">
              Sin documento <code className="rounded bg-zinc-100 px-1 dark:bg-navy-800">usage-months</code> para
              este período (normal si aún no hay triggers de uso).
            </p>
          )}
        </section>
      </div>
    </DpContent>
  );
}
