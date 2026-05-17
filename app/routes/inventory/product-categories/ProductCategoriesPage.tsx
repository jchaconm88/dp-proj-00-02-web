import { useRef, useState } from "react";
import { useNavigate, useMatch, Outlet, useNavigation, useRevalidator } from "react-router";
import {
  getProductCategories,
  deleteProductCategory,
  deleteProductCategories,
  type ProductCategoryRecord,
} from "~/features/inventory/product-categories";
import type { Route } from "./+types/ProductCategoriesPage";
import { DpContent, DpContentHeader } from "~/components/ui";
import { DpTable, type DpTableRef } from "~/components/ui";
import { DpConfirmDialog } from "~/components/ui";
import ProductCategoryDialog from "./ProductCategoryDialog";
import { moduleTableDef } from "~/data/system-modules";
import { getAuthUser } from "~/lib/get-auth-user";

const TABLE_DEF = moduleTableDef("product-category");

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Categorías de Producto" },
    { name: "description", content: "Gestión de categorías de producto" },
  ];
}

export async function clientLoader({}: Route.ClientLoaderArgs) {
  await getAuthUser();
  const { items } = await getProductCategories();
  return { items };
}

export default function ProductCategoriesPage({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const tableRef = useRef<DpTableRef<ProductCategoryRecord>>(null);

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedCount, setSelectedCount] = useState(0);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(null);
  const [filterValue, setFilterValue] = useState("");

  const isLoading = navigation.state !== "idle" || revalidator.state === "loading";

  const addMatch = useMatch("/inventory/product-categories/add");
  const editMatch = useMatch("/inventory/product-categories/edit/:id");
  const isAdd = !!addMatch;
  const editId = editMatch?.params.id ? decodeURIComponent(editMatch.params.id) : null;
  const dialogVisible = isAdd || !!editId;

  const handleFilter = (value: string) => {
    setFilterValue(value);
    tableRef.current?.filter(value);
  };

  const openAdd = () => navigate("/inventory/product-categories/add");
  const openEdit = (row: ProductCategoryRecord) =>
    navigate(`/inventory/product-categories/edit/${encodeURIComponent(row.id)}`);
  const handleHide = () => navigate("/inventory/product-categories");
  const handleSuccess = () => {
    revalidator.revalidate();
    navigate("/inventory/product-categories");
  };

  const openDeleteConfirm = () => {
    const selected = tableRef.current?.getSelectedRows() ?? [];
    if (selected.length === 0) return;

    // Check if any selected category has subcategories
    const allCategories = loaderData.items;
    const selectedIds = new Set(selected.map((s) => s.id));
    const hasSubcategories = selected.some((cat) =>
      allCategories.some(
        (c) => c.parentCategoryId === cat.id && !selectedIds.has(c.id)
      )
    );

    if (hasSubcategories) {
      setError(
        "No se puede eliminar: una o más categorías seleccionadas tienen subcategorías dependientes. Elimine primero las subcategorías."
      );
      return;
    }

    setPendingDeleteIds(selected.map((s) => s.id));
  };

  const handleConfirmDelete = async () => {
    const ids = pendingDeleteIds;
    if (!ids?.length) return;
    setSaving(true);
    setError(null);
    try {
      if (ids.length === 1) {
        await deleteProductCategory(ids[0]);
      } else {
        await deleteProductCategories(ids);
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
        title="CATEGORÍAS DE PRODUCTO"
        breadcrumbItems={["INVENTARIO", "CATEGORÍAS DE PRODUCTO"]}
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
          filterPlaceholder="Filtrar por código, nombre..."
        />

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
            {error}
          </div>
        )}

        <DpTable<ProductCategoryRecord>
          ref={tableRef}
          data={loaderData.items}
          loading={isLoading || saving}
          tableDef={TABLE_DEF}
          onEdit={openEdit}
          onSelectionChange={(rows) => setSelectedCount(rows.length)}
          showFilterInHeader={false}
          emptyMessage="No hay categorías de producto."
          emptyFilterMessage="No se encontraron categorías."
        />
      </DpContent>

      {dialogVisible && (
        <ProductCategoryDialog
          visible={dialogVisible}
          categoryId={editId}
          categories={loaderData.items}
          onSuccess={handleSuccess}
          onHide={handleHide}
        />
      )}

      <DpConfirmDialog
        visible={pendingDeleteIds !== null}
        onHide={closeDeleteConfirm}
        title="Eliminar categorías"
        message={
          pendingDeleteIds?.length
            ? `¿Eliminar ${pendingDeleteIds.length} categoría(s)? Esta acción no se puede deshacer.`
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
