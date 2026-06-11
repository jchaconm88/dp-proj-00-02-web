import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useMatch, useNavigate, useNavigation, useRevalidator } from "react-router";
import { getAuthUser } from "~/lib/get-auth-user";
import { requireActiveCompanyId } from "~/lib/tenant";
import { withUrlSearch } from "~/lib/url-search";
import {
  deleteVariant,
  getProducts,
  listProductVariants,
  type ProductRecord,
  type ProductVariantRecord,
} from "~/features/inventory/products";
import {
  getProductAttributeTypes,
  variantAttributeTypes,
  type ProductAttributeTypeRecord,
} from "~/features/inventory/product-attribute-types";
import type { Route } from "./+types/ProductVariantsListPage";
import { DpContent, DpContentHeader, DpConfirmDialog } from "~/components/ui";
import { DpTable, type DpTableDefColumn, type DpTableRef } from "~/components/ui";
import { ProductVariantDialog } from "../products/ProductVariantDialog";

const TABLE_DEF: DpTableDefColumn[] = [
  { header: "SKU", column: "sku", order: 1, display: true, filter: true },
  { header: "Producto", column: "productName", order: 2, display: true, filter: true },
  { header: "SKU padre", column: "productSku", order: 3, display: true, filter: true },
  { header: "Precio", column: "salePrice", order: 4, display: true },
  { header: "Costo estándar", column: "standardUnitCost", order: 5, display: true },
  { header: "Activo", column: "active", order: 6, display: true, type: "bool" },
];

function resolveApplicableTypes(
  product: ProductRecord,
  catalog: ProductAttributeTypeRecord[]
): ProductAttributeTypeRecord[] {
  const codes = new Set(product.attributeTypeCodes ?? []);
  return catalog.filter((t) => t.active !== false && codes.has(t.code));
}

function productsWithVariantAttributes(products: ProductRecord[]): ProductRecord[] {
  return products.filter((p) => (p.attributeTypeCodes?.length ?? 0) > 0);
}

export function meta() {
  return [{ title: "Variaciones de producto" }];
}

export async function clientLoader() {
  await getAuthUser();
  const companyId = requireActiveCompanyId();
  const [{ items: products }, variants, { items: allTypes }] = await Promise.all([
    getProducts(),
    listProductVariants({ companyId }),
    getProductAttributeTypes(),
  ]);
  const attributeTypes = variantAttributeTypes(allTypes);
  return {
    companyId,
    products,
    variants,
    attributeTypes,
    variantProductOptions: productsWithVariantAttributes(products),
  };
}

export default function ProductVariantsListPage({ loaderData }: Route.ComponentProps) {
  const { companyId, products, variants, attributeTypes, variantProductOptions } = loaderData;
  const navigate = useNavigate();
  const location = useLocation();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const tableRef = useRef<DpTableRef<ProductVariantRecord>>(null);

  const basePath = "/inventory/product-variants";
  const listQuery = location.search;
  const isAdd = !!useMatch("/inventory/product-variants/add");
  const editMatch = useMatch("/inventory/product-variants/edit/:variantId");
  const editVariantId = editMatch?.params.variantId ?? null;
  const dialogVisible = isAdd || !!editVariantId;

  const [filterValue, setFilterValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCount, setSelectedCount] = useState(0);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(null);
  const [draftProductId, setDraftProductId] = useState("");

  const isLoading = navigation.state !== "idle" || revalidator.state === "loading";

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const editingVariant = editVariantId
    ? (variants.find((v) => v.id === editVariantId) ?? null)
    : null;

  const dialogProductId = isAdd ? draftProductId : (editingVariant?.productId ?? "");
  const dialogProduct = dialogProductId ? productById.get(dialogProductId) : undefined;
  const applicableTypes = dialogProduct
    ? resolveApplicableTypes(dialogProduct, attributeTypes)
    : [];

  const productPickerOptions = useMemo(
    () =>
      variantProductOptions.map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
      })),
    [variantProductOptions]
  );

  useEffect(() => {
    if (!isAdd) return;
    if (draftProductId && variantProductOptions.some((p) => p.id === draftProductId)) return;
    setDraftProductId(variantProductOptions[0]?.id ?? "");
  }, [isAdd, draftProductId, variantProductOptions]);

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
      await Promise.all(
        ids.map((id) => {
          const row = variants.find((v) => v.id === id);
          if (!row?.productId) throw new Error("Variación sin producto padre");
          return deleteVariant(row.productId, id, companyId);
        })
      );
      setPendingDeleteIds(null);
      revalidator.revalidate();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al eliminar.");
    } finally {
      setSaving(false);
    }
  }, [pendingDeleteIds, variants, companyId, revalidator]);

  return (
    <DpContent title="VARIACIONES" breadcrumbItems={["INVENTARIO", "VARIACIONES"]}>
      <DpContentHeader
        onLoad={() => revalidator.revalidate()}
        onCreate={openAdd}
        onDelete={openDeleteConfirm}
        deleteDisabled={selectedCount === 0}
        filterValue={filterValue}
        onFilter={handleFilter}
        filterPlaceholder="Filtrar por SKU, producto..."
        loading={isLoading || saving}
      />

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}

      <DpTable<ProductVariantRecord>
        ref={tableRef}
        data={loaderData.variants}
        loading={isLoading || saving}
        tableDef={TABLE_DEF}
        onEdit={openEdit}
        onSelectionChange={(rows) => setSelectedCount(rows.length)}
        showFilterInHeader={false}
        emptyMessage="No hay variaciones registradas"
        emptyFilterMessage="No se encontraron variaciones"
      />

      <DpConfirmDialog
        visible={pendingDeleteIds !== null}
        onHide={() => setPendingDeleteIds(null)}
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

      {dialogVisible && isAdd && (
        <ProductVariantDialog
          visible={dialogVisible}
          companyId={companyId}
          productId={dialogProductId}
          parentSku={dialogProduct?.sku ?? ""}
          variant={null}
          applicableTypes={applicableTypes}
          productOptions={productPickerOptions}
          onProductIdChange={setDraftProductId}
          onHide={handleHide}
          onSuccess={handleSuccess}
        />
      )}

      {dialogVisible && !isAdd && editingVariant && dialogProduct && (
        <ProductVariantDialog
          visible={dialogVisible}
          companyId={companyId}
          productId={dialogProductId}
          parentSku={dialogProduct.sku ?? ""}
          variant={editingVariant}
          applicableTypes={applicableTypes}
          onHide={handleHide}
          onSuccess={handleSuccess}
        />
      )}

      {dialogVisible && !isAdd && (!editingVariant || !dialogProduct) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="rounded-lg bg-white p-6 shadow-lg dark:bg-zinc-900 max-w-md">
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              {!editingVariant ? "Variación no encontrada." : "Producto padre no encontrado."}
            </p>
            <button type="button" className="mt-4 p-button p-component" onClick={handleHide}>
              Cerrar
            </button>
          </div>
        </div>
      )}
    </DpContent>
  );
}
