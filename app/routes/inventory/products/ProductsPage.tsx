import { useRef, useState } from "react";
import { useNavigate, useNavigation, useRevalidator, useMatch } from "react-router";
import {
  getProducts,
  deleteProduct,
  deleteProducts,
  type ProductRecord,
} from "~/features/inventory/products";
import { getUnitsOfMeasureCatalog } from "~/features/system/units-of-measure";
import { getAuthUser } from "~/lib/get-auth-user";
import type { Route } from "./+types/ProductsPage";
import { DpContent, DpContentHeader } from "~/components/DpContent";
import { DpTable, type DpTableRef } from "~/components/DpTable";
import { DpConfirmDialog } from "~/components/DpConfirmDialog";
import { PRODUCT_TYPE } from "~/constants/status-options";
import { moduleTableDef } from "~/data/system-modules";
import ProductDialog from "./ProductDialog";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Productos" },
    { name: "description", content: "Gestión de productos" },
  ];
}

const TABLE_DEF = moduleTableDef("product", { type: PRODUCT_TYPE });

export async function clientLoader() {
  await getAuthUser();
  const [{ items }, unitsCatalog] = await Promise.all([getProducts(), getUnitsOfMeasureCatalog()]);
  return { items, unitsCatalog };
}

export default function ProductsPage({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const tableRef = useRef<DpTableRef<ProductRecord>>(null);

  const isLoading = navigation.state !== "idle" || revalidator.state === "loading";
  const isAdd = !!useMatch("/inventory/products/add");
  const editMatch = useMatch("/inventory/products/edit/:id");
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

  const openAdd = () => navigate("/inventory/products/add");
  const openEdit = (row: ProductRecord) =>
    navigate(`/inventory/products/edit/${encodeURIComponent(row.id)}`);

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
        await deleteProduct(ids[0]);
      } else {
        await deleteProducts(ids);
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
    navigate("/inventory/products");
    revalidator.revalidate();
  };

  const handleHide = () => navigate("/inventory/products");

  return (
    <DpContent
      title="PRODUCTOS"
      breadcrumbItems={["INVENTARIO", "PRODUCTOS"]}
      onCreate={openAdd}
    >
      <DpContentHeader
        filterValue={filterValue}
        onFilter={handleFilter}
        onLoad={() => revalidator.revalidate()}
        showCreateButton={false}
        onDelete={openDeleteConfirm}
        deleteDisabled={selectedCount === 0 || saving}
        loading={isLoading || saving}
        filterPlaceholder="Filtrar por código, nombre..."
      />

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}

      <DpTable<ProductRecord>
        ref={tableRef}
        data={loaderData.items}
        loading={isLoading || saving}
        tableDef={TABLE_DEF}
        onEdit={openEdit}
        onSelectionChange={(rows) => setSelectedCount(rows.length)}
        showFilterInHeader={false}
        emptyMessage="No hay productos registrados."
        emptyFilterMessage="No se encontraron productos."
      />

      {dialogVisible && (
        <ProductDialog
          visible={dialogVisible}
          productId={editId}
          unitsCatalog={loaderData.unitsCatalog}
          onSuccess={handleSuccess}
          onHide={handleHide}
        />
      )}

      <DpConfirmDialog
        visible={pendingDeleteIds !== null}
        onHide={closeDeleteConfirm}
        title="Eliminar productos"
        message={
          pendingDeleteIds?.length ? (
            <p>
              ¿Eliminar <strong>{pendingDeleteIds.length}</strong> producto(s)?
              Esta acción no se puede deshacer.
            </p>
          ) : (
            ""
          )
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
