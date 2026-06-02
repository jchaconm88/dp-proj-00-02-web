import { useRef, useState } from "react";
import { useNavigate, useMatch, Outlet, useNavigation, useRevalidator } from "react-router";
import {
  getFilterableAttributeTypes,
  deleteFilterableAttributeType,
  type FilterableAttributeTypeRecord,
} from "~/features/inventory/filterable-attribute-types";
import type { Route } from "./+types/FilterableAttributeTypesPage";
import { DpContent, DpContentHeader, DpConfirmDialog, DpTable, type DpTableRef } from "~/components/ui";
import { moduleTableDef } from "~/data/system-modules";
import { getAuthUser } from "~/lib/get-auth-user";
import FilterableAttributeTypeDialog from "./FilterableAttributeTypeDialog";

const TABLE_DEF = moduleTableDef("filterable-attribute-type");

function formatValues(row: FilterableAttributeTypeRecord): string {
  return `${row.values.length} valor${row.values.length !== 1 ? "es" : ""}`;
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Tipos de atributo filtrable" },
    { name: "description", content: "Catálogo de tipos de atributo filtrable para productos" },
  ];
}

export async function clientLoader({}: Route.ClientLoaderArgs) {
  await getAuthUser();
  const { items } = await getFilterableAttributeTypes();
  return { items };
}

export default function FilterableAttributeTypesPage({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  type TypeRow = FilterableAttributeTypeRecord & { valuesDisplay: string };
  const tableRef = useRef<DpTableRef<TypeRow>>(null);

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedCount, setSelectedCount] = useState(0);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(null);
  const [filterValue, setFilterValue] = useState("");

  const isLoading = navigation.state !== "idle" || revalidator.state === "loading";

  const addMatch = useMatch("/inventory/filterable-attribute-types/add");
  const editMatch = useMatch("/inventory/filterable-attribute-types/edit/:id");
  const isAdd = !!addMatch;
  const editId = editMatch?.params.id ? decodeURIComponent(editMatch.params.id) : null;
  const dialogVisible = isAdd || !!editId;

  const handleFilter = (value: string) => {
    setFilterValue(value);
    tableRef.current?.filter(value);
  };

  const openAdd = () => navigate("/inventory/filterable-attribute-types/add");
  const openEdit = (row: FilterableAttributeTypeRecord) =>
    navigate(`/inventory/filterable-attribute-types/edit/${encodeURIComponent(row.id)}`);
  const handleHide = () => navigate("/inventory/filterable-attribute-types");
  const handleSuccess = () => {
    revalidator.revalidate();
    navigate("/inventory/filterable-attribute-types");
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
      await Promise.all(ids.map((id) => deleteFilterableAttributeType(id)));
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

  const tableData = loaderData.items.map((row) => ({
    ...row,
    valuesDisplay: formatValues(row),
  }));

  return (
    <>
      <DpContent
        title="TIPOS DE ATRIBUTO FILTRABLE"
        breadcrumbItems={["INVENTARIO", "TIPOS DE ATRIBUTO FILTRABLE"]}
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
          filterPlaceholder="Filtrar por código, etiqueta..."
        />

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
            {error}
          </div>
        )}

        <DpTable<TypeRow>
          ref={tableRef}
          data={tableData}
          loading={isLoading || saving}
          tableDef={TABLE_DEF}
          onEdit={openEdit}
          onSelectionChange={(rows) => setSelectedCount(rows.length)}
          showFilterInHeader={false}
          emptyMessage="No hay tipos de atributo filtrable."
          emptyFilterMessage="No se encontraron tipos."
        />
      </DpContent>

      <DpConfirmDialog
        visible={pendingDeleteIds !== null}
        onHide={closeDeleteConfirm}
        title="Eliminar tipos"
        message={
          pendingDeleteIds?.length
            ? `¿Eliminar ${pendingDeleteIds.length} tipo(s)? Los productos con estos atributos asignados pueden quedar con valores huérfanos.`
            : ""
        }
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={handleConfirmDelete}
        severity="danger"
        loading={saving}
      />

      {dialogVisible && (
        <FilterableAttributeTypeDialog
          visible={dialogVisible}
          typeId={editId}
          types={loaderData.items}
          onSuccess={handleSuccess}
          onHide={handleHide}
        />
      )}

      <Outlet />
    </>
  );
}
