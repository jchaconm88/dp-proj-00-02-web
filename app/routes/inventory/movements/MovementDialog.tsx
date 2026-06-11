import { useState, useEffect, useMemo } from "react";
import { useNavigation } from "react-router";
import { DpInput } from "~/components/ui";
import { DpCodeInput } from "~/components/ui";
import { DpContentSet } from "~/components/ui";
import {
  addMovement,
  type MovementType,
  type MovementReferenceType,
} from "~/features/inventory/movements";
import { getProducts, getVariants, type ProductRecord, type ProductVariantRecord } from "~/features/inventory/products";
import { requireActiveCompanyId } from "~/lib/tenant";
import { getWarehouses, type WarehouseRecord } from "~/features/inventory/warehouses";
import { generateSequenceCode } from "~/features/system/sequences";
import {
  MOVEMENT_TYPE,
  MOVEMENT_REFERENCE_TYPE,
  statusToSelectOptions,
} from "~/constants/status-options";
import { useLocationContext } from "~/lib/location-context";
import type { UnitOfMeasureRecord } from "~/features/system/units-of-measure";
import { unitsCatalogToSelectOptions } from "~/features/system/units-of-measure";

export interface MovementDialogProps {
  visible: boolean;
  unitsCatalog: UnitOfMeasureRecord[];
  onSuccess?: () => void;
  onHide: () => void;
}

const TYPE_OPTIONS = statusToSelectOptions(MOVEMENT_TYPE);
const REFERENCE_TYPE_OPTIONS = statusToSelectOptions(MOVEMENT_REFERENCE_TYPE);

