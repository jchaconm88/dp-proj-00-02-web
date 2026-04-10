import { useRef, useState } from "react";
import { useNavigate, useNavigation, useRevalidator, useMatch } from "react-router";
import { getTripById } from "~/features/transport/trips";
import {
  getTripAssignments,
  deleteTripAssignment,
  deleteTripAssignments,
  type TripAssignmentRecord,
} from "~/features/transport/trip-assignments";
import type { Route } from "./+types/TripAssignmentsPage";
import { DpContentInfo, DpContentHeader } from "~/components/DpContent";
import { DpTable, type DpTableRef, type DpTableDefColumn } from "~/components/DpTable";
import { DpConfirmDialog } from "~/components/DpConfirmDialog";
import { TRIP_ASSIGNMENT_ENTITY_TYPE, TRIP_ASSIGNMENT_TYPE } from "~/constants/status-options";
import TripAssignmentDialog from "./TripAssignmentDialog";

export function meta({ data }: Route.MetaArgs) {
  const tripCode = data?.trip?.code ?? "Viaje";
  return [
    { title: `Asignaciones: ${tripCode}` },
    { name: "description", content: `Asignaciones del viaje ${tripCode}` },
  ];
}

type AssignmentRow = TripAssignmentRecord & { scopeSummary: string; assignmentTypeLabel: string };

const TABLE_DEF: DpTableDefColumn[] = [
  { header: "Código", column: "code", order: 1, display: true, filter: true },
  { header: "Tipo asignación", column: "assignmentTypeLabel", order: 2, display: true, filter: true },
  { header: "Nombre", column: "displayName", order: 3, display: true, filter: true },
  { header: "Tipo entidad", column: "entityType", order: 4, display: true, filter: true, type: "label", typeOptions: TRIP_ASSIGNMENT_ENTITY_TYPE },
  { header: "Posición", column: "position", order: 5, display: true, filter: true },
  { header: "Alcance", column: "scopeSummary", order: 6, display: true, filter: true },
];

function scopeSummaryRow(a: TripAssignmentRecord): string {
  if (a.scope?.type === "trip") return "Todo el viaje";
  return (a.scope?.display ?? "").trim() || "—";
}

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const tripId = (params?.id ?? "") as string;
  if (!tripId) throw new Error("ID de viaje no encontrado");
  const trip = await getTripById(tripId);
  if (!trip) throw new Error("Viaje no encontrado");
  const { items } = await getTripAssignments(tripId);
  const assignments: AssignmentRow[] = items.map((a) => {
    const assignmentTypeLabel =
      a.chargeType?.trim() || a.chargeTypeId?.trim() || TRIP_ASSIGNMENT_TYPE[a.type]?.label || a.type;
    return {
      ...a,
      scopeSummary: scopeSummaryRow(a),
      assignmentTypeLabel,
    };
  });
  return { trip, assignments, tripId };
}

export default function TripAssignmentsPage({ loaderData }: Route.ComponentProps) {
  const { trip, assignments, tripId } = loaderData;
  const navigate = useNavigate();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const tableRef = useRef<DpTableRef<AssignmentRow>>(null);

  const isLoading = navigation.state !== "idle" || revalidator.state === "loading";
  const isAdd = !!useMatch("/transport/trips/:id/trip-assignments/add");
  const editMatch = useMatch("/transport/trips/:id/trip-assignments/edit/:assignmentId");
  const editAssignmentId = editMatch?.params.assignmentId ?? null;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterValue, setFilterValue] = useState("");
  const [selectedCount, setSelectedCount] = useState(0);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(null);

  const dialogVisible = isAdd || !!editAssignmentId;

  const handleFilter = (value: string) => {
    setFilterValue(value);
    tableRef.current?.filter(value);
  };

  const openAdd = () => navigate(`/transport/trips/${encodeURIComponent(tripId)}/trip-assignments/add`);
  const openEdit = (row: AssignmentRow) =>
    navigate(`/transport/trips/${encodeURIComponent(tripId)}/trip-assignments/edit/${encodeURIComponent(row.id)}`);

  const openDeleteConfirm = () => {
    const selected = tableRef.current?.getSelectedRows() ?? [];
    if (!selected.length) return;
    setPendingDeleteIds(selected.map((r) => r.id));
  };

  const handleConfirmDelete = async () => {
    const ids = pendingDeleteIds;
    if (!ids?.length) return;
    setSaving(true);
    setError(null);
    try {
      if (ids.length === 1) {
        await deleteTripAssignment(ids[0]);
      } else {
        await deleteTripAssignments(ids);
      }
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

  const handleSuccess = () => {
    navigate(`/transport/trips/${encodeURIComponent(tripId)}/trip-assignments`);
    revalidator.revalidate();
  };
  const handleHide = () => navigate(`/transport/trips/${encodeURIComponent(tripId)}/trip-assignments`);
  const onBack = () => navigate("/transport/trips");

  return (
    <DpContentInfo
      title={trip ? `Asignaciones: ${trip.code}` : "Asignaciones del viaje"}
      breadcrumbItems={["TRANSPORTE", "VIAJES", "ASIGNACIONES"]}
      backLabel="Volver a viajes"
      onBack={onBack}
      onCreate={openAdd}
    >
      <DpContentHeader
        onLoad={() => revalidator.revalidate()}
        onDelete={openDeleteConfirm}
        deleteDisabled={selectedCount === 0 || saving}
        filterValue={filterValue}
        onFilter={handleFilter}
        filterPlaceholder="Filtrar asignaciones..."
      />
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}
      <DpTable<AssignmentRow>
        ref={tableRef}
        data={assignments}
        loading={isLoading || saving}
        tableDef={TABLE_DEF}
        onSelectionChange={(rows) => setSelectedCount(rows.length)}
        onEdit={openEdit}
        showFilterInHeader={false}
        emptyMessage="No hay asignaciones en este viaje."
        emptyFilterMessage="No se encontraron asignaciones."
      />
      {dialogVisible && (
        <TripAssignmentDialog
          visible={dialogVisible}
          tripId={tripId}
          assignmentId={editAssignmentId}
          onSuccess={handleSuccess}
          onHide={handleHide}
        />
      )}

      <DpConfirmDialog
        visible={pendingDeleteIds !== null}
        onHide={closeDeleteConfirm}
        title="Eliminar asignaciones"
        message={
          pendingDeleteIds?.length
            ? `¿Eliminar ${pendingDeleteIds.length} asignación(es)? Esta acción no se puede deshacer.`
            : ""
        }
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={handleConfirmDelete}
        severity="danger"
        loading={saving}
      />
    </DpContentInfo>
  );
}
