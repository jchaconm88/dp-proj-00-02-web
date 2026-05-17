import { useEffect, useMemo, useState, useCallback } from "react";
import { useRevalidator, useNavigation } from "react-router";
import { InputSwitch } from "primereact/inputswitch";
import { Button } from "primereact/button";
import { Message } from "primereact/message";
import { DpContent, DpContentHeader } from "~/components/ui";
import { DpTable, DpTColumn, type DpTableDefColumn } from "~/components/ui";
import { getAuthUser } from "~/lib/get-auth-user";
import { useCompany } from "~/lib/company-context";
import { getEffectivePermissions } from "~/lib/effective-permissions";
import { hasPermissionCode } from "~/lib/permission-codes";
import { getAllRoles, type RoleRecord } from "~/features/system/roles";
import {
  loadDefinitions,
  saveCompanyOverrides,
  type OverrideEntry,
} from "~/features/system/dashboard";
import type { Route } from "./+types/DashboardOverridesPage";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CardConfigItem {
  id: string;
  title: string;
  definitionType: "card";
  visible: boolean;
  order: number;
}

interface ChartConfigItem {
  id: string;
  title: string;
  definitionType: "chart";
  chartType: string;
  visible: boolean;
  order: number;
}

// ---------------------------------------------------------------------------
// Table definitions
// ---------------------------------------------------------------------------

const CARDS_TABLE_DEF: DpTableDefColumn[] = [
  { header: "Título", column: "title", order: 1, display: true, filter: true, sort: true },
  { header: "Visible", column: "visible", order: 2, display: true },
];

const CHARTS_TABLE_DEF: DpTableDefColumn[] = [
  { header: "Título", column: "title", order: 1, display: true, filter: true, sort: true },
  { header: "Tipo", column: "chartType", order: 2, display: true, filter: true, sort: true },
  { header: "Visible", column: "visible", order: 3, display: true },
];

// ---------------------------------------------------------------------------
// Meta & clientLoader
// ---------------------------------------------------------------------------

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Accesos Dashboard" },
    { name: "description", content: "Configurar visibilidad y orden de tarjetas y gráficos del dashboard" },
  ];
}

