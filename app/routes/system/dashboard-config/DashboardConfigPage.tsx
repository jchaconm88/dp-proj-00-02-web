import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRevalidator } from "react-router";
import { TabView, TabPanel } from "primereact/tabview";
import { Button } from "primereact/button";
import { DpContent, DpContentHeader, DpContentSet } from "~/components/DpContent";
import { DpTable, DpTColumn, type DpTableRef, type DpTableDefColumn } from "~/components/DpTable";
import { DpConfirmDialog } from "~/components/DpConfirmDialog";
import { DpInput } from "~/components/DpInput";
import { getAuthUser } from "~/lib/get-auth-user";
import {
  getCards,
  getCharts,
  getMetrics,
  createCard,
  updateCard,
  deleteCard,
  createChart,
  updateChart,
  deleteChart,
} from "~/features/system/dashboard";
import type { Route } from "./+types/DashboardConfigPage";
import type { StatusSeverity } from "~/constants/status-options";

// ─── Row types ────────────────────────────────────────────────────────────────

interface CardTableRow {
  id: string;
  cardKey: string;
  title: string;
  metricKey: string;
  target: string;
  order: number;
  visible: boolean;
  source: string;
  readonly: boolean;
  _raw: any;
}

interface ChartTableRow {
  id: string;
  chartKey: string;
  title: string;
  chartType: string;
  target: string;
  source: string;
  readonly: boolean;
  _raw: any;
}

// ─── Table definitions ────────────────────────────────────────────────────────

const SOURCE_OPTIONS: Record<string, { label: string; severity: StatusSeverity }> = {
  default: { label: "Default", severity: "info" },
  custom: { label: "Custom", severity: "success" },
};

const READONLY_OPTIONS: Record<string, { label: string; severity: StatusSeverity }> = {
  true: { label: "Readonly", severity: "warning" },
  false: { label: "Editable", severity: "secondary" },
};

const VISIBLE_OPTIONS: Record<string, { label: string; severity: StatusSeverity }> = {
  true: { label: "Sí", severity: "success" },
  false: { label: "No", severity: "secondary" },
};

const CARDS_TABLE_DEF: DpTableDefColumn[] = [
  { header: "Card Key", column: "cardKey", order: 1, display: true, filter: true, sort: true },
  { header: "Título", column: "title", order: 2, display: true, filter: true, sort: true },
  { header: "Metric Key", column: "metricKey", order: 3, display: true, filter: true, sort: true },
  { header: "Target", column: "target", order: 4, display: true, filter: true, sort: true },
  { header: "Orden", column: "order", order: 5, display: true, filter: true, sort: true },
  { header: "Visible", column: "visible", order: 6, display: true, filter: true, type: "status", typeOptions: VISIBLE_OPTIONS },
  { header: "Source", column: "source", order: 7, display: true, filter: true, type: "status", typeOptions: SOURCE_OPTIONS },
  { header: "Readonly", column: "readonly", order: 8, display: true, filter: true, type: "status", typeOptions: READONLY_OPTIONS },
];

const CHARTS_TABLE_DEF: DpTableDefColumn[] = [
  { header: "Chart Key", column: "chartKey", order: 1, display: true, filter: true, sort: true },
  { header: "Título", column: "title", order: 2, display: true, filter: true, sort: true },
  { header: "Tipo", column: "chartType", order: 3, display: true, filter: true, sort: true },
  { header: "Target", column: "target", order: 4, display: true, filter: true, sort: true },
  { header: "Source", column: "source", order: 5, display: true, filter: true, type: "status", typeOptions: SOURCE_OPTIONS },
  { header: "Readonly", column: "readonly", order: 6, display: true, filter: true, type: "status", typeOptions: READONLY_OPTIONS },
];

// ─── Flatten helpers ──────────────────────────────────────────────────────────

function flattenCards(records: any[]): CardTableRow[] {
  return records.map((r: any) => ({
    id: r.id ?? r.cardKey,
    cardKey: r.cardKey,
    title: r.title,
    metricKey: r.metricKey,
    target: r.target,
    order: r.order,
    visible: r.visible,
    source: r.source ?? "custom",
    readonly: r.readonly ?? false,
    _raw: r,
  }));
}

function flattenCharts(records: any[]): ChartTableRow[] {
  return records.map((r: any) => ({
    id: r.id ?? r.chartKey,
    chartKey: r.chartKey,
    title: r.title,
    chartType: r.chartType,
    target: r.target,
    source: r.source ?? "custom",
    readonly: r.readonly ?? false,
    _raw: r,
  }));
}

// ─── Form options ─────────────────────────────────────────────────────────────

