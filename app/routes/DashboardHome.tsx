import { useEffect, useMemo, useState } from "react";
import DpDashboardActivityPanel from "~/components/DpDashboard/DpDashboardActivityPanel";
import {
  DashboardRenderer,
  getSnapshot,
  loadDashboardSnapshot,
  loadDefinitions,
} from "~/features/system/dashboard";
import type { DashboardSnapshot, DashboardSnapshotResponse, OverrideEntry } from "~/features/system/dashboard";
import { currentUsagePeriod } from "~/features/system/usage-months";
import { useCompany } from "~/lib/company-context";
import { getEffectivePermissions } from "~/lib/effective-permissions";
import { getAllRoles, type RoleRecord } from "~/features/system/roles";
import { requireActiveCompanyId } from "~/lib/tenant";
import { webFetch } from "~/lib/backend-client";
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
  // Legacy snapshot state (for activity panels)
  const [legacySnapshot, setLegacySnapshot] = useState<DashboardSnapshot | null>(null);

  // New configurable dashboard state
  const [snapshot, setSnapshot] = useState<DashboardSnapshotResponse | null>(null);
  const [overrides, setOverrides] = useState<OverrideEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recomposing, setRecomposing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(currentUsagePeriod());

  // Permissions
  const { companyUsers, activeCompanyId } = useCompany();
  const [roles, setRoles] = useState<RoleRecord[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!activeCompanyId) return;
      try {
        const next = await getAllRoles(activeCompanyId);
        if (!cancelled) setRoles(next);
      } catch {
        if (!cancelled) setRoles([]);
      }
    }
    void run();
    return () => { cancelled = true; };
  }, [activeCompanyId]);

  const activeCompanyUserRows = useMemo(() => {
    if (!activeCompanyId) return [];
    return companyUsers.filter((x) => x.companyId === activeCompanyId && x.status === "active");
  }, [companyUsers, activeCompanyId]);

  const companyUserRoleIds = useMemo(
    () => (activeCompanyUserRows[0]?.webRoleIds ?? []).map((x: unknown) => String(x)),
    [activeCompanyUserRows]
  );
  const companyUserRoleNames = useMemo(
    () => (activeCompanyUserRows[0]?.webRoleNames ?? []).map((x: unknown) => String(x)),
    [activeCompanyUserRows]
  );
  const effectivePermissions = useMemo(
    () => getEffectivePermissions(companyUserRoleIds, companyUserRoleNames, roles),
    [companyUserRoleIds, companyUserRoleNames, roles]
  );

  // Load snapshot + overrides
  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const companyId = requireActiveCompanyId();
        const [snapshotData, defsData] = await Promise.all([
          getSnapshot(companyId, selectedPeriod),
          loadDefinitions().catch(() => null),
        ]);
        if (!cancelled) {
          setSnapshot(snapshotData);
          setOverrides(defsData?.overrides ?? null);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "No se pudo cargar el dashboard.";
        if (!cancelled) setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void run();
    return () => { cancelled = true; };
  }, [selectedPeriod]);

  // Load legacy snapshot for activity panels
  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const data = await loadDashboardSnapshot(selectedPeriod);
        if (!cancelled) setLegacySnapshot(data);
      } catch {
        // Activity panels are non-critical; ignore errors
      }
    }
    void run();
    return () => { cancelled = true; };
  }, [selectedPeriod]);

  const reports = legacySnapshot?.activityReports ?? [];
  const trips = legacySnapshot?.activityTrips ?? [];

  const handleRetry = () => {
    // Trigger re-fetch by toggling period
    const current = selectedPeriod;
    setSelectedPeriod("");
    setTimeout(() => setSelectedPeriod(current), 0);
  };

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
  };

  const handleRecompose = async () => {
    try {
      setRecomposing(true);
      const companyId = requireActiveCompanyId();
      await webFetch("/dashboard/web/recompose", {
        method: "POST",
        body: JSON.stringify({ companyId, period: selectedPeriod }),
      });
      // Re-fetch snapshot by re-triggering the period effect
      const current = selectedPeriod;
      setSelectedPeriod("");
      setTimeout(() => setSelectedPeriod(current), 0);
    } catch {
      // Error is non-critical; snapshot will eventually update
    } finally {
      setRecomposing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero header */}
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
        </div>
      </section>

      {/* Configurable Dashboard Renderer */}
      <DashboardRenderer
        snapshot={snapshot}
        effectivePermissions={effectivePermissions}
        overrides={overrides}
        loading={loading}
        error={error}
        onRetry={handleRetry}
        onPeriodChange={handlePeriodChange}
        period={selectedPeriod}
        onRecompose={handleRecompose}
        recomposing={recomposing}
      />

      {/* Activity panels */}
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <DpDashboardActivityPanel title="Reportes recientes" items={reports} fallbackHref="/reports" />
        <DpDashboardActivityPanel title="Viajes recientes" items={trips} fallbackHref="/transport/trips" />
      </section>
    </div>
  );
}
