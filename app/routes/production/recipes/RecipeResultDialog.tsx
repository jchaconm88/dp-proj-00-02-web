import { useEffect, useMemo, useState } from "react";
import { useNavigation } from "react-router";
import { DpInput, DpContentSet } from "~/components/ui";
import { addRecipeResult, updateRecipeResult, getRecipeResultById, type RecipeResultRecord } from "~/features/production";
import { getProducts, type ProductRecord } from "~/features/inventory/products";
import { getUnitsOfMeasureCatalog, unitsCatalogToSelectOptions, type UnitOfMeasureRecord } from "~/features/system/units-of-measure";
import { statusToSelectOptions } from "~/constants/status-options";

const RESULT_TYPE_OPTIONS = statusToSelectOptions({
  finished_good: { label: "Producto terminado", severity: "success" },
  by_product: { label: "Subproducto", severity: "info" },
  waste: { label: "Desperdicio", severity: "secondary" },
});

export interface RecipeResultDialogProps {
  visible: boolean;
  recipeId: string;
  resultId: string | null;
  onSuccess: () => void;
  onHide: () => void;
}

export default function RecipeResultDialog({
  visible, recipeId, resultId, onSuccess, onHide,
}: RecipeResultDialogProps) {
  const isEdit = !!resultId;
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";

  const [type, setType] = useState("finished_good");
  const [productId, setProductId] = useState("");
  const [productName, setProductName] = useState("");
  const [productCode, setProductCode] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitOfMeasureCode, setUnitOfMeasureCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [unitsCatalog, setUnitsCatalog] = useState<UnitOfMeasureRecord[]>([]);

  const finishedProductOptions = useMemo(() => {
    return products
      .filter((p) => ["finished_good", "semi_finished"].includes(p.type))
      .map((p) => ({ value: p.id, label: `${p.code ? p.code + " - " : ""}${p.name}` }));
  }, [products]);

  const unitOptions = useMemo(() => unitsCatalogToSelectOptions(unitsCatalog), [unitsCatalog]);

  const needsProduct = type === "finished_good" || type === "by_product";
  const valid = !!type && (!needsProduct || !!productId) && !!quantity && Number(quantity) > 0 && !!unitOfMeasureCode;

  const handleProductChange = (value: string | number) => {
    const pid = String(value);
    setProductId(pid);
    const product = products.find((p) => p.id === pid);
    if (product) {
      setProductName(product.name);
      setProductCode(product.code ?? "");
      setUnitOfMeasureCode(product.unitOfMeasureCode || "unit");
    }
  };

  const loadResult = async () => {
    if (!resultId) return;
    setLoading(true);
    try {
      const res = await getRecipeResultById(recipeId, resultId);
      if (res) {
        setType(res.type);
        setProductId(res.productId);
        setProductName(res.productName);
        setProductCode(res.productCode);
        setDescription(res.description ?? "");
        setQuantity(String(res.quantity));
        setUnitOfMeasureCode(res.unitOfMeasureCode);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar resultado");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setProductsLoading(true);
    setUnitsLoading(true);
    Promise.all([getProducts(), getUnitsOfMeasureCatalog()])
      .then(([{ items }, units]) => {
        if (cancelled) return;
        setProducts(items);
        setUnitsCatalog(units);
      })
      .catch((err) => {
        if (cancelled) return;
        setProducts([]);
        setUnitsCatalog([]);
        setError(err instanceof Error ? err.message : "Error al cargar productos");
      })
      .finally(() => {
        if (!cancelled) {
          setProductsLoading(false);
          setUnitsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    setTouched(false);
    if (!resultId) {
      setType("finished_good");
      setProductId("");
      setProductName("");
      setProductCode("");
      setDescription("");
      setQuantity("");
      setUnitOfMeasureCode("");
      setLoading(false);
      return;
    }
    loadResult();
  }, [visible, resultId, recipeId]);

  const handleHide = () => {
    if (!saving && !isNavigating) onHide();
  };

  const save = async () => {
    setTouched(true);
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      if (isEdit && resultId) {
        await updateRecipeResult(recipeId, resultId, {
          type: type as any,
          productId: needsProduct ? productId : "",
          productName: needsProduct ? productName : "",
          productCode: needsProduct ? productCode : "",
          description: type === "waste" ? description : "",
          quantity: Number(quantity),
          unitOfMeasureCode,
          unitOfMeasureName: unitsCatalog.find((u) => u.code === unitOfMeasureCode)?.name ?? "",
          unitOfMeasureAbbreviation: unitsCatalog.find((u) => u.code === unitOfMeasureCode)?.abbreviation ?? "",
        });
      } else {
        await addRecipeResult(recipeId, {
          type: type as any,
          productId: needsProduct ? productId : undefined,
          productName: needsProduct ? productName : undefined,
          productCode: needsProduct ? productCode : undefined,
          description: type === "waste" ? description : undefined,
          quantity: Number(quantity),
          unitOfMeasureCode,
          unitOfMeasureName: unitsCatalog.find((u) => u.code === unitOfMeasureCode)?.name ?? "",
          unitOfMeasureAbbreviation: unitsCatalog.find((u) => u.code === unitOfMeasureCode)?.abbreviation ?? "",
        });
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DpContentSet
      title={isEdit ? "Editar Resultado" : "Agregar Resultado"}
      recordId={isEdit ? resultId : null}
      cancelLabel="Cancelar"
      onCancel={handleHide}
      saveLabel="Guardar"
      onSave={save}
      saving={saving || isNavigating}
      saveDisabled={!valid || isNavigating}
      visible={visible}
      onHide={handleHide}
      showLoading={loading || productsLoading || unitsLoading}
      showError={!!error}
      errorMessage={error ?? ""}
    >
      <DpInput type="select" label="Tipo *" name="type" value={type} onChange={(v) => setType(String(v))} options={RESULT_TYPE_OPTIONS} />
      {needsProduct && (
        <DpInput type="select" label="Producto *" name="productId" value={productId} onChange={handleProductChange} options={finishedProductOptions} placeholder="Seleccionar producto" />
      )}
      {type === "waste" && (
        <DpInput type="input" label="Descripción" name="description" value={description} onChange={(v) => setDescription(String(v))} />
      )}
      <DpInput type="input" label="Cantidad *" name="quantity" value={quantity} onChange={(v) => setQuantity(String(v))} />
      <DpInput type="select" label="Unidad de medida *" name="unitOfMeasureCode" value={unitOfMeasureCode} onChange={(v) => setUnitOfMeasureCode(String(v))} options={unitOptions} placeholder="Seleccionar unidad" />
    </DpContentSet>
  );
}
