import { Link } from "react-router";
import type { DashboardKpiCard } from "~/features/system/dashboard";
import DpDashboardSparkline from "./DpDashboardSparkline";

interface DpDashboardKpiCardProps {
  card: DashboardKpiCard;
  mounted: boolean;
  index: number;
}

export default function DpDashboardKpiCard({ card, mounted, index }: DpDashboardKpiCardProps) {
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
      className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-[var(--dp-surface-low)]/85 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[color-mix(in_srgb,var(--dp-primary)_45%,transparent)] ${
        mounted ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
      }`}
      style={{ transitionDelay: `${index * 40}ms` }}
    >
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${gradient}`} />
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
      <div className="relative">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--dp-on-surface-soft)]">
              {card.subtitle}
            </p>
            <h2 className="mt-1 text-xs font-medium text-[var(--dp-on-surface)]/90">{card.title}</h2>
          </div>
          <div className="rounded-lg border border-white/10 bg-[color-mix(in_srgb,var(--dp-surface-high)_70%,transparent)] p-2 text-sm">
            <i className={`pi pi-${card.icon} ${card.accentClass}`} />
          </div>
        </div>

        <div className="mt-3 flex items-end justify-between gap-3">
          <p className="text-4xl font-bold tracking-tight text-[var(--dp-on-surface)]">{card.value}</p>
          <span className="rounded-lg border border-white/10 bg-[var(--dp-surface-high)]/70 px-2 py-1 text-[10px] uppercase tracking-wider text-[var(--dp-on-surface-soft)]">
            {card.progressLabel}
          </span>
        </div>

        <div className="mt-2 text-[var(--dp-on-surface-soft)]">
          <DpDashboardSparkline progressPct={card.progressPct} />
        </div>

        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-[var(--dp-primary)] to-[var(--dp-tertiary)] transition-all duration-500 group-hover:brightness-110"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </Link>
  );
}
