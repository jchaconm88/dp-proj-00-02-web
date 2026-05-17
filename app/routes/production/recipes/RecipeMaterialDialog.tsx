import { useEffect, useState, useMemo } from "react";
import { useNavigation } from "react-router";
import { DpInput, DpContentSet } from "~/components/ui";
import { addRecipeMaterial, updateRecipeMaterial, getRecipeMaterialById, type RecipeMaterialRecord } from "~/features/production";
import { getProducts, type ProductRecord } from "~/features/inventory/products";
import { getUnitsOfMeasureCatalog, unitsCatalogToSelectOptions, type UnitOfMeasureRecord } from "~/features/system/units-of-measure";

export interface RecipeMaterialDialogProps {
  visible: boolean;
  recipeId: string;
  materialId: string | null;
  onSuccess: () => void;
  onHide: () => void;
}

export default function RecipeMaterialDialog({
  visible, recipeId, materialId, onSuccess, onHide,
}: RecipeMaterialDialogProps) {
  const isEdit = !!materialId;
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";

  const [productId, setProductId] = useState("");
  const [productName, setProductName] = useState("");
  const [productCode, setProductCode] = useState("");
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

  const materialProductOptions = useMemo(() => {
    return products
      .filter((p) => ["raw_material", "semi_finished", "supply"].includes(p.type))
      .map((p) => ({ value: p.id, label: `${p.code ? p.code + " - " : ""}${p.name}` }));
  }, [products]);

  const unitOptions = useMemo(() => unitsCatalogToSelectOptions(unitsCatalog), [unitsCatalog]);

  const valid = !!productId && !!quantity && Number(quantity) > 0 && !!unitOfMeasureCode;

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

  const loadMaterial = async () => {
    if (!materialId) return;
    setLoading(true);
    try {
      const mat = await getRecipeMaterialById(recipeId, materialId);
      if (mat) {
        setProductId(mat.productId);
        setProductName(mat.productName);
        setProductCode(mat.productCode);
        setQuantity(String(mat.quantity));
        setUnitOfMeasureCode(mat.unitOfMeasureCode);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar material");
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
        if (!cancelled) setProducts(items);
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
    if (!materialId) {
      setProductId("");
      setProductName("");
      setProductCode("");
      setQuantity("");
      setUnitOfMeasureCode("");
      setLoading(false);
      return;
    }
    loadMaterial();
  }, [visible, materialId, recipeId]);

  const handleHide = () => {
    if (!saving && !isNavigating) onHide();
  };

  const save = async () => {
    setTouched(true);
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      if (isEdit && materialId) {
        await updateRecipeMaterial(recipeId, materialId, {
          productId, productName, productCode,
          quantity: Number(quantity),
          unitOfMeasureCode,
          unitOfMeasureName: unitsCatalog.find((u) => u.code === unitOfMeasureCode)?.name ?? "",
          unitOfMeasureAbbreviation: unitsCatalog.find((u) => u.code === unitOfMeasureCode)?.abbreviation ?? "",
        });
      } else {
        await addRecipeMaterial(recipeId, {
          productId, productName, productCode,
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
      title={isEdit ? "Editar Material" : "Agregar Material"}
      recordId={isEdit ? materialId : null}
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
      <DpInput type="select" label="Material *" name="productId" value={productId} onChange={handleProductChange} options={materialProductOptions} placeholder="Seleccionar material" />
      <DpInput type="input" label="Cantidad *" name="quantity" value={quantity} onChange={(v) => setQuantity(String(v))} />
      <DpInput type="select" label="Unidad de medida *" name="unitOfMeasureCode" value={unitOfMeasureCode} onChange={(v) => setUnitOfMeasureCode(String(v))} options={unitOptions} placeholder="Seleccionar unidad" />
    </DpContentSet>
  );
}
