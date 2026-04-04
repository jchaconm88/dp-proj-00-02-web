import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import type { DashboardActivityItem, DashboardKpiCard, DashboardSnapshot } from "~/features/system/dashboard";
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

function Sparkline({ progressPct }: { progressPct: number | null }) {
  const d = useMemo(() => {
    if (progressPct == null) {
      // Sin límite/porcentaje: línea neutra (sin simular tendencia falsa).
      return "M 0 40 L 176 40";
    }
    const pct = Math.max(0, Math.min(100, progressPct));
    const targetY = 56 - (pct / 100) * 44;
    return `M 0 56 L 48 56 L 96 ${targetY} L 176 ${targetY}`;
  }, [progressPct]);
  return (
    <svg viewBox="0 0 176 64" className="h-10 w-full opacity-70">
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeDasharray={progressPct == null ? "4 4" : undefined}
      />
    </svg>
  );
}

function ActivityPanel({
  title,
  items,
  fallbackHref,
}: {
  title: string;
  items: DashboardActivityItem[];
  fallbackHref: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-md shadow-slate-200/70 dark:border-navy-600 dark:bg-navy-800 dark:shadow-black/20">
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-slate-100/60 blur-2xl dark:bg-slate-500/10" />
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      <div className="mt-3 space-y-2">
        {items.length === 0 && (
          <p className="text-sm text-slate-500 dark:text-slate-400">Sin actividad reciente.</p>
        )}
        {items.map((it) => (
          <Link
            key={it.id}
            to={it.href ?? fallbackHref}
            className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-navy-600 dark:bg-navy-700/40"
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-800 dark:text-slate-100">{it.title}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{it.meta}</p>
            </div>
            <span className="ml-3 rounded-lg bg-slate-100 px-2 py-1 text-[11px] capitalize text-slate-600 dark:bg-navy-700 dark:text-slate-300">
              {it.status.replaceAll("_", " ")}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function KpiCard({
  card,
  mounted,
  index,
}: {
  card: DashboardKpiCard;
  mounted: boolean;
  index: number;
}) {
  const pct = Math.max(0, Math.min(100, card.progressPct ?? 0));
  const gradient =
    index % 4 === 0
      ? "from-violet-500/10 to-fuchsia-500/5"
      : index % 4 === 1
      ? "from-emerald-500/10 to-teal-500/5"
      : index % 4 === 2
      ? "from-orange-500/10 to-amber-500/5"
      : "from-sky-500/10 to-blue-500/5";

  return (
    <Link
      to={card.href ?? "#"}
      className={`group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-md shadow-slate-200/70 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-navy-600 dark:bg-navy-800 dark:shadow-black/25 ${
        mounted ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
      }`}
      style={{ transitionDelay: `${index * 40}ms` }}
    >
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${gradient}`} />
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/40 blur-2xl dark:bg-slate-400/10" />
      <div className="relative">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">{card.subtitle}</p>
            <h2 className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{card.title}</h2>
          </div>
          <div className="rounded-xl bg-white/80 p-2 text-sm shadow-sm dark:bg-navy-700/70">
            <i className={`pi pi-${card.icon} ${card.accentClass}`} />
          </div>
        </div>

        <div className="mt-3 flex items-end justify-between gap-3">
          <p className="text-3xl font-bold text-slate-900 dark:text-slate-50">{card.value}</p>
          <span className="rounded-lg bg-white/80 px-2 py-1 text-[11px] text-slate-600 shadow-sm dark:bg-navy-700/80 dark:text-slate-300">
            {card.progressLabel}
          </span>
        </div>

        <div className="mt-2 text-slate-500 dark:text-slate-400">
          <Sparkline progressPct={card.progressPct} />
        </div>

        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-navy-700">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-500 group-hover:brightness-110"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </Link>
  );
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
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/80 dark:border-navy-600 dark:bg-navy-800 dark:shadow-black/25">
        <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-cyan-300/20 blur-3xl dark:bg-cyan-500/10" />
        <div className="pointer-events-none absolute -right-16 -bottom-14 h-52 w-52 rounded-full bg-violet-300/20 blur-3xl dark:bg-violet-500/10" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Performance overview
            </p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900 dark:text-slate-50">
              Dashboard de métricas
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Límites de plan, uso mensual y actividad operativa del tenant.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm dark:border-navy-500 dark:bg-navy-700 dark:text-slate-200">
            <span>Periodo</span>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 outline-none dark:border-navy-500 dark:bg-navy-800 dark:text-slate-200"
            >
              {periodOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <span className="opacity-70">{snapshot?.period ?? "—"}</span>
          </div>
        </div>
      </section>

      {error && (
        <div
          className={
            isPreparing
              ? "rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"
              : "rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
          }
        >
          {error}
        </div>
      )}
      {!loading && !error && !hasUsageForPeriod && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          Sin documento `usage-months` para este periodo. Los contadores de uso mensual pueden verse en 0.
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {loading &&
          Array.from({ length: 8 }).map((_, i) => (
            <div
              key={`sk-${i}`}
              className="relative h-44 animate-pulse overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-navy-600 dark:bg-navy-800"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-100/60 to-transparent dark:via-navy-700/60" />
            </div>
          ))}

        {!loading && cards.map((card, i) => <KpiCard key={card.id} card={card} mounted={mounted} index={i} />)}
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ActivityPanel title="Reportes recientes" items={reports} fallbackHref="/reports" />
        <ActivityPanel title="Viajes recientes" items={trips} fallbackHref="/transport/trips" />
      </section>
    </div>
  );
}
