import { Link } from "react-router";
import { ProgressBar } from "primereact/progressbar";
import type { SnapshotCard } from "./dashboard.types";

interface DashboardKpiCardProps {
  card: SnapshotCard;
  index?: number;
}

/**
 * Renders a single KPI card from the dashboard snapshot.
 * For ratio-type cards (progressPct != null), displays a ProgressBar.
 */
export default function DashboardKpiCard({ card, index = 0 }: DashboardKpiCardProps) {
  const hasProgress = card.progressPct != null;
  const pct = Math.max(0, Math.min(100, card.progressPct ?? 0));

  const gradients = [
    "from-violet-500/10 to-fuchsia-500/5",
    "from-emerald-500/10 to-teal-500/5",
    "from-orange-500/10 to-amber-500/5",
    "from-sky-500/10 to-blue-500/5",
  ];
  const gradient = gradients[index % gradients.length];

  const content = (
    <div className="relative">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-xs font-medium text-[var(--dp-on-surface)]/90">{card.title}</h2>
          {card.subtitle && (
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--dp-on-surface-soft)]">
              {card.subtitle}
            </p>
          )}
        </div>
        <div className="rounded-lg border border-white/10 bg-[color-mix(in_srgb,var(--dp-surface-high)_70%,transparent)] p-2 text-sm">
          <i className={`pi ${card.icon.startsWith("pi") ? card.icon : `pi-${card.icon}`} ${card.accentClass}`} aria-hidden />
        </div>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="text-3xl font-bold tracking-tight text-[var(--dp-on-surface)]">{card.value}</p>
      </div>

      {hasProgress && (
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between">
            {card.progressLabel && (
              <span className="text-[10px] uppercase tracking-wider text-[var(--dp-on-surface-soft)]">
                {card.progressLabel}
              </span>
            )}
            <span className="text-[10px] font-semibold text-[var(--dp-on-surface-soft)]">
              {Math.round(pct)}%
            </span>
          </div>
          <ProgressBar
            value={pct}
            showValue={false}
            style={{ height: "8px" }}
            className="border-round-lg"
          />
        </div>
      )}
    </div>
  );

  const wrapperClass = `group relative overflow-hidden rounded-2xl border border-white/10 bg-[var(--dp-surface-low)]/85 p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--dp-primary)_45%,transparent)]`;

  if (card.href) {
    return (
      <Link to={card.href} className={`${wrapperClass} no-underline`}>
        <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${gradient}`} />
        {content}
      </Link>
    );
  }

  return (
    <div className={wrapperClass}>
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${gradient}`} />
      {content}
    </div>
  );
}
