import { getDocument } from "~/lib/firestore.service";
import { callHttpsFunction } from "~/lib/functions.service";
import { requireActiveCompanyId, resolveActiveAccountId } from "~/lib/tenant";
import { currentUsagePeriod } from "~/features/system/usage-months";
import type { DashboardActivityItem, DashboardKpiCard, DashboardSnapshot } from "./dashboard.types";

const DASHBOARD_SNAPSHOT_COLLECTION = "dashboard-snapshots";
export const PREPARING_DASHBOARD_MESSAGE =
  "Preparando dashboard. Reintenta en unos segundos mientras se genera el snapshot.";

function normalizePeriod(period?: string): string {
  const raw = String(period ?? "").trim();
  if (/^\d{4}-\d{2}$/.test(raw)) return raw;
  return currentUsagePeriod();
}

function hasUsageForPeriod(raw: unknown): boolean {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  return Object.keys(raw as Record<string, unknown>).length > 0;
}

function snapshotLooksIncomplete(snap: Record<string, unknown>): boolean {
  const cards = Array.isArray(snap.cards) ? snap.cards : [];
  return cards.length === 0;
}

function coerceActivityItems(raw: unknown): DashboardActivityItem[] {
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

function coerceCards(raw: unknown): DashboardKpiCard[] {
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

async function createSnapshotOnDemand(companyId: string, period: string): Promise<void> {
  await callHttpsFunction<{ companyId: string; period: string }, { ok: boolean }>(
    "prepareDashboardSnapshot",
    { companyId, period },
    { errorFallback: "No se pudo preparar el dashboard en servidor." }
  );
}

export async function loadDashboardSnapshot(periodArg?: string): Promise<DashboardSnapshot> {
  const companyId = requireActiveCompanyId();
  const accountId = await resolveActiveAccountId();
  const period = normalizePeriod(periodArg);
  const snapshotId = `${accountId}_${period}`;
  let snap = await getDocument<Record<string, unknown>>(DASHBOARD_SNAPSHOT_COLLECTION, snapshotId);
  if (snap) {
    if (snapshotLooksIncomplete(snap)) {
      await createSnapshotOnDemand(companyId, period);
      snap = await getDocument<Record<string, unknown>>(DASHBOARD_SNAPSHOT_COLLECTION, snapshotId);
    }
  }
  if (snap) {
    const cards = coerceCards(snap.cards);
    const activityReports = coerceActivityItems(snap.activityReports);
    const activityTrips = coerceActivityItems(snap.activityTrips);
    if (cards.length > 0) {
      return {
        period: String(snap.period ?? period),
        cards,
        activityReports,
        activityTrips,
        hasUsageForPeriod: hasUsageForPeriod(snap.usage),
      };
    }
  }

  await createSnapshotOnDemand(companyId, period);
  snap = await getDocument<Record<string, unknown>>(DASHBOARD_SNAPSHOT_COLLECTION, snapshotId);
  if (snap) {
    const cards = coerceCards(snap.cards);
    const activityReports = coerceActivityItems(snap.activityReports);
    const activityTrips = coerceActivityItems(snap.activityTrips);
    if (cards.length > 0) {
      return {
        period: String(snap.period ?? period),
        cards,
        activityReports,
        activityTrips,
        hasUsageForPeriod: hasUsageForPeriod(snap.usage),
      };
    }
  }
  throw new Error(PREPARING_DASHBOARD_MESSAGE);
}

