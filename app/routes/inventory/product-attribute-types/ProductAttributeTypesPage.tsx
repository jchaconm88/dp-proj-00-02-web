import { useRef, useState } from "react";
import { useNavigate, useMatch, Outlet, useNavigation, useRevalidator } from "react-router";
import {
  getProductAttributeTypes,
  deleteProductAttributeType,
  type ProductAttributeTypeRecord,
} from "~/features/inventory/product-attribute-types";
import type { Route } from "./+types/ProductAttributeTypesPage";
import { DpContent, DpContentHeader, DpConfirmDialog, DpTable, type DpTableRef } from "~/components/ui";
import { moduleTableDef } from "~/data/system-modules";
import { getAuthUser } from "~/lib/get-auth-user";
import ProductAttributeTypeDialog from "./ProductAttributeTypeDialog";

const TABLE_DEF = moduleTableDef("product-attribute-type");

type TypeRow = ProductAttributeTypeRecord & {
  valuesDisplay: string;
  flagsDisplay: string;
};

function formatFlags(row: ProductAttributeTypeRecord): string {
  const parts: string[] = [];
  if (row.useForVariants) parts.push("Variantes");
  if (row.useForFilters) parts.push("Filtros");
  if (row.isColor) parts.push("Color");
  return parts.join(", ") || "—";
}

export function meta({}: Route.MetaArgs) {
  return [{ title: "Tipos de atributo" }, { name: "description", content: "Catálogo unificado de atributos de producto" }];
}

export async function clientLoader() {
  await getAuthUser();
  const { items } = await getProductAttributeTypes();
  return { items };
}

export default function ProductAttributeTypesPage({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const tableRef = useRef<DpTableRef<TypeRow>>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedCount, setSelectedCount] = useState(0);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(null);
  const [filterValue, setFilterValue] = useState("");

  const isLoading = navigation.state !== "idle" || revalidator.state === "loading";
  const addMatch = useMatch("/inventory/product-attribute-types/add");
  const editMatch = useMatch("/inventory/product-attribute-types/edit/:id");
  const editId = editMatch?.params.id ? decodeURIComponent(editMatch.params.id) : null;
  const dialogVisible = !!addMatch || !!editId;

  const tableData: TypeRow[] = loaderData.items.map((row) => ({
    ...row,
    valuesDisplay: `${row.values.length} valor${row.values.length !== 1 ? "es" : ""}`,
    flagsDisplay: formatFlags(row),
  }));

  return (
    <>
      <DpContent title="TIPOS DE ATRIBUTO" breadcrumbItems={["INVENTARIO", "TIPOS DE ATRIBUTO"]} onCreate={() => navigate("/inventory/product-attribute-types/add")}>
        <DpContentHeader
          filterValue={filterValue}
          onFilter={(v) => {
            setFilterValue(v);
            tableRef.current?.filter(v);
          }}
          onLoad={() => revalidator.revalidate()}
          showCreateButton={false}
          onDelete={() => {
            const ids = (tableRef.current?.getSelectedRows() ?? []).map((r) => r.id);
            if (ids.length) setPendingDeleteIds(ids);
          }}
          deleteDisabled={selectedCount === 0 || saving}
          loading={isLoading}
          filterPlaceholder="Filtrar por código, etiqueta..."
        />
        {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <DpTable<TypeRow>
          ref={tableRef}
          data={tableData}
          loading={isLoading || saving}
          tableDef={TABLE_DEF}
          onEdit={(row) => navigate(`/inventory/product-attribute-types/edit/${encodeURIComponent(row.id)}`)}
          onSelectionChange={(rows) => setSelectedCount(rows.length)}
          showFilterInHeader={false}
          emptyMessage="No hay tipos de atributo."
        />
      </DpContent>

      <DpConfirmDialog
        visible={pendingDeleteIds !== null}
        onHide={() => !saving && setPendingDeleteIds(null)}
        title="Eliminar tipos"
        message={pendingDeleteIds?.length ? `¿Eliminar ${pendingDeleteIds.length} tipo(s)?` : ""}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={async () => {
          if (!pendingDeleteIds?.length) return;
          setSaving(true);
          try {
            await Promise.all(pendingDeleteIds.map((id) => deleteProductAttributeType(id)));
            tableRef.current?.clearSelectedRows();
            setPendingDeleteIds(null);
            revalidator.revalidate();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Error al eliminar.");
          } finally {
            setSaving(false);
          }
        }}
        severity="danger"
        loading={saving}
      />

      {dialogVisible && (
        <ProductAttributeTypeDialog
          visible={dialogVisible}
          typeId={editId}
          types={loaderData.items}
          onSuccess={() => {
            revalidator.revalidate();
            navigate("/inventory/product-attribute-types");
          }}
          onHide={() => navigate("/inventory/product-attribute-types")}
        />
      )}
      <Outlet />
    </>
  );
}
