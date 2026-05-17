import { useRef, useState } from "react";
import { useRevalidator } from "react-router";
import { DpContent, DpContentHeader, DpContentSet } from "~/components/ui";
import { DpTable, type DpTableRef, type DpTableDefColumn } from "~/components/ui";
import { DpConfirmDialog } from "~/components/ui";
import { DpInput } from "~/components/ui";
import { getMetrics, createMetric, updateMetric, deleteMetric } from "~/features/system/dashboard";
import { getAuthUser } from "~/lib/get-auth-user";
import type { Route } from "./+types/DashboardMetricsPage";
import type { StatusSeverity } from "~/constants/status-options";

// ─── Flat row type for DpTable ────────────────────────────────────────────────

interface MetricTableRow {
  id: string;
  metricKey: string;
  label: string;
  type: string;
  measureType: string;
  source: string;
  readonly: string;
  _record: any;
}

// ─── Table definition ─────────────────────────────────────────────────────────

const SOURCE_OPTIONS: Record<string, { label: string; severity: StatusSeverity }> = {
  default: { label: "Default", severity: "info" },
  custom: { label: "Custom", severity: "success" },
};

const READONLY_OPTIONS: Record<string, { label: string; severity: StatusSeverity }> = {
  true: { label: "Readonly", severity: "warning" },
  false: { label: "Editable", severity: "secondary" },
};

const METRICS_TABLE_DEF: DpTableDefColumn[] = [
  { header: "Metric Key", column: "metricKey", order: 1, display: true, filter: true, sort: true },
  { header: "Label", column: "label", order: 2, display: true, filter: true, sort: true },
  { header: "Tipo", column: "type", order: 3, display: true, filter: true, sort: true },
  { header: "Medición", column: "measureType", order: 4, display: true, filter: true, sort: true },
  { header: "Source", column: "source", order: 5, display: true, filter: true, type: "status", typeOptions: SOURCE_OPTIONS },
  { header: "Readonly", column: "readonly", order: 6, display: true, filter: true, type: "status", typeOptions: READONLY_OPTIONS },
];

// ─── Form options ─────────────────────────────────────────────────────────────

const METRIC_TYPE_OPTIONS = [
  { label: "Entity Count", value: "entityCount" },
  { label: "Sum", value: "sum" },
  { label: "Ratio", value: "ratio" },
  { label: "Custom", value: "custom" },
];

const MEASURE_TYPE_OPTIONS = [
  { label: "Counter Monthly", value: "counterMonthly" },
  { label: "Gauge Current", value: "gaugeCurrent" },
];

const VALUE_FORMAT_OPTIONS = [
  { label: "Number", value: "number" },
  { label: "Currency", value: "currency" },
  { label: "Percentage", value: "percentage" },
  { label: "Bytes", value: "bytes" },
];

// ─── Flatten helper ───────────────────────────────────────────────────────────

function flattenMetrics(records: any[]): MetricTableRow[] {
  return records.map((r) => ({
    id: r.data.id,
    metricKey: r.data.metricKey,
    label: r.data.label,
    type: r.data.type,
    measureType: r.data.measureType,
    source: r.source,
    readonly: String(r.readonly),
    _record: r,
  }));
}

// ─── Meta ─────────────────────────────────────────────────────────────────────

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "Métricas dashboard" },
    { name: "description", content: "Gestión de métricas de dashboard" },
  ];
}

// ─── Client Loader ────────────────────────────────────────────────────────────

