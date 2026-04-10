import { Link } from "react-router";
import type { DashboardActivityItem } from "~/features/system/dashboard";

interface DpDashboardActivityPanelProps {
  title: string;
  items: DashboardActivityItem[];
  fallbackHref: string;
}

export default function DpDashboardActivityPanel({
  title,
  items,
  fallbackHref,
}: DpDashboardActivityPanelProps) {
  return (
    <div className="dp-glass-panel dp-neon-glow-tertiary relative overflow-hidden rounded-2xl p-5">
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[color-mix(in_srgb,var(--dp-tertiary)_14%,transparent)] blur-2xl" />
      <h3 className="text-base font-semibold tracking-tight text-[var(--dp-on-surface)]">{title}</h3>
      <div className="mt-3 space-y-2">
        {items.length === 0 && (
          <p className="text-sm text-[var(--dp-on-surface-soft)]">Sin actividad reciente.</p>
        )}
        {items.map((it) => (
          <Link
            key={it.id}
            to={it.href ?? fallbackHref}
            className="group flex items-center justify-between rounded-xl border border-white/10 bg-[var(--dp-surface-low)]/75 px-3 py-2 text-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--dp-surface-high)]/80"
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-[var(--dp-on-surface)]">{it.title}</p>
              <p className="text-xs text-[var(--dp-on-surface-soft)]">{it.meta}</p>
            </div>
            <span className="ml-3 rounded-lg border border-white/10 bg-[var(--dp-surface-high)]/70 px-2 py-1 text-[10px] capitalize tracking-wide text-[var(--dp-on-surface-soft)]">
              {it.status.replaceAll("_", " ")}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
