import { useState, useEffect } from "react";
import { useNavigation } from "react-router";
import { DpInput } from "~/components/DpInput";
import { DpCodeInput } from "~/components/DpCodeInput";
import { DpContentSet } from "~/components/DpContent";
import { resolveCodeIfEmpty } from "~/features/system/sequences";
import {
  getTripChargeById,
  addTripCharge,
  updateTripCharge,
  type TripChargeType,
  type TripChargeSource,
  type TripChargeStatus,
} from "~/features/transport/trip-charges";
import {
  TRIP_CHARGE_TYPE,
  TRIP_CHARGE_SOURCE,
  TRIP_CHARGE_STATUS,
  CURRENCY,
  statusToSelectOptions,
} from "~/constants/status-options";

export interface TripChargeDialogProps {
  visible: boolean;
  tripId: string;
  chargeId: string | null;
  onSuccess?: () => void;
  onHide: () => void;
}

const TYPE_OPTIONS = statusToSelectOptions(TRIP_CHARGE_TYPE);
const SOURCE_OPTIONS = statusToSelectOptions(TRIP_CHARGE_SOURCE);
const STATUS_OPTIONS = statusToSelectOptions(TRIP_CHARGE_STATUS);
const CURRENCY_OPTIONS = statusToSelectOptions(CURRENCY);

export default function TripChargeDialog({
  visible,
  tripId,
  chargeId,
  onSuccess,
  onHide,
}: TripChargeDialogProps) {
  const isEdit = !!chargeId;
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";

  const [code, setCode] = useState("");
  const [type, setType] = useState<TripChargeType>("freight");
  const [source, setSource] = useState<TripChargeSource>("manual");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("PEN");
  const [status, setStatus] = useState<TripChargeStatus>("open");
  const [settlementId, setSettlementId] = useState("");

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    if (!chargeId) {
      setCode("");
      setType("freight");
      setSource("manual");
      setAmount("");
      setCurrency("PEN");
      setStatus("open");
      setSettlementId("");
      setLoading(false);
      return;
    }
    setLoading(true);
    getTripChargeById(chargeId)
      .then((data) => {
        if (!data) {
          setError("Cargo no encontrado.");
          return;
        }
        setCode(data.code ?? "");
        setType(data.type ?? "freight");
        setSource(data.source ?? "manual");
        setAmount(String(data.amount ?? ""));
        setCurrency(data.currency ?? "PEN");
        setStatus(data.status ?? "open");
        setSettlementId(data.settlementId ?? "");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error al cargar."))
      .finally(() => setLoading(false));
  }, [visible, chargeId]);

  const save = async () => {
    const amountNum = Number(amount);
    if (Number.isNaN(amountNum) || amountNum < 0) return;
    setSaving(true);
    setError(null);
    try {
      let finalCode: string;
      try {
        finalCode = await resolveCodeIfEmpty(code, "trip-charge");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al generar código.");
        setSaving(false);
        return;
      }
      const payload = {
        code: finalCode,
        tripId,
        type,
        source,
        amount: amountNum,
        currency: currency.trim() || "PEN",
        status,
        settlementId: settlementId.trim() || null,
      };
      if (chargeId) {
        await updateTripCharge(chargeId, payload);
      } else {
        await addTripCharge(payload);
      }
      onSuccess?.();
      onHide();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const valid = !Number.isNaN(Number(amount)) && Number(amount) >= 0;

  return (
    <DpContentSet
      title={isEdit ? "Editar cargo" : "Agregar cargo"}
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
          <DpCodeInput entity="trip-charge" label="Código" name="code" value={code} onChange={setCode} />
          <DpInput type="select" label="Tipo" name="type" value={type} onChange={(v) => setType(v as TripChargeType)} options={TYPE_OPTIONS} />
          <DpInput type="select" label="Origen" name="source" value={source} onChange={(v) => setSource(v as TripChargeSource)} options={SOURCE_OPTIONS} />
          <DpInput type="number" label="Monto" name="amount" value={amount} onChange={setAmount} placeholder="0" />
          <DpInput type="select" label="Moneda" name="currency" value={currency} onChange={(v) => setCurrency(String(v ?? ""))} options={CURRENCY_OPTIONS} />
          <DpInput type="select" label="Estado" name="status" value={status} onChange={(v) => setStatus(v as TripChargeStatus)} options={STATUS_OPTIONS} />
          <DpInput type="input" label="ID liquidación" name="settlementId" value={settlementId} onChange={setSettlementId} placeholder="Opcional" />
        </div>
      )}
    </DpContentSet>
  );
}
