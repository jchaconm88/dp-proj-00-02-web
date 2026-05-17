import { useEffect, useState } from "react";
import { useNavigation } from "react-router";
import { DpInput, DpCodeInput, DpContentSet } from "~/components/ui";
import { addOrder, updateOrder, getOrderById, getRecipes, type ProductionOrderRecord } from "~/features/production";
import { getWarehouses, type WarehouseRecord } from "~/features/inventory/warehouses";
import { statusToSelectOptions } from "~/constants/status-options";
import { generateSequenceCode } from "~/features/system/sequences";
import { useLocationContext } from "~/lib/location-context";

const PRIORITY_OPTIONS = statusToSelectOptions({
  alta: { label: "Alta", severity: "danger" },
  media: { label: "Media", severity: "warning" },
  baja: { label: "Baja", severity: "info" },
});

export interface OrderDialogProps {
  visible: boolean;
  orderId: string | null;
  onSuccess: () => void;
  onHide: () => void;
}

export default function OrderDialog({ visible, orderId, onSuccess, onHide }: OrderDialogProps) {
  const isEdit = !!orderId;
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";
  const { activeLocationId, locations } = useLocationContext();

  const [code, setCode] = useState("");
  const [recipeId, setRecipeId] = useState("");
  const [quantityToProduce, setQuantityToProduce] = useState("");
  const [priority, setPriority] = useState("media");
  const [sourceWarehouseId, setSourceWarehouseId] = useState("");
  const [sourceWarehouseName, setSourceWarehouseName] = useState("");
  const [destinationWarehouseId, setDestinationWarehouseId] = useState("");
  const [destinationWarehouseName, setDestinationWarehouseName] = useState("");
  const [plannedStartDate, setPlannedStartDate] = useState("");
  const [plannedEndDate, setPlannedEndDate] = useState("");
  const [locationId, setLocationId] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const [recipeOptions, setRecipeOptions] = useState<{ label: string; value: string }[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseRecord[]>([]);

  const warehouseOptions = warehouses
    .filter((w) => w.active !== false)
    .map((w) => ({ label: `${w.code ? w.code + " - " : ""}${w.name}`, value: w.id }));

  const locationIdForSave = activeLocationId ?? locationId;
  const locationNameForSave =
    locations.find((l) => l.id === locationIdForSave)?.name ?? "";

  const valid =
    !!recipeId &&
    !!quantityToProduce &&
    Number(quantityToProduce) > 0 &&
    !!plannedStartDate &&
    !!plannedEndDate &&
    !!sourceWarehouseId &&
    !!sourceWarehouseName &&
    !!destinationWarehouseId &&
    !!destinationWarehouseName &&
    !!locationIdForSave &&
    !!locationNameForSave;

  const loadOrder = async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const order = await getOrderById(orderId);
      if (order) {
        setCode(order.code ?? "");
        setRecipeId(order.recipeId);
        setQuantityToProduce(String(order.quantityToProduce));
        setPriority(order.priority);
        setSourceWarehouseId(order.sourceWarehouseId);
        setSourceWarehouseName(order.sourceWarehouseName);
        setDestinationWarehouseId(order.destinationWarehouseId);
        setDestinationWarehouseName(order.destinationWarehouseName);
        setPlannedStartDate(order.plannedStartDate);
        setPlannedEndDate(order.plannedEndDate);
        setLocationId(order.locationId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar orden");
    } finally {
      setLoading(false);
    }
  };

  const loadCatalogs = async () => {
    try {
      const [{ items: recipes }, { items: warehouseItems }] = await Promise.all([
        getRecipes({ status: "active" }),
        getWarehouses(),
      ]);
      setRecipeOptions(
        recipes.map((r) => ({ label: `${r.code ? r.code + " - " : ""}${r.name}`, value: r.id }))
      );
      setWarehouses(warehouseItems);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!visible) return;
    void loadCatalogs();
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    setTouched(false);
    if (!orderId) {
      setCode("");
      setRecipeId("");
      setQuantityToProduce("");
      setPriority("media");
      setSourceWarehouseId("");
      setSourceWarehouseName("");
      setDestinationWarehouseId("");
      setDestinationWarehouseName("");
      setPlannedStartDate("");
      setPlannedEndDate("");
      setLocationId("");
      setLoading(false);
      return;
    }
    void loadOrder();
  }, [visible, orderId]);

  const handleHide = () => {
    if (!saving && !isNavigating) onHide();
  };

  const save = async () => {
    setTouched(true);
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      if (isEdit && orderId) {
        await updateOrder(orderId, {
          priority: priority as any,
          sourceWarehouseId,
          sourceWarehouseName,
          destinationWarehouseId,
          destinationWarehouseName,
          plannedStartDate,
          plannedEndDate,
          quantityToProduce: Number(quantityToProduce),
          locationId: locationIdForSave,
          locationName: locationNameForSave,
        });
      } else {
        let finalCode: string;
        try {
          finalCode = await generateSequenceCode(code, "production-order");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Error al generar código.");
          setSaving(false);
          return;
        }

        await addOrder({
          code: finalCode,
          recipeId,
          quantityToProduce: Number(quantityToProduce),
          priority: priority as any,
          plannedStartDate,
          plannedEndDate,
          sourceWarehouseId,
          sourceWarehouseName,
          destinationWarehouseId,
          destinationWarehouseName,
          locationId: locationIdForSave,
          locationName: locationNameForSave,
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
      title={isEdit ? "Editar Orden" : "Nueva Orden de Producción"}
      recordId={isEdit ? orderId : null}
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
      <DpCodeInput entity="production-order" value={code} onChange={setCode} disabled={isEdit} />
      <DpInput type="select" label="Receta *" name="recipeId" value={recipeId} onChange={(v) => setRecipeId(String(v))} options={recipeOptions} placeholder="Seleccionar receta" />
      <DpInput type="input" label="Cantidad a producir *" name="quantityToProduce" value={quantityToProduce} onChange={(v) => setQuantityToProduce(String(v))} />
      <DpInput type="select" label="Prioridad" name="priority" value={priority} onChange={(v) => setPriority(String(v))} options={PRIORITY_OPTIONS} />
      <DpInput
        type="select"
        label="Almacén origen *"
        name="sourceWarehouseId"
        value={sourceWarehouseId}
        onChange={(v) => {
          const id = String(v);
          setSourceWarehouseId(id);
          setSourceWarehouseName(warehouses.find((w) => w.id === id)?.name ?? "");
        }}
        options={warehouseOptions}
        placeholder="Seleccionar almacén"
      />
      <DpInput
        type="select"
        label="Almacén destino *"
        name="destinationWarehouseId"
        value={destinationWarehouseId}
        onChange={(v) => {
          const id = String(v);
          setDestinationWarehouseId(id);
          setDestinationWarehouseName(warehouses.find((w) => w.id === id)?.name ?? "");
        }}
        options={warehouseOptions}
        placeholder="Seleccionar almacén"
      />
      <DpInput type="date" label="Fecha inicio *" name="plannedStartDate" value={plannedStartDate} onChange={(v) => setPlannedStartDate(String(v))} />
      <DpInput type="date" label="Fecha fin *" name="plannedEndDate" value={plannedEndDate} onChange={(v) => setPlannedEndDate(String(v))} />
    </DpContentSet>
  );
}