export async function clientLoader(_args: Route.ClientLoaderArgs) {
  await getAuthUser();
  const items = await getMetrics();
  return { metrics: flattenMetrics(items) };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardMetricsPage({ loaderData }: Route.ComponentProps) {
  const revalidator = useRevalidator();
  const tableRef = useRef<DpTableRef<MetricTableRow>>(null);
  const [filterValue, setFilterValue] = useState("");
  const [selectedCount, setSelectedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Delete state
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  // Form state
  const [formVisible, setFormVisible] = useState(false);
  const [formEdit, setFormEdit] = useState<any | null>(null);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form fields
  const [metricKey, setMetricKey] = useState("");
  const [label, setLabel] = useState("");
  const [type, setType] = useState("entityCount");
  const [measureType, setMeasureType] = useState("counterMonthly");
  const [valueFormat, setValueFormat] = useState("number");
  const [collectionName, setCollectionName] = useState("");
  const [active, setActive] = useState(true);

  const isLoading = revalidator.state === "loading";

  const handleFilter = (value: string) => {
    setFilterValue(value);
    tableRef.current?.filter(value);
  };

  // ─── Create / Edit ────────────────────────────────────────────────────────

  const openCreate = () => {
    setFormEdit(null);
    setMetricKey("");
    setLabel("");
    setType("entityCount");
    setMeasureType("counterMonthly");
    setValueFormat("number");
    setCollectionName("");
    setActive(true);
    setFormError(null);
    setFormVisible(true);
  };

  const openEdit = (row: MetricTableRow) => {
    if (row.readonly === "true") {
      setError("Las métricas default no se pueden editar.");
      return;
    }
    const d = row._record.data;
    setFormEdit(row._record);
    setMetricKey(d.metricKey);
    setLabel(d.label);
    setType(d.type);
    setMeasureType(d.measureType);
    setValueFormat(d.valueFormat);
    setCollectionName(d.source?.collectionName ?? "");
    setActive(d.active);
    setFormError(null);
    setFormVisible(true);
  };

  const handleFormSave = async () => {
    // Basic validation
    if (!metricKey.trim() || !label.trim() || !collectionName.trim()) {
      setFormError("Metric Key, Label y Collection Name son requeridos.");
      return;
    }

    setFormSaving(true);
    setFormError(null);

    const payload: any = {
      metricKey: metricKey.trim(),
      label: label.trim(),
      type,
      measureType,
      valueFormat,
      source: { collectionName: collectionName.trim() },
      active,
      target: "web",
    };

    try {
      if (formEdit) {
        await updateMetric(formEdit.data.id, payload);
      } else {
        await createMetric(payload);
      }
      setFormVisible(false);
      revalidator.revalidate();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Error al guardar.");
    } finally {
      setFormSaving(false);
    }
  };

  // ─── Delete ───────────────────────────────────────────────────────────────

  const openDeleteConfirm = () => {
    const selected = tableRef.current?.getSelectedRows() ?? [];
    if (!selected.length) return;
    if (selected.some((s) => s.readonly === "true")) {
      setError("Las métricas default no se pueden eliminar.");
      return;
    }
    setPendingDeleteIds(selected.map((s) => s.id));
  };

  const handleConfirmDelete = async () => {
    const ids = pendingDeleteIds;
    if (!ids?.length) return;
    setDeleteSaving(true);
    setError(null);
    try {
      await Promise.all(ids.map((id) => deleteMetric(id)));
      tableRef.current?.clearSelectedRows();
      setPendingDeleteIds(null);
      revalidator.revalidate();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al eliminar.");
    } finally {
      setDeleteSaving(false);
    }
  };

  return (
    <>
      <DpContent title="MÉTRICAS DASHBOARD" breadcrumbItems={["SISTEMA", "MÉTRICAS DASHBOARD"]} onCreate={openCreate}>
        <DpContentHeader
          filterValue={filterValue}
          onFilter={handleFilter}
          onLoad={() => revalidator.revalidate()}
          showCreateButton={false}
          onDelete={openDeleteConfirm}
          deleteDisabled={selectedCount === 0 || deleteSaving}
          loading={isLoading}
          filterPlaceholder="Filtrar métricas..."
        />

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
            {error}
          </div>
        )}

        <DpTable<MetricTableRow>
          ref={tableRef}
          data={loaderData.metrics}
          loading={isLoading}
          tableDef={METRICS_TABLE_DEF}
          linkColumn="metricKey"
          onDetail={openEdit}
          onEdit={openEdit}
          onSelectionChange={(rows) => setSelectedCount(rows.length)}
          showFilterInHeader={false}
          emptyMessage="No hay métricas definidas."
          emptyFilterMessage="No hay resultados para el filtro."
        />
      </DpContent>

      {/* Create/Edit Form Dialog */}
      <DpContentSet
        title={formEdit ? "Editar Métrica" : "Nueva Métrica"}
        visible={formVisible}
        onHide={() => !formSaving && setFormVisible(false)}
        onCancel={() => setFormVisible(false)}
        onSave={handleFormSave}
        saving={formSaving}
        saveDisabled={formSaving}
        showError={!!formError}
        errorMessage={formError ?? ""}
      >
        <div className="flex flex-col gap-4">
          <DpInput
            type="input"
            label="Metric Key"
            name="metricKey"
            value={metricKey}
            onChange={setMetricKey}
            disabled={!!formEdit}
            placeholder="ej: trips-count"
          />
          <DpInput
            type="input"
            label="Label"
            name="label"
            value={label}
            onChange={setLabel}
            placeholder="Nombre descriptivo"
          />
          <DpInput
            type="select"
            label="Tipo"
            name="type"
            value={type}
            onChange={(v) => setType(String(v))}
            options={METRIC_TYPE_OPTIONS}
            placeholder="Seleccionar tipo"
          />
          <DpInput
            type="select"
            label="Medición"
            name="measureType"
            value={measureType}
            onChange={(v) => setMeasureType(String(v))}
            options={MEASURE_TYPE_OPTIONS}
            placeholder="Seleccionar medición"
          />
          <DpInput
            type="select"
            label="Formato de Valor"
            name="valueFormat"
            value={valueFormat}
            onChange={(v) => setValueFormat(String(v))}
            options={VALUE_FORMAT_OPTIONS}
            placeholder="Seleccionar formato"
          />
          <DpInput
            type="input"
            label="Collection Name"
            name="collectionName"
            value={collectionName}
            onChange={setCollectionName}
            placeholder="ej: trips"
          />
          <DpInput
            type="check"
            label="Activa"
            name="active"
            value={active}
            onChange={setActive}
          />
        </div>
      </DpContentSet>

      {/* Delete Confirmation */}
      <DpConfirmDialog
        visible={pendingDeleteIds !== null}
        onHide={() => !deleteSaving && setPendingDeleteIds(null)}
        title="Eliminar métricas"
        message={
          pendingDeleteIds?.length
            ? `¿Eliminar ${pendingDeleteIds.length} métrica(s)? Esta acción no se puede deshacer.`
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
