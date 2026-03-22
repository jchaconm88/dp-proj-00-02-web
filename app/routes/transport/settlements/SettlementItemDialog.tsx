import { useEffect, useState } from "react";
import { useNavigation } from "react-router";
import { DpInput } from "~/components/DpInput";
import { DpContentSet } from "~/components/DpContent";
import {
  getSettlementItemById,
  createSettlementItem,
  updateSettlementItem,
  itemToFormValues,
  type SettlementItemFormValues,
} from "~/features/transport/settlements";
import {
  SETTLEMENT_MOVEMENT_TYPE,
  CURRENCY,
  statusToSelectOptions,
} from "~/constants/status-options";

export interface SettlementItemDialogProps {
  visible: boolean;
  settlementId: string;
  itemId: string | null;
  onSuccess?: () => void;
  onHide: () => void;
}

const MOVEMENT_OPTIONS = statusToSelectOptions(SETTLEMENT_MOVEMENT_TYPE);
const CURRENCY_OPTIONS = statusToSelectOptions(CURRENCY);

function parseDecimal(s: string): number {
  const n = parseFloat(String(s).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function emptyItemForm(): SettlementItemFormValues {
  return {
    movementType: "tripCost",
    movementId: "",
    tripId: "",
    tripCode: "",
    concept: "",
    amount: 0,
    settledAmount: 0,
    pendingAmount: 0,
    currency: "PEN",
  };
}

export default function SettlementItemDialog({
  visible,
  settlementId,
  itemId,
  onSuccess,
  onHide,
}: SettlementItemDialogProps) {
  const isEdit = !!itemId;
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";

  const [movementType, setMovementType] = useState("tripCost");
  const [movementId, setMovementId] = useState("");
  const [tripId, setTripId] = useState("");
  const [tripCode, setTripCode] = useState("");
  const [concept, setConcept] = useState("");
  const [amountStr, setAmountStr] = useState("0");
  const [settledStr, setSettledStr] = useState("0");
  const [pendingStr, setPendingStr] = useState("0");
  const [currency, setCurrency] = useState("PEN");

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    if (!itemId) {
      const f = emptyItemForm();
      setMovementType(f.movementType);
      setMovementId(f.movementId);
      setTripId(f.tripId);
      setTripCode(f.tripCode);
      setConcept(f.concept);
      setAmountStr("0");
      setSettledStr("0");
      setPendingStr("0");
      setCurrency(f.currency);
      setLoading(false);
      return;
    }
    setLoading(true);
    getSettlementItemById(settlementId, itemId)
      .then((doc) => {
        if (!doc) {
          setError("Ítem no encontrado.");
          return;
        }
        const f = itemToFormValues(doc);
        setMovementType(f.movementType);
        setMovementId(f.movementId);
        setTripId(f.tripId);
        setTripCode(f.tripCode);
        setConcept(f.concept);
        setAmountStr(String(f.amount));
        setSettledStr(String(f.settledAmount));
        setPendingStr(String(f.pendingAmount));
        setCurrency(f.currency);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Error al cargar."))
      .finally(() => setLoading(false));
  }, [visible, settlementId, itemId]);

  const buildValues = (): SettlementItemFormValues => ({
    movementType,
    movementId,
    tripId,
    tripCode,
    concept,
    amount: parseDecimal(amountStr),
    settledAmount: parseDecimal(settledStr),
    pendingAmount: parseDecimal(pendingStr),
    currency,
  });

  const save = async () => {
    if (!movementId.trim()) {
      setError("Indique el ID del movimiento.");
      return;
    }
    if (!tripId.trim() || !tripCode.trim()) {
      setError("Indique ID y código del viaje.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const values = buildValues();
      if (itemId) {
        await updateSettlementItem(settlementId, itemId, values);
      } else {
        await createSettlementItem(settlementId, values);
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
      title={isEdit ? "Editar ítem de liquidación" : "Nuevo ítem"}
      variant="dialog"
      visible={visible}
      onHide={onHide}
      onCancel={onHide}
      onSave={save}
      saving={saving || isNavigating}
      saveDisabled={loading}
      showLoading={loading}
      loadingMessage="Cargando ítem..."
      showError={!!error}
      errorMessage={error ?? ""}
      dismissibleError
    >
      <div className="grid gap-4 md:grid-cols-2">
        <DpInput
          type="select"
          label="Tipo de movimiento"
          value={movementType}
          onChange={(v) => setMovementType(String(v))}
          options={MOVEMENT_OPTIONS}
        />
        <DpInput type="input" label="ID movimiento" value={movementId} onChange={setMovementId} />
        <DpInput type="input" label="ID viaje" value={tripId} onChange={setTripId} />
        <DpInput type="input" label="Código viaje" value={tripCode} onChange={setTripCode} />
        <DpInput
          type="input"
          label="Concepto"
          value={concept}
          onChange={setConcept}
          className="md:col-span-2"
        />
        <DpInput type="input-decimal" label="Monto" value={amountStr} onChange={setAmountStr} />
        <DpInput
          type="input-decimal"
          label="Liquidado"
          value={settledStr}
          onChange={setSettledStr}
        />
        <DpInput
          type="input-decimal"
          label="Pendiente"
          value={pendingStr}
          onChange={setPendingStr}
        />
        <DpInput
          type="select"
          label="Moneda"
          value={currency}
          onChange={(v) => setCurrency(String(v))}
          options={CURRENCY_OPTIONS}
        />
      </div>
    </DpContentSet>
  );
}
