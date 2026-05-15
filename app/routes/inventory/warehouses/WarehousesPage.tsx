import { useRef, useState } from "react";
import { useNavigate, useNavigation, useRevalidator, useMatch } from "react-router";
import { getAuthUser } from "~/lib/get-auth-user";
import {
  getWarehouses,
  deleteWarehouse,
  type WarehouseRecord,
} from "~/features/inventory/warehouses";
import type { Route } from "./+types/WarehousesPage";
import { DpContent, DpContentHeader } from "~/components/DpContent";
import { DpTable, type DpTableRef } from "~/components/DpTable";
import { DpConfirmDialog } from "~/components/DpConfirmDialog";
import { WAREHOUSE_TYPE } from "~/constants/status-options";
import { moduleTableDef } from "~/data/system-modules";
import WarehouseDialog from "./WarehouseDialog";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Almacenes" },
    { name: "description", content: "Gestión de almacenes" },
  ];
}

type WarehouseRow = WarehouseRecord;

const TABLE_DEF = moduleTableDef("warehouse", { type: WAREHOUSE_TYPE });

export async function clientLoader() {
  await getAuthUser();
  const { items } = await getWarehouses();
  return { items };
}

export default function WarehousesPage({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const tableRef = useRef<DpTableRef<WarehouseRow>>(null);

  const isLoading = navigation.state !== "idle" || revalidator.state === "loading";
  const isAdd = !!useMatch("/inventory/warehouses/add");
  const editMatch = useMatch("/inventory/warehouses/edit/:id");
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

  const openAdd = () => navigate("/inventory/warehouses/add");
  const openEdit = (row: WarehouseRow) =>
    navigate(`/inventory/warehouses/edit/${encodeURIComponent(row.id)}`);

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
      await Promise.all(ids.map(deleteWarehouse));
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
    navigate("/inventory/warehouses");
    revalidator.revalidate();
  };

  const handleHide = () => navigate("/inventory/warehouses");

  return (
    <DpContent
      title="ALMACENES"
      breadcrumbItems={["INVENTARIO", "ALMACENES"]}
      onCreate={openAdd}
    >
      <DpContentHeader
        onLoad={() => revalidator.revalidate()}
        showCreateButton={false}
        onDelete={openDeleteConfirm}
        deleteDisabled={selectedCount === 0 || saving}
        filterValue={filterValue}
        onFilter={handleFilter}
        filterPlaceholder="Filtrar por código, nombre..."
      />
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}
      <DpTable<WarehouseRow>
        ref={tableRef}
        data={loaderData.items}
        loading={isLoading || saving}
        tableDef={TABLE_DEF}
        onSelectionChange={(rows) => setSelectedCount(rows.length)}
        onEdit={openEdit}
        showFilterInHeader={false}
        emptyMessage="No hay almacenes."
        emptyFilterMessage="No se encontraron almacenes."
      />

      {dialogVisible && (
        <WarehouseDialog
          visible={dialogVisible}
          warehouseId={editId}
          onSuccess={handleSuccess}
          onHide={handleHide}
        />
      )}

      <DpConfirmDialog
        visible={pendingDeleteIds !== null}
        onHide={closeDeleteConfirm}
        title="Eliminar almacenes"
        message={
          pendingDeleteIds?.length
            ? `¿Eliminar ${pendingDeleteIds.length} almacén(es)? Esta acción no se puede deshacer.`
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
