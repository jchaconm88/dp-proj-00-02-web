import { useState, useEffect, useCallback } from "react";
import { useNavigation } from "react-router";
import { DpInput } from "~/components/DpInput";
import { DpCodeInput } from "~/components/DpCodeInput";
import { DpContentSet } from "~/components/DpContent";
import { generateSequenceCode } from "~/features/system/sequences";
import {
  getTripChargeById,
  addTripCharge,
  updateTripCharge,
  getTripChargeFreightPricing,
  type TripChargeType,
  type TripChargeSource,
  type TripChargeStatus,
} from "~/features/transport/trip-charges";
import { getTransportServices } from "~/features/transport/transport-services";
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
  /** Cliente del viaje (necesario para precio flete desde contrato). */
  clientId: string;
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
  clientId,
  chargeId,
  onSuccess,
  onHide,
}: TripChargeDialogProps) {
  const isEdit = !!chargeId;
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<TripChargeType>("freight");
  const [source, setSource] = useState<TripChargeSource>("manual");
  const [transportServiceId, setTransportServiceId] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("PEN");
  const [status, setStatus] = useState<TripChargeStatus>("open");

  const [serviceOptions, setServiceOptions] = useState<{ label: string; value: string }[]>([]);
  const [pricingLocked, setPricingLocked] = useState(false);
  const [pricingLoading, setPricingLoading] = useState(false);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFreight = type === "freight";
  const clientIdTrim = clientId.trim();

  const applyContractFreightPricing = useCallback(
    async (svcId: string) => {
      if (!clientIdTrim || !svcId.trim()) {
        setPricingLocked(false);
        return;
      }
      setPricingLoading(true);
      setError(null);
      try {
        const res = await getTripChargeFreightPricing({
          clientId: clientIdTrim,
          transportServiceId: svcId.trim(),
        });
        setAmount(String(res.amount));
        setCurrency((res.currency || "PEN").trim() || "PEN");
        if (res.serviceName.trim()) setName(res.serviceName.trim());
        setPricingLocked(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo calcular el precio.");
        setPricingLocked(false);
      } finally {
        setPricingLoading(false);
      }
    },
    [clientIdTrim]
  );

  useEffect(() => {
    if (!visible) return;
    getTransportServices()
      .then(({ items }) => {
        const opts = items
          .filter((s) => s.active !== false)
          .map((s) => ({
            label: (s.name || s.code || s.id).trim(),
            value: s.id,
          }));
        setServiceOptions(opts);
      })
      .catch(() => setServiceOptions([]));
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    if (!chargeId) {
      setCode("");
      setName("");
      setType("freight");
      setSource("manual");
      setTransportServiceId("");
      setAmount("");
      setCurrency("PEN");
      setStatus("open");
      setPricingLocked(false);
      setPricingLoading(false);
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
        setName(data.name ?? "");
        setType(data.type ?? "freight");
        setSource(data.source ?? "manual");
        setTransportServiceId(data.transportServiceId ?? "");
        setAmount(String(data.amount ?? ""));
        setCurrency(data.currency ?? "PEN");
        setStatus(data.status ?? "open");
        const locked =
          data.source === "contract" &&
          data.type === "freight" &&
          !!(data.transportServiceId ?? "").trim();
        setPricingLocked(locked);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error al cargar."))
      .finally(() => setLoading(false));
  }, [visible, chargeId]);

  const handleSourceChange = (v: TripChargeSource) => {
    setSource(v);
    if (v === "manual") {
      setAmount("0");
      setPricingLocked(false);
      return;
    }
    if (type === "freight" && transportServiceId.trim() && clientIdTrim) {
      void applyContractFreightPricing(transportServiceId);
    }
  };

  const handleTypeChange = (v: TripChargeType) => {
    setType(v);
    if (v !== "freight") {
      setTransportServiceId("");
      setPricingLocked(false);
      return;
    }
    if (source === "contract" && transportServiceId.trim() && clientIdTrim) {
      void applyContractFreightPricing(transportServiceId);
    }
  };

  const handleTransportServiceChange = (v: string | number) => {
    const id = String(v ?? "").trim();
    setTransportServiceId(id);
    const opt = serviceOptions.find((o) => o.value === id);

    if (!id) {
      setSource("manual");
      setAmount("0");
      setPricingLocked(false);
      setName("");
      setError(null);
      return;
    }

    setSource("contract");
    if (opt?.label) setName(opt.label);
    setError(null);
    if (clientIdTrim) {
      void applyContractFreightPricing(id);
    } else {
      setPricingLocked(false);
      setError("El viaje no tiene cliente asignado; no se puede calcular el precio por contrato.");
    }
  };

  const save = async () => {
    const amountNum = Number(amount);
    if (Number.isNaN(amountNum) || amountNum < 0) return;
    if (source === "contract" && isFreight) {
      if (!clientIdTrim) {
        setError("El viaje no tiene cliente; no se puede usar origen Contrato en flete.");
        return;
      }
      if (!transportServiceId.trim()) {
        setError("Seleccione un servicio de transporte para el flete con origen Contrato.");
        return;
      }
    }

    setSaving(true);
    setError(null);
    try {
      let finalCode: string;
      try {
        finalCode = await generateSequenceCode(code, "trip-charge");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al generar código.");
        setSaving(false);
        return;
      }
      const typeLabel = TRIP_CHARGE_TYPE[type]?.label ?? type;
      const resolvedName = name.trim() || typeLabel;

      const payload = {
        code: finalCode,
        tripId,
        name: resolvedName,
        type,
        source,
        transportServiceId: isFreight ? transportServiceId.trim() : "",
        amount: amountNum,
        currency: currency.trim() || "PEN",
        status,
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

  const amountCurrencyLocked = pricingLocked && source === "contract" && isFreight && !!transportServiceId.trim();

  const valid =
    !Number.isNaN(Number(amount)) &&
    Number(amount) >= 0 &&
    !(source === "contract" && isFreight && (!clientIdTrim || !transportServiceId.trim()));

  return (
    <DpContentSet
      title={isEdit ? "Editar cargo" : "Agregar cargo"}
      cancelLabel="Cancelar"
      onCancel={onHide}
      saveLabel="Guardar"
      onSave={save}
      saving={saving || isNavigating || pricingLoading}
      saveDisabled={!valid || isNavigating || pricingLoading}
      visible={visible}
      onHide={onHide}
      showLoading={loading}
      showError={!!error}
      errorMessage={error ?? ""}
    >
      <div className="flex flex-col gap-4 pt-2">
        <DpCodeInput entity="trip-charge" label="Código" name="code" value={code} onChange={setCode} />
        <DpInput
          type="select"
          label="Tipo"
          name="type"
          value={type}
          onChange={(v) => handleTypeChange(v as TripChargeType)}
          options={TYPE_OPTIONS}
        />

        {isFreight && (
          <DpInput
            type="select"
            label="Servicio de transporte"
            name="transportServiceId"
            value={transportServiceId}
            onChange={handleTransportServiceChange}
            options={serviceOptions}
            placeholder="Seleccionar servicio"
            filter
          />
        )}

        <DpInput
          type="select"
          label="Origen"
          name="source"
          value={source}
          onChange={(v) => handleSourceChange(v as TripChargeSource)}
          options={SOURCE_OPTIONS}
        />

        {source === "contract" && isFreight && !clientIdTrim && (
          <p className="text-sm text-amber-700 dark:text-amber-300">
            El viaje no tiene cliente asignado; el precio por contrato no está disponible.
          </p>
        )}

        {pricingLoading && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Calculando precio desde contrato…</p>
        )}

        <DpInput
          type="number"
          label="Monto"
          name="amount"
          value={amount}
          onChange={setAmount}
          placeholder="0"
          disabled={amountCurrencyLocked}
        />
        <DpInput
          type="select"
          label="Moneda"
          name="currency"
          value={currency}
          onChange={(v) => setCurrency(String(v ?? ""))}
          options={CURRENCY_OPTIONS}
          disabled={amountCurrencyLocked}
        />
        <DpInput
          type="select"
          label="Estado"
          name="status"
          value={status}
          onChange={(v) => setStatus(v as TripChargeStatus)}
          options={STATUS_OPTIONS}
        />
      </div>
    </DpContentSet>
  );
}
