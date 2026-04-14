import { useRef, useState } from "react";
import { useNavigate, useNavigation, useRevalidator, useMatch } from "react-router";
import {
  getPlans,
  deletePlan,
  deletePlans,
  type PlanRecord,
} from "~/features/transport/plans";
import type { Route } from "./+types/PlansPage";
import { DpContent, DpContentHeader } from "~/components/DpContent";
import { DpTable, type DpTableRef } from "~/components/DpTable";
import { DpConfirmDialog } from "~/components/DpConfirmDialog";
import { PLAN_STATUS } from "~/constants/status-options";
import { moduleTableDef } from "~/data/system-modules";
import PlanDialog from "./PlanDialog";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Planes" },
    { name: "description", content: "Gestión de planes de transporte" },
  ];
}

type PlanRow = PlanRecord & { orderIdsStr?: string };

const TABLE_DEF = moduleTableDef("plan", { status: PLAN_STATUS });

export async function clientLoader() {
  const { items } = await getPlans();
  return {
    items: items.map((p) => ({
      ...p,
      orderIdsStr:
        p.orderIds.length === 0
          ? "—"
          : `${p.orderIds.length} pedido${p.orderIds.length !== 1 ? "s" : ""}`,
    })),
  };
}

export default function PlansPage({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const tableRef = useRef<DpTableRef<PlanRow>>(null);

  const isLoading = navigation.state !== "idle" || revalidator.state === "loading";
  const isAdd = !!useMatch("/transport/plans/add");
  const editMatch = useMatch("/transport/plans/edit/:id");
  const editId = editMatch?.params.id ?? null;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterValue, setFilterValue] = useState("");
  const [selectedCount, setSelectedCount] = useState(0);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(null);

  const dialogVisible = isAdd || !!editId;

  const handleFilter = (value: string) => {
    setFilterValue(value);
    tableRef.current?.filter(value);
  };

  const openAdd = () => navigate("/transport/plans/add");
  const openEdit = (row: PlanRow) =>
    navigate(`/transport/plans/edit/${encodeURIComponent(row.id)}`);

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
        await deletePlan(ids[0]);
      } else {
        await deletePlans(ids);
      }
      tableRef.current?.clearSelectedRows();
      setPendingDeleteIds(null);
      revalidator.revalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar");
    } finally {
      setSaving(false);
    }
  };

  const closeDeleteConfirm = () => {
    if (!saving) setPendingDeleteIds(null);
  };

  const handleSuccess = () => {
    navigate("/transport/plans");
    revalidator.revalidate();
  };

  const handleHide = () => navigate("/transport/plans");

  return (
    <DpContent
      title="PLANES"
      breadcrumbItems={["TRANSPORTE", "PLANES"]}
      onCreate={openAdd}
    >
      <DpContentHeader
        onLoad={() => revalidator.revalidate()}
        showCreateButton={false}
        onDelete={openDeleteConfirm}
        deleteDisabled={selectedCount === 0 || saving}
        filterValue={filterValue}
        onFilter={handleFilter}
        filterPlaceholder="Filtrar por fecha, zona, tipo..."
      />
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}
      <DpTable<PlanRow>
        ref={tableRef}
        data={loaderData.items}
        loading={isLoading || saving}
        tableDef={TABLE_DEF}
        onSelectionChange={(rows) => setSelectedCount(rows.length)}
        onEdit={openEdit}
        showFilterInHeader={false}
        emptyMessage="No hay planes."
        emptyFilterMessage="No se encontraron planes."
      />

      {dialogVisible && (
        <PlanDialog
          visible={dialogVisible}
          planId={editId}
          onSuccess={handleSuccess}
          onHide={handleHide}
        />
      )}

      <DpConfirmDialog
        visible={pendingDeleteIds !== null}
        onHide={closeDeleteConfirm}
        title="Eliminar planes"
        message={
          pendingDeleteIds?.length
            ? `¿Eliminar ${pendingDeleteIds.length} plan(es)? Esta acción no se puede deshacer.`
            : ""
        }
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={handleConfirmDelete}
        severity="danger"
        loading={saving}
      />
    </DpContent>
  );
}
