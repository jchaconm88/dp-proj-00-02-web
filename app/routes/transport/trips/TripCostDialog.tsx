import { useState, useEffect } from "react";
import { useNavigation } from "react-router";
import { DpInput } from "~/components/DpInput";
import { DpContentSet } from "~/components/DpContent";
import {
  getTripCostById,
  addTripCost,
  updateTripCost,
  type TripCostEntity,
  type TripCostType,
  type TripCostSource,
  type TripCostStatus,
} from "~/features/transport/trip-costs";
import {
  TRIP_COST_ENTITY,
  TRIP_COST_TYPE,
  TRIP_COST_SOURCE,
  TRIP_COST_STATUS,
  CURRENCY,
  statusToSelectOptions,
} from "~/constants/status-options";

export interface TripCostDialogProps {
  visible: boolean;
  tripId: string;
  costId: string | null;
  onSuccess?: () => void;
  onHide: () => void;
}

const ENTITY_OPTIONS = statusToSelectOptions(TRIP_COST_ENTITY);
const TYPE_OPTIONS = statusToSelectOptions(TRIP_COST_TYPE);
const SOURCE_OPTIONS = statusToSelectOptions(TRIP_COST_SOURCE);
const STATUS_OPTIONS = statusToSelectOptions(TRIP_COST_STATUS);
const CURRENCY_OPTIONS = statusToSelectOptions(CURRENCY);

export default function TripCostDialog({
  visible,
  tripId,
  costId,
  onSuccess,
  onHide,
}: TripCostDialogProps) {
  const isEdit = !!costId;
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";

  const [code, setCode] = useState("");
  const [entity, setEntity] = useState<TripCostEntity>("assignment");
  const [entityId, setEntityId] = useState("");
  const [type, setType] = useState<TripCostType>("driver_payment");
  const [source, setSource] = useState<TripCostSource>("manual");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("PEN");
  const [status, setStatus] = useState<TripCostStatus>("open");
  const [settlementId, setSettlementId] = useState("");

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    if (!costId) {
      setCode("");
      setEntity("assignment");
      setEntityId("");
      setType("driver_payment");
      setSource("manual");
      setAmount("");
      setCurrency("PEN");
      setStatus("open");
      setSettlementId("");
      setLoading(false);
      return;
    }
    setLoading(true);
    getTripCostById(costId)
      .then((data) => {
        if (!data) {
          setError("Costo no encontrado.");
          return;
        }
        setCode(data.code ?? "");
        setEntity(data.entity ?? "assignment");
        setEntityId(data.entityId ?? "");
        setType(data.type ?? "driver_payment");
        setSource(data.source ?? "manual");
        setAmount(String(data.amount ?? ""));
        setCurrency(data.currency ?? "PEN");
        setStatus(data.status ?? "open");
        setSettlementId(data.settlementId ?? "");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error al cargar."))
      .finally(() => setLoading(false));
  }, [visible, costId]);

  const save = async () => {
    if (!entityId.trim()) return;
    const amountNum = Number(amount);
    if (Number.isNaN(amountNum) || amountNum < 0) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        code: code.trim(),
        tripId,
        entity,
        entityId: entityId.trim(),
        type,
        source,
        amount: amountNum,
        currency: currency.trim() || "PEN",
        status,
        settlementId: settlementId.trim() || null,
      };
      if (costId) {
        await updateTripCost(costId, payload);
      } else {
        await addTripCost(payload);
      }
      onSuccess?.();
      onHide();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const valid = !!entityId.trim() && !Number.isNaN(Number(amount)) && Number(amount) >= 0;

  return (
    <DpContentSet
      title={isEdit ? "Editar costo" : "Agregar costo"}
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
          <DpInput type="input" label="Código" name="code" value={code} onChange={setCode} placeholder="COST-001" />
          <DpInput type="select" label="Entidad" name="entity" value={entity} onChange={(v) => setEntity(v as TripCostEntity)} options={ENTITY_OPTIONS} />
          <DpInput type="input" label="ID entidad" name="entityId" value={entityId} onChange={setEntityId} placeholder="ID de asignación o empresa" />
          <DpInput type="select" label="Tipo" name="type" value={type} onChange={(v) => setType(v as TripCostType)} options={TYPE_OPTIONS} />
          <DpInput type="select" label="Origen" name="source" value={source} onChange={(v) => setSource(v as TripCostSource)} options={SOURCE_OPTIONS} />
          <DpInput type="number" label="Monto" name="amount" value={amount} onChange={setAmount} placeholder="0" />
          <DpInput type="select" label="Moneda" name="currency" value={currency} onChange={setCurrency} options={CURRENCY_OPTIONS} />
          <DpInput type="select" label="Estado" name="status" value={status} onChange={(v) => setStatus(v as TripCostStatus)} options={STATUS_OPTIONS} />
          <DpInput type="input" label="ID liquidación" name="settlementId" value={settlementId} onChange={setSettlementId} placeholder="Opcional" />
        </div>
      )}
    </DpContentSet>
  );
}