export async function clientLoader({}: Route.ClientLoaderArgs) {
  await getAuthUser();
  const data = await loadDefinitions();
  return { definitions: data };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DashboardOverridesPage({ loaderData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const { companyUsers, activeCompanyId } = useCompany();

  const isLoading = navigation.state !== "idle" || revalidator.state === "loading";

  // --- Roles & Permissions ---
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

  const canView = useMemo(
    () => hasPermissionCode(effectivePermissions, "view", "dashboard-config"),
    [effectivePermissions]
  );
  const canEdit = useMemo(
    () => hasPermissionCode(effectivePermissions, "edit", "dashboard-config"),
    [effectivePermissions]
  );

  // --- Local state for items ---
  const [cardItems, setCardItems] = useState<CardConfigItem[]>([]);
  const [chartItems, setChartItems] = useState<ChartConfigItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Build local state from loader data
  useEffect(() => {
    const { definitions } = loaderData;
    if (!definitions) return;

    const overrideMap = new Map<string, OverrideEntry>();
    if (definitions.overrides) {
      for (const ov of definitions.overrides) {
        overrideMap.set(`${ov.definitionType}:${ov.definitionId}`, ov);
      }
    }

    const cards: CardConfigItem[] = (definitions.cards ?? []).map((card: any, idx: number) => {
      const override = overrideMap.get(`card:${card.id}`);
      return {
        id: card.id,
        title: card.title ?? card.cardKey ?? card.id,
        definitionType: "card" as const,
        visible: override ? override.visible : (card.visible ?? true),
        order: override ? override.order : (card.order ?? (idx + 1) * 10),
      };
    });

    const charts: ChartConfigItem[] = (definitions.charts ?? []).map((chart: any, idx: number) => {
      const override = overrideMap.get(`chart:${chart.id}`);
      return {
        id: chart.id,
        title: chart.title ?? chart.chartKey ?? chart.id,
        definitionType: "chart" as const,
        chartType: chart.chartType ?? "bar",
        visible: override ? override.visible : (chart.visible !== false),
        order: override ? override.order : (chart.order ?? (idx + 1) * 10),
      };
    });

    // Sort by order
    cards.sort((a, b) => a.order - b.order);
    charts.sort((a, b) => a.order - b.order);

    setCardItems(cards);
    setChartItems(charts);
  }, [loaderData]);

  // --- Handlers ---

  const toggleCardVisibility = useCallback((id: string) => {
    setCardItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, visible: !item.visible } : item))
    );
    setSuccess(null);
  }, []);

  const toggleChartVisibility = useCallback((id: string) => {
    setChartItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, visible: !item.visible } : item))
    );
    setSuccess(null);
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const entries: OverrideEntry[] = [
        ...cardItems.map((item, idx) => ({
          definitionId: item.id,
          definitionType: "card" as const,
          visible: item.visible,
          order: idx + 1,
        })),
        ...chartItems.map((item, idx) => ({
          definitionId: item.id,
          definitionType: "chart" as const,
          visible: item.visible,
          order: idx + 1,
        })),
      ];
      await saveCompanyOverrides(entries);
      setSuccess("Configuración guardada correctamente.");
      revalidator.revalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar la configuración.");
    } finally {
      setSaving(false);
    }
  }, [cardItems, chartItems, revalidator]);

  // --- Permission gate ---
  if (!canView) {
    return (
      <DpContent title="ACCESOS DASHBOARD" breadcrumbItems={["SISTEMA", "ACCESOS DASHBOARD"]}>
        <Message severity="error" text="No tiene permisos para acceder a esta pantalla." className="w-full" />
      </DpContent>
    );
  }

  // --- Render ---
  return (
    <DpContent
      title="ACCESOS DASHBOARD"
      breadcrumbItems={["SISTEMA", "ACCESOS DASHBOARD"]}
    >
      <DpContentHeader
        filterValue=""
        onFilter={() => {}}
        onLoad={() => revalidator.revalidate()}
        showCreateButton={false}
        loading={isLoading}
        filterPlaceholder=""
      />

      {error && (
        <div className="mb-4">
          <Message severity="error" text={error} className="w-full" />
        </div>
      )}

      {success && (
        <div className="mb-4">
          <Message severity="success" text={success} className="w-full" />
        </div>
      )}

      {/* Cards Section */}
      <section className="mb-6">
        <h2 className="mb-3 text-lg font-semibold text-[var(--dp-on-surface)]">Tarjetas</h2>
        <DpTable<CardConfigItem>
          data={cardItems}
          loading={isLoading}
          tableDef={CARDS_TABLE_DEF}
          paginator={false}
          showFilterInHeader={false}
          emptyMessage="No hay tarjetas disponibles."
        >
          <DpTColumn<CardConfigItem> name="visible">
            {(row) => (
              <InputSwitch
                checked={row.visible}
                onChange={() => toggleCardVisibility(row.id)}
                disabled={!canEdit}
              />
            )}
          </DpTColumn>
        </DpTable>
      </section>

      {/* Charts Section */}
      <section className="mb-6">
        <h2 className="mb-3 text-lg font-semibold text-[var(--dp-on-surface)]">Gráficos</h2>
        <DpTable<ChartConfigItem>
          data={chartItems}
          loading={isLoading}
          tableDef={CHARTS_TABLE_DEF}
          paginator={false}
          showFilterInHeader={false}
          emptyMessage="No hay gráficos disponibles."
        >
          <DpTColumn<ChartConfigItem> name="visible">
            {(row) => (
              <InputSwitch
                checked={row.visible}
                onChange={() => toggleChartVisibility(row.id)}
                disabled={!canEdit}
              />
            )}
          </DpTColumn>
        </DpTable>
      </section>

      {/* Save button */}
      {canEdit && (
        <div className="flex justify-end">
          <Button
            label="Guardar"
            icon="pi pi-save"
            loading={saving}
            disabled={saving}
            onClick={handleSave}
          />
        </div>
      )}
    </DpContent>
  );
}
