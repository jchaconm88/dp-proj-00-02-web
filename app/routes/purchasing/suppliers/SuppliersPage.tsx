import { useRef, useState } from "react";
import { useNavigate, useMatch, Outlet, useNavigation, useRevalidator } from "react-router";
import {
  getSuppliers,
  deleteSupplier,
  deleteSuppliers,
  type SupplierRecord,
} from "~/features/purchasing/suppliers";
import type { Route } from "./+types/SuppliersPage";
import { DpContent, DpContentHeader } from "~/components/ui";
import { DpTable, type DpTableRef } from "~/components/ui";
import { DpConfirmDialog } from "~/components/ui";
import { SUPPLIER_STATUS } from "~/constants/status-options";
import { moduleTableDef } from "~/data/system-modules";
import { getAuthUser } from "~/lib/get-auth-user";
import SupplierDialog from "./SupplierDialog";

const TABLE_DEF = moduleTableDef("supplier", { status: SUPPLIER_STATUS });

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Proveedores" },
    { name: "description", content: "Gestión de proveedores" },
  ];
}

export async function clientLoader({}: Route.ClientLoaderArgs) {
  await getAuthUser();
  const { items } = await getSuppliers();
  // Flatten contact.contactName for table display
  const rows = items.map((s) => ({
    ...s,
    contactName: s.contact?.contactName ?? "",
  }));
  return { suppliers: rows };
}

type SupplierRow = SupplierRecord & { contactName: string };

export default function SuppliersPage({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const tableRef = useRef<DpTableRef<SupplierRow>>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedCount, setSelectedCount] = useState(0);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(null);
  const [filterValue, setFilterValue] = useState("");

  const isLoading = navigation.state !== "idle" || revalidator.state === "loading";

  const addMatch = useMatch("/purchasing/suppliers/add");
  const editMatch = useMatch("/purchasing/suppliers/edit/:id");
  const isAdd = !!addMatch;
  const editId = editMatch?.params.id ? decodeURIComponent(editMatch.params.id) : null;
  const dialogVisible = isAdd || !!editId;

  const handleFilter = (value: string) => {
    setFilterValue(value);
    tableRef.current?.filter(value);
  };

  const openAdd = () => navigate("/purchasing/suppliers/add");
  const openEdit = (row: SupplierRow) =>
    navigate("/purchasing/suppliers/edit/" + encodeURIComponent(row.id));
  const handleHide = () => navigate("/purchasing/suppliers");
  const handleSuccess = () => {
    revalidator.revalidate();
    navigate("/purchasing/suppliers");
  };

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
      if (ids.length === 1) {
        await deleteSupplier(ids[0]);
      } else {
        await deleteSuppliers(ids);
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

  return (
    <>
      <DpContent
        title="PROVEEDORES"
        breadcrumbItems={["COMPRAS", "PROVEEDORES"]}
        onCreate={openAdd}
      >
        <DpContentHeader
          filterValue={filterValue}
          onFilter={handleFilter}
          onLoad={() => revalidator.revalidate()}
          showCreateButton={false}
          onDelete={openDeleteConfirm}
          deleteDisabled={selectedCount === 0 || saving}
          loading={isLoading}
          filterPlaceholder="Filtrar por código, razón social..."
        />

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
            {error}
          </div>
        )}

        <DpTable<SupplierRow>
          ref={tableRef}
          data={loaderData.suppliers}
          loading={isLoading}
          tableDef={TABLE_DEF}
          onEdit={openEdit}
          onSelectionChange={(rows) => setSelectedCount(rows.length)}
          showFilterInHeader={false}
          emptyMessage="No hay proveedores registrados."
          emptyFilterMessage="No se encontraron proveedores."
        />
      </DpContent>

      {dialogVisible && (
        <SupplierDialog
          visible={dialogVisible}
          supplierId={editId}
          onSuccess={handleSuccess}
          onHide={handleHide}
        />
      )}

      <DpConfirmDialog
        visible={pendingDeleteIds !== null}
        onHide={closeDeleteConfirm}
        title="Eliminar proveedores"
        message={
          pendingDeleteIds?.length
            ? `¿Eliminar ${pendingDeleteIds.length} proveedor(es)? Esta acción no se puede deshacer.`
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
