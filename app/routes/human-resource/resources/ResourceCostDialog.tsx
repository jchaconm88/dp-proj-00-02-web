import { useState, useEffect } from "react";
import { useNavigation } from "react-router";
import { DpInput } from "~/components/DpInput";
import { DpCodeInput } from "~/components/DpCodeInput";
import { DpContentSet } from "~/components/DpContent";
import {
  getResourceCost,
  addResourceCost,
  updateResourceCost,
  type ResourceCostType,
} from "~/features/human-resource/resources";
import { resolveCodeIfEmpty } from "~/features/system/sequences";
import { RESOURCE_COST_TYPE, CURRENCY, statusToSelectOptions } from "~/constants/status-options";

export interface ResourceCostDialogProps {
  visible: boolean;
  resourceId: string;
  costId: string | null;
  onSuccess?: () => void;
  onHide: () => void;
}

const TYPE_OPTIONS = statusToSelectOptions(RESOURCE_COST_TYPE);
const CURRENCY_OPTIONS = statusToSelectOptions(CURRENCY);

export default function ResourceCostDialog({
  visible,
  resourceId,
  costId,
  onSuccess,
  onHide,
}: ResourceCostDialogProps) {
  const isEdit = !!costId;
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<ResourceCostType>("per_trip");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("PEN");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [active, setActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleHide = () => {
    if (!saving && !isNavigating) {
      onHide();
    }
  };

  useEffect(() => {
    if (!visible) return;
    setError(null);
    if (!costId) {
      setCode("");
      setName("");
      setType("per_trip");
      setAmount("");
      setCurrency("PEN");
      setEffectiveFrom("");
      setActive(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    getResourceCost(resourceId, costId)
      .then((data) => {
        if (!data) {
          setError("Costo no encontrado.");
          return;
        }
        setCode(data.code ?? "");
        setName(data.name ?? "");
        setType(data.type ?? "per_trip");
        setAmount(String(data.amount ?? ""));
        setCurrency(data.currency ?? "PEN");
        setEffectiveFrom(data.effectiveFrom ?? "");
        setActive(data.active !== false);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error al cargar."))
      .finally(() => setLoading(false));
  }, [visible, resourceId, costId]);

  const save = async () => {
    if (!name.trim()) return;
    if (isEdit && !code.trim()) return;
    setSaving(true);
    setError(null);
    try {
      let finalCode: string;
      if (isEdit) {
        finalCode = code.trim();
      } else {
        try {
          finalCode = await resolveCodeIfEmpty(code, "resource-cost");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Error al generar código.");
          setSaving(false);
          return;
        }
      }

      const numAmount = Number(amount) || 0;
      const payload = {
        code: finalCode,
        name: name.trim(),
        type,
        amount: numAmount,
        currency: currency.trim(),
        effectiveFrom: effectiveFrom.trim(),
        active,
      };

      if (isEdit) {
        await updateResourceCost(resourceId, costId!, payload);
      } else {
        await addResourceCost(resourceId, payload);
      }
      onSuccess?.();
      onHide();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const valid = !!name.trim() && (isEdit ? !!code.trim() : true);

  return (
    <DpContentSet
      title={isEdit ? "Editar costo" : "Agregar costo"}
      cancelLabel="Cancelar"
      onCancel={handleHide}
      saveLabel="Guardar"
      onSave={save}
      saving={saving || isNavigating}
      saveDisabled={!valid || isNavigating}
      visible={visible}
      onHide={handleHide}
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
          <DpCodeInput entity="resource-cost" label="Código" name="code" value={code} onChange={setCode} />
          <DpInput
            type="input"
            label="Nombre"
            name="name"
            value={name}
            onChange={setName}
            placeholder="Tarifa Lima"
          />
          <DpInput
            type="select"
            label="Tipo"
            name="type"
            value={type}
            onChange={(v) => setType(v as ResourceCostType)}
            options={TYPE_OPTIONS}
          />
          <DpInput
            type="number"
            label="Monto"
            name="amount"
            value={amount}
            onChange={setAmount}
            placeholder="180"
          />
          <DpInput
            type="select"
            label="Moneda"
            name="currency"
            value={currency}
            onChange={(v) => setCurrency(String(v))}
            options={CURRENCY_OPTIONS}
          />
          <DpInput
            type="date"
            label="Vigente desde"
            name="effectiveFrom"
            value={effectiveFrom}
            onChange={setEffectiveFrom}
            placeholder="DD/MM/YYYY"
          />
          <DpInput type="check" label="Activo" name="active" value={active} onChange={setActive} />
        </div>
      )}
    </DpContentSet>
  );
}
