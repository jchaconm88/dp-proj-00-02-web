import { useRef, useState } from "react";
import { useNavigate, useMatch, Outlet, useNavigation, useRevalidator } from "react-router";
import { getSequences, deleteSequence, type SequenceRecord } from "~/features/system/sequences";
import type { Route } from "./+types/SequencesPage";
import { DpContent, DpContentHeader } from "~/components/DpContent";
import { DpTable, type DpTableRef, type DpTableDefColumn } from "~/components/DpTable";
import { DpConfirmDialog } from "~/components/DpConfirmDialog";
import SequenceDialog from "./SequenceDialog";
import { RESET_PERIOD } from "~/constants/status-options";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Secuencias" },
    { name: "description", content: "Mantenimiento de secuencias de numeración" },
  ];
}

// clientLoader: carga datos antes de renderizar el componente.
// El PaceLoader se activa automáticamente via useNavigation() durante la transición.
export async function clientLoader({}: Route.ClientLoaderArgs) {
  const { items } = await getSequences();
  return { sequences: items };
}

const TABLE_DEF: DpTableDefColumn[] = [
  { header: "Entidad", column: "entity", order: 1, display: true, filter: true },
  { header: "Prefijo", column: "prefix", order: 2, display: true, filter: true },
  { header: "Dígitos", column: "digits", order: 3, display: true, filter: true },
  { header: "Formato", column: "format", order: 4, display: true, filter: true },
  {
    header: "Reinicio",
    column: "resetPeriod",
    order: 5,
    display: true,
    filter: true,
    type: "status",
    typeOptions: RESET_PERIOD,
  },
  { header: "Override manual", column: "allowManualOverride", order: 6, display: true, filter: false, type: "bool" },
  { header: "Evitar huecos", column: "preventGaps", order: 7, display: true, filter: false, type: "bool" },
  { header: "Activo", column: "active", order: 8, display: true, filter: true, type: "bool" },
];

export default function Sequences({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const tableRef = useRef<DpTableRef<SequenceRecord>>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedCount, setSelectedCount] = useState(0);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(null);
  const [filterValue, setFilterValue] = useState("");

  // Loading unificado: navegación entre rutas + revalidaciones
  const isLoading = navigation.state !== "idle" || revalidator.state === "loading";

  // Detección de diálogo activo por URL - useMatch es la API oficial de RR v7
  const addMatch = useMatch("/system/sequences/add");
  const editMatch = useMatch("/system/sequences/edit/:id");
  const isAdd = !!addMatch;
  const editId = editMatch?.params.id ? decodeURIComponent(editMatch.params.id) : null;
  const dialogVisible = isAdd || !!editId;

  const handleFilter = (value: string) => {
    setFilterValue(value);
    tableRef.current?.filter(value);
  };

  const openAdd = () => navigate("/system/sequences/add");
  const openEdit = (s: SequenceRecord) =>
    navigate("/system/sequences/edit/" + encodeURIComponent(s.id));
  const handleHide = () => navigate("/system/sequences");

  // Refresca datos re-ejecutando el clientLoader sin necesidad de refetch manual
  const handleSuccess = () => revalidator.revalidate();

  const openDeleteConfirm = () => {
    const selected = tableRef.current?.getSelectedRows() ?? [];
    if (selected.length === 0) return;
    setPendingDeleteIds(selected.map((s) => s.id));
  };

  const handleConfirmDelete = async () => {
    const ids = pendingDeleteIds;
    if (!ids?.length) return;
    setSaving(true);
    setError(null);
    try {
      await Promise.all(ids.map((id) => deleteSequence(id)));
      tableRef.current?.clearSelectedRows();
      setPendingDeleteIds(null);
      revalidator.revalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar.");
    } finally {
      setSaving(false);
    }
  };

  const closeDeleteConfirm = () => {
    if (!saving) setPendingDeleteIds(null);
  };

  return (
    <>
      <DpContent title="SECUENCIAS">
        <DpContentHeader
          filterValue={filterValue}
          onFilter={handleFilter}
          onLoad={() => revalidator.revalidate()}
          onCreate={openAdd}
          onDelete={openDeleteConfirm}
          deleteDisabled={selectedCount === 0 || saving}
          loading={isLoading}
          filterPlaceholder="Filtrar por entidad, prefijo..."
        />

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
            {error}
          </div>
        )}

        {/* data prop: modo controlado - se actualiza automáticamente con cada revalidación */}
        <DpTable<SequenceRecord>
          ref={tableRef}
          data={loaderData.sequences}
          loading={isLoading}
          tableDef={TABLE_DEF}
          linkColumn="entity"
          onDetail={openEdit}
          onEdit={openEdit}
          onSelectionChange={(rows) => setSelectedCount(rows.length)}
          showFilterInHeader={false}
          filterPlaceholder="Filtrar..."
          emptyMessage='No hay secuencias en la colección "sequences".'
          emptyFilterMessage="No hay resultados para el filtro."
        />
      </DpContent>

      <SequenceDialog
        visible={dialogVisible}
        sequenceId={editId}
        onSuccess={handleSuccess}
        onHide={handleHide}
      />

      <DpConfirmDialog
        visible={pendingDeleteIds !== null}
        onHide={closeDeleteConfirm}
        title="Eliminar secuencias"
        message={
          pendingDeleteIds?.length
            ? `¿Eliminar ${pendingDeleteIds.length} secuencia(s)? Esta acción no se puede deshacer.`
            : ""
        }
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={handleConfirmDelete}
        severity="danger"
        loading={saving}
      />

      <Outlet />
    </>
  );
}
