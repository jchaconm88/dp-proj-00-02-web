import { useRef, useState } from "react";
import { useNavigate, useNavigation, useRevalidator } from "react-router";
import { Button } from "primereact/button";
import type { Route } from "./+types/ReportDefinitionsPage";
import { DpContent, DpContentHeader } from "~/components/DpContent";
import { DpTable, type DpTableRef, type DpTableDefColumn } from "~/components/DpTable";
import { DpConfirmDialog } from "~/components/DpConfirmDialog";
import DpTColumn from "~/components/DpTable/DpTColumn";
import type { ReportDefinitionRecord } from "~/features/reports/reports.types";
import {
  deleteReportDefinition,
  displayGranularityLabel,
  getReportDefinitions,
} from "~/features/reports/reports.service";
import ReportDefinitionDialog from "./ReportDefinitionDialog";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Reportes" },
    { name: "description", content: "Definiciones de reportes (colección report-definitions)" },
  ];
}

type DefRow = ReportDefinitionRecord & {
  granularityLabel: string;
  scheduleLabel: string;
  layoutLabel: string;
};

const DEF_TABLE: DpTableDefColumn[] = [
  { header: "Nombre", column: "name", order: 1, display: true, filter: true },
  { header: "Diseño", column: "layoutLabel", order: 2, display: true, filter: true },
  { header: "Granularidad", column: "granularityLabel", order: 3, display: true, filter: true },
  { header: "Programación", column: "scheduleLabel", order: 4, display: true, filter: true },
  { header: "Corridas", column: "_runs", order: 5, display: true, filter: false },
];

export async function clientLoader() {
  const definitions = await getReportDefinitions();
  const defRows: DefRow[] = definitions.map((d) => ({
    ...d,
    layoutLabel:
      d.layoutKind !== "pivot"
        ? "Tabular (legacy)"
        : d.pivotSpec?.outputKind === "detail"
          ? "Pivot · detalle"
          : "Pivot · resumen",
    granularityLabel: displayGranularityLabel(d),
    scheduleLabel: d.schedule?.enabled ? `Sí (${d.schedule.frequency ?? "daily"})` : "No",
  }));
  return { defRows };
}

export default function ReportDefinitionsPage({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const defTableRef = useRef<DpTableRef<DefRow>>(null);

  const [defFilter, setDefFilter] = useState("");
  const [defDialogOpen, setDefDialogOpen] = useState(false);
  const [editingDef, setEditingDef] = useState<ReportDefinitionRecord | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [defSelectedCount, setDefSelectedCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLoading = navigation.state !== "idle" || revalidator.state === "loading";

  const openCreateDef = () => {
    setEditingDef(null);
    setDefDialogOpen(true);
  };

  const openEditDef = (row: DefRow) => {
    const { granularityLabel: _g, scheduleLabel: _s, layoutLabel: _l, ...rest } = row;
    setEditingDef(rest);
    setDefDialogOpen(true);
  };

  const selectedDefs = () => defTableRef.current?.getSelectedRows() ?? [];

  const handleDeleteDefs = async () => {
    const sel = selectedDefs();
    if (sel.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      for (const r of sel) {
        await deleteReportDefinition(r.id);
      }
      defTableRef.current?.clearSelectedRows();
      setDeleteConfirm(false);
      revalidator.revalidate();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al eliminar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DpContent title="REPORTES">
      {error && (
        <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}

      <DpContentHeader
        filterValue={defFilter}
        onFilter={(v) => {
          setDefFilter(v);
          defTableRef.current?.filter(v);
        }}
        onLoad={() => revalidator.revalidate()}
        onCreate={openCreateDef}
        onDelete={() => setDeleteConfirm(true)}
        deleteDisabled={saving || defSelectedCount === 0}
        loading={isLoading}
        filterPlaceholder="Filtrar definiciones..."
      />
      <DpTable<DefRow>
        ref={defTableRef}
        data={loaderData.defRows}
        loading={isLoading || saving}
        tableDef={DEF_TABLE}
        linkColumn="name"
        onDetail={openEditDef}
        onEdit={openEditDef}
        onSelectionChange={(rows) => setDefSelectedCount(rows.length)}
        showFilterInHeader={false}
        emptyMessage="No hay definiciones. Usa Agregar para crear una."
        emptyFilterMessage="Sin resultados."
      >
        <DpTColumn<DefRow> name="_runs">
          {(row) => (
            <Button
              type="button"
              icon="pi pi-list"
              rounded
              text
              title="Ver historial de corridas"
              onClick={() => navigate(`/reports/${encodeURIComponent(row.id)}/runs`)}
            />
          )}
        </DpTColumn>
      </DpTable>

      <ReportDefinitionDialog
        visible={defDialogOpen}
        editing={editingDef}
        onHide={() => setDefDialogOpen(false)}
        onSuccess={() => revalidator.revalidate()}
      />

      <DpConfirmDialog
        visible={deleteConfirm}
        onHide={() => setDeleteConfirm(false)}
        onConfirm={() => void handleDeleteDefs()}
        message="¿Eliminar las definiciones seleccionadas?"
        title="Confirmar"
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        loading={saving}
      />
    </DpContent>
  );
}