const TARGET_OPTIONS = [
  { label: "Web", value: "web" },
  { label: "Both", value: "both" },
];

const CHART_TYPE_OPTIONS = [
  { label: "Bar", value: "bar" },
  { label: "Line", value: "line" },
  { label: "Pie", value: "pie" },
  { label: "Doughnut", value: "doughnut" },
];

const GROUP_BY_OPTIONS = [
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
];

// ─── Meta & clientLoader ──────────────────────────────────────────────────────

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "Config. Dashboard" },
    { name: "description", content: "CRUD de tarjetas y gráficos del dashboard" },
  ];
}

export async function clientLoader(_args: Route.ClientLoaderArgs) {
  await getAuthUser();
  const [cards, charts] = await Promise.all([getCards(), getCharts()]);
  return { cards: flattenCards(cards), charts: flattenCharts(charts) };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardConfigPage({ loaderData }: Route.ComponentProps) {
  const revalidator = useRevalidator();

  // ─── Tab state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState(0);
  const [filterValue, setFilterValue] = useState("");

  // ─── Table refs ─────────────────────────────────────────────────────────────
  const cardsTableRef = useRef<DpTableRef<CardTableRow>>(null);
  const chartsTableRef = useRef<DpTableRef<ChartTableRow>>(null);

  // ─── Metrics (for form dropdowns) ───────────────────────────────────────────
  const [metricKeys, setMetricKeys] = useState<string[]>([]);
  const [metricsLoaded, setMetricsLoaded] = useState(false);

  const loadMetricKeys = useCallback(async () => {
    if (metricsLoaded) return;
    try {
      const items = await getMetrics();
      setMetricKeys(items.map((m: any) => m.data?.metricKey ?? m.metricKey));
      setMetricsLoaded(true);
    } catch {
      // silently fail — user can type manually
    }
  }, [metricsLoaded]);

  // ─── Error state ────────────────────────────────────────────────────────────
  const [error, setError] = useState<string | null>(null);

  // ─── Delete confirm ─────────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "card" | "chart";
    id: string;
    label: string;
  } | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  // ─── Card form state ────────────────────────────────────────────────────────
  const [cardFormVisible, setCardFormVisible] = useState(false);
  const [cardFormEdit, setCardFormEdit] = useState<CardTableRow | null>(null);
  const [cardFormSaving, setCardFormSaving] = useState(false);
  const [cardFormError, setCardFormError] = useState<string | null>(null);

  const [cardKey, setCardKey] = useState("");
  const [cardMetricKey, setCardMetricKey] = useState("");
  const [cardTitle, setCardTitle] = useState("");
  const [cardIcon, setCardIcon] = useState("");
  const [cardAccentClass, setCardAccentClass] = useState("");
  const [cardOrder, setCardOrder] = useState("1");
  const [cardVisible, setCardVisible] = useState(true);
  const [cardActive, setCardActive] = useState(true);
  const [cardTarget, setCardTarget] = useState("web");
  const [cardPermissionModule, setCardPermissionModule] = useState("");

  // ─── Chart form state ───────────────────────────────────────────────────────
  const [chartFormVisible, setChartFormVisible] = useState(false);
  const [chartFormEdit, setChartFormEdit] = useState<ChartTableRow | null>(null);
  const [chartFormSaving, setChartFormSaving] = useState(false);
  const [chartFormError, setChartFormError] = useState<string | null>(null);

  const [chartKey, setChartKey] = useState("");
  const [chartTitle, setChartTitle] = useState("");
  const [chartType, setChartType] = useState("bar");
  const [chartMetricKeysStr, setChartMetricKeysStr] = useState("");
  const [chartGroupBy, setChartGroupBy] = useState("monthly");
  const [chartTarget, setChartTarget] = useState("web");
  const [chartPermissionModule, setChartPermissionModule] = useState("");
  const [chartActive, setChartActive] = useState(true);

  const isLoading = revalidator.state === "loading";

  const metricKeyOptions = useMemo(
    () => metricKeys.map((k) => ({ label: k, value: k })),
    [metricKeys]
  );

  // ─── Filter & Reload ────────────────────────────────────────────────────────
  const handleFilter = (value: string) => {
    setFilterValue(value);
    if (activeTab === 0) cardsTableRef.current?.filter(value);
    else chartsTableRef.current?.filter(value);
  };

  const handleReload = () => {
    revalidator.revalidate();
  };

  // ─── Card CRUD handlers ─────────────────────────────────────────────────────

  const openCreateCard = () => {
    void loadMetricKeys();
    setCardFormEdit(null);
    setCardKey("");
    setCardMetricKey("");
    setCardTitle("");
    setCardIcon("");
    setCardAccentClass("");
    setCardOrder("1");
    setCardVisible(true);
    setCardActive(true);
    setCardTarget("web");
    setCardPermissionModule("");
    setCardFormError(null);
    setCardFormVisible(true);
  };

  const openEditCard = (row: CardTableRow) => {
    if (row.readonly) {
      setError("Las tarjetas default no se pueden editar.");
      return;
    }
    void loadMetricKeys();
    setCardFormEdit(row);
    setCardKey(row.cardKey);
    setCardMetricKey(row.metricKey);
    setCardTitle(row.title);
    setCardIcon(row._raw.icon ?? "");
    setCardAccentClass(row._raw.accentClass ?? "");
    setCardOrder(String(row.order));
    setCardVisible(row.visible);
    setCardActive(row._raw.active ?? true);
    setCardTarget(row.target);
    setCardPermissionModule(row._raw.permissionModule ?? "");
    setCardFormError(null);
    setCardFormVisible(true);
  };

  const handleSaveCard = async () => {
    if (!cardKey.trim() || !cardMetricKey.trim() || !cardTitle.trim()) {
      setCardFormError("Card Key, Metric Key y Título son requeridos.");
      return;
    }
    setCardFormSaving(true);
    setCardFormError(null);

    const payload: any = {
      cardKey: cardKey.trim(),
      metricKey: cardMetricKey.trim(),
      title: cardTitle.trim(),
      icon: cardIcon.trim(),
      accentClass: cardAccentClass.trim(),
      order: parseInt(cardOrder, 10) || 1,
      visible: cardVisible,
      active: cardActive,
      target: cardTarget,
      permissionModule: cardPermissionModule.trim() || null,
    };

    try {
      if (cardFormEdit) {
        await updateCard(cardFormEdit.id, payload);
      } else {
        await createCard(payload);
      }
      setCardFormVisible(false);
      revalidator.revalidate();
    } catch (e) {
      setCardFormError(e instanceof Error ? e.message : "Error al guardar la tarjeta.");
    } finally {
      setCardFormSaving(false);
    }
  };

  // ─── Chart CRUD handlers ────────────────────────────────────────────────────

  const openCreateChart = () => {
    void loadMetricKeys();
    setChartFormEdit(null);
    setChartKey("");
    setChartTitle("");
    setChartType("bar");
    setChartMetricKeysStr("");
    setChartGroupBy("monthly");
    setChartTarget("web");
    setChartPermissionModule("");
    setChartActive(true);
    setChartFormError(null);
    setChartFormVisible(true);
  };

  const openEditChart = (row: ChartTableRow) => {
    if (row.readonly) {
      setError("Los gráficos default no se pueden editar.");
      return;
    }
    void loadMetricKeys();
    setChartFormEdit(row);
    setChartKey(row.chartKey);
    setChartTitle(row.title);
    setChartType(row.chartType);
    setChartMetricKeysStr((row._raw.metricKeys ?? []).join(", "));
    setChartGroupBy(row._raw.groupBy ?? "monthly");
    setChartTarget(row.target);
    setChartPermissionModule(row._raw.permissionModule ?? "");
    setChartActive(row._raw.active ?? true);
    setChartFormError(null);
    setChartFormVisible(true);
  };

  const handleSaveChart = async () => {
    if (!chartKey.trim() || !chartTitle.trim() || !chartPermissionModule.trim()) {
      setChartFormError("Chart Key, Título y Permission Module son requeridos.");
      return;
    }
    const keys = chartMetricKeysStr.split(",").map((k) => k.trim()).filter(Boolean);
    if (keys.length === 0) {
      setChartFormError("Al menos 1 Metric Key es requerido.");
      return;
    }

    setChartFormSaving(true);
    setChartFormError(null);

    const payload: any = {
      chartKey: chartKey.trim(),
      title: chartTitle.trim(),
      chartType,
      metricKeys: keys,
      groupBy: chartGroupBy,
      target: chartTarget,
      permissionModule: chartPermissionModule.trim(),
      active: chartActive,
    };

    try {
      if (chartFormEdit) {
        await updateChart(chartFormEdit.id, payload);
      } else {
        await createChart(payload);
      }
      setChartFormVisible(false);
      revalidator.revalidate();
    } catch (e) {
      setChartFormError(e instanceof Error ? e.message : "Error al guardar el gráfico.");
    } finally {
      setChartFormSaving(false);
    }
  };

  // ─── Delete handler ─────────────────────────────────────────────────────────
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteSaving(true);
    setError(null);
    try {
      if (deleteTarget.type === "card") {
        await deleteCard(deleteTarget.id);
      } else {
        await deleteChart(deleteTarget.id);
      }
      setDeleteTarget(null);
      revalidator.revalidate();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al eliminar.");
    } finally {
      setDeleteSaving(false);
    }
  };

  // ─── Create button handler ──────────────────────────────────────────────────
  const handleCreate = () => {
    if (activeTab === 0) openCreateCard();
    else openCreateChart();
  };

  // ─── Actions column renderers ───────────────────────────────────────────────
  const cardActionsRenderer = useCallback(
    (row: CardTableRow) => {
      if (row.readonly) return null;
      return (
        <div className="flex gap-1">
          <Button
            icon="pi pi-trash"
            className="p-button-text p-button-sm p-button-danger"
            tooltip="Eliminar"
            tooltipOptions={{ position: "top" }}
            onClick={() => setDeleteTarget({ type: "card", id: row.id, label: row.title })}
          />
        </div>
      );
    },
    []
  );

  const chartActionsRenderer = useCallback(
    (row: ChartTableRow) => {
      if (row.readonly) return null;
      return (
        <div className="flex gap-1">
          <Button
            icon="pi pi-trash"
            className="p-button-text p-button-sm p-button-danger"
            tooltip="Eliminar"
            tooltipOptions={{ position: "top" }}
            onClick={() => setDeleteTarget({ type: "chart", id: row.id, label: row.title })}
          />
        </div>
      );
    },
    []
  );

  return (
    <>
      <DpContent
        title="CONFIG. DASHBOARD"
        breadcrumbItems={["SISTEMA", "CONFIG. DASHBOARD"]}
        onCreate={handleCreate}
      >
        {error && (
          <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
            {error}
          </div>
        )}

        <TabView activeIndex={activeTab} onTabChange={(e) => { setActiveTab(e.index); setFilterValue(""); }}>
          {/* ─── Tarjetas Tab ─────────────────────────────────────────── */}
          <TabPanel header="Tarjetas">
            <div className="space-y-3">
              <DpContentHeader
                filterValue={filterValue}
                onFilter={handleFilter}
                onLoad={handleReload}
                showCreateButton={false}
                loading={isLoading}
                filterPlaceholder="Filtrar tarjetas..."
              />

              <DpTable<CardTableRow>
                ref={cardsTableRef}
                data={loaderData.cards}
                loading={isLoading}
                tableDef={CARDS_TABLE_DEF}
                linkColumn="cardKey"
                onDetail={openEditCard}
                onEdit={openEditCard}
                showFilterInHeader={false}
                emptyMessage="No hay tarjetas definidas."
              >
                <DpTColumn<CardTableRow> name="actions">
                  {cardActionsRenderer}
                </DpTColumn>
              </DpTable>
            </div>
          </TabPanel>

          {/* ─── Gráficos Tab ─────────────────────────────────────────── */}
          <TabPanel header="Gráficos">
            <div className="space-y-3">
              <DpContentHeader
                filterValue={filterValue}
                onFilter={handleFilter}
                onLoad={handleReload}
                showCreateButton={false}
                loading={isLoading}
                filterPlaceholder="Filtrar gráficos..."
              />

              <DpTable<ChartTableRow>
                ref={chartsTableRef}
                data={loaderData.charts}
                loading={isLoading}
                tableDef={CHARTS_TABLE_DEF}
                linkColumn="chartKey"
                onDetail={openEditChart}
                onEdit={openEditChart}
                showFilterInHeader={false}
                emptyMessage="No hay gráficos definidos."
              >
                <DpTColumn<ChartTableRow> name="actions">
                  {chartActionsRenderer}
                </DpTColumn>
              </DpTable>
            </div>
          </TabPanel>
        </TabView>
      </DpContent>

      {/* ─── Card Form Dialog ──────────────────────────────────────────── */}
      <DpContentSet
        title={cardFormEdit ? "Editar Tarjeta" : "Nueva Tarjeta"}
        visible={cardFormVisible}
        onHide={() => !cardFormSaving && setCardFormVisible(false)}
        onCancel={() => setCardFormVisible(false)}
        onSave={handleSaveCard}
        saving={cardFormSaving}
        saveDisabled={cardFormSaving}
        showError={!!cardFormError}
        errorMessage={cardFormError ?? ""}
      >
        <div className="flex flex-col gap-4">
          <DpInput
            type="input"
            label="Card Key"
            name="cardKey"
            value={cardKey}
            onChange={setCardKey}
            disabled={!!cardFormEdit}
            placeholder="ej: trips-count-card"
          />
          {metricKeyOptions.length > 0 ? (
            <DpInput
              type="select"
              label="Metric Key"
              name="metricKey"
              value={cardMetricKey}
              onChange={(v) => setCardMetricKey(String(v))}
              options={metricKeyOptions}
              placeholder="Seleccionar métrica"
              filter
            />
          ) : (
            <DpInput
              type="input"
              label="Metric Key"
              name="metricKey"
              value={cardMetricKey}
              onChange={setCardMetricKey}
              placeholder="ej: trips-count"
            />
          )}
          <DpInput
            type="input"
            label="Título"
            name="title"
            value={cardTitle}
            onChange={setCardTitle}
            placeholder="Nombre de la tarjeta"
          />
          <DpInput
            type="input"
            label="Icono"
            name="icon"
            value={cardIcon}
            onChange={setCardIcon}
            placeholder="ej: pi pi-map"
          />
          <DpInput
            type="input"
            label="Accent Class"
            name="accentClass"
            value={cardAccentClass}
            onChange={setCardAccentClass}
            placeholder="ej: text-blue-500"
          />
          <DpInput
            type="number"
            label="Orden"
            name="order"
            value={cardOrder}
            onChange={setCardOrder}
            placeholder="1-999"
          />
          <DpInput
            type="select"
            label="Target"
            name="target"
            value={cardTarget}
            onChange={(v) => setCardTarget(String(v))}
            options={TARGET_OPTIONS}
          />
          <DpInput
            type="input"
            label="Permission Module (opcional)"
            name="permissionModule"
            value={cardPermissionModule}
            onChange={setCardPermissionModule}
            placeholder="ej: trip"
          />
          <DpInput
            type="check"
            label="Visible"
            name="visible"
            value={cardVisible}
            onChange={setCardVisible}
          />
          <DpInput
            type="check"
            label="Activa"
            name="active"
            value={cardActive}
            onChange={setCardActive}
          />
        </div>
      </DpContentSet>

      {/* ─── Chart Form Dialog ─────────────────────────────────────────── */}
      <DpContentSet
        title={chartFormEdit ? "Editar Gráfico" : "Nuevo Gráfico"}
        visible={chartFormVisible}
        onHide={() => !chartFormSaving && setChartFormVisible(false)}
        onCancel={() => setChartFormVisible(false)}
        onSave={handleSaveChart}
        saving={chartFormSaving}
        saveDisabled={chartFormSaving}
        showError={!!chartFormError}
        errorMessage={chartFormError ?? ""}
      >
        <div className="flex flex-col gap-4">
          <DpInput
            type="input"
            label="Chart Key"
            name="chartKey"
            value={chartKey}
            onChange={setChartKey}
            disabled={!!chartFormEdit}
            placeholder="ej: trips-trend"
          />
          <DpInput
            type="input"
            label="Título"
            name="title"
            value={chartTitle}
            onChange={setChartTitle}
            placeholder="Nombre del gráfico"
          />
          <DpInput
            type="select"
            label="Tipo de Gráfico"
            name="chartType"
            value={chartType}
            onChange={(v) => setChartType(String(v))}
            options={CHART_TYPE_OPTIONS}
          />
          <DpInput
            type="input"
            label="Metric Keys (separados por coma)"
            name="metricKeys"
            value={chartMetricKeysStr}
            onChange={setChartMetricKeysStr}
            placeholder="ej: trips-count, invoices-count"
          />
          <DpInput
            type="select"
            label="Group By"
            name="groupBy"
            value={chartGroupBy}
            onChange={(v) => setChartGroupBy(String(v))}
            options={GROUP_BY_OPTIONS}
          />
          <DpInput
            type="select"
            label="Target"
            name="target"
            value={chartTarget}
            onChange={(v) => setChartTarget(String(v))}
            options={TARGET_OPTIONS}
          />
          <DpInput
            type="input"
            label="Permission Module"
            name="permissionModule"
            value={chartPermissionModule}
            onChange={setChartPermissionModule}
            placeholder="ej: trip"
          />
          <DpInput
            type="check"
            label="Activo"
            name="active"
            value={chartActive}
            onChange={setChartActive}
          />
        </div>
      </DpContentSet>

      {/* ─── Delete Confirmation ───────────────────────────────────────── */}
      <DpConfirmDialog
        visible={deleteTarget !== null}
        onHide={() => { if (!deleteSaving) setDeleteTarget(null); }}
        title="Eliminar definición"
        message={
          deleteTarget
            ? `¿Eliminar "${deleteTarget.label}"? Esta acción no se puede deshacer.`
            : ""
        }
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={handleConfirmDelete}
        severity="danger"
        loading={deleteSaving}
      />
    </>
  );
}
