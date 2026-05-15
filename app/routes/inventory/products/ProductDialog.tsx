import { useState, useEffect, useMemo } from "react";
import { useNavigation } from "react-router";
import { DpInput } from "~/components/DpInput";
import { DpCodeInput } from "~/components/DpCodeInput";
import { DpContentSet } from "~/components/DpContent";
import {
  getProduct,
  addProduct,
  updateProduct,
  type ProductType,
} from "~/features/inventory/products";
import { getActiveCompanyCurrencyOptions } from "~/features/system/companies";
import { getProductCategories } from "~/features/inventory/product-categories";
import { PRODUCT_TYPE, TAX_AFFECTATION_CODE, statusToSelectOptions } from "~/constants/status-options";
import { generateSequenceCode } from "~/features/system/sequences";
import type { UnitOfMeasureRecord } from "~/features/system/units-of-measure";
import { unitsCatalogToSelectOptions } from "~/features/system/units-of-measure";

export interface ProductDialogProps {
  visible: boolean;
  productId: string | null;
  unitsCatalog: UnitOfMeasureRecord[];
  onSuccess?: () => void;
  onHide: () => void;
}

const PRODUCT_TYPE_OPTIONS = statusToSelectOptions(PRODUCT_TYPE);
const TAX_AFFECTATION_OPTIONS = statusToSelectOptions(TAX_AFFECTATION_CODE);

export default function ProductDialog({
  visible,
  productId,
  unitsCatalog,
  onSuccess,
  onHide,
}: ProductDialogProps) {
  const isEdit = !!productId;
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
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

  const [categoryOptions, setCategoryOptions] = useState<{ label: string; value: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currencyOptions, setCurrencyOptions] = useState<{ label: string; value: string }[]>([]);

  const unitOptions = useMemo(() => unitsCatalogToSelectOptions(unitsCatalog), [unitsCatalog]);

  const handleHide = () => {
    if (!saving && !isNavigating) onHide();
  };

  useEffect(() => {
    if (!visible) return;
    setError(null);

    // Load categories for dropdown
    getProductCategories()
      .then(({ items }) => {
        setCategoryOptions(
          items
            .filter((c) => c.active !== false)
            .map((c) => ({ label: c.name, value: c.id }))
        );
      })
      .catch(() => setCategoryOptions([]));

    if (!productId) {
      setCode("");
      setName("");
      setDescription("");
      setCategoryId("");
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
        setCategoryId(data.categoryId ?? "");
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
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error al cargar."))
      .finally(() => setLoading(false));
  }, [visible, productId]);

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

  const save = async () => {
    if (!valid) return;
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

      const payload = {
        code: finalCode,
        name: name.trim(),
        description: description.trim(),
        categoryId: categoryId.trim(),
        categoryName: categoryName.trim(),
        type,
        unitOfMeasureCode: unitOfMeasure.trim(),
        purchasePrice: purchasePriceNum,
        salePrice: salePriceNum,
        currency: currency.trim() || "PEN",
        taxAffectation: taxAffectation.trim() || "10",
        ...(minStockNum != null ? { minStock: minStockNum } : { minStock: undefined }),
        ...(maxStockNum != null ? { maxStock: maxStockNum } : { maxStock: undefined }),
        active,
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
          <DpInput
            type="select"
            label="Categoría"
            name="categoryId"
            value={categoryId}
            onChange={(v) => {
              setCategoryId(String(v));
              const found = categoryOptions.find((o) => o.value === String(v));
              setCategoryName(found ? found.label : "");
            }}
            options={categoryOptions}
            placeholder="Seleccione..."
          />
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

        <DpInput
          type="check"
          label="Activo"
          name="active"
          value={active}
          onChange={setActive}
        />
      </div>
    </DpContentSet>
  );
}