export default function MovementDialog({
  visible,
  unitsCatalog,
  onSuccess,
  onHide,
}: MovementDialogProps) {
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";
  const { activeLocationId, locations } = useLocationContext();

  const [code, setCode] = useState("");
  const [type, setType] = useState<MovementType | "">("");
  const [productId, setProductId] = useState("");
  const [variantId, setVariantId] = useState("");
  const [unitCostApplied, setUnitCostApplied] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [warehouseDestinationId, setWarehouseDestinationId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitOfMeasure, setUnitOfMeasure] = useState("");
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [referenceType, setReferenceType] = useState<MovementReferenceType | "">("");
  const [referenceId, setReferenceId] = useState("");
  const [notes, setNotes] = useState("");

  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [variants, setVariants] = useState<ProductVariantRecord[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseRecord[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const unitOptions = useMemo(() => unitsCatalogToSelectOptions(unitsCatalog), [unitsCatalog]);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    setTouched(false);
    setCode("");
    setType("");
    setProductId("");
    setVariantId("");
    setUnitCostApplied("");
    setVariants([]);
    setWarehouseId("");
    setWarehouseDestinationId("");
    setQuantity("");
    setUnitOfMeasure("");
    setDate(new Date().toISOString().slice(0, 10));
    setReason("");
    setReferenceType("");
    setReferenceId("");
    setNotes("");

    const loadData = async () => {
      setLoading(true);
      try {
        const [productsRes, warehousesRes] = await Promise.all([
          getProducts(),
          getWarehouses(),
        ]);
        setProducts(productsRes.items);
        setWarehouses(warehousesRes.items);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar datos.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [visible]);

  const productOptions = products.map((p) => ({
    value: p.id,
    label: `${p.code ? p.code + " - " : ""}${p.name}`,
  }));

  const variantOptions = [
    { value: "", label: "(Sin variante — producto base)" },
    ...variants.map((v) => ({
      value: v.id,
      label: `${v.sku}${Object.keys(v.attributes).length ? ` · ${Object.values(v.attributes).join(", ")}` : ""}`,
    })),
  ];

  const warehouseOptions = warehouses.map((w) => ({
    value: w.id,
    label: `${w.code ? w.code + " - " : ""}${w.name}`,
  }));

  const warehouseDestinationOptions = warehouses
    .filter((w) => w.id !== warehouseId)
    .map((w) => ({
      value: w.id,
      label: `${w.code ? w.code + " - " : ""}${w.name}`,
    }));

  const handleProductChange = async (v: string) => {
    setProductId(v);
    setVariantId("");
    const p = products.find((x) => x.id === v);
    if (p) setUnitOfMeasure((p.unitOfMeasureCode || "unit").trim());
    else setUnitOfMeasure("");
    if (!v) {
      setVariants([]);
      return;
    }
    try {
      const companyId = requireActiveCompanyId();
      const list = await getVariants(v, companyId);
      setVariants(list.filter((x) => x.active !== false));
    } catch {
      setVariants([]);
    }
  };

  const isTransfer = type === "transfer";
  const needsUnitCost = type === "entry";
  const quantityNum = parseFloat(quantity);
  const unitCostNum = parseFloat(unitCostApplied);
  const unitCostValid = !needsUnitCost || (!isNaN(unitCostNum) && unitCostNum >= 0);
  const quantityValid = !isNaN(quantityNum) && quantityNum > 0;

  const unitInCatalog =
    !!unitOfMeasure.trim() && unitsCatalog.some((u) => u.code === unitOfMeasure.trim());
  const unitInvalid = touched && !unitInCatalog;

  const productIdInvalid = touched && !productId;
  const warehouseIdInvalid = touched && !warehouseId;
  const quantityInvalid = touched && !quantityValid;
  const typeInvalid = touched && !type;
  const dateInvalid = touched && !date;
  const destinationInvalid =
    touched && isTransfer && (!warehouseDestinationId || warehouseDestinationId === warehouseId);

  const valid =
    !!productId &&
    !!warehouseId &&
    quantityValid &&
    !!type &&
    !!date &&
    unitInCatalog &&
    unitCostValid &&
    (!isTransfer || (!!warehouseDestinationId && warehouseDestinationId !== warehouseId));

  const save = async () => {
    setTouched(true);
    if (!valid) return;

    setSaving(true);
    setError(null);
    try {
      const selectedProduct = products.find((p) => p.id === productId);
      const selectedWarehouse = warehouses.find((w) => w.id === warehouseId);
      const selectedDestination = warehouses.find((w) => w.id === warehouseDestinationId);
      const locationName =
        locations.find((l) => l.id === activeLocationId)?.name ?? "";

      let finalCode: string;
      try {
        finalCode = await generateSequenceCode(code, "inventory-movement");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al generar código.");
        setSaving(false);
        return;
      }

      await addMovement({
        code: finalCode,
        type: type as MovementType,
        productId,
        productName: selectedProduct?.name ?? "",
        variantId: variantId || undefined,
        unitCostApplied: needsUnitCost ? unitCostNum : undefined,
        warehouseId,
        warehouseName: selectedWarehouse?.name ?? "",
        warehouseDestinationId: isTransfer ? warehouseDestinationId : undefined,
        warehouseDestinationName: isTransfer ? selectedDestination?.name ?? "" : undefined,
        quantity: quantityNum,
        unitOfMeasure: unitOfMeasure.trim(),
        reason: reason.trim() || undefined,
        referenceType: referenceType ? (referenceType as MovementReferenceType) : undefined,
        referenceId: referenceId.trim() || undefined,
        date,
        notes: notes.trim() || undefined,
        locationId: activeLocationId ?? "",
        locationName,
      });

      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DpContentSet
      title="Registrar movimiento de inventario"
      recordId={null}
      cancelLabel="Cancelar"
      onCancel={onHide}
      saveLabel="Guardar"
      onSave={save}
      saving={saving || isNavigating}
      saveDisabled={!valid || isNavigating}
      visible={visible}
      onHide={onHide}
      showLoading={loading}
      showError={!!error}
      errorMessage={error ?? ""}
    >
      <div className="flex flex-col gap-4 pt-2">
        <DpCodeInput
          entity="inventory-movement"
          value={code}
          onChange={setCode}
        />

        <DpInput
          type="select"
          label="Tipo de movimiento *"
          name="type"
          value={type}
          onChange={(v) => setType(String(v) as MovementType)}
          options={TYPE_OPTIONS}
          placeholder="Seleccionar tipo"
        />
        {typeInvalid && (
          <p className="mt-[-0.5rem] text-xs text-red-600 dark:text-red-400">
            El tipo de movimiento es obligatorio.
          </p>
        )}

        <DpInput
          type="select"
          label="Producto *"
          name="productId"
          value={productId}
          onChange={(v) => handleProductChange(String(v))}
          options={productOptions}
          placeholder="Seleccionar producto"
        />
        {productIdInvalid && (
          <p className="mt-[-0.5rem] text-xs text-red-600 dark:text-red-400">
            El producto es obligatorio.
          </p>
        )}

        {variants.length > 0 && (
          <DpInput
            type="select"
            label="Variación"
            name="variantId"
            value={variantId}
            onChange={(v) => {
              const id = String(v);
              setVariantId(id);
              const variant = variants.find((x) => x.id === id);
              if (variant?.standardUnitCost != null) {
                setUnitCostApplied(String(variant.standardUnitCost));
              }
            }}
            options={variantOptions}
            placeholder="Opcional"
          />
        )}

        <DpInput
          type="select"
          label="Unidad de medida *"
          name="unitOfMeasure"
          value={unitOfMeasure}
          onChange={(v) => setUnitOfMeasure(String(v))}
          options={unitOptions}
          placeholder="Seleccione..."
        />
        {unitInvalid && (
          <p className="mt-[-0.5rem] text-xs text-red-600 dark:text-red-400">
            Seleccione una unidad válida del catálogo.
          </p>
        )}

        <DpInput
          type="select"
          label="Almacén origen *"
          name="warehouseId"
          value={warehouseId}
          onChange={(v) => setWarehouseId(String(v))}
          options={warehouseOptions}
          placeholder="Seleccionar almacén"
        />
        {warehouseIdInvalid && (
          <p className="mt-[-0.5rem] text-xs text-red-600 dark:text-red-400">
            El almacén es obligatorio.
          </p>
        )}

        {isTransfer && (
          <>
            <DpInput
              type="select"
              label="Almacén destino *"
              name="warehouseDestinationId"
              value={warehouseDestinationId}
              onChange={(v) => setWarehouseDestinationId(String(v))}
              options={warehouseDestinationOptions}
              placeholder="Seleccionar almacén destino"
            />
            {destinationInvalid && (
              <p className="mt-[-0.5rem] text-xs text-red-600 dark:text-red-400">
                {!warehouseDestinationId
                  ? "El almacén destino es obligatorio para transferencias."
                  : "El almacén destino debe ser distinto al almacén origen."}
              </p>
            )}
          </>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <DpInput
            type="number"
            label="Cantidad *"
            name="quantity"
            value={quantity}
            onChange={setQuantity}
            placeholder="0"
          />
          <DpInput
            type="date"
            label="Fecha *"
            name="date"
            value={date}
            onChange={setDate}
          />
        </div>
        {needsUnitCost && (
          <DpInput
            type="number"
            label="Costo unitario aplicado *"
            name="unitCostApplied"
            value={unitCostApplied}
            onChange={setUnitCostApplied}
            placeholder="0.00"
          />
        )}
        {quantityInvalid && (
          <p className="mt-[-0.5rem] text-xs text-red-600 dark:text-red-400">
            La cantidad debe ser mayor a 0.
          </p>
        )}
        {dateInvalid && (
          <p className="mt-[-0.5rem] text-xs text-red-600 dark:text-red-400">
            La fecha es obligatoria.
          </p>
        )}

        <DpInput
          type="input"
          label="Motivo"
          name="reason"
          value={reason}
          onChange={setReason}
          placeholder="Motivo del movimiento"
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <DpInput
            type="select"
            label="Tipo de referencia"
            name="referenceType"
            value={referenceType}
            onChange={(v) => setReferenceType(String(v) as MovementReferenceType)}
            options={REFERENCE_TYPE_OPTIONS}
            placeholder="Seleccionar referencia"
          />
          <DpInput
            type="input"
            label="ID de referencia"
            name="referenceId"
            value={referenceId}
            onChange={setReferenceId}
            placeholder="Código de documento"
          />
        </div>

        <DpInput
          type="textarea"
          label="Notas"
          name="notes"
          value={notes}
          onChange={setNotes}
          placeholder="Observaciones adicionales..."
        />
      </div>
    </DpContentSet>
  );
}
