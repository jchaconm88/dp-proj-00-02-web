import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigation } from "react-router";
import { DpInput } from "~/components/ui";
import { DpCodeInput } from "~/components/ui";
import { DpContentSet } from "~/components/ui";
import {
  getProduct,
  addProduct,
  updateProduct,
  uploadProductImage,
  type ProductType,
} from "~/features/inventory/products";
import { getActiveCompanyCurrencyOptions } from "~/features/system/companies";
import { getProductCategories } from "~/features/inventory/product-categories";
import {
  getProductAttributeTypes,
  variantAttributeTypes,
  filterableAttributeTypes,
  type ProductAttributeTypeRecord,
} from "~/features/inventory/product-attribute-types";
import FilterableAttributesSection from "~/components/FilterableAttributesSection";
import { MultiSelect } from "primereact/multiselect";
import { PRODUCT_TYPE, TAX_AFFECTATION_CODE, ECOMMERCE_STATUS, WOOCOMMERCE_TYPE, statusToSelectOptions } from "~/constants/status-options";
import CategorySelector from "~/components/CategorySelector";
import TagInput from "~/components/TagInput";
import ImageUpload, { type PendingImage } from "~/components/ImageUpload";
import {
  buildCategoryTree,
  computePrimaryCategoryPath,
  type CategoryTreeNode,
} from "~/features/inventory/product-categories";
import { getProducts } from "~/features/inventory/products";
import { generateSequenceCode } from "~/features/system/sequences";
import type { UnitOfMeasureRecord } from "~/features/system/units-of-measure";
import { unitsCatalogToSelectOptions } from "~/features/system/units-of-measure";
import { requireActiveCompanyId } from "~/lib/tenant";

export interface ProductDialogProps {
  visible: boolean;
  productId: string | null;
  unitsCatalog: UnitOfMeasureRecord[];
  companyId: string;
  onSuccess?: () => void;
  onHide: () => void;
}

const PRODUCT_TYPE_OPTIONS = statusToSelectOptions(PRODUCT_TYPE);
const TAX_AFFECTATION_OPTIONS = statusToSelectOptions(TAX_AFFECTATION_CODE);
const ECOMMERCE_OPTIONS = statusToSelectOptions(ECOMMERCE_STATUS);
const WOOCOMMERCE_TYPE_OPTIONS = statusToSelectOptions(WOOCOMMERCE_TYPE);

