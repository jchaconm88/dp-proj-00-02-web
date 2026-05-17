import { useState, useEffect, useMemo } from "react";
import { useNavigation } from "react-router";
import { DpInput } from "~/components/ui";
import { DpContentSet } from "~/components/ui";
import {
  getPurchaseOrderItemById,
  addPurchaseOrderItem,
  updatePurchaseOrderItem,
  calculateItemTotals,
} from "~/features/purchasing/purchase-orders";
import { getProducts, type ProductRecord } from "~/features/inventory/products";
import {
  TAX_AFFECTATION_CODE,
  statusToSelectOptions,
} from "~/constants/status-options";
import type { UnitOfMeasureRecord } from "~/features/system/units-of-measure";
import { unitsCatalogToSelectOptions } from "~/features/system/units-of-measure";

export interface PurchaseOrderItemDialogProps {
  visible: boolean;
  orderId: string;
  itemId: string | null;
  unitsCatalog: UnitOfMeasureRecord[];
  locked?: boolean;
  onSuccess?: () => void;
  onHide: () => void;
}

const TAX_AFFECTATION_OPTIONS = statusToSelectOptions(TAX_AFFECTATION_CODE);

export default function PurchaseOrderItemDialog({
  visible,
  orderId,
  itemId,
  unitsCatalog,
  locked = false,
  onSuccess,
  onHide,
}: PurchaseOrderItemDialogProps) {
  const isEdit = !!itemId;
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";

  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("0");
  const [unitOfMeasure, setUnitOfMeasure] = useState("");
  const [taxAffectation, setTaxAffectation] = useState("10");

  // Calculated fields (read-only)
  const [subtotal, setSubtotal] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [total, setTotal] = useState(0);

  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const unitOptions = useMemo(() => unitsCatalogToSelectOptions(unitsCatalog), [unitsCatalog]);

  // Auto-calculate totals when quantity, unitPrice, or taxAffectation change
  useEffect(() => {
    const q = Number(quantity) || 0;
    const u = Number(unitPrice) || 0;
    const calc = calculateItemTotals(q, u, taxAffectation);
    setSubtotal(calc.subtotal);
    setTaxAmount(calc.taxAmount);
    setTotal(calc.total);
  }, [quantity, unitPrice, taxAffectation]);

  // Load data when dialog opens
  useEffect(() => {
    if (!visible) return;
    setError(null);
    setTouched(false);

    const loadData = async () => {
      setLoading(true);
      try {
        const { items: productList } = await getProducts();
        setProducts(productList);

        if (!itemId) {
          setProductId("");
          setQuantity("1");
          setUnitPrice("0");
          setUnitOfMeasure("");
          setTaxAffectation("10");
        } else {
          const data = await getPurchaseOrderItemById(orderId, itemId);
          if (!data) {
            setError("Ítem no encontrado.");
            return;
          }
          setProductId(data.productId ?? "");
          setQuantity(String(data.quantity ?? 1));
          setUnitPrice(String(data.unitPrice ?? 0));
          setUnitOfMeasure(data.unitOfMeasureCode || "");
          setTaxAffectation(data.taxAffectation ?? "10");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [visible, orderId, itemId]);

  const productOptions = products.map((p) => ({
    value: p.id,
    label: `${p.code ? p.code + " - " : ""}${p.name}`,
  }));

  // When product changes, auto-fill unitOfMeasure and unitPrice
  const handleProductChange = (value: string) => {
    setProductId(value);
    const selected = products.find((p) => p.id === value);
    if (selected) {
      setUnitOfMeasure((selected.unitOfMeasureCode || "unit").trim());
      if (!isEdit) {
        setUnitPrice(String(selected.purchasePrice ?? 0));
      }
    }
  };

  const qNum = Number(quantity) || 0;
  const uNum = Number(unitPrice) || 0;

  const quantityInvalid = touched && qNum <= 0;
  const unitPriceInvalid = touched && uNum < 0;
  const productIdInvalid = touched && !productId;

  const unitInCatalog =
    !!unitOfMeasure.trim() && unitsCatalog.some((u) => u.code === unitOfMeasure.trim());

  const valid = !!productId && qNum > 0 && uNum >= 0 && unitInCatalog;

  const save = async () => {
    setTouched(true);
    if (!valid) return;
    if (locked) {
      setError("Solo se pueden editar ítems cuando la orden está en estado Borrador.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const selectedProduct = products.find((p) => p.id === productId);
      const productName = selectedProduct?.name ?? "";

      if (itemId) {
        await updatePurchaseOrderItem(orderId, itemId, {
          productId,
          productName,
          quantity: qNum,
          unitOfMeasureCode: unitOfMeasure.trim(),
          unitPrice: uNum,
          taxAffectation,
        });
      } else {
        await addPurchaseOrderItem(orderId, {
          productId,
          productName,
          quantity: qNum,
          unitOfMeasureCode: unitOfMeasure.trim(),
          unitPrice: uNum,
          taxAffectation,
        });
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
      title={isEdit ? "Editar ítem" : "Agregar ítem"}
      recordId={isEdit ? itemId : null}
      cancelLabel="Cancelar"
      onCancel={onHide}
      saveLabel="Guardar"
      onSave={save}
      saving={saving || isNavigating}
      saveDisabled={!valid || isNavigating || locked}
      visible={visible}
      onHide={onHide}
      showLoading={loading}
      showError={!!error}
      errorMessage={error ?? ""}
      dialogBodyHeader={
        locked ? (
          <div className="pb-3">
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              Esta orden no está en <strong>Borrador</strong> y no se pueden editar sus ítems.
            </div>
          </div>
        ) : null
      }
    >
      <div className="flex flex-col gap-4 pt-2">
        <DpInput
          type="select"
          label="Producto *"
          name="productId"
          value={productId}
          onChange={(v) => handleProductChange(String(v))}
          options={productOptions}
          placeholder="Seleccionar producto"
          disabled={locked}
        />
        {productIdInvalid && (
          <p className="mt-[-0.5rem] text-xs text-red-600 dark:text-red-400">
            El producto es obligatorio.
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <DpInput
            type="number"
            label="Cantidad *"
            name="quantity"
            value={quantity}
            onChange={setQuantity}
            placeholder="1"
            disabled={locked}
          />
          <DpInput
            type="number"
            label="Precio unitario *"
            name="unitPrice"
            value={unitPrice}
            onChange={setUnitPrice}
            placeholder="0"
            disabled={locked}
          />
        </div>
        {quantityInvalid && (
          <p className="mt-[-0.5rem] text-xs text-red-600 dark:text-red-400">
            La cantidad debe ser mayor a 0.
          </p>
        )}
        {unitPriceInvalid && (
          <p className="mt-[-0.5rem] text-xs text-red-600 dark:text-red-400">
            El precio unitario debe ser mayor o igual a 0.
          </p>
        )}

        <DpInput
          type="select"
          label="Unidad de medida *"
          name="unitOfMeasure"
          value={unitOfMeasure}
          onChange={(v) => setUnitOfMeasure(String(v))}
          options={unitOptions}
          placeholder="Seleccione..."
          disabled={locked}
        />

        <DpInput
          type="select"
          label="Afectación IGV"
          name="taxAffectation"
          value={taxAffectation}
          onChange={(v) => setTaxAffectation(String(v))}
          options={TAX_AFFECTATION_OPTIONS}
          disabled={locked}
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <DpInput
            type="input"
            label="Subtotal"
            name="subtotal"
            value={subtotal.toFixed(2)}
            onChange={() => {}}
            disabled
          />
          <DpInput
            type="input"
            label="IGV"
            name="taxAmount"
            value={taxAmount.toFixed(2)}
            onChange={() => {}}
            disabled
          />
          <DpInput
            type="input"
            label="Total"
            name="total"
            value={total.toFixed(2)}
            onChange={() => {}}
            disabled
          />
        </div>
      </div>
    </DpContentSet>
  );
}
