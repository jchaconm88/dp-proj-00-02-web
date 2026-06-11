import { useCallback, useRef, useState } from "react";
import { useLocation, useNavigate, useNavigation, useRevalidator, useMatch } from "react-router";
import { DpContentInfo, DpContentHeader, DpConfirmDialog, DpTable, type DpTableDefColumn, type DpTableRef } from "~/components/ui";
import { getAuthUser } from "~/lib/get-auth-user";
import { withUrlSearch } from "~/lib/url-search";
import { deleteVariant, getProduct, getVariants, type ProductRecord, type ProductVariantRecord } from "~/features/inventory/products";
import {
  getProductAttributeTypes,
  variantAttributeTypes,
  type ProductAttributeTypeRecord,
} from "~/features/inventory/product-attribute-types";
import type { Route } from "./+types/ProductVariantsPage";
import { ProductVariantDialog } from "./ProductVariantDialog";

const TABLE_DEF: DpTableDefColumn[] = [
  { header: "SKU", column: "sku", order: 1, display: true, filter: true },
  { header: "Atributos", column: "attributesDisplay", order: 2, display: true, filter: true },
  { header: "Precio", column: "salePrice", order: 3, display: true },
  { header: "Promo", column: "salePricePromo", order: 4, display: true },
  { header: "Peso (kg)", column: "weightKg", order: 5, display: true },
  { header: "Activo", column: "active", order: 6, display: true, type: "bool" },
];

function resolveApplicableTypes(
  product: ProductRecord,
  catalog: ProductAttributeTypeRecord[]
): ProductAttributeTypeRecord[] {
  const codes = new Set(product.attributeTypeCodes ?? []);
  return catalog.filter((t) => t.active !== false && codes.has(t.code));
}

function formatAttributesDisplay(
  attributes: Record<string, string>,
  types: ProductAttributeTypeRecord[]
): string {
  const labelByCode = new Map(types.map((t) => [t.code, t.label]));
  return Object.entries(attributes)
    .filter(([, v]) => v)
    .map(([code, value]) => `${labelByCode.get(code) ?? code}: ${value}`)
    .join(" · ");
}

export function meta({ data }: Route.MetaArgs) {
  const p = data?.product;
  const title = p ? `Variaciones: ${p.name}` : "Variaciones de producto";
  return [{ title }];
}

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  await getAuthUser();
  const productId = params.id ?? "";
  if (!productId) throw new Error("Producto no encontrado");
  const product = await getProduct(productId);
  if (!product) throw new Error("Producto no encontrado");
  const [{ items: allTypes }, variants] = await Promise.all([
    getProductAttributeTypes(),
    getVariants(productId, product.companyId),
  ]);
  const attributeTypes = variantAttributeTypes(allTypes);
  const applicableTypes = resolveApplicableTypes(product, attributeTypes);
  return { product, productId, variants, companyId: product.companyId, applicableTypes, attributeTypes };
}

export default function ProductVariantsPage({ loaderData }: Route.ComponentProps) {
  const { product, productId, variants, companyId, applicableTypes } = loaderData;
  const navigate = useNavigate();
  const location = useLocation();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  type VariantRow = ProductVariantRecord & { attributesDisplay: string };
  const tableRef = useRef<DpTableRef<VariantRow>>(null);

  const isLoading = navigation.state !== "idle" || revalidator.state === "loading";

  const basePath = `/inventory/products/${encodeURIComponent(productId)}/variants`;
  const listQuery = location.search;
  const isAdd = !!useMatch("/inventory/products/:id/variants/add");
  const editMatch = useMatch("/inventory/products/:id/variants/edit/:variantId");
  const editVariantId = editMatch?.params.variantId ?? null;
  const dialogVisible = isAdd || !!editVariantId;

  const [filterValue, setFilterValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCount, setSelectedCount] = useState(0);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(null);

  const handleFilter = (value: string) => {
    setFilterValue(value);
    tableRef.current?.filter(value);
  };

  const openAdd = () => navigate(withUrlSearch(`${basePath}/add`, listQuery));
  const openEdit = (row: ProductVariantRecord) =>
    navigate(withUrlSearch(`${basePath}/edit/${encodeURIComponent(row.id)}`, listQuery));

  const handleHide = () => navigate(basePath);
  const handleSuccess = () => {
    navigate(basePath);
    revalidator.revalidate();
  };

  const openDeleteConfirm = useCallback(() => {
    const rows = tableRef.current?.getSelectedRows() ?? [];
    if (!rows.length) return;
    setPendingDeleteIds(rows.map((r) => r.id));
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    const ids = pendingDeleteIds;
    if (!ids?.length) return;
    setSaving(true);
    setError(null);
    try {
      await Promise.all(ids.map((id) => deleteVariant(productId, id, companyId)));
      setPendingDeleteIds(null);
      revalidator.revalidate();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al eliminar.");
    } finally {
      setSaving(false);
    }
  }, [pendingDeleteIds, productId, companyId, revalidator]);

  const closeDeleteConfirm = () => setPendingDeleteIds(null);

  const editingVariant =
    editVariantId ? (variants.find((v) => v.id === editVariantId) ?? null) : null;

  const tableRows = variants.map((v) => ({
    ...v,
    attributesDisplay: formatAttributesDisplay(v.attributes ?? {}, applicableTypes),
  }));

  return (
    <DpContentInfo
      title={`Variaciones: ${product.name}`}
      breadcrumbItems={["INVENTARIO", "PRODUCTOS", "VARIACIONES"]}
      backLabel="Volver a productos"
      onBack={() => navigate("/inventory/products")}
      onCreate={openAdd}
    >
      <DpContentHeader
        filterValue={filterValue}
        onFilter={handleFilter}
        onLoad={() => revalidator.revalidate()}
        onDelete={openDeleteConfirm}
        deleteDisabled={selectedCount === 0}
        loading={isLoading || saving}
        filterPlaceholder="Filtrar por SKU, atributos..."
        showCreateButton={false}
      />

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}

      <DpTable<VariantRow>
        ref={tableRef}
        data={tableRows}
        loading={isLoading || saving}
        tableDef={TABLE_DEF}
        onEdit={openEdit}
        onSelectionChange={(rows) => setSelectedCount(rows.length)}
        showFilterInHeader={false}
        emptyMessage="No hay variaciones registradas."
        emptyFilterMessage="No se encontraron variaciones."
      />

      <DpConfirmDialog
        visible={pendingDeleteIds !== null}
        onHide={closeDeleteConfirm}
        title="Eliminar variaciones"
        message={
          pendingDeleteIds?.length ? (
            <p>
              ¿Eliminar <strong>{pendingDeleteIds.length}</strong> variación(es)? Esta acción no se puede deshacer.
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

      {dialogVisible && (
        <ProductVariantDialog
          visible={dialogVisible}
          companyId={companyId}
          productId={productId}
          parentSku={product.sku ?? ""}
          variant={editingVariant}
          applicableTypes={applicableTypes}
          onHide={handleHide}
          onSuccess={handleSuccess}
        />
      )}
    </DpContentInfo>
  );
}

