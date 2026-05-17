import { useState, useEffect, useMemo } from "react";
import { useNavigation } from "react-router";
import { DpInput } from "~/components/ui";
import { DpContentSet } from "~/components/ui";
import { DpConfirmDialog } from "~/components/ui";
import {
  getQuotationItemById,
  addQuotationItem,
  updateQuotationItem,
  calculateQuotationItemFields,
} from "~/features/sales/quotations";
import { getProducts, type ProductRecord } from "~/features/inventory/products";
import { TAX_AFFECTATION_CODE, statusToSelectOptions } from "~/constants/status-options";
import ProductDialog from "../../inventory/products/ProductDialog";
import type { UnitOfMeasureRecord } from "~/features/system/units-of-measure";
import { unitsCatalogToSelectOptions } from "~/features/system/units-of-measure";

export interface QuotationItemDialogProps {
  visible: boolean;
  quotationId: string;
  itemId: string | null;
  unitsCatalog: UnitOfMeasureRecord[];
  locked?: boolean;
  onSuccess?: () => void;
  onHide: () => void;
}

const TAX_AFFECTATION_OPTIONS = statusToSelectOptions(TAX_AFFECTATION_CODE);

export default function QuotationItemDialog({
  visible,
  quotationId,
  itemId,
  unitsCatalog,
  locked = false,
  onSuccess,
  onHide,
}: QuotationItemDialogProps) {
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
  const [showNoProductsConfirm, setShowNoProductsConfirm] = useState(false);
  const [showCreateProductDialog, setShowCreateProductDialog] = useState(false);
  const [productIdsBeforeCreate, setProductIdsBeforeCreate] = useState<string[]>([]);

  const unitOptions = useMemo(() => unitsCatalogToSelectOptions(unitsCatalog), [unitsCatalog]);

  // Recalculate in real time
  useEffect(() => {
    const q = Number(quantity) || 0;
    const u = Number(unitPrice) || 0;
    const d = Number(discount) || 0;
    const calc = calculateQuotationItemFields({
      quantity: q,
      unitPrice: u,
      discount: d,
      taxAffectation,
    });
    setSubtotal(calc.subtotal);
    setTaxAmount(calc.taxAmount);
    setTotal(calc.total);
  }, [quantity, unitPrice, discount, taxAffectation]);

  // Load products for dropdown
  useEffect(() => {
    if (!visible) return;
    setLoadingProducts(true);
    getProducts()
      .then(({ items }) => {
        setProducts(items);
        if (!isEdit && items.length === 0) {
          setShowNoProductsConfirm(true);
        }
      })
      .catch(() => setProducts([]))
      .finally(() => setLoadingProducts(false));
  }, [visible, isEdit]);

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
    getQuotationItemById(quotationId, itemId)
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
  }, [visible, quotationId, itemId]);

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

  const quantityInvalid = touched && qNum < 1;
  const unitPriceInvalid = touched && uNum < 0.01;
  const discountInvalid = touched && (dNum < 0 || dNum > 100);

  const unitInCatalog =
    !!unitOfMeasure.trim() && unitsCatalog.some((u) => u.code === unitOfMeasure.trim());

  const valid =
    !!productName.trim() &&
    qNum >= 1 &&
    uNum >= 0.01 &&
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
      setError("Solo se pueden editar ítems cuando la cotización está en estado Borrador o Enviada.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const data = {
        productId,
        productName: productName.trim(),
        productCode: productCode.trim(),
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
        await updateQuotationItem(quotationId, itemId, data);
      } else {
        await addQuotationItem(quotationId, data);
      }
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
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
                Esta cotización no está en <strong>Borrador</strong> o <strong>Enviada</strong> y no se pueden editar sus ítems.
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
          <DpInput
            type="input"
            label="Nombre del producto"
            name="productName"
            value={productName}
            onChange={setProductName}
            placeholder="Nombre del producto"
            disabled={locked}
          />
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
                  La cantidad debe ser al menos 1.
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
                  El precio unitario debe ser al menos 0.01.
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

      <DpConfirmDialog
        visible={showNoProductsConfirm}
        onHide={() => setShowNoProductsConfirm(false)}
        title="No hay productos creados"
        message="No existen productos creados. ¿Desea crear un producto nuevo ahora?"
        confirmLabel="Sí, crear producto"
        cancelLabel="No"
        severity="primary"
        onConfirm={() => {
          setProductIdsBeforeCreate(products.map((p) => p.id));
          setShowNoProductsConfirm(false);
          setShowCreateProductDialog(true);
        }}
      />

      <ProductDialog
        visible={showCreateProductDialog}
        productId={null}
        unitsCatalog={unitsCatalog}
        onHide={() => setShowCreateProductDialog(false)}
        onSuccess={() => {
          setShowCreateProductDialog(false);
          getProducts()
            .then(({ items }) => {
              setProducts(items);
              const created = items.find((p) => !productIdsBeforeCreate.includes(p.id)) ?? items[0];
              if (created) {
                handleProductChange(created.id);
              }
            })
            .catch(() => {
              setError("No se pudo refrescar productos.");
            });
        }}
      />
    </>
  );
}
