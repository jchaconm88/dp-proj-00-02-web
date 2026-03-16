import { useState, useEffect } from "react";
import { useNavigation } from "react-router";
import { DpInput } from "~/components/DpInput";
import { DpContentSet } from "~/components/DpContent";
import {
  getVehicleById,
  addVehicle,
  updateVehicle,
  type VehicleStatus,
} from "~/features/transport/vehicles";
import { VEHICLE_STATUS, VEHICLE_TYPE, statusToSelectOptions } from "~/constants/status-options";

export interface VehicleDialogProps {
  visible: boolean;
  vehicleId: string | null;
  onSuccess?: () => void;
  onHide: () => void;
}

const STATUS_OPTIONS = statusToSelectOptions(VEHICLE_STATUS);
const TYPE_OPTIONS = statusToSelectOptions(VEHICLE_TYPE);

export default function VehicleDialog({
  visible,
  vehicleId,
  onSuccess,
  onHide,
}: VehicleDialogProps) {
  const isEdit = !!vehicleId;
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";

  const [plate, setPlate] = useState("");
  const [type, setType] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [capacityKg, setCapacityKg] = useState<string>("");
  const [status, setStatus] = useState<VehicleStatus>("available");
  const [currentTripId, setCurrentTripId] = useState("");
  const [active, setActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setError(null);

    if (!vehicleId) {
      setPlate("");
      setType("");
      setBrand("");
      setModel("");
      setCapacityKg("");
      setStatus("available");
      setCurrentTripId("");
      setActive(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    getVehicleById(vehicleId)
      .then((data) => {
        if (!data) {
          setError("Vehículo no encontrado.");
          return;
        }
        setPlate(data.plate ?? "");
        setType(data.type ?? "");
        setBrand(data.brand ?? "");
        setModel(data.model ?? "");
        setCapacityKg(String(data.capacityKg ?? ""));
        setStatus(data.status ?? "available");
        setCurrentTripId(data.currentTripId ?? "");
        setActive(data.active ?? true);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error al cargar."))
      .finally(() => setLoading(false));
  }, [visible, vehicleId]);

  const save = async () => {
    if (!plate.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        plate: plate.trim(),
        type: type.trim(),
        brand: brand.trim(),
        model: model.trim(),
        capacityKg: Number(capacityKg) || 0,
        status,
        currentTripId: currentTripId.trim() || "",
        active,
      };

      if (vehicleId) {
        await updateVehicle(vehicleId, payload);
      } else {
        await addVehicle(payload);
      }
      onSuccess?.();
      onHide();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const valid = !!plate.trim() && !!type.trim();

  return (
    <DpContentSet
      title={isEdit ? "Editar vehículo" : "Agregar vehículo"}
      cancelLabel="Cancelar"
      onCancel={onHide}
      saveLabel="Guardar"
      onSave={save}
      saving={saving || isNavigating}
      saveDisabled={!valid || isNavigating}
      visible={visible}
      onHide={onHide}
    >
      {loading ? (
        <div className="py-8 text-center text-zinc-500">Cargando...</div>
      ) : (
        <div className="flex flex-col gap-4 pt-2">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <DpInput type="input" label="Placa" name="plate" value={plate} onChange={setPlate} placeholder="ABC-123" />
            <DpInput type="select" label="Tipo" name="type" value={type} onChange={(v) => setType(String(v))} options={TYPE_OPTIONS} placeholder="Seleccionar tipo" />
            <DpInput type="input" label="Marca" name="brand" value={brand} onChange={setBrand} placeholder="Volvo" />
            <DpInput type="input" label="Modelo" name="model" value={model} onChange={setModel} placeholder="FH16" />
            <DpInput type="number" label="Capacidad (kg)" name="capacityKg" value={capacityKg} onChange={setCapacityKg} placeholder="18000" />
            <DpInput type="select" label="Estado" name="status" value={status} onChange={(v) => setStatus(v as VehicleStatus)} options={STATUS_OPTIONS} />
            <div className="md:col-span-2">
               <DpInput type="input" label="Viaje actual (ID)" name="currentTripId" value={currentTripId} onChange={setCurrentTripId} placeholder="TRIP-2026-0001 (Opcional)" />
            </div>
            <div className="md:col-span-2">
               <DpInput type="check" label="Activo" name="active" value={active} onChange={setActive} />
            </div>
          </div>
        </div>
      )}
    </DpContentSet>
  );
}
