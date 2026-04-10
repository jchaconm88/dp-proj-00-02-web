import { useEffect, useMemo, useState } from "react";
import { DpContent } from "~/components/DpContent";
import { DpInput } from "~/components/DpInput";
import {
  createEntityCountMetricTemplate,
  deleteDashboardCardDefinition,
  deleteMetricDefinition,
  listDashboardCardDefinitions,
  listMetricDefinitions,
  updateDashboardCardDefinition,
  updateMetricDefinition,
  type DashboardCardDefinitionRecord,
  type MetricDefinitionRecord,
} from "~/features/system/dashboard-config";
import type { Route } from "./+types/DashboardMetricsPage";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "Métricas dashboard" },
    { name: "description", content: "Configuración dinámica de métricas y tarjetas de dashboard" },
  ];
}

type TemplateForm = {
  entityLabel: string;
  metricKey: string;
  collectionName: string;
  planLimitKey: string;
  href: string;
  icon: string;
  accentClass: string;
};

const EMPTY_FORM: TemplateForm = {
  entityLabel: "",
  metricKey: "",
  collectionName: "",
  planLimitKey: "",
  href: "",
  icon: "chart-line",
  accentClass: "text-sky-600",
};

export default function DashboardMetricsPage() {
  const [metrics, setMetrics] = useState<MetricDefinitionRecord[]>([]);
  const [cards, setCards] = useState<DashboardCardDefinitionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<TemplateForm>(EMPTY_FORM);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const [metricRows, cardRows] = await Promise.all([listMetricDefinitions(), listDashboardCardDefinitions()]);
      setMetrics(metricRows);
      setCards(cardRows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar configuración.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  const metricKeys = useMemo(() => new Set(metrics.map((m) => m.metricKey)), [metrics]);

  async function handleCreateTemplate() {
    const metricKey = form.metricKey.trim();
    const entityLabel = form.entityLabel.trim();
    const collectionName = form.collectionName.trim();
    if (!metricKey || !entityLabel || !collectionName) return;
    if (metricKeys.has(metricKey)) {
      setError(`Ya existe una métrica con key "${metricKey}".`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createEntityCountMetricTemplate({
        entityLabel,
        metricKey,
        collectionName,
        planLimitKey: form.planLimitKey.trim() || undefined,
        href: form.href.trim() || undefined,
        icon: form.icon.trim() || "chart-line",
        accentClass: form.accentClass.trim() || "text-sky-600",
      });
      setForm(EMPTY_FORM);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear la plantilla.");
    } finally {
      setSaving(false);
    }
  }

  async function removeMetric(metricId: string) {
    setSaving(true);
    setError(null);
    try {
      await deleteMetricDefinition(metricId);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar la métrica.");
    } finally {
      setSaving(false);
    }
  }

  async function removeCard(cardId: string) {
    setSaving(true);
    setError(null);
    try {
      await deleteDashboardCardDefinition(cardId);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar la tarjeta.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleMetricActive(metric: MetricDefinitionRecord) {
    setSaving(true);
    setError(null);
    try {
      await updateMetricDefinition(metric.id, { active: !metric.active });
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo actualizar la métrica.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleCardVisible(card: DashboardCardDefinitionRecord) {
    setSaving(true);
    setError(null);
    try {
      await updateDashboardCardDefinition(card.id, { visible: !card.visible });
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo actualizar la tarjeta.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DpContent title="MÉTRICAS DASHBOARD" breadcrumbItems={["SISTEMA", "MÉTRICAS DASHBOARD"]}>
      <div className="space-y-4 text-sm">
        <p className="text-surface-600 dark:text-surface-400">
          Administración dinámica de <code>metric-definitions</code> y <code>dashboard-card-definitions</code>.
          Usa el asistente para alta rápida de métricas estándar por entidad.
        </p>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
            {error}
          </div>
        )}

        <section className="space-y-3 rounded-xl border border-surface-200 p-4 dark:border-navy-600">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-surface-500 dark:text-surface-400">
            Asistente: métrica estándar por entidad
          </h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <DpInput
              type="input"
              label="Nombre de entidad"
              value={form.entityLabel}
              onChange={(v) => setForm((f) => ({ ...f, entityLabel: v }))}
              placeholder="Facturas"
            />
            <DpInput
              type="input"
              label="metricKey"
              value={form.metricKey}
              onChange={(v) => setForm((f) => ({ ...f, metricKey: v }))}
              placeholder="invoicesCount"
            />
            <DpInput
              type="input"
              label="Colección Firestore"
              value={form.collectionName}
              onChange={(v) => setForm((f) => ({ ...f, collectionName: v }))}
              placeholder="invoices"
            />
            <DpInput
              type="input"
              label="planLimitKey (opcional)"
              value={form.planLimitKey}
              onChange={(v) => setForm((f) => ({ ...f, planLimitKey: v }))}
              placeholder="maxInvoices"
            />
            <DpInput
              type="input"
              label="Ruta tarjeta (opcional)"
              value={form.href}
              onChange={(v) => setForm((f) => ({ ...f, href: v }))}
              placeholder="/sales/invoices"
            />
            <DpInput
              type="input"
              label="Icono PrimeIcon"
              value={form.icon}
              onChange={(v) => setForm((f) => ({ ...f, icon: v }))}
              placeholder="file"
            />
            <DpInput
              type="input"
              label="Clase color"
              value={form.accentClass}
              onChange={(v) => setForm((f) => ({ ...f, accentClass: v }))}
              placeholder="text-sky-600"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded bg-sky-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
              disabled={
                saving || !form.entityLabel.trim() || !form.metricKey.trim() || !form.collectionName.trim()
              }
              onClick={() => void handleCreateTemplate()}
            >
              Crear métrica y tarjeta
            </button>
            <button
              type="button"
              className="rounded border border-surface-300 px-3 py-2 text-xs font-semibold dark:border-navy-500"
              disabled={saving}
              onClick={() => setForm(EMPTY_FORM)}
            >
              Limpiar
            </button>
          </div>
        </section>

        <section className="space-y-2 rounded-xl border border-surface-200 p-4 dark:border-navy-600">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-surface-500 dark:text-surface-400">
            Métricas definidas ({metrics.length})
          </h2>
          {loading ? (
            <p className="text-surface-500">Cargando...</p>
          ) : (
            <div className="overflow-auto rounded border border-surface-200 dark:border-navy-600">
              <table className="min-w-full text-xs">
                <thead className="bg-surface-100 dark:bg-navy-800">
                  <tr>
                    <th className="p-2 text-left">metricKey</th>
                    <th className="p-2 text-left">Tipo</th>
                    <th className="p-2 text-left">Colección</th>
                    <th className="p-2 text-left">Límite</th>
                    <th className="p-2 text-left">Estado</th>
                    <th className="p-2 text-left">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.map((m) => (
                    <tr key={m.id} className="border-t border-surface-200 dark:border-navy-700">
                      <td className="p-2 font-mono">{m.metricKey}</td>
                      <td className="p-2">{m.type}</td>
                      <td className="p-2">{m.source.collectionName ?? "—"}</td>
                      <td className="p-2">{m.planLimitKey ?? "—"}</td>
                      <td className="p-2">{m.active ? "Activa" : "Inactiva"}</td>
                      <td className="p-2">
                        <button
                          type="button"
                          className="mr-2 rounded border border-surface-300 px-2 py-1 dark:border-navy-500"
                          disabled={saving}
                          onClick={() => void toggleMetricActive(m)}
                        >
                          {m.active ? "Desactivar" : "Activar"}
                        </button>
                        <button
                          type="button"
                          className="rounded border border-red-300 px-2 py-1 text-red-700 dark:border-red-900 dark:text-red-300"
                          disabled={saving}
                          onClick={() => void removeMetric(m.id)}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="space-y-2 rounded-xl border border-surface-200 p-4 dark:border-navy-600">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-surface-500 dark:text-surface-400">
            Tarjetas definidas ({cards.length})
          </h2>
          {loading ? (
            <p className="text-surface-500">Cargando...</p>
          ) : (
            <div className="overflow-auto rounded border border-surface-200 dark:border-navy-600">
              <table className="min-w-full text-xs">
                <thead className="bg-surface-100 dark:bg-navy-800">
                  <tr>
                    <th className="p-2 text-left">cardKey</th>
                    <th className="p-2 text-left">metricKey</th>
                    <th className="p-2 text-left">Título</th>
                    <th className="p-2 text-left">Orden</th>
                    <th className="p-2 text-left">Visible</th>
                    <th className="p-2 text-left">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {cards.map((c) => (
                    <tr key={c.id} className="border-t border-surface-200 dark:border-navy-700">
                      <td className="p-2 font-mono">{c.cardKey}</td>
                      <td className="p-2 font-mono">{c.metricKey}</td>
                      <td className="p-2">{c.title}</td>
                      <td className="p-2">{c.order}</td>
                      <td className="p-2">{c.visible ? "Sí" : "No"}</td>
                      <td className="p-2">
                        <button
                          type="button"
                          className="mr-2 rounded border border-surface-300 px-2 py-1 dark:border-navy-500"
                          disabled={saving}
                          onClick={() => void toggleCardVisible(c)}
                        >
                          {c.visible ? "Ocultar" : "Mostrar"}
                        </button>
                        <button
                          type="button"
                          className="rounded border border-red-300 px-2 py-1 text-red-700 dark:border-red-900 dark:text-red-300"
                          disabled={saving}
                          onClick={() => void removeCard(c.id)}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </DpContent>
  );
}
