import { useEffect, useMemo, useState } from "react";
import DpDashboardActivityPanel from "~/components/DpDashboard/DpDashboardActivityPanel";
import DpDashboardKpiCard from "~/components/DpDashboard/DpDashboardKpiCard";
import type { DashboardSnapshot } from "~/features/system/dashboard";
import { loadDashboardSnapshot, PREPARING_DASHBOARD_MESSAGE } from "~/features/system/dashboard";
import { currentUsagePeriod } from "~/features/system/usage-months";
import type { Route } from "./+types/DashboardHome";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Inicio - Panel" }, { name: "description", content: "Dashboard de métricas" }];
}

function buildRecentPeriods(maxMonths = 12): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = 0; i < maxMonths; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    out.push(`${y}-${m}`);
  }
  return out;
}

export default function DashboardHome() {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState(currentUsagePeriod());
  const periodOptions = useMemo(() => buildRecentPeriods(18), []);

  useEffect(() => {
    const id = window.setTimeout(() => setMounted(true), 20);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let retryTimer: number | null = null;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const data = await loadDashboardSnapshot(selectedPeriod);
        if (!cancelled) setSnapshot(data);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "No se pudo cargar el dashboard.";
        if (!cancelled) setError(msg);
        if (!cancelled && msg === PREPARING_DASHBOARD_MESSAGE) {
          retryTimer = window.setTimeout(() => {
            setReloadToken((v) => v + 1);
          }, 2000);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
      if (retryTimer != null) window.clearTimeout(retryTimer);
    };
  }, [reloadToken, selectedPeriod]);

  const cards = useMemo(() => snapshot?.cards ?? [], [snapshot?.cards]);
  const reports = snapshot?.activityReports ?? [];
  const trips = snapshot?.activityTrips ?? [];

  const isPreparing = error === PREPARING_DASHBOARD_MESSAGE;
  const hasUsageForPeriod = snapshot?.hasUsageForPeriod !== false;

  return (
    <div className="space-y-6">
      <section className="dp-glass-panel dp-neon-glow-primary relative overflow-hidden rounded-3xl p-6 md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-[color-mix(in_srgb,var(--dp-primary)_14%,transparent)] via-transparent to-[color-mix(in_srgb,var(--dp-secondary)_10%,transparent)]" />
        <div className="relative flex flex-wrap items-start justify-between gap-5">
          <div className="space-y-3">
            <span className="inline-flex rounded-full border border-white/10 bg-[color-mix(in_srgb,var(--dp-tertiary)_16%,transparent)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--dp-tertiary)]">
              Live Feedback
            </span>
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--dp-on-surface-soft)]">
                Performance overview
              </p>
              <h1 className="mt-1 text-3xl font-black tracking-tight text-[var(--dp-on-surface)] md:text-4xl">
                Dashboard de métricas
              </h1>
            </div>
            <p className="max-w-2xl text-sm text-[var(--dp-on-surface-soft)]">
              Límites de plan, uso mensual y actividad operativa del tenant.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="dp-pill-toggle flex items-center p-1">
              <button type="button" className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--dp-on-surface-soft)]">
                Day
              </button>
              <button type="button" className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--dp-on-surface-soft)]">
                Week
              </button>
              <button type="button" className="dp-pill-toggle-active rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em]">
                Month
              </button>
              <button type="button" className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--dp-on-surface-soft)]">
                Year
              </button>
            </div>
            <div className="dp-pill-toggle flex items-center gap-2 px-3 py-1.5">
              <i className="pi pi-calendar text-xs text-[var(--dp-on-surface-soft)]" aria-hidden />
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="bg-transparent text-xs font-semibold text-[var(--dp-on-surface)] outline-none"
              >
                {periodOptions.map((p) => (
                  <option key={p} value={p} className="text-zinc-900">
                    {p}
                  </option>
                ))}
              </select>
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--dp-on-surface-soft)]">
                {snapshot?.period ?? "—"}
              </span>
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div
          className={
            isPreparing
              ? "rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200"
              : "rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
          }
        >
          {error}
        </div>
      )}
      {!loading && !error && !hasUsageForPeriod && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Sin documento `usage-months` para este periodo. Los contadores de uso mensual pueden verse en 0.
        </div>
      )}

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {loading &&
          Array.from({ length: 8 }).map((_, i) => (
            <div
              key={`sk-${i}`}
              className="relative h-44 animate-pulse overflow-hidden rounded-2xl border border-white/10 bg-[var(--dp-surface-low)]/80"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>
          ))}

        {!loading &&
          cards.map((card, i) => (
            <DpDashboardKpiCard key={card.id} card={card} mounted={mounted} index={i} />
          ))}
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <DpDashboardActivityPanel title="Reportes recientes" items={reports} fallbackHref="/reports" />
        <DpDashboardActivityPanel title="Viajes recientes" items={trips} fallbackHref="/transport/trips" />
      </section>
    </div>
  );
}
