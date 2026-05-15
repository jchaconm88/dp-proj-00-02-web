import { useState, useEffect, useMemo } from "react";
import { useNavigation } from "react-router";
import { DpInput } from "~/components/DpInput";
import { DpContentSet } from "~/components/DpContent";
import {
  getSaleOrderItemById,
  addSaleOrderItem,
  updateSaleOrderItem,
  calculateSaleOrderItemFields,
} from "~/features/sales/sale-orders";
import { getProducts, type ProductRecord } from "~/features/inventory/products";
import { TAX_AFFECTATION_CODE, statusToSelectOptions } from "~/constants/status-options";
import type { UnitOfMeasureRecord } from "~/features/system/units-of-measure";
import { unitsCatalogToSelectOptions } from "~/features/system/units-of-measure";

export interface SaleOrderItemDialogProps {
  visible: boolean;
  orderId: string;
  itemId: string | null;
  unitsCatalog: UnitOfMeasureRecord[];
  locked?: boolean;
  onSuccess?: () => void;
  onHide: () => void;
}

const TAX_AFFECTATION_OPTIONS = statusToSelectOptions(TAX_AFFECTATION_CODE);

export default function SaleOrderItemDialog({
  visible,
  orderId,
  itemId,
  unitsCatalog,
  locked = false,
  onSuccess,
  onHide,
}: SaleOrderItemDialogProps) {
  const isEdit = !!itemId;
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";

  const [productId, setProductId] = useState("");
  const [productName, setProductName] = useState("");
  const [productCode, setProductCode] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitOfMeasure, setUnitOfMeasure] = useState("");
  const [unitPrice, setUnitPrice] = useState("0");
  const [discount, setDiscount] = useState("0");
  const [taxAffectation, setTaxAffectation] = useState("10");

  // Calculated fields (read-only)
  const [subtotal, setSubtotal] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [total, setTotal] = useState(0);

  // Products for dropdown
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const unitOptions = useMemo(() => unitsCatalogToSelectOptions(unitsCatalog), [unitsCatalog]);

  // Recalculate in real time using calculateSaleOrderItemFields
  useEffect(() => {
    const q = Number(quantity) || 0;
    const u = Number(unitPrice) || 0;
    const d = Number(discount) || 0;
    const calc = calculateSaleOrderItemFields(q, u, d, taxAffectation);
    setSubtotal(calc.subtotal);
    setTaxAmount(calc.taxAmount);
    setTotal(calc.total);
  }, [quantity, unitPrice, discount, taxAffectation]);

  // Load products for dropdown
  useEffect(() => {
    if (!visible) return;
    setLoadingProducts(true);
    getProducts()
      .then(({ items }) => setProducts(items))
      .catch(() => setProducts([]))
      .finally(() => setLoadingProducts(false));
  }, [visible]);

  // Load item data on edit
  useEffect(() => {
    if (!visible) return;
    setError(null);
    setTouched(false);

    if (!itemId) {
      setProductId("");
      setProductName("");
      setProductCode("");
      setQuantity("1");
      setUnitOfMeasure("");
      setUnitPrice("0");
      setDiscount("0");
      setTaxAffectation("10");
      setLoading(false);
      return;
    }

    setLoading(true);
    getSaleOrderItemById(orderId, itemId)
      .then((data) => {
        if (!data) {
          setError("Ítem no encontrado.");
          return;
        }
        setProductId(data.productId ?? "");
        setProductName(data.productName ?? "");
        setProductCode(data.productCode ?? "");
        setQuantity(String(data.quantity ?? 1));
        setUnitOfMeasure(data.unitOfMeasureCode || "");
        setUnitPrice(String(data.unitPrice ?? 0));
        setDiscount(String(data.discount ?? 0));
        setTaxAffectation(data.taxAffectation ?? "10");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error al cargar."))
      .finally(() => setLoading(false));
  }, [visible, orderId, itemId]);

  // Handle product selection
  const handleProductChange = (selectedProductId: string | number) => {
    const id = String(selectedProductId);
    setProductId(id);
    const product = products.find((p) => p.id === id);
    if (product) {
      setProductName(product.name);
      setProductCode(product.code);
      setUnitOfMeasure((product.unitOfMeasureCode || "unit").trim());
      setUnitPrice(String(product.salePrice ?? 0));
      setTaxAffectation(product.taxAffectation ?? "10");
    }
  };

  // Validation
  const qNum = Number(quantity) || 0;
  const uNum = Number(unitPrice) || 0;
  const dNum = Number(discount) || 0;

  const quantityInvalid = touched && qNum <= 0;
  const unitPriceInvalid = touched && uNum < 0;
  const discountInvalid = touched && (dNum < 0 || dNum > 100);
  const productIdInvalid = touched && !productId;

  const unitInCatalog =
    !!unitOfMeasure.trim() && unitsCatalog.some((u) => u.code === unitOfMeasure.trim());

  const valid =
    !!productId &&
    qNum > 0 &&
    uNum >= 0 &&
    dNum >= 0 &&
    dNum <= 100 &&
    unitInCatalog;

  const productOptions = products.map((p) => ({
    value: p.id,
    label: `${p.code ? p.code + " - " : ""}${p.name}`,
  }));

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
      const resolvedProductName = selectedProduct?.name ?? productName.trim();

      const data = {
        productId,
        productName: resolvedProductName,
        productCode: selectedProduct?.code ?? productCode.trim(),
        quantity: qNum,
        unitOfMeasureCode: unitOfMeasure.trim(),
        unitPrice: uNum,
        discount: dNum,
        taxAffectation,
        subtotal,
        taxAmount,
        total,
      };

      if (itemId) {
        await updateSaleOrderItem(orderId, itemId, data);
      } else {
        await addSaleOrderItem(orderId, data);
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
      showLoading={loading || loadingProducts}
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
          onChange={handleProductChange}
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
          <div>
            <DpInput
              type="number"
              label="Cantidad *"
              name="quantity"
              value={quantity}
              onChange={setQuantity}
              placeholder="1"
              disabled={locked}
            />
            {quantityInvalid && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                La cantidad debe ser mayor a 0.
              </p>
            )}
          </div>
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
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <DpInput
              type="number"
              label="Precio unitario *"
              name="unitPrice"
              value={unitPrice}
              onChange={setUnitPrice}
              placeholder="0.00"
              disabled={locked}
            />
            {unitPriceInvalid && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                El precio unitario debe ser mayor o igual a 0.
              </p>
            )}
          </div>
          <div>
            <DpInput
              type="number"
              label="Descuento (%)"
              name="discount"
              value={discount}
              onChange={setDiscount}
              placeholder="0"
              disabled={locked}
            />
            {discountInvalid && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                El descuento debe estar entre 0 y 100.
              </p>
            )}
          </div>
        </div>

        <DpInput
          type="select"
          label="Afectación IGV"
          name="taxAffectation"
          value={taxAffectation}
          onChange={(v) => setTaxAffectation(String(v))}
          options={TAX_AFFECTATION_OPTIONS}
          disabled={locked}
        />

        {/* Calculated fields (read-only) */}
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
