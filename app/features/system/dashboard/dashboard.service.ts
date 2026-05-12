import { webFetch } from "~/lib/backend-client";
import { requireActiveCompanyId } from "~/lib/tenant";
import type { DashboardSnapshotResponse, DashboardSnapshot } from "./dashboard.types";

// ---------------------------------------------------------------------------
// New configurable dashboard service
// ---------------------------------------------------------------------------

/**
 * Fetches the pre-computed dashboard snapshot for a given company and period.
 * Uses GET /web/dashboard/snapshot with companyId and period query params.
 */
export async function getSnapshot(companyId: string, period: string): Promise<DashboardSnapshotResponse> {
  const query = new URLSearchParams({ companyId, period }).toString();
  return webFetch<DashboardSnapshotResponse>(`/dashboard/snapshot?${query}`);
}

// ---------------------------------------------------------------------------
// Legacy service (kept for backward compatibility until DashboardHome migration)
// ---------------------------------------------------------------------------

/** @deprecated Will be removed when DashboardHome is migrated to the new renderer */
export const NO_DASHBOARD_DATA_MESSAGE = "No hay datos de dashboard disponibles.";

/** @deprecated Use getSnapshot instead */
export async function loadDashboardSnapshot(periodArg?: string): Promise<DashboardSnapshot> {
  const companyId = requireActiveCompanyId();
  const period = normalizePeriod(periodArg);
  const query = new URLSearchParams({ companyId, period }).toString();

  const data = await webFetch<Record<string, unknown>>(`/dashboard/snapshot?${query}`);

  const cards = coerceCards(data.cards);
  const activityReports = coerceActivityItems(data.activityReports);
  const activityTrips = coerceActivityItems(data.activityTrips);

  if (cards.length === 0) {
    throw new Error(NO_DASHBOARD_DATA_MESSAGE);
  }

  return {
    period: String(data.period ?? period),
    cards,
    activityReports,
    activityTrips,
    hasUsageForPeriod: hasUsageForPeriod(data.usage),
  };
}

// ---------------------------------------------------------------------------
// Legacy helpers
// ---------------------------------------------------------------------------

function normalizePeriod(period?: string): string {
  const raw = String(period ?? "").trim();
  if (/^\d{4}-\d{2}$/.test(raw)) return raw;
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function hasUsageForPeriod(raw: unknown): boolean {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  return Object.keys(raw as Record<string, unknown>).length > 0;
}

function coerceActivityItems(raw: unknown): Array<{ id: string; title: string; meta: string; status: string; href?: string }> {
  if (!Array.isArray(raw)) return [];
  return raw.map((it, index) => {
    const item = it && typeof it === "object" ? (it as Record<string, unknown>) : {};
    return {
      id: String(item.id ?? `it-${index}`),
      title: String(item.title ?? ""),
      meta: String(item.meta ?? ""),
      status: String(item.status ?? "pending"),
      href: String(item.href ?? "").trim() || undefined,
    };
  });
}

function coerceCards(raw: unknown): Array<{ id: string; title: string; subtitle: string; icon: string; accentClass: string; value: string; progressPct: number | null; progressLabel: string; href?: string }> {
  if (!Array.isArray(raw)) return [];
  return raw.map((it, index) => {
    const card = it && typeof it === "object" ? (it as Record<string, unknown>) : {};
    const pctRaw = card.progressPct;
    const pct = Number.isFinite(Number(pctRaw)) ? Number(pctRaw) : null;
    return {
      id: String(card.id ?? `card-${index}`),
      title: String(card.title ?? ""),
      subtitle: String(card.subtitle ?? ""),
      icon: String(card.icon ?? "chart-line"),
      accentClass: String(card.accentClass ?? "text-slate-600"),
      value: String(card.value ?? "0"),
      progressPct: pct,
      progressLabel: String(card.progressLabel ?? "Sin límite"),
      href: String(card.href ?? "").trim() || undefined,
    };
  });
}
