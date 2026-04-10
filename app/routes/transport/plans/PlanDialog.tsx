import { useState, useEffect } from "react";
import { useNavigation } from "react-router";
import { MultiSelect } from "primereact/multiselect";
import { DpInput } from "~/components/DpInput";
import { DpContentSet } from "~/components/DpContent";
import {
  getPlanById,
  addPlan,
  updatePlan,
  type PlanStatus,
} from "~/features/transport/plans";
import { getOrders } from "~/features/logistic/orders";
import { PLAN_STATUS, statusToSelectOptions } from "~/constants/status-options";

export interface PlanDialogProps {
  visible: boolean;
  planId: string | null;
  onSuccess?: () => void;
  onHide: () => void;
}

const STATUS_OPTIONS = statusToSelectOptions(PLAN_STATUS);

export default function PlanDialog({
  visible,
  planId,
  onSuccess,
  onHide,
}: PlanDialogProps) {
  const isEdit = !!planId;
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";

  const [code, setCode] = useState("");
  const [date, setDate] = useState("");
  const [zone, setZone] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [orderIds, setOrderIds] = useState<string[]>([]);
  const [orderOptions, setOrderOptions] = useState<{ label: string; value: string }[]>([]);
  const [status, setStatus] = useState<PlanStatus>("draft");

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    getOrders()
      .then(({ items }) => {
        setOrderOptions(
          items.map((o) => ({
            label: `${(o.code || o.id).trim()} — ${o.client} — ${o.deliveryAddress}`,
            value: o.id,
          }))
        );
      })
      .catch(() => setOrderOptions([]));

    if (!planId) {
      setCode("");
      const today = new Date().toISOString().slice(0, 10);
      setDate(today);
      setZone("");
      setVehicleType("");
      setOrderIds([]);
      setStatus("draft");
      setLoading(false);
      return;
    }

    setLoading(true);
    getPlanById(planId)
      .then((data) => {
        if (!data) {
          setError("Plan no encontrado.");
          return;
        }
        setCode(data.code ?? "");
        setDate(data.date ?? "");
        setZone(data.zone ?? "");
        setVehicleType(data.vehicleType ?? "");
        setOrderIds(data.orderIds ?? []);
        setStatus(data.status ?? "draft");
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Error al cargar.")
      )
      .finally(() => setLoading(false));
  }, [visible, planId]);

  const save = async () => {
    if (!date.trim() || !zone.trim() || !vehicleType.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        code: code.trim(),
        date: date.trim(),
        zone: zone.trim(),
        vehicleType: vehicleType.trim(),
        orderIds: [...orderIds],
        status,
      };
      if (planId) {
        await updatePlan(planId, payload);
      } else {
        await addPlan(payload);
      }
      onSuccess?.();
      onHide();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const valid = !!date.trim() && !!zone.trim() && !!vehicleType.trim();

  return (
    <DpContentSet
      title={isEdit ? "Editar plan" : "Agregar plan"}
      recordId={isEdit ? planId : null}
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

          <DpInput
            type="input"
            label="Código"
            name="code"
            value={code}
            onChange={setCode}
            placeholder="plan_20260226_LIM01"
          />
          <DpInput
            type="date"
            label="Fecha"
            name="date"
            value={date}
            onChange={setDate}
          />
          <DpInput
            type="input"
            label="Zona"
            name="zone"
            value={zone}
            onChange={setZone}
            placeholder="Lima Metropolitana"
          />
          <DpInput
            type="input"
            label="Tipo de vehículo"
            name="vehicleType"
            value={vehicleType}
            onChange={setVehicleType}
            placeholder="Camión 5TN"
          />
          <div className="flex flex-col gap-2">
            <label className="font-medium text-zinc-700 dark:text-zinc-300">
              Pedidos
            </label>
            <MultiSelect
              value={orderIds}
              options={orderOptions}
              onChange={(e) => setOrderIds(e.value ?? [])}
              optionLabel="label"
              optionValue="value"
              placeholder="Seleccione pedidos"
              filter
              filterPlaceholder="Buscar por cliente o dirección"
              className="w-full"
            />
          </div>
          <DpInput
            type="select"
            label="Estado"
            name="status"
            value={status}
            onChange={(v) => setStatus(v as PlanStatus)}
            options={STATUS_OPTIONS}
          />
        </div>
    </DpContentSet>
  );
}