export default function ProductDialog({
  visible,
  productId,
  unitsCatalog,
  companyId,
  onSuccess,
  onHide,
}: ProductDialogProps) {
  const isEdit = !!productId;
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [categoryName, setCategoryName] = useState("");
  const [type, setType] = useState<ProductType>("good");
  const [unitOfMeasure, setUnitOfMeasure] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [currency, setCurrency] = useState("PEN");
  const [taxAffectation, setTaxAffectation] = useState("10");
  const [minStock, setMinStock] = useState("");
  const [maxStock, setMaxStock] = useState("");
  const [active, setActive] = useState(true);
  const [sku, setSku] = useState("");
  const [ecommerceStatus, setEcommerceStatus] = useState("active");
  const [woocommerceType, setWoocommerceType] = useState("simple");
  const [visibleInStore, setVisibleInStore] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [groupedProductIds, setGroupedProductIds] = useState<string[]>([]);
  const [imageUrlsArr, setImageUrlsArr] = useState<string[]>([]);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [categoryPath, setCategoryPath] = useState<string[]>([]);
  const [attributeTypeCodes, setAttributeTypeCodes] = useState<string[]>([]);

  const [filterableAttributes, setFilterableAttributes] = useState<Record<string, string[]>>({});
  const [filterableAttributeTypesList, setFilterableAttributeTypesList] = useState<ProductAttributeTypeRecord[]>([]);

  const [categoryTreeNodes, setCategoryTreeNodes] = useState<CategoryTreeNode[]>([]);
  const [variantTypeOptions, setVariantTypeOptions] = useState<{ label: string; value: string }[]>([]);
  const [simpleProductOptions, setSimpleProductOptions] = useState<{ label: string; value: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currencyOptions, setCurrencyOptions] = useState<{ label: string; value: string }[]>([]);

  const unitOptions = useMemo(() => unitsCatalogToSelectOptions(unitsCatalog), [unitsCatalog]);

  const handleHide = () => {
    if (!saving && !isNavigating) {
      // Revoke blob URLs for any pending images on cancel
      pendingImages.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      setPendingImages([]);
      onHide();
    }
  };

  useEffect(() => {
    if (!visible) return;
    setError(null);

    // Load categories for tree selector
    getProductCategories()
      .then(({ items }) => {
        setCategoryTreeNodes(buildCategoryTree(items.filter((c) => c.active !== false)));
      })
      .catch(() => setCategoryTreeNodes([]));

    getProductAttributeTypes()
      .then(({ items }) => {
        setVariantTypeOptions(
          variantAttributeTypes(items)
            .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label))
            .map((t) => ({ label: `${t.label} (${t.code})`, value: t.code }))
        );
        setFilterableAttributeTypesList(filterableAttributeTypes(items));
      })
      .catch(() => {
        setVariantTypeOptions([]);
        setFilterableAttributeTypesList([]);
      });

    getProducts()
      .then(({ items }) => {
        const simple = items.filter((p) => p.woocommerceType === "simple" && p.id !== productId);
        setSimpleProductOptions(
          simple.map((p) => ({ label: `${p.code} - ${p.name}`, value: p.id }))
        );
      })
      .catch(() => setSimpleProductOptions([]));

    if (!productId) {
      setCode("");
      setName("");
      setDescription("");
      setCategoryIds([]);
      setCategoryName("");
      setType("good");
      setUnitOfMeasure("");
      setPurchasePrice("");
      setSalePrice("");
      setCurrency("PEN");
      setTaxAffectation("10");
      setMinStock("");
      setMaxStock("");
      setActive(true);
      setSku("");
      setEcommerceStatus("active");
      setWoocommerceType("simple");
      setVisibleInStore(false);
      setTags([]);
      setGroupedProductIds([]);
      setImageUrlsArr([]);
      setPendingImages([]);
      setCategoryPath([]);
      setAttributeTypeCodes([]);
      setFilterableAttributes({});
      setLoading(false);
      return;
    }

    setLoading(true);
    getProduct(productId)
      .then((data) => {
        if (!data) {
          setError("Producto no encontrado.");
          return;
        }
        setCode(data.code ?? "");
        setName(data.name ?? "");
        setDescription(data.description ?? "");
        setCategoryIds(Array.isArray(data.categoryIds) ? data.categoryIds : data.categoryId ? [data.categoryId] : []);
        setCategoryName(data.categoryName ?? "");
        setType(data.type ?? "good");
        setUnitOfMeasure(data.unitOfMeasureCode || "");
        setPurchasePrice(String(data.purchasePrice ?? ""));
        setSalePrice(String(data.salePrice ?? ""));
        setCurrency(data.currency ?? "PEN");
        setTaxAffectation(data.taxAffectation ?? "10");
        setMinStock(data.minStock != null ? String(data.minStock) : "");
        setMaxStock(data.maxStock != null ? String(data.maxStock) : "");
        setActive(data.active !== false);
        setSku(data.sku ?? "");
        setEcommerceStatus(data.ecommerceStatus ?? "active");
        setWoocommerceType(data.woocommerceType ?? "simple");
        setVisibleInStore(data.visibleInStore ?? false);
        setTags(Array.isArray(data.tags) ? data.tags : []);
        setGroupedProductIds(Array.isArray(data.groupedProductIds) ? data.groupedProductIds : []);
        setImageUrlsArr(Array.isArray(data.imageUrls) ? data.imageUrls : []);
        setCategoryPath(Array.isArray(data.categoryPath) ? data.categoryPath : []);
        setAttributeTypeCodes(
          Array.isArray(data.attributeTypeCodes) ? data.attributeTypeCodes : []
        );
        setFilterableAttributes(
          data.filterableAttributes && typeof data.filterableAttributes === "object"
            ? data.filterableAttributes
            : {}
        );
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error al cargar."))
      .finally(() => setLoading(false));
  }, [visible, productId]);

  useEffect(() => {
    if (!visible || categoryIds.length === 0 || categoryTreeNodes.length === 0) return;
    setCategoryPath(computePrimaryCategoryPath(categoryTreeNodes, categoryIds));
  }, [visible, categoryIds, categoryTreeNodes]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    getActiveCompanyCurrencyOptions()
      .then(({ options, defaultCurrency }) => {
        if (cancelled) return;
        const mapped = options.map((opt) => ({ label: opt.label, value: opt.value }));
        setCurrencyOptions(mapped);
        setCurrency((prev) => (mapped.some((x) => x.value === prev) ? prev : defaultCurrency));
      })
      .catch((err) => {
        if (cancelled) return;
        setCurrencyOptions([]);
        setError(err instanceof Error ? err.message : "No se pudo cargar la configuración de monedas.");
      });
    return () => {
      cancelled = true;
    };
  }, [visible]);

  // Validation
  const nameValid = name.trim().length > 0 && name.trim().length <= 150;
  const unitValid =
    unitOfMeasure.trim().length > 0 && unitsCatalog.some((u) => u.code === unitOfMeasure.trim());
  const purchasePriceNum = Number(purchasePrice) || 0;
  const salePriceNum = Number(salePrice) || 0;
  const pricesValid = purchasePriceNum >= 0 && salePriceNum >= 0;
  const minStockNum = minStock.trim() !== "" ? Number(minStock) : null;
  const maxStockNum = maxStock.trim() !== "" ? Number(maxStock) : null;
  const stockValid =
    minStockNum == null ||
    maxStockNum == null ||
    minStockNum <= maxStockNum;

  const valid = nameValid && unitValid && pricesValid && stockValid;

  const visibleInStoreValid = !visibleInStore || (
    sku.trim().length > 0 &&
    name.trim().length > 0 &&
    categoryPath.length > 0 &&
    (woocommerceType === "grouped" || salePriceNum > 0)
  );

  /**
   * Validates and updates filterable attributes.
   * Only allows values that exist in the type's values array.
   */
  const handleFilterableAttributesChange = useCallback(
    (attrs: Record<string, string[]>) => {
      const validated: Record<string, string[]> = {};
      for (const [code, values] of Object.entries(attrs)) {
        const attrType = filterableAttributeTypesList.find((t) => t.code === code);
        if (!attrType) {
          // Keep existing values for orphaned codes (type removed from catalog)
          validated[code] = values;
          continue;
        }
        // Only keep values that exist in the type's values array
        const validValues = values.filter((v) => attrType.values.includes(v));
        if (validValues.length > 0) {
          validated[code] = validValues;
        }
      }
      setFilterableAttributes(validated);
    },
    [filterableAttributeTypesList]
  );

  const save = async () => {
    if (!valid) return;
    if (visibleInStore && !visibleInStoreValid) {
      const missing: string[] = [];
      if (!sku.trim()) missing.push("SKU");
      if (!name.trim()) missing.push("Nombre");
      if (categoryPath.length === 0) missing.push("Categoría");
      if (woocommerceType !== "grouped" && salePriceNum <= 0) missing.push("Precio venta");
      setError(`Campos requeridos faltantes para visible en tienda: ${missing.join(", ")}`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      let finalCode: string;
      if (isEdit) {
        finalCode = code.trim();
      } else {
        try {
          finalCode = await generateSequenceCode(code, "product");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Error al generar código.");
          setSaving(false);
          return;
        }
      }

      const primaryCategoryId = categoryIds.length > 0 ? categoryIds[0] : undefined;
      const primaryCategoryName = primaryCategoryId
        ? categoryTreeNodes.length > 0
          ? (() => {
              const flat = (nodes: CategoryTreeNode[]): CategoryTreeNode[] =>
                nodes.flatMap((n) => [n, ...flat(n.children)]);
              const found = flat(categoryTreeNodes).find((n) => n.id === primaryCategoryId);
              return found?.name ?? "";
            })()
          : ""
        : "";

      const groupedIds = woocommerceType === "grouped" ? groupedProductIds : undefined;

      // Upload pending images before saving
      let allImageUrls = [...imageUrlsArr];
      if (pendingImages.length > 0) {
        const targetProductId = productId ?? "__new__";
        for (const pending of pendingImages) {
          const result = await uploadProductImage(companyId, targetProductId, pending.file);
          allImageUrls.push(result.url);
        }
        // Clear pending images after successful upload
        pendingImages.forEach((p) => URL.revokeObjectURL(p.previewUrl));
        setPendingImages([]);
        setImageUrlsArr(allImageUrls);
      }

      const payload = {
        code: finalCode,
        name: name.trim(),
        description: description.trim(),
        categoryIds,
        categoryId: primaryCategoryId,
        categoryName: primaryCategoryName,
        type,
        unitOfMeasureCode: unitOfMeasure.trim(),
        purchasePrice: purchasePriceNum,
        salePrice: salePriceNum,
        currency: currency.trim() || "PEN",
        taxAffectation: taxAffectation.trim() || "10",
        ...(minStockNum != null ? { minStock: minStockNum } : { minStock: undefined }),
        ...(maxStockNum != null ? { maxStock: maxStockNum } : { maxStock: undefined }),
        active,
        sku: sku.trim() || undefined,
        ecommerceStatus: ecommerceStatus as "active" | "inactive" | "discontinued",
        woocommerceType: woocommerceType as "simple" | "variable" | "grouped",
        visibleInStore,
        tags,
        ...(groupedIds != null ? { groupedProductIds: groupedIds } : { groupedProductIds: undefined }),
        imageUrls: productId ? allImageUrls : allImageUrls.length > 0 ? allImageUrls : undefined,
        categoryPath,
        attributeTypeCodes,
        filterableAttributes,
      };

      if (productId) {
        await updateProduct(productId, payload);
      } else {
        await addProduct(payload);
      }
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DpContentSet
      title={isEdit ? "Editar producto" : "Agregar producto"}
      recordId={isEdit ? productId : null}
      cancelLabel="Cancelar"
      onCancel={handleHide}
      saveLabel="Guardar"
      onSave={save}
      saving={saving || isNavigating}
      saveDisabled={!valid || isNavigating}
      visible={visible}
      onHide={handleHide}
      showLoading={loading}
      showError={!!error}
      errorMessage={error ?? ""}
    >
      <div className="flex flex-col gap-4 pt-2">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <DpCodeInput entity="product" label="Código" name="code" value={code} onChange={setCode} />
          <DpInput
            type="select"
            label="Tipo"
            name="type"
            value={type}
            onChange={(v) => setType(v as ProductType)}
            options={PRODUCT_TYPE_OPTIONS}
          />
        </div>

        <DpInput
          type="input"
          label="Nombre *"
          name="name"
          value={name}
          onChange={setName}
          placeholder="Nombre del producto"
        />
        {name.trim().length > 150 && (
          <small className="text-red-600">Máximo 150 caracteres.</small>
        )}

        <DpInput
          type="input"
          label="Descripción"
          name="description"
          value={description}
          onChange={setDescription}
          placeholder="Descripción del producto"
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Categorías
            </label>
            <CategorySelector
              value={categoryIds}
              onChange={(ids, path) => {
                setCategoryIds(ids);
                setCategoryPath(path);
              }}
              categories={categoryTreeNodes}
            />
          </div>
          <DpInput
            type="select"
            label="Unidad de medida *"
            name="unitOfMeasure"
            value={unitOfMeasure}
            onChange={(v) => setUnitOfMeasure(String(v))}
            options={unitOptions}
            placeholder="Seleccione..."
          />
        </div>

        <div className="border-t border-zinc-200 pt-3 dark:border-zinc-700">
          <h4 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Precios</h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <DpInput
              type="number"
              label="Precio compra"
              name="purchasePrice"
              value={purchasePrice}
              onChange={setPurchasePrice}
              placeholder="0.00"
            />
            <DpInput
              type="number"
              label="Precio venta"
              name="salePrice"
              value={salePrice}
              onChange={setSalePrice}
              placeholder="0.00"
            />
            <DpInput
              type="select"
              label="Moneda"
              name="currency"
              value={currency}
              onChange={(v) => setCurrency(String(v))}
            options={currencyOptions}
            />
          </div>
        </div>

        <DpInput
          type="select"
          label="Afectación IGV"
          name="taxAffectation"
          value={taxAffectation}
          onChange={(v) => setTaxAffectation(String(v))}
          options={TAX_AFFECTATION_OPTIONS}
        />

        <div className="border-t border-zinc-200 pt-3 dark:border-zinc-700">
          <h4 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Stock</h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DpInput
              type="number"
              label="Stock mínimo"
              name="minStock"
              value={minStock}
              onChange={setMinStock}
              placeholder="0"
            />
            <DpInput
              type="number"
              label="Stock máximo"
              name="maxStock"
              value={maxStock}
              onChange={setMaxStock}
              placeholder="0"
            />
          </div>
          {!stockValid && (
            <small className="mt-1 text-red-600">
              El stock mínimo no puede ser mayor al stock máximo.
            </small>
          )}
        </div>

        <div className="border-t border-zinc-200 pt-3 dark:border-zinc-700">
          <h4 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">E-commerce</h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DpInput
              type="input"
              label="SKU"
              name="sku"
              value={sku}
              onChange={setSku}
              placeholder="Código SKU"
            />
            <DpInput
              type="select"
              label="Estado e-commerce"
              name="ecommerceStatus"
              value={ecommerceStatus}
              onChange={(v) => setEcommerceStatus(String(v))}
              options={ECOMMERCE_OPTIONS}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DpInput
              type="select"
              label="Tipo WooCommerce"
              name="woocommerceType"
              value={woocommerceType}
              onChange={(v) => setWoocommerceType(String(v))}
              options={WOOCOMMERCE_TYPE_OPTIONS}
            />
            <DpInput
              type="check"
              label="Visible en tienda"
              name="visibleInStore"
              value={visibleInStore}
              onChange={setVisibleInStore}
            />
          </div>
          <TagInput value={tags} onChange={setTags} />
          {woocommerceType === "grouped" && (
            <div className="mt-2">
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Productos hijos (agrupados)
              </label>
              <MultiSelect
                value={groupedProductIds}
                options={simpleProductOptions}
                onChange={(e) => setGroupedProductIds((e.value as string[]) ?? [])}
                optionLabel="label"
                optionValue="value"
                placeholder="Seleccione productos simples..."
                display="chip"
                className="w-full"
              />
            </div>
          )}
          <ImageUpload
            images={imageUrlsArr}
            pendingImages={pendingImages}
            onImagesChange={setImageUrlsArr}
            onPendingImagesChange={setPendingImages}
          />
          {categoryPath.length > 0 && (
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              Ruta: {categoryPath.join(" → ")}
            </div>
          )}
        </div>

        <div className="border-t border-zinc-200 pt-3 dark:border-zinc-700">
          <h4 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Atributos de variante
          </h4>
          <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">
            Tipos aplicables a este producto
          </label>
          <MultiSelect
            value={attributeTypeCodes}
            options={variantTypeOptions}
            onChange={(e) => setAttributeTypeCodes((e.value as string[]) ?? [])}
            optionLabel="label"
            optionValue="value"
            placeholder="Seleccione talla, color, etc."
            display="chip"
            className="w-full"
            disabled={variantTypeOptions.length === 0}
          />
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Define qué dimensiones tendrán las variaciones de este producto. Configúre los tipos en
            Inventario → Tipos de atributo (marcar «Usar en variantes»).
          </p>
        </div>

        <div className="border-t border-zinc-200 pt-3 dark:border-zinc-700">
          <h4 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Atributos filtrables
          </h4>
          <FilterableAttributesSection
            value={filterableAttributes}
            onChange={handleFilterableAttributesChange}
            attributeTypes={filterableAttributeTypesList}
            disabled={saving}
          />
        </div>

        <DpInput
          type="check"
          label="Activo"
          name="active"
          value={active}
          onChange={setActive}
        />
      </div>

      {/* Variaciones se gestionan en pantalla dedicada: /inventory/products/:id/variants */}
    </DpContentSet>
  );
}
